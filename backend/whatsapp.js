import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

export let connectionStatus = 'INITIALIZING';
export let qrCodeUrl = '';

let client = null;

export function getClient() {
  return client;
}

export function initWhatsApp() {
  console.log('Initializing WhatsApp Client...');
  connectionStatus = 'INITIALIZING';
  qrCodeUrl = '';

  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'lead-scraper-client' }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', async (qr) => {
    console.log('WhatsApp QR Code generated.');
    try {
      qrCodeUrl = await qrcode.toDataURL(qr);
      connectionStatus = 'QR_CODE';
    } catch (err) {
      console.error('Error generating QR code data URL:', err);
    }
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready and connected!');
    connectionStatus = 'CONNECTED';
    qrCodeUrl = '';
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated successfully.');
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication failure:', msg);
    connectionStatus = 'DISCONNECTED';
    qrCodeUrl = '';
  });

  client.on('disconnected', (reason) => {
    console.warn('WhatsApp Client was disconnected:', reason);
    connectionStatus = 'DISCONNECTED';
    qrCodeUrl = '';
    // Attempt re-initialization after a short delay
    setTimeout(() => {
      initWhatsApp();
    }, 5000);
  });

  client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
    connectionStatus = 'DISCONNECTED';
  });
}

export async function sendDirectMessage(phone, text) {
  if (connectionStatus !== 'CONNECTED' || !client) {
    throw new Error('WhatsApp client is not connected.');
  }

  // Clean phone number: keep only digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Clean Indian format specific cases
  if (cleaned.startsWith('910') && cleaned.length === 13) {
    cleaned = '91' + cleaned.substring(3);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned; // Default Indian code
  }

  let chatId = `${cleaned}@c.us`;
  
  // Try to get verified WhatsApp JID
  try {
    const numberDetails = await client.getNumberId(cleaned);
    if (numberDetails && numberDetails._serialized) {
      chatId = numberDetails._serialized;
    }
  } catch (err) {
    console.warn(`Could not verify WhatsApp number ID for ${cleaned}:`, err);
  }

  console.log(`Sending direct WhatsApp message to ${chatId}...`);
  await client.sendMessage(chatId, text);
  return true;
}

export async function logoutWhatsApp() {
  if (!client) {
    throw new Error('WhatsApp client is not initialized.');
  }

  console.log('Logging out from WhatsApp...');
  try {
    await client.logout();
  } catch (err) {
    console.error('Error during WhatsApp client.logout(), destroying client:', err);
    try {
      await client.destroy();
    } catch (destroyErr) {
      console.error('Error destroying client:', destroyErr);
    }
  }

  connectionStatus = 'DISCONNECTED';
  qrCodeUrl = '';
  
  // Re-initialize client after logout/destruction to generate a new QR code
  setTimeout(() => {
    initWhatsApp();
  }, 2000);

  return true;
}
