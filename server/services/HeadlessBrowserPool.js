const puppeteer = require('puppeteer');

/**
 * Headless Browser Worker Pool for Protected Instagram Content
 * 
 * This service manages a pool of Puppeteer browser instances for extracting
 * protected Instagram stories/reels that require browser-like behavior.
 * Similar to how StorySaver.net handles protected content.
 */
class HeadlessBrowserPool {
  constructor() {
    this.browsers = [];
    this.maxBrowsers = parseInt(process.env.MAX_BROWSERS) || 3;
    this.maxPagesPerBrowser = parseInt(process.env.MAX_PAGES_PER_BROWSER) || 5;
    this.browserTimeout = parseInt(process.env.BROWSER_TIMEOUT) || 30000; // 30 seconds
    this.pageTimeout = parseInt(process.env.PAGE_TIMEOUT) || 20000; // 20 seconds
    this.currentBrowserIndex = 0;
    this.activeTasks = new Map();
    
    // Browser configuration
    this.browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // Speed up loading
      '--disable-javascript-harmony-shipping',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--remote-debugging-port=0' // Random port for debugging
    ];

    // Initialize cleanup on process exit
    this.setupCleanup();
  }

  /**
   * Initialize the browser pool
   */
  async initializePool() {
    console.log('🚀 Initializing headless browser pool...');
    
    try {
      for (let i = 0; i < this.maxBrowsers; i++) {
        const browser = await this.createBrowser();
        if (browser) {
          this.browsers.push({
            instance: browser,
            activePages: 0,
            lastUsed: Date.now(),
            id: `browser-${i + 1}`
          });
        }
      }
      
      console.log(`✅ Browser pool initialized with ${this.browsers.length} browsers`);
      
      // Start health monitoring
      this.startHealthMonitor();
      
    } catch (error) {
      console.error('❌ Failed to initialize browser pool:', error.message);
    }
  }

  /**
   * Create a new browser instance
   */
  async createBrowser() {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: this.browserArgs,
        timeout: 10000, // 10 second launch timeout
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 375, height: 812 } // Mobile viewport
      });

      console.log('🌐 New browser instance created');
      return browser;
      
    } catch (error) {
      console.error('❌ Failed to create browser:', error.message);
      return null;
    }
  }

  /**
   * Get an available browser for task execution
   */
  async getBrowser() {
    // Find browser with least active pages
    let selectedBrowser = null;
    let minPages = Infinity;

    for (const browser of this.browsers) {
      if (browser.activePages < this.maxPagesPerBrowser && browser.activePages < minPages) {
        selectedBrowser = browser;
        minPages = browser.activePages;
      }
    }

    // If no browser available, try to create a new one
    if (!selectedBrowser && this.browsers.length < this.maxBrowsers) {
      const newBrowser = await this.createBrowser();
      if (newBrowser) {
        selectedBrowser = {
          instance: newBrowser,
          activePages: 0,
          lastUsed: Date.now(),
          id: `browser-${this.browsers.length + 1}`
        };
        this.browsers.push(selectedBrowser);
      }
    }

    if (selectedBrowser) {
      selectedBrowser.activePages++;
      selectedBrowser.lastUsed = Date.now();
    }

    return selectedBrowser;
  }

  /**
   * Release browser back to pool
   */
  releaseBrowser(browserWrapper) {
    if (browserWrapper && browserWrapper.activePages > 0) {
      browserWrapper.activePages--;
      browserWrapper.lastUsed = Date.now();
    }
  }

  /**
   * Extract Instagram content using headless browser
   * @param {string} url - Instagram URL
   * @param {Object} options - Extraction options
   * @returns {Object} - Extraction result
   */
  async extractInstagramContent(url, options = {}) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`🎯 Starting headless extraction task ${taskId} for:`, url);

    let browserWrapper = null;
    let page = null;
    
    try {
      // Set task timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Browser extraction timeout')), this.browserTimeout);
      });

      // Get browser from pool
      browserWrapper = await this.getBrowser();
      if (!browserWrapper) {
        throw new Error('No available browsers in pool');
      }

      console.log(`🌐 Using browser ${browserWrapper.id} for task ${taskId}`);

      // Create new page
      page = await browserWrapper.instance.newPage();
      
      // Configure page
      await this.configurePage(page);
      
      // Track this task
      this.activeTasks.set(taskId, { browserWrapper, page, startTime: Date.now() });

      // Run extraction with timeout protection
      const extractionPromise = this.performExtraction(page, url, options);
      const result = await Promise.race([extractionPromise, timeoutPromise]);

      console.log(`✅ Task ${taskId} completed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Task ${taskId} failed:`, error.message);
      return {
        success: false,
        reason: error.message,
        taskId
      };
    } finally {
      // Cleanup task
      this.activeTasks.delete(taskId);
      
      // Close page
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.warn('Failed to close page:', error.message);
        }
      }
      
      // Release browser back to pool
      if (browserWrapper) {
        this.releaseBrowser(browserWrapper);
      }
    }
  }

  /**
   * Configure page for Instagram extraction
   */
  async configurePage(page) {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 812 });
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // Block ads, analytics, and unnecessary resources
      if (resourceType === 'stylesheet' || 
          resourceType === 'font' ||
          url.includes('google-analytics') ||
          url.includes('facebook.com/tr') ||
          url.includes('doubleclick') ||
          url.includes('ads') ||
          url.includes('analytics')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
  }

  /**
   * Perform the actual content extraction
   */
  async performExtraction(page, url, options) {
    const mediaRequests = [];
    let networkComplete = false;

    // Listen for media requests
    page.on('response', async (response) => {
      const responseUrl = response.url();
      
      if (this.isInstagramMediaUrl(responseUrl)) {
        console.log('📸 Found media URL:', responseUrl.substring(0, 100) + '...');
        
        mediaRequests.push({
          url: responseUrl,
          type: responseUrl.includes('.mp4') ? 'video' : 'image',
          statusCode: response.status(),
          headers: response.headers(),
          source: 'network-request'
        });
      }
    });

    // Navigate to Instagram page
    console.log('🌐 Navigating to Instagram page...');

    try {
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: this.pageTimeout
      });
      console.log('✅ Page loaded successfully');
    } catch (gotoError) {
      console.log('⚠️ Page load issue, trying with different wait condition...');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.pageTimeout
      });
    }

    // Wait for page to stabilize and check for Instagram login/blocking
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if we're blocked or redirected
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('accounts/login') || currentUrl.includes('challenge')) {
      console.log('⚠️ Instagram is requesting login - trying mobile approach...');

      // Try mobile Instagram URL
      const mobileUrl = url.replace('www.instagram.com', 'm.instagram.com');
      await page.goto(mobileUrl, { waitUntil: 'domcontentloaded', timeout: this.pageTimeout });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Extract media URLs from DOM with enhanced detection
    const domMediaUrls = await page.evaluate(() => {
      const mediaUrls = [];

      console.log('Starting DOM extraction...');

      // Look for video elements with broader search
      const videos = document.querySelectorAll('video, video[src], video source');
      console.log(`Found ${videos.length} video elements`);

      videos.forEach((video, index) => {
        console.log(`Video ${index}:`, video.src || video.currentSrc);
        const videoSrc = video.src || video.currentSrc;
        if (videoSrc && (videoSrc.includes('cdninstagram.com') || videoSrc.includes('fbcdn') || videoSrc.includes('scontent'))) {
          mediaUrls.push({
            url: videoSrc,
            type: 'video',
            source: 'video-element',
            width: video.videoWidth || 1080,
            height: video.videoHeight || 1920
          });
          console.log('Added video URL:', videoSrc.substring(0, 100));
        }
      });

      // Look for image elements with broader search
      const images = document.querySelectorAll('img');
      console.log(`Found ${images.length} image elements`);

      images.forEach((img, index) => {
        if (img.src &&
            (img.src.includes('cdninstagram.com') || img.src.includes('fbcdn') || img.src.includes('scontent')) &&
            !img.src.includes('profile_pic') &&
            !img.src.includes('t51.2885-19') &&
            !img.src.includes('s150x150')) {
          mediaUrls.push({
            url: img.src,
            type: 'image',
            source: 'img-element',
            width: img.naturalWidth || 1080,
            height: img.naturalHeight || 1080
          });
          console.log('Added image URL:', img.src.substring(0, 100));
        }
      });

      // Look for URLs in data attributes
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        const attrs = element.attributes;
        for (let attr of attrs) {
          if (attr.name.startsWith('data-') && attr.value && typeof attr.value === 'string' &&
              (attr.value.includes('.mp4') || attr.value.includes('.jpg')) &&
              (attr.value.includes('cdninstagram.com') || attr.value.includes('fbcdn') || attr.value.includes('scontent'))) {
            mediaUrls.push({
              url: attr.value,
              type: attr.value.includes('.mp4') ? 'video' : 'image',
              source: 'data-attribute',
              width: 1080,
              height: attr.value.includes('.mp4') ? 1920 : 1080
            });
            console.log('Added data attribute URL:', attr.value.substring(0, 100));
          }
        }
      });

      // Extract from script tags with enhanced patterns
      const scripts = document.querySelectorAll('script');
      console.log(`Found ${scripts.length} script tags`);

      scripts.forEach((script, index) => {
        const content = script.textContent || script.innerHTML;
        if (content && (content.includes('video_url') || content.includes('display_url') || content.includes('reels_media') || content.includes('video_versions'))) {

          // Enhanced video URL patterns
          const videoPatterns = [
            /"video_url"\s*:\s*"([^"]+)"/g,
            /"video_versions"\s*:\s*\[\s*{[^}]*"url"\s*:\s*"([^"]+)"/g,
            /"playback_url"\s*:\s*"([^"]+)"/g,
            /(https:\/\/[^"\s]*\.mp4[^"\s]*)/g
          ];

          videoPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
              const urlMatch = match.match(/https:\/\/[^"\s]+/);
              if (urlMatch && urlMatch[0] && !urlMatch[0].includes('profile_pic')) {
                const cleanUrl = urlMatch[0].replace(/\\u0026/g, '&').replace(/\\/g, '').replace(/\\\//g, '/');
                if (cleanUrl.includes('.mp4') || cleanUrl.includes('video')) {
                  mediaUrls.push({
                    url: cleanUrl,
                    type: 'video',
                    source: 'script-enhanced',
                    width: 1080,
                    height: 1920
                  });
                  console.log('Added script video URL:', cleanUrl.substring(0, 100));
                }
              }
            });
          });

          // Enhanced image URL patterns
          const imagePatterns = [
            /"display_url"\s*:\s*"([^"]+)"/g,
            /"image_versions2"\s*:\s*{[^}]*"candidates"\s*:\s*\[[^}]*"url"\s*:\s*"([^"]+)"/g,
            /(https:\/\/[^"\s]*\.(jpg|jpeg|png|webp)[^"\s]*)/g
          ];

          imagePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
              const urlMatch = match.match(/https:\/\/[^"\s]+/);
              if (urlMatch && urlMatch[0] && !urlMatch[0].includes('profile_pic') && !urlMatch[0].includes('s150x150')) {
                const cleanUrl = urlMatch[0].replace(/\\u0026/g, '&').replace(/\\/g, '').replace(/\\\//g, '/');
                mediaUrls.push({
                  url: cleanUrl,
                  type: 'image',
                  source: 'script-enhanced',
                  width: 1080,
                  height: 1080
                });
                console.log('Added script image URL:', cleanUrl.substring(0, 100));
              }
            });
          });
        }
      });

      console.log(`Total DOM extraction found: ${mediaUrls.length} URLs`);

      return mediaUrls;
    });

    // Log what we found
    console.log(`DOM extraction results: ${domMediaUrls.length} URLs found`);
    domMediaUrls.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.type}: ${item.url.substring(0, 100)}... (${item.source})`);
    });

    console.log(`🔍 Found ${domMediaUrls.length} DOM URLs and ${mediaRequests.length} network URLs`);

    // Combine and filter URLs
    const allUrls = [...mediaRequests, ...domMediaUrls];
    const validUrls = allUrls.filter(item => 
      item.url && 
      !item.url.includes('profile_pic') && 
      !item.url.includes('t51.2885-19') &&
      (item.url.includes('t50.2886-16') || item.url.includes('t51.2885-15') || item.url.includes('scontent'))
    );

    // Remove duplicates
    const uniqueUrls = validUrls.filter((item, index, self) => 
      index === self.findIndex(t => t.url === item.url)
    );

    if (uniqueUrls.length > 0) {
      // Prioritize video over images
      const videoUrls = uniqueUrls.filter(item => item.type === 'video');
      const imageUrls = uniqueUrls.filter(item => item.type === 'image');
      const bestUrl = videoUrls[0] || imageUrls[0];

      console.log('✅ Headless extraction successful:', bestUrl.type, bestUrl.url.substring(0, 80) + '...');
      
      return {
        success: true,
        mediaUrl: bestUrl.url,
        mediaType: bestUrl.type,
        source: bestUrl.source,
        width: bestUrl.width || 1080,
        height: bestUrl.height || (bestUrl.type === 'video' ? 1920 : 1080),
        extractionMethod: 'headless-browser',
        totalUrlsFound: uniqueUrls.length,
        allUrls: uniqueUrls.map(u => ({ url: u.url.substring(0, 100), type: u.type, source: u.source }))
      };
    }

    return {
      success: false,
      reason: 'No valid Instagram media URLs found',
      urlsChecked: allUrls.length
    };
  }

  /**
   * Check if URL is Instagram media
   */
  isInstagramMediaUrl(url) {
    return url.includes('cdninstagram.com') && 
           (url.includes('.mp4') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.webp')) &&
           !url.includes('profile_pic') &&
           !url.includes('t51.2885-19') &&
           (url.includes('t50.2886-16') || url.includes('t51.2885-15') || url.includes('scontent'));
  }

  /**
   * Start health monitoring for browsers
   */
  startHealthMonitor() {
    setInterval(async () => {
      const now = Date.now();
      
      for (let i = this.browsers.length - 1; i >= 0; i--) {
        const browser = this.browsers[i];
        
        // Remove browsers that have been idle for too long (30 minutes)
        if (browser.activePages === 0 && now - browser.lastUsed > 30 * 60 * 1000) {
          console.log(`🧹 Cleaning up idle browser ${browser.id}`);
          try {
            await browser.instance.close();
          } catch (error) {
            console.warn('Failed to close browser:', error.message);
          }
          this.browsers.splice(i, 1);
        }
        
        // Check if browser is still responsive
        try {
          const pages = await browser.instance.pages();
          if (pages.length > 10) { // Too many pages open
            console.log(`🔄 Restarting browser ${browser.id} - too many pages`);
            await this.restartBrowser(i);
          }
        } catch (error) {
          console.log(`🔄 Restarting unresponsive browser ${browser.id}`);
          await this.restartBrowser(i);
        }
      }
      
      // Ensure minimum number of browsers
      while (this.browsers.length < Math.min(this.maxBrowsers, 1)) {
        const newBrowser = await this.createBrowser();
        if (newBrowser) {
          this.browsers.push({
            instance: newBrowser,
            activePages: 0,
            lastUsed: Date.now(),
            id: `browser-${this.browsers.length + 1}`
          });
        }
      }
      
    }, 60000); // Check every minute
  }

  /**
   * Restart a specific browser
   */
  async restartBrowser(index) {
    const browser = this.browsers[index];
    
    try {
      await browser.instance.close();
    } catch (error) {
      console.warn('Failed to close browser during restart:', error.message);
    }
    
    const newBrowser = await this.createBrowser();
    if (newBrowser) {
      this.browsers[index] = {
        instance: newBrowser,
        activePages: 0,
        lastUsed: Date.now(),
        id: browser.id
      };
    } else {
      this.browsers.splice(index, 1);
    }
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      totalBrowsers: this.browsers.length,
      maxBrowsers: this.maxBrowsers,
      activeTasks: this.activeTasks.size,
      browsers: this.browsers.map(b => ({
        id: b.id,
        activePages: b.activePages,
        lastUsed: new Date(b.lastUsed).toISOString()
      }))
    };
  }

  /**
   * Cleanup on process exit
   */
  setupCleanup() {
    const cleanup = async () => {
      console.log('🧹 Cleaning up browser pool...');
      
      for (const browser of this.browsers) {
        try {
          await browser.instance.close();
        } catch (error) {
          console.warn('Failed to close browser during cleanup:', error.message);
        }
      }
      
      this.browsers = [];
      console.log('✅ Browser pool cleanup complete');
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  /**
   * Manually close all browsers
   */
  async shutdown() {
    console.log('🔒 Shutting down browser pool...');
    
    for (const browser of this.browsers) {
      try {
        await browser.instance.close();
      } catch (error) {
        console.warn('Failed to close browser during shutdown:', error.message);
      }
    }
    
    this.browsers = [];
    console.log('✅ Browser pool shut down complete');
  }
}

module.exports = new HeadlessBrowserPool();
