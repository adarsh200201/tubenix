const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

class YouTubeRateLimitHandler {
  constructor() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.consecutiveFailures = 0;
    this.isCircuitOpen = false;
    this.circuitOpenTime = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Rate limiting config
    this.maxRequestsPerMinute = 30;
    this.minRequestInterval = 2000; // 2 seconds between requests
    this.circuitBreakerThreshold = 5; // Open circuit after 5 consecutive failures
    this.circuitBreakerTimeout = 300000; // 5 minutes
    
    // Enhanced user agents with real browser fingerprints
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    
    this.currentUserAgentIndex = 0;
  }

  // Check if circuit breaker is open
  isCircuitBreakerOpen() {
    if (this.isCircuitOpen) {
      const now = Date.now();
      if (now - this.circuitOpenTime > this.circuitBreakerTimeout) {
        console.log('🔧 Circuit breaker timeout reached, attempting to close circuit');
        this.isCircuitOpen = false;
        this.consecutiveFailures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  // Get next user agent in rotation
  getNextUserAgent() {
    const userAgent = this.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return userAgent;
  }

  // Calculate dynamic delay based on current load and failures
  calculateDelay() {
    const baseDelay = this.minRequestInterval;
    const failureMultiplier = Math.min(this.consecutiveFailures * 1000, 30000); // Max 30 seconds
    const jitter = Math.random() * 1000; // Random jitter up to 1 second
    
    return baseDelay + failureMultiplier + jitter;
  }

  // Wait before making request to respect rate limits
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const requiredDelay = this.calculateDelay();
    
    if (timeSinceLastRequest < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${Math.round(waitTime)}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  // Enhanced ytdl.getInfo with comprehensive error handling
  async getVideoInfo(url, options = {}) {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('⚡ YouTube extraction temporarily disabled due to consistent failures. Please try again in a few minutes.');
    }

    // Wait for rate limit
    await this.waitForRateLimit();

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 YouTube extraction attempt ${attempt}/${maxRetries} (failures: ${this.consecutiveFailures})`);
        
        const userAgent = this.getNextUserAgent();
        const requestOptions = {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7,es;q=0.6',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          maxRedirects: 5,
          timeout: 15000 + (attempt * 5000) // Increase timeout with each attempt
        };

        const ytdlOptions = {
          requestOptions,
          lang: 'en',
          quality: attempt === 1 ? 'highestvideo' : attempt === 2 ? 'highest' : 'best',
          ...options
        };

        const info = await ytdl.getInfo(url, ytdlOptions);
        
        // Success - reset failure counter
        this.consecutiveFailures = 0;
        console.log(`✅ YouTube extraction successful on attempt ${attempt}`);
        
        return info;

      } catch (error) {
        lastError = error;
        console.log(`❌ YouTube extraction attempt ${attempt} failed:`, error.message);

        // Check for rate limiting
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          this.consecutiveFailures++;
          
          // Calculate exponential backoff delay
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 60000); // Max 1 minute
          console.log(`🚦 Rate limit detected, waiting ${Math.round(backoffDelay)}ms...`);
          
          // If we've hit too many failures, open circuit breaker
          if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
            this.isCircuitOpen = true;
            this.circuitOpenTime = Date.now();
            console.log(`🔴 Circuit breaker opened after ${this.consecutiveFailures} consecutive failures`);
            throw new Error('🔄 YouTube temporarily overloaded. Service will retry automatically in a few minutes. This helps prevent permanent blocking.');
          }
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        } else {
          // Non-rate-limit error, don't increment failure counter
          console.log(`⚠️ Non-rate-limit error:`, error.message);
          if (attempt < maxRetries) {
            const normalDelay = 2000 + (Math.random() * 3000); // 2-5 seconds
            await new Promise(resolve => setTimeout(resolve, normalDelay));
          }
        }
      }
    }

    // All attempts failed
    this.consecutiveFailures++;
    throw lastError || new Error('YouTube extraction failed after all attempts');
  }

  // Enhanced direct page scraping with better parsing
  async scrapeYouTubePage(url) {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('YouTube page scraping temporarily disabled due to consistent failures.');
    }

    await this.waitForRateLimit();

    const userAgent = this.getNextUserAgent();
    
    try {
      console.log('🔍 Attempting direct YouTube page scraping...');
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7,es;q=0.6',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache'
        },
        timeout: 20000,
        maxRedirects: 5
      });

      // Success
      this.consecutiveFailures = 0;
      return response;

    } catch (error) {
      if (error.response?.status === 429) {
        this.consecutiveFailures++;
        console.log(`🚦 Page scraping rate limited (failures: ${this.consecutiveFailures})`);
      }
      throw error;
    }
  }

  // Get current handler status
  getStatus() {
    return {
      requestCount: this.requestCount,
      consecutiveFailures: this.consecutiveFailures,
      isCircuitOpen: this.isCircuitOpen,
      circuitOpenTime: this.circuitOpenTime,
      timeUntilCircuitRetry: this.isCircuitOpen ? 
        Math.max(0, this.circuitBreakerTimeout - (Date.now() - this.circuitOpenTime)) : 0
    };
  }

  // Reset handler state (for testing or manual intervention)
  reset() {
    this.requestCount = 0;
    this.consecutiveFailures = 0;
    this.isCircuitOpen = false;
    this.circuitOpenTime = 0;
    this.currentUserAgentIndex = 0;
    console.log('🔄 YouTube rate limit handler reset');
  }
}

// Export singleton instance
module.exports = new YouTubeRateLimitHandler();
