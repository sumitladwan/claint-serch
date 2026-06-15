import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Download, 
  Trash2, 
  MapPin, 
  Phone, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Mail,
  User as UserIcon,
  LogOut,
  Square,
  MessageCircle
} from 'lucide-react';

const CATEGORIES = [
  "Restaurants & Cafes",
  "Bakeries & Sweet Shops",
  "Clothing Boutiques",
  "Gyms & Yoga Studios",
  "Beauty Salons & Spas",
  "Tuition Centers / Coaching Classes",
  "Dance / Music Schools",
  "Interior Designers",
  "Travel Agents",
  "Event Planners",
  "Real Estate Agents"
];

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('auth_token') || '');
  const [userEmail, setUserEmail] = useState('');
  
  // Auth Form States
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard States
  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState('');
  const [whatsappStatus, setWhatsappStatus] = useState('INITIALIZING');
  const [whatsappQr, setWhatsappQr] = useState('');
  
  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJobId, setFilterJobId] = useState('');

  // Auto-complete location suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const INDIAN_CITIES = [
    "Mumbai, Maharashtra", "Delhi, NCR", "Bangalore, Karnataka", "Hyderabad, Telangana", 
    "Ahmedabad, Gujarat", "Chennai, Tamil Nadu", "Kolkata, West Bengal", "Pune, Maharashtra", 
    "Jaipur, Rajasthan", "Lucknow, Uttar Pradesh", "Kanpur, Uttar Pradesh", "Nagpur, Maharashtra", 
    "Indore, Madhya Pradesh", "Thane, Maharashtra", "Bhopal, Madhya Pradesh", "Visakhapatnam, Andhra Pradesh", 
    "Patna, Bihar", "Vadodara, Gujarat", "Ghaziabad, Uttar Pradesh", "Ludhiana, Punjab", 
    "Agra, Uttar Pradesh", "Nashik, Maharashtra", "Faridabad, Haryana", "Meerut, Uttar Pradesh", 
    "Rajkot, Gujarat", "Kalyan-Dombivli, Maharashtra", "Vasai-Virar, Maharashtra", "Varanasi, Uttar Pradesh", 
    "Srinagar, Jammu and Kashmir", "Aurangabad, Maharashtra", "Dhanbad, Jharkhand", "Amritsar, Punjab", 
    "Navi Mumbai, Maharashtra", "Allahabad, Uttar Pradesh", "Ranchi, Jharkhand", "Howrah, West Bengal", 
    "Coimbatore, Tamil Nadu", "Jabalpur, Madhya Pradesh", "Gwalior, Madhya Pradesh", "Vijayawada, Andhra Pradesh", 
    "Jodhpur, Rajasthan", "Madurai, Tamil Nadu", "Raipur, Chhattisgarh", "Kota, Rajasthan", 
    "Guwahati, Assam", "Chandigarh", "Solapur, Maharashtra", "Hubli-Dharwad, Karnataka", 
    "Bareilly, Uttar Pradesh", "Moradabad, Uttar Pradesh", "Mysore, Karnataka", "Gurgaon, Haryana", 
    "Aligarh, Uttar Pradesh", "Jalandhar, Punjab", "Tiruchirappalli, Tamil Nadu", "Bhubaneswar, Odisha", 
    "Salem, Tamil Nadu", "Mira-Bhayandar, Maharashtra", "Warangal, Telangana", "Thiruvananthapuram, Kerala", 
    "Bhiwandi, Maharashtra", "Saharanpur, Uttar Pradesh", "Amravati, Maharashtra", "Noida, Uttar Pradesh", 
    "Jamshedpur, Jharkhand", "Bikaner, Rajasthan", "Kochi, Kerala", "Cuttack, Odisha", 
    "Firozabad, Uttar Pradesh", "Bhavnagar, Gujarat", "Dehradun, Uttarakhand", "Durgapur, West Bengal", 
    "Asansol, West Bengal", "Rourkela, Odisha", "Nanded, Maharashtra", "Kolhapur, Maharashtra", 
    "Ajmer, Rajasthan", "Akola, Maharashtra", "Gulbarga, Karnataka", "Jamnagar, Gujarat", 
    "Ujjain, Madhya Pradesh", "Loni, Uttar Pradesh", "Jhansi, Uttar Pradesh", "Pondicherry", 
    "Nellore, Andhra Pradesh", "Jammu, Jammu and Kashmir", "Belgaum, Karnataka", "Mangalore, Karnataka", 
    "Tirunelveli, Tamil Nadu", "Malegaum, Maharashtra", "Gaya, Bihar", "Udaipur, Rajasthan"
  ];

  // Fetch suggestions
  useEffect(() => {
    if (!location.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(location)}&limit=5`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'NoWebsiteClientFinder/1.0'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const formatted = data.map(item => item.display_name.split(',').slice(0, 3).join(','));
            setSuggestions(formatted);
            return;
          }
        }
      } catch (err) {
        console.warn('Nominatim autocomplete failed, using local list:', err);
      }

      const filtered = INDIAN_CITIES.filter(city => 
        city.toLowerCase().includes(location.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    }, 450);

    return () => clearTimeout(timer);
  }, [location]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowSuggestions(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch user profile and verify token
  useEffect(() => {
    if (token) {
      fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('Token verification failed');
        }
      })
      .then(data => {
        setUserEmail(data.email);
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, [token]);

  // Fetch WhatsApp status
  useEffect(() => {
    if (!token) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/whatsapp/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setWhatsappStatus(data.status);
          setWhatsappQr(data.qrCode);
        }
      } catch (err) {
        console.error('Error fetching WhatsApp status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Fetch dashboard data
  useEffect(() => {
    if (token) {
      fetchLeads();
      fetchJobs(true); // Auto-select latest job on first load
      
      const interval = setInterval(() => {
        fetchJobs();
        fetchLeads();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [token, filterCategory, filterStatus, searchTerm, filterJobId]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);
      if (filterJobId) params.append('jobId', filterJobId);
      
      const response = await fetch(`${BACKEND_URL}/api/leads?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchJobs = async (autoSelectLatest = false) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
        const running = data.some(j => j.status === 'Running' || j.status === 'Pending');
        setIsScraping(running);

        if (autoSelectLatest && data.length > 0) {
          setFilterJobId(prev => prev || data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput || !passwordInput) {
      setAuthError('Please fill in all fields.');
      return;
    }

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUserEmail(data.email);
      setEmailInput('');
      setPasswordInput('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken('');
    setUserEmail('');
    setLeads([]);
    setJobs([]);
  };

  const handleStartScrape = async (e) => {
    e.preventDefault();
    if (!location.trim()) {
      setScrapingError('Please specify a location.');
      return;
    }
    setScrapingError('');
    setIsScraping(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/scrape`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category, location }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scraper');
      }
      
      setLocation('');
      if (data.job && data.job._id) {
        setFilterJobId(data.job._id);
        setLeads([]); // Empty the leads list for the new scraper run
      }
      fetchJobs();
    } catch (error) {
      setScrapingError(error.message);
      setIsScraping(false);
    }
  };

  const handleStopScrape = async () => {
    const activeJob = jobs.find(j => j.status === 'Running' || j.status === 'Pending');
    if (!activeJob) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/scrape/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: activeJob._id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to stop scraper');
      }

      fetchJobs();
    } catch (error) {
      setScrapingError(error.message);
    }
  };

  const handleSendWhatsApp = async (lead) => {
    if (!lead || !lead.phone) return;
    
    const message = `Hello Sir/Ma'am 🙏

My name is Sumit Ladwan and I am a AI & web developer from Wardha.

I help all types of businesses — restaurants, clinics, salons, shops, coaching classes and many more — get a *professional website* so that more customers can find them online. 🌐

Today most people search on Google before visiting any business. If your business is not online, you are losing customers every day without even knowing it!

📌 *What you will get:*
✅ Professional & attractive website
✅ Your business details, services & photos
✅ Contact & inquiry form for customers
✅ WhatsApp button so customers message you directly
✅ Google Maps so people find your location easily
✅ Works perfectly on all mobile phones
✅ Fast loading & easy to use

🎁 *Special Offer:*
I will create a *FREE demo website* for your business — you can see exactly how it looks before paying anything. If you like it, we move forward. If not, no problem at all!

💡 Your website works for your business *24 hours a day, 7 days a week* — even when your shop is closed!

Can we connect for a quick *10 minute call* this week? I would love to show you what I can do for your business. 😊

Thank you for your time 🙏

Sumit Ladwan
*AI & Web Developer – Wardha*
*📞 +91 950549534`;

    if (whatsappStatus === 'CONNECTED') {
      try {
        const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ phone: lead.phone, message, leadId: lead._id }),
        });

        if (!response.ok) {
          let errorMsg = 'Failed to send direct message';
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch (jsonErr) {
            try {
              const textMsg = await response.text();
              errorMsg = textMsg || errorMsg;
            } catch (textErr) {}
          }
          throw new Error(errorMsg);
        }

        alert(`Message sent directly to ${lead.name}!`);
        fetchLeads(); // Refresh leads to show updated status
      } catch (error) {
        alert(`Direct send failed: ${error.message}. Opening fallback window.`);
        openFallbackWhatsApp(lead.phone, message);
      }
    } else {
      openFallbackWhatsApp(lead.phone, message);
    }
  };

  const openFallbackWhatsApp = (phone, message) => {
    // Clean phone number: keep only digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Clean Indian format specific cases
    if (cleaned.startsWith('910') && cleaned.length === 13) {
      cleaned = '91' + cleaned.substring(3);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    
    // If it's a 10 digit number, assume Indian prefix 91
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppLogout = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? You will need to scan the QR code again.')) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/whatsapp/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setWhatsappStatus('DISCONNECTED');
        setWhatsappQr('');
      } else {
        const errData = await response.json();
        alert(`Failed to disconnect: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leads/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        fetchLeads();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdateNotes = async (id, notes) => {
    try {
      await fetch(`${BACKEND_URL}/api/leads/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes }),
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/leads/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchLeads();
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    
    const headers = ['Business Name', 'Category', 'Phone', 'Address', 'Location', 'Status', 'Notes', 'Google Maps Link'];
    const rows = leads.map(l => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.category}"`,
      `"${l.phone}"`,
      `"${l.address.replace(/"/g, '""')}"`,
      `"${l.location}"`,
      `"${l.status}"`,
      `"${l.notes.replace(/"/g, '""')}"`,
      `"${l.mapsUrl}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leads_Without_Website_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Auth Page View
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', padding: '1rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Client Finder Panel</h1>
            <p className="subtitle">Sign in to search for website-less businesses</p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="name@company.com" 
                  style={{ paddingLeft: '2.25rem' }}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  style={{ paddingLeft: '2.25rem', width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.25rem', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none' }}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
            </div>

            {authError && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={14} /> {authError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            {authMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <span 
                  style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: '500' }} 
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                >
                  Sign up
                </span>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <span 
                  style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: '500' }} 
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                >
                  Sign in
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Dashboard View
  return (
    <div className="app-container">
      <header>
        <div>
          <h1>No-Website Business Client Finder</h1>
          <p className="subtitle">Find local businesses on Google Maps that lack websites and need your services</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <UserIcon size={16} />
            <span>{userEmail}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto', display: 'flex', gap: '0.25rem' }} 
            onClick={handleLogout}
          >
            <LogOut size={16} /> Logout
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto' }} 
            onClick={() => { fetchLeads(); fetchJobs(); }}
          >
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>
      </header>

      <div className="grid">
        {/* Left Sidebar - Scraper controls and Job status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
          <div className="card">
            <h2>Start New Scan</h2>
            <form onSubmit={handleStartScrape}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Location (India only)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mumbai, Delhi, Bangalore" 
                  value={location} 
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isScraping}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-list" onClick={(e) => e.stopPropagation()}>
                    {suggestions.map((sug, idx) => (
                      <li 
                        key={idx} 
                        onClick={() => {
                          setLocation(sug);
                          setShowSuggestions(false);
                        }}
                      >
                        {sug}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label>Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isScraping}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {scrapingError && (
                <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {scrapingError}
                </div>
              )}

              {isScraping ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    disabled={true}
                    style={{ flex: 1 }}
                  >
                    <RefreshCw size={16} className="animate-spin" /> Scraping {category === 'All' ? 'All Categories' : category}...
                  </button>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={handleStopScrape}
                    style={{ 
                      width: 'auto', 
                      backgroundColor: 'var(--danger-color)', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.25rem',
                      padding: '0 1rem'
                    }}
                  >
                    <Square size={16} fill="white" /> Stop
                  </button>
                </div>
              ) : (
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!location.trim()}
                >
                  <Play size={16} /> Find Clients
                </button>
              )}
            </form>
          </div>

          <div className="card">
            <h2>WhatsApp Connection</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', textAlign: 'center', padding: '0.5rem 0' }}>
              {whatsappStatus === 'CONNECTED' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', fontWeight: '600' }}>
                    <CheckCircle size={24} fill="var(--success-color)" color="white" />
                    <span>WhatsApp Connected</span>
                  </div>
                  <p className="subtitle" style={{ fontSize: '0.8rem' }}>Messages will be sent directly when you click the send button next to leads.</p>
                </>
              ) : whatsappStatus === 'QR_CODE' ? (
                <>
                  <div style={{ fontWeight: '600', color: '#f59e0b', marginBottom: '0.25rem' }}>Scan QR to Connect</div>
                  {whatsappQr ? (
                    <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <img src={whatsappQr} alt="WhatsApp QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
                    </div>
                  ) : (
                    <div className="animate-spin" style={{ margin: '1rem' }}><RefreshCw size={24} /></div>
                  )}
                  <p className="subtitle" style={{ fontSize: '0.75rem' }}>Open WhatsApp on your phone, go to Linked Devices, and scan this QR code.</p>
                </>
              ) : whatsappStatus === 'INITIALIZING' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Initializing WhatsApp...</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)', fontWeight: '600' }}>
                    <AlertCircle size={20} />
                    <span>WhatsApp Disconnected</span>
                  </div>
                  <p className="subtitle" style={{ fontSize: '0.75rem' }}>Could not connect to WhatsApp. Reconnecting...</p>
                </>
              )}
              {whatsappStatus === 'CONNECTED' && (
                <button 
                  onClick={handleWhatsAppLogout}
                  className="btn btn-secondary" 
                  style={{ width: 'auto', marginTop: '0.5rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Disconnect WhatsApp
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Scrape Jobs History</h2>
            <div className="status-list">
              {jobs.length === 0 ? (
                <div className="subtitle" style={{ textAlign: 'center', padding: '1rem 0' }}>No scrape jobs run yet.</div>
              ) : (
                jobs.map((job) => (
                  <div 
                    key={job._id} 
                    className="status-item"
                    onClick={() => setFilterJobId(job._id)}
                    style={{ 
                      cursor: 'pointer', 
                      border: filterJobId === job._id ? '1px solid var(--primary-color)' : '1px solid transparent',
                      backgroundColor: filterJobId === job._id ? 'rgba(37, 99, 235, 0.05)' : ''
                    }}
                    title="Click to filter leads by this job"
                  >
                    <div className="status-item-info">
                      <strong style={{ fontSize: '0.825rem' }}>{job.category}</strong>
                      <span className="subtitle" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={10} /> {job.location}
                      </span>
                      <span className="subtitle" style={{ fontSize: '0.75rem' }}>
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <span className={`badge badge-${job.status.toLowerCase()}`}>
                        {job.status}
                      </span>
                      {job.status === 'Completed' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--success-color)', fontWeight: '600' }}>
                          +{job.leadsFound} leads
                        </span>
                      )}
                      {job.status === 'Failed' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--danger-color)' }} title={job.error}>
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Leads display */}
        <div className="leads-container">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2>Target Leads ({leads.length})</h2>
                {(() => {
                  const selectedJob = jobs.find(j => j._id === filterJobId);
                  return selectedJob && (
                    <span 
                      onClick={() => setFilterJobId('')}
                      style={{ 
                        fontSize: '0.725rem', 
                        backgroundColor: 'rgba(37, 99, 235, 0.1)', 
                        color: 'var(--primary-color)', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500'
                      }}
                      title="Click to clear job filter"
                    >
                      📍 {selectedJob.location} ({selectedJob.category}) <span style={{ fontWeight: 'bold', marginLeft: '2px' }}>×</span>
                    </span>
                  );
                })()}
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ width: 'auto', gap: '0.5rem' }} 
                onClick={handleExportCSV}
                disabled={leads.length === 0}
              >
                <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="table-filters">
              <div className="search-wrapper">
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name, phone or address..." 
                    style={{ paddingLeft: '2.25rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              {leads.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <p>No leads found. Choose a category and location, then click "Find Clients" to start scanning!</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Business Details</th>
                      <th style={{ width: '18%' }}>Category</th>
                      <th style={{ width: '20%' }}>Contact Info</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '20%' }}>Notes</th>
                      <th style={{ width: '5%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{lead.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <MapPin size={12} /> {lead.location}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lead.category}</span>
                        </td>
                        <td>
                          {lead.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <Phone size={12} /> {lead.phone}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No phone number</span>
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }} title={lead.address}>
                            {lead.address || 'No address details'}
                          </div>
                        </td>
                        <td>
                          <select 
                            value={lead.status} 
                            onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Interested">Interested</option>
                            <option value="Not Interested">Not Interested</option>
                            <option value="Done">Done</option>
                          </select>
                        </td>
                        <td>
                          <textarea 
                            className="notes-input" 
                            placeholder="Add notes (e.g. email, callback date)..."
                            defaultValue={lead.notes}
                            onBlur={(e) => handleUpdateNotes(lead._id, e.target.value)}
                          />
                        </td>
                        <td>
                          <div className="action-buttons">
                            {lead.phone && (
                              <button 
                                className="btn-icon" 
                                style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => handleSendWhatsApp(lead)}
                                title={whatsappStatus === 'CONNECTED' ? "Send Direct WhatsApp" : "Open WhatsApp Web/App Link"}
                              >
                                <MessageCircle size={14} fill="#25D366" />
                              </button>
                            )}
                            {lead.mapsUrl && (
                              <a 
                                href={lead.mapsUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn-icon" 
                                title="Open Google Maps link"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button 
                              className="btn-icon" 
                              style={{ color: 'var(--danger-color)' }}
                              onClick={() => handleDeleteLead(lead._id)}
                              title="Delete Lead"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
