import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  mapsUrl: { type: String, default: '' },
  location: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'Interested', 'Not Interested', 'Done'], 
    default: 'New' 
  },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Avoid saving duplicates by creating a compound index on name and phone
LeadSchema.index({ name: 1, phone: 1 }, { unique: true });

const ScrapeJobSchema = new mongoose.Schema({
  category: { type: String, default: 'All' },
  location: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Running', 'Completed', 'Failed', 'Stopped'], 
    default: 'Pending' 
  },
  leadsFound: { type: Number, default: 0 },
  error: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Lead = mongoose.model('Lead', LeadSchema);
export const ScrapeJob = mongoose.model('ScrapeJob', ScrapeJobSchema);
export const User = mongoose.model('User', UserSchema);
