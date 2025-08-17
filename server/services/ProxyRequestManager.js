const axios = require('axios');

/**
 * Proxy Request Manager - Instagram Request Layer
 * 
 * Manages HTTP requests with:
 * - Rotating user agents and headers
 * - Proxy support (when configured)
 * - Request retry logic
 * - Rate limiting protection
 * - Request fingerprint randomization
 */
class ProxyRequestManager {
  constructor() {
    this.userAgents = [
      // Desktop Chrome
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      
      // Desktop Firefox
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      
      // Desktop Safari
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15',
      
      // Mobile Chrome
      'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      
      // iPhone Safari
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      
      // Instagram App User Agents
      'Instagram 276.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229237)',
      'Instagram 302.0.0.23.109 (iPhone14,3; iOS 17_1; en_US; en-US; scale=3.00; 1170x2532; 489720489) AppleWebKit/420+',
      'Instagram 285.0.0.21.100 Android (29/10; 480dpi; 1080x2280; OnePlus; GM1913; OnePlus7; qcom; en_US; 442075113)'
    ];

    this.acceptLanguages = [
      'en-US,en;q=0.9',
      'en-US,en;q=0.8,es;q=0.7',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.5',
      'en-CA,en;q=0.9'
    ];

    this.acceptEncodings = [
      'gzip, deflate, br',
      'gzip, deflate',
      'br, gzip, deflate'
    ];

    // Proxy configuration (if available)
    this.proxies = this.loadProxies();
    this.currentProxyIndex = 0;
    
    // Request tracking
    this.requestCounts = new Map();
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // Minimum 100ms between requests
    
    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // Base retry delay in ms
  }

  /**
   * Load proxy configuration from environment
   */
  loadProxies() {
    const proxies = [];
    
    // Support for multiple proxy formats
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      proxies.push({
        protocol: 'http',
        host: process.env.PROXY_HOST || 'localhost',
        port: parseInt(process.env.PROXY_PORT) || 8080,
        auth: process.env.PROXY_USER && process.env.PROXY_PASS ? {
          username: process.env.PROXY_USER,
          password: process.env.PROXY_PASS
        } : undefined
      });
    }

    // Support for comma-separated proxy list
    if (process.env.PROXY_LIST) {
      const proxyList = process.env.PROXY_LIST.split(',');
      proxyList.forEach(proxyStr => {
        const [host, port, user, pass] = proxyStr.trim().split(':');
        if (host && port) {
          proxies.push({
            protocol: 'http',
            host,
            port: parseInt(port),
            auth: user && pass ? { username: user, password: pass } : undefined
          });
        }
      });
    }

    if (proxies.length > 0) {
      console.log(`🔄 Loaded ${proxies.length} proxy configurations`);
    }

    return proxies;
  }

  /**
   * Generate realistic headers for Instagram requests
   */
  generateHeaders(options = {}) {
    const userAgent = options.userAgent || this.getRandomUserAgent();
    const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
    const isInstagramApp = userAgent.includes('Instagram');
    
    const baseHeaders = {
      'User-Agent': userAgent,
      'Accept': options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': this.getRandomItem(this.acceptLanguages),
      'Accept-Encoding': this.getRandomItem(this.acceptEncodings),
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // Add mobile-specific headers
    if (isMobile && !isInstagramApp) {
      baseHeaders['Sec-Fetch-Dest'] = 'document';
      baseHeaders['Sec-Fetch-Mode'] = 'navigate';
      baseHeaders['Sec-Fetch-Site'] = 'none';
      baseHeaders['Sec-Fetch-User'] = '?1';
      baseHeaders['sec-ch-ua-mobile'] = '?1';
      baseHeaders['sec-ch-ua-platform'] = isMobile ? '"Android"' : '"Windows"';
    }

    // Add Instagram app specific headers
    if (isInstagramApp) {
      baseHeaders['X-IG-App-ID'] = '936619743392459';
      baseHeaders['X-IG-Capabilities'] = '3brTv10=';
      baseHeaders['X-IG-Connection-Type'] = 'WIFI';
      baseHeaders['X-IG-Bandwidth-Speed-KBPS'] = '-1.000';
      baseHeaders['X-IG-Bandwidth-TotalBytes-B'] = '0';
      baseHeaders['X-IG-Bandwidth-TotalTime-MS'] = '0';
      
      if (Math.random() > 0.5) {
        baseHeaders['X-IG-Android-ID'] = 'android-' + Math.random().toString(36).substring(2, 18);
      }
    }

    // Add desktop-specific headers
    if (!isMobile) {
      baseHeaders['sec-ch-ua'] = '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"';
      baseHeaders['sec-ch-ua-mobile'] = '?0';
      baseHeaders['sec-ch-ua-platform'] = '"Windows"';
    }

    // Add referer for Instagram requests
    if (options.referer) {
      baseHeaders['Referer'] = options.referer;
    } else if (options.url && options.url.includes('instagram.com')) {
      baseHeaders['Referer'] = 'https://www.instagram.com/';
    }

    // Add origin for API requests
    if (options.origin) {
      baseHeaders['Origin'] = options.origin;
    }

    // Randomly add some additional realistic headers
    if (Math.random() > 0.7) {
      baseHeaders['Cache-Control'] = 'max-age=0';
    }

    if (Math.random() > 0.8) {
      baseHeaders['Pragma'] = 'no-cache';
    }

    return baseHeaders;
  }

  /**
   * Get a random user agent
   */
  getRandomUserAgent() {
    return this.getRandomItem(this.userAgents);
  }

  /**
   * Get random item from array
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Get next proxy in rotation
   */
  getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  /**
   * Create axios configuration with proxy and headers
   */
  createAxiosConfig(url, options = {}) {
    const config = {
      url,
      timeout: options.timeout || 15000,
      maxRedirects: options.maxRedirects || 5,
      headers: this.generateHeaders({
        ...options,
        url
      }),
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
      }
    };

    // Add proxy if available and enabled
    if (this.proxies.length > 0 && !options.disableProxy) {
      const proxy = this.getNextProxy();
      if (proxy) {
        config.proxy = proxy;
        console.log(`🔄 Using proxy: ${proxy.host}:${proxy.port}`);
      }
    }

    // Add method
    config.method = options.method || 'GET';

    // Add data for POST requests
    if (options.data) {
      config.data = options.data;
    }

    // Add custom axios options
    if (options.responseType) {
      config.responseType = options.responseType;
    }

    return config;
  }

  /**
   * Make HTTP request with retry logic and rate limiting
   */
  async makeRequest(url, options = {}) {
    // Rate limiting
    await this.enforceRateLimit();

    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📡 Request attempt ${attempt + 1}/${this.maxRetries + 1}: ${url.substring(0, 100)}...`);
        
        const config = this.createAxiosConfig(url, {
          ...options,
          attempt: attempt + 1
        });

        const response = await axios(config);
        
        console.log(`✅ Request successful: ${response.status} ${response.statusText}`);
        
        // Track successful request
        this.trackRequest(url, true);
        
        return response;

      } catch (error) {
        lastError = error;
        
        console.log(`❌ Request attempt ${attempt + 1} failed: ${error.message}`);
        
        // Track failed request
        this.trackRequest(url, false);

        // Don't retry on certain errors
        if (error.response) {
          const status = error.response.status;
          
          // Don't retry on client errors (except 429 rate limit)
          if (status >= 400 && status < 500 && status !== 429) {
            console.log(`🚫 Not retrying due to client error: ${status}`);
            break;
          }
          
          // Special handling for Instagram-specific errors
          if (status === 404) {
            console.log('🚫 Content not found (404) - likely expired or private');
            break;
          }
          
          if (status === 403) {
            console.log('🚫 Access forbidden (403) - likely blocked or private');
            break;
          }
        }

        // Wait before retry
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    console.error(`❌ All ${this.maxRetries + 1} attempts failed for: ${url}`);
    throw lastError;
  }

  /**
   * Enforce rate limiting between requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms`);
      await this.sleep(delay);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Track request statistics
   */
  trackRequest(url, success) {
    const domain = new URL(url).hostname;
    
    if (!this.requestCounts.has(domain)) {
      this.requestCounts.set(domain, { total: 0, success: 0, failed: 0 });
    }
    
    const stats = this.requestCounts.get(domain);
    stats.total++;
    
    if (success) {
      stats.success++;
    } else {
      stats.failed++;
    }
  }

  /**
   * Get request statistics
   */
  getStats() {
    const stats = {};
    
    for (const [domain, counts] of this.requestCounts.entries()) {
      stats[domain] = {
        ...counts,
        successRate: counts.total > 0 ? (counts.success / counts.total * 100).toFixed(2) + '%' : '0%'
      };
    }
    
    return {
      proxiesConfigured: this.proxies.length,
      userAgents: this.userAgents.length,
      requestStats: stats
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make GET request
   */
  async get(url, options = {}) {
    return this.makeRequest(url, { ...options, method: 'GET' });
  }

  /**
   * Make POST request
   */
  async post(url, data, options = {}) {
    return this.makeRequest(url, { ...options, method: 'POST', data });
  }

  /**
   * Make HEAD request for checking if resource exists
   */
  async head(url, options = {}) {
    return this.makeRequest(url, { ...options, method: 'HEAD' });
  }

  /**
   * Special method for Instagram GraphQL requests
   */
  async instagramGraphQL(queryHash, variables, options = {}) {
    const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
    
    const graphQLOptions = {
      ...options,
      userAgent: this.getRandomUserAgent(),
      referer: 'https://www.instagram.com/',
      origin: 'https://www.instagram.com',
      accept: '*/*'
    };

    // Add Instagram-specific headers
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Instagram-AJAX': '1010824617',
      'X-IG-App-ID': '936619743392459',
      'X-IG-WWW-Claim': '0'
    };

    if (graphQLOptions.headers) {
      Object.assign(graphQLOptions.headers, headers);
    } else {
      graphQLOptions.headers = headers;
    }

    return this.get(url, graphQLOptions);
  }

  /**
   * Special method for Instagram mobile API requests
   */
  async instagramMobileAPI(endpoint, options = {}) {
    const mobileUserAgent = 'Instagram 276.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229237)';
    
    const mobileOptions = {
      ...options,
      userAgent: mobileUserAgent,
      accept: '*/*'
    };

    return this.get(endpoint, mobileOptions);
  }

  /**
   * Test proxy connectivity
   */
  async testProxies() {
    const results = [];
    
    for (let i = 0; i < this.proxies.length; i++) {
      const proxy = this.proxies[i];
      
      try {
        console.log(`🧪 Testing proxy ${i + 1}: ${proxy.host}:${proxy.port}`);
        
        const config = {
          url: 'https://httpbin.org/ip',
          timeout: 10000,
          proxy: proxy
        };
        
        const response = await axios(config);
        
        results.push({
          index: i,
          proxy: `${proxy.host}:${proxy.port}`,
          status: 'working',
          ip: response.data.origin,
          responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime
        });
        
        console.log(`✅ Proxy ${i + 1} working - IP: ${response.data.origin}`);
        
      } catch (error) {
        results.push({
          index: i,
          proxy: `${proxy.host}:${proxy.port}`,
          status: 'failed',
          error: error.message
        });
        
        console.log(`❌ Proxy ${i + 1} failed: ${error.message}`);
      }
    }
    
    return results;
  }
}

module.exports = new ProxyRequestManager();
