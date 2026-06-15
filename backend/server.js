import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Lead, ScrapeJob, User } from './models.js';
import { runScraper, stopScraper } from './scraper.js';
import { initWhatsApp, connectionStatus, qrCodeUrl, sendDirectMessage, logoutWhatsApp } from './whatsapp.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-key-12345';

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lead_scraper';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas successfully.'))
  .catch((err) => {
    console.error('MongoDB connection error details:', err.message);
    console.log('Ensure MONGODB_URI in backend/.env is correct and Atlas network permissions allow access.');
  });

// Authentication Middleware
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found or authorization failed' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Request is not authorized' });
  }
};

// API Routes

// 1. Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ email: user.email, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ email: user.email, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json(req.user);
});

// 2. Trigger Scraper (Protected)
app.post('/api/scrape', requireAuth, async (req, res) => {
  const { category, location } = req.body;
  if (!location) {
    return res.status(400).json({ error: 'Location is required.' });
  }

  // Check if there's already a running job to prevent overloading
  const activeJob = await ScrapeJob.findOne({ status: { $in: ['Running', 'Pending'] } });
  if (activeJob) {
    return res.status(400).json({ error: 'A scraping job is already running. Please wait for it to complete.' });
  }

  try {
    const job = new ScrapeJob({ category: category || 'All', location, status: 'Pending' });
    await job.save();

    // Trigger scraper asynchronously
    runScraper(job._id).catch(err => {
      console.error(`Error in runScraper background process for job ${job._id}:`, err);
    });

    res.json({ message: 'Scraper started successfully', job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Stop Scraper (Protected)
app.post('/api/scrape/stop', requireAuth, async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required.' });
  }

  try {
    const stopped = await stopScraper(jobId);
    if (stopped) {
      res.json({ message: 'Scraper stop signal sent successfully.' });
    } else {
      // If the job isn't actively running in memory, check if it's in the DB and set status to Stopped
      const job = await ScrapeJob.findById(jobId);
      if (job && (job.status === 'Running' || job.status === 'Pending')) {
        job.status = 'Stopped';
        job.updatedAt = new Date();
        await job.save();
        res.json({ message: 'Scraper state updated to Stopped.' });
      } else {
        res.status(400).json({ error: 'Scraper job is not running or not found.' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2c. Get WhatsApp Connection Status (Protected)
app.get('/api/whatsapp/status', requireAuth, (req, res) => {
  res.json({ status: connectionStatus, qrCode: qrCodeUrl });
});

// 2d. Send Direct WhatsApp Message (Protected)
app.post('/api/whatsapp/send', requireAuth, async (req, res) => {
  const { phone, message, leadId } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone number and message are required.' });
  }

  try {
    await sendDirectMessage(phone, message);
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, { status: 'Contacted' });
    }
    res.json({ success: true, message: 'WhatsApp message sent directly!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2e. Logout WhatsApp (Protected)
app.post('/api/whatsapp/logout', requireAuth, async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true, message: 'WhatsApp logged out successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Scrape Status / History (Protected)
app.get('/api/status', requireAuth, async (req, res) => {
  try {
    const jobs = await ScrapeJob.find().sort({ createdAt: -1 }).limit(10);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Leads (Protected)
app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const { category, status, search, location, jobId } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }
    if (location) {
      query.location = location;
    }
    if (jobId) {
      query.jobId = jobId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update Lead Status / Notes (Protected)
app.put('/api/leads/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  try {
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const lead = await Lead.findByIdAndUpdate(id, updateData, { new: true });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Delete Lead (Protected)
app.delete('/api/leads/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  initWhatsApp();
});
