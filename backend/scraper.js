import puppeteer from 'puppeteer';
import { Lead, ScrapeJob } from './models.js';

// Map to store active scraper state by jobId
export const activeScrapers = new Map();

export const CATEGORIES = [
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

export async function stopScraper(jobId) {
  const scraper = activeScrapers.get(jobId.toString());
  if (scraper) {
    console.log(`Stopping scrape job ${jobId}...`);
    scraper.stopped = true;
    if (scraper.browser) {
      try {
        await scraper.browser.close();
      } catch (e) {
        console.error('Error closing browser during stop:', e);
      }
    }
    activeScrapers.delete(jobId.toString());
    
    // Update job status to Stopped in DB
    try {
      const job = await ScrapeJob.findById(jobId);
      if (job && (job.status === 'Running' || job.status === 'Pending')) {
        job.status = 'Stopped';
        job.updatedAt = new Date();
        await job.save();
      }
    } catch (dbErr) {
      console.error('Error updating job status to Stopped in database:', dbErr);
    }
    return true;
  }
  return false;
}

export async function runScraper(jobId) {
  const job = await ScrapeJob.findById(jobId);
  if (!job) return;

  job.status = 'Running';
  job.updatedAt = new Date();
  await job.save();

  const scraperState = { browser: null, stopped: false };
  activeScrapers.set(jobId.toString(), scraperState);

  let browser;
  try {
    const headless = process.env.PUPPETEER_HEADLESS === 'true';
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,800'
      ]
    });
    scraperState.browser = browser;

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    // Set a normal user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const categoriesToScrape = job.category === 'All' ? CATEGORIES : [job.category];
    let leadsCount = 0;

    for (const currentCategory of categoriesToScrape) {
      if (scraperState.stopped) break;

      const locationWithCountry = job.location.toLowerCase().includes('india') ? job.location : `${job.location}, India`;
      const searchQuery = `${currentCategory} in ${locationWithCountry}`;
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      console.log(`Starting scrape for query: "${searchQuery}" using URL: ${searchUrl}`);

      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      } catch (err) {
        if (scraperState.stopped) break;
        console.error(`Error navigating to search URL for category ${currentCategory}:`, err.message);
        continue;
      }

      // Wait for the results feed or no results message
      let feedSelector = 'div[role="feed"]';
      try {
        await page.waitForSelector(feedSelector, { timeout: 15000 });
      } catch (e) {
        if (scraperState.stopped) break;
        console.log(`Results feed not found for category ${currentCategory} with default selector. Retrying alternative selector...`);
        feedSelector = 'div[aria-label*="Results for"]';
        try {
          await page.waitForSelector(feedSelector, { timeout: 10000 });
        } catch (e2) {
          console.log(`No results found or feed failed to load for category ${currentCategory}. Skipping.`);
          continue;
        }
      }

      if (scraperState.stopped) break;

      // Scroll down the sidebar panel to load more results
      console.log(`Scrolling results sidebar for category ${currentCategory}...`);
      try {
        await page.evaluate(async (selector) => {
          const scrollableDiv = document.querySelector(selector) || document.body;
          if (!scrollableDiv) return;
          
          let lastHeight = scrollableDiv.scrollHeight;
          let scrollAttempts = 0;
          
          // Reduced to 8 attempts per category to keep the overall run time for "All" reasonable
          while (scrollAttempts < 8) {
            scrollableDiv.scrollBy(0, scrollableDiv.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const newHeight = scrollableDiv.scrollHeight;
            if (newHeight === lastHeight) {
              scrollableDiv.scrollBy(0, -300);
              await new Promise(resolve => setTimeout(resolve, 400));
              scrollableDiv.scrollBy(0, scrollableDiv.scrollHeight);
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              if (scrollableDiv.scrollHeight === lastHeight) {
                break;
              }
            }
            lastHeight = scrollableDiv.scrollHeight;
            scrollAttempts++;
          }
        }, feedSelector);
      } catch (err) {
        if (scraperState.stopped) break;
        console.error('Error during scroll evaluation:', err.message);
      }

      if (scraperState.stopped) break;

      // Get all links that match maps place pattern
      let listingsData = [];
      try {
        listingsData = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
          return links.map(link => {
            let parent = link.closest('div');
            let name = '';
            const ariaLabel = link.getAttribute('aria-label');
            if (ariaLabel) {
              name = ariaLabel;
            } else {
              const textEl = link.querySelector('.fontHeadlineSmall, .qistia');
              if (textEl) name = textEl.textContent.trim();
            }
            
            return {
              name: name || 'Unknown Business',
              url: link.href
            };
          }).filter(item => item.name);
        });
      } catch (err) {
        if (scraperState.stopped) break;
        console.error('Error evaluating listings:', err.message);
        continue;
      }

      // Deduplicate listings by URL
      const uniqueListings = [];
      const seenUrls = new Set();
      for (const item of listingsData) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          uniqueListings.push(item);
        }
      }

      console.log(`Found ${uniqueListings.length} total potential listings for category ${currentCategory}. Analyzing details...`);

      // Limit to 10 listings per category for "All" or 30 if single category to keep it fast
      const limitCount = job.category === 'All' ? 10 : 30;
      const listingsToAnalyze = uniqueListings.slice(0, limitCount);

      for (const listing of listingsToAnalyze) {
        if (scraperState.stopped) break;

        try {
          console.log(`Analyzing: ${listing.name}`);
          await page.goto(listing.url, { waitUntil: 'networkidle2', timeout: 30000 });
          
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

          if (scraperState.stopped) break;

          const details = await page.evaluate(() => {
            const websiteEl = document.querySelector('[data-item-id="authority"]') || 
                              document.querySelector('a[aria-label*="Website"], a[aria-label*="website"]');
            
            const website = websiteEl ? (websiteEl.getAttribute('href') || websiteEl.textContent || '').trim() : '';

            const phoneEl = document.querySelector('[data-item-id^="phone:tel:"]') || 
                            document.querySelector('button[aria-label*="Phone:"], button[aria-label*="phone:"]');
            const phone = phoneEl ? phoneEl.textContent.trim().replace(/Phone:\s*/i, '') : '';

            const addressEl = document.querySelector('[data-item-id="address"]') || 
                              document.querySelector('button[aria-label*="Address:"], button[aria-label*="address:"]');
            const address = addressEl ? addressEl.textContent.trim().replace(/Address:\s*/i, '') : '';

            return {
              hasWebsite: !!website && !website.includes('google.com/maps'),
              website,
              phone,
              address
            };
          });

          if (!details.hasWebsite) {
            console.log(`🎯 Lead Found (No Website): ${listing.name} | Phone: ${details.phone || 'N/A'}`);
            
            try {
              await Lead.create({
                name: listing.name,
                category: currentCategory,
                phone: details.phone || '',
                address: details.address || '',
                mapsUrl: listing.url,
                location: job.location,
                status: 'New'
              });
              leadsCount++;
              
              // Periodically update progress in DB
              job.leadsFound = leadsCount;
              await job.save();
            } catch (dbErr) {
              if (dbErr.code === 11000) {
                console.log(`Lead "${listing.name}" already exists in the database. Skipping.`);
              } else {
                console.error('Database save error:', dbErr.message);
              }
            }
          } else {
            console.log(`Skipping: ${listing.name} (Has Website: ${details.website})`);
          }
        } catch (err) {
          if (scraperState.stopped) break;
          console.error(`Error analyzing listing ${listing.name}:`, err.message);
        }
      }
    }

    if (scraperState.stopped) {
      console.log(`Scraper stopped by user. Cleaning up...`);
      return;
    }

    job.status = 'Completed';
    job.leadsFound = leadsCount;
    job.updatedAt = new Date();
    await job.save();
    console.log(`Scrape Job completed successfully. Found ${leadsCount} total new leads.`);

  } catch (error) {
    if (scraperState.stopped) {
      console.log(`Scraper stopped by user. Caught browser close/cancellation error.`);
    } else {
      console.error('Scraper error:', error);
      job.status = 'Failed';
      job.error = error.message;
      job.updatedAt = new Date();
      await job.save();
    }
  } finally {
    activeScrapers.delete(jobId.toString());
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Browser might already be closed
      }
    }
  }
}
