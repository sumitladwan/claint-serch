# Client Finder: No-Website Business Lead Scraper & Auto-Contact

A modern, full-screen dashboard tool designed to scrape local businesses from Google Maps that do not have websites, manage those leads, and contact them directly via automated WhatsApp messages.

---

## 🚀 Key Features

*   **Google Maps Scraper**: Scrapes businesses in India by category and location using Puppeteer.
*   **Website Detection**: Automatically filters out businesses that already have a website.
*   **WhatsApp Integration**: Built-in `whatsapp-web.js` client allowing direct QR code sign-in, session logout, and message automation.
*   **Lead Pipeline Management**: Track lead status (`New`, `Contacted`, `Interested`, `Not Interested`, `Done`) and write persistent follow-up notes.
*   **Robust Phone Formatting**: Automatically cleans Indian phone formats (removes leading zeroes, country code prefixes) to ensure messages go to the correct numbers.
*   **CSV Data Export**: Export lead sheets instantly to CSV.
*   **Responsive Full-Screen Layout**: Premium, scroll-optimized dashboard layout focusing on the scraped lead tables.

---

## 🛠️ Project Structure

```text
my-project/
├── backend/
│   ├── models.js          # MongoDB schemas (Lead, ScrapeJob, User)
│   ├── scraper.js         # Puppeteer-based Google Maps scraping logic
│   ├── server.js          # Express API server & routes
│   └── whatsapp.js        # WhatsApp-Web.js client session handlers
└── frontend/
    ├── src/
    │   ├── App.jsx        # React Dashboard UI
    │   ├── main.jsx       # React entry point
    │   └── index.css      # Custom UI design system & layout styles
    └── package.json
```

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB Instance (Local or Atlas connection URL)

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Update the environment variables in `.env` (like `MONGODB_URI`, `JWT_SECRET`).
5. Start the backend development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173`.

---

## 💬 Usage Guide

1.  **Register/Login**: Set up a user account on the dashboard login screen.
2.  **Scan WhatsApp QR**: Under the **WhatsApp Connection** widget, scan the generated QR code using WhatsApp on your mobile device (Linked Devices).
3.  **Start Scrape**: Input a target location (e.g. *Wardha, Nagpur, Pune*) and press **Find Clients**. The Puppeteer scraper will run in the background.
4.  **Send Pitch**: Click the WhatsApp message button next to any lead to send a personalized website creation offer.
5.  **Track Statuses**: Change the lead workflow status to `Done` once a site deal is successfully finalized.
