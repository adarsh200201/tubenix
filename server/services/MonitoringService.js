/**
 * Monitoring and Error Handling Service
 * 
 * Provides comprehensive monitoring and error handling for the Instagram extraction system:
 * - Error tracking and categorization
 * - Performance monitoring
 * - Health checks
 * - Alerting system
 * - Metrics collection
 * - System status reporting
 */
class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byMethod: new Map(),
        byPlatform: new Map(),
        byErrorType: new Map()
      },
      performance: {
        averageResponseTime: 0,
        responseTimeHistory: [],
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      errors: {
        total: 0,
        byCategory: new Map(),
        recentErrors: [],
        maxRecentErrors: 100
      },
      system: {
        startTime: Date.now(),
        lastHealthCheck: Date.now(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      extraction: {
        methodSuccess: new Map(),
        headlessBrowserUsage: 0,
        cacheHitRate: 0,
        rateLimitHits: 0
      }
    };

    this.healthStatus = {
      overall: 'healthy',
      services: {
        extraction: 'healthy',
        headlessBrowser: 'healthy',
        cache: 'healthy',
        queue: 'healthy',
        proxy: 'healthy'
      },
      lastUpdated: Date.now()
    };

    this.errorCategories = {
      NETWORK_ERROR: 'Network connectivity issues',
      RATE_LIMIT: 'Rate limiting triggered',
      INVALID_URL: 'Invalid URL provided',
      CONTENT_NOT_FOUND: 'Content not found or expired',
      PRIVATE_CONTENT: 'Private content access attempted',
      EXTRACTION_FAILED: 'All extraction methods failed',
      HEADLESS_ERROR: 'Headless browser error',
      CACHE_ERROR: 'Cache system error',
      QUEUE_ERROR: 'Task queue error',
      SYSTEM_ERROR: 'System or server error'
    };

    // Start monitoring loops
    this.startMonitoring();
    
    console.log('📊 Monitoring Service initialized');
  }

  /**
   * Record a request
   */
  recordRequest(platform, method, success, responseTime, error = null) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      
      if (error) {
        this.recordError(error, { platform, method });
      }
    }

    // Track by method
    const methodKey = `${platform}-${method}`;
    if (!this.metrics.requests.byMethod.has(methodKey)) {
      this.metrics.requests.byMethod.set(methodKey, { total: 0, successful: 0, failed: 0 });
    }
    const methodStats = this.metrics.requests.byMethod.get(methodKey);
    methodStats.total++;
    if (success) methodStats.successful++;
    else methodStats.failed++;

    // Track by platform
    if (!this.metrics.requests.byPlatform.has(platform)) {
      this.metrics.requests.byPlatform.set(platform, { total: 0, successful: 0, failed: 0 });
    }
    const platformStats = this.metrics.requests.byPlatform.get(platform);
    platformStats.total++;
    if (success) platformStats.successful++;
    else platformStats.failed++;

    // Track performance
    this.recordPerformance(responseTime);

    // Track extraction method success
    if (platform === 'Instagram') {
      if (!this.metrics.extraction.methodSuccess.has(method)) {
        this.metrics.extraction.methodSuccess.set(method, { attempts: 0, successes: 0 });
      }
      const methodSuccessStats = this.metrics.extraction.methodSuccess.get(method);
      methodSuccessStats.attempts++;
      if (success) methodSuccessStats.successes++;
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformance(responseTime) {
    // Update response time metrics
    this.metrics.performance.responseTimeHistory.push({
      time: Date.now(),
      responseTime
    });

    // Keep only last 1000 entries
    if (this.metrics.performance.responseTimeHistory.length > 1000) {
      this.metrics.performance.responseTimeHistory.shift();
    }

    // Update min/max
    this.metrics.performance.maxResponseTime = Math.max(
      this.metrics.performance.maxResponseTime, 
      responseTime
    );
    this.metrics.performance.minResponseTime = Math.min(
      this.metrics.performance.minResponseTime, 
      responseTime
    );

    // Calculate rolling average
    const recent = this.metrics.performance.responseTimeHistory.slice(-100);
    this.metrics.performance.averageResponseTime = 
      recent.reduce((sum, entry) => sum + entry.responseTime, 0) / recent.length;
  }

  /**
   * Record an error
   */
  recordError(error, context = {}) {
    this.metrics.errors.total++;
    
    const errorCategory = this.categorizeError(error);
    
    if (!this.metrics.errors.byCategory.has(errorCategory)) {
      this.metrics.errors.byCategory.set(errorCategory, 0);
    }
    this.metrics.errors.byCategory.set(errorCategory, 
      this.metrics.errors.byCategory.get(errorCategory) + 1
    );

    // Track by error type for requests
    if (!this.metrics.requests.byErrorType.has(errorCategory)) {
      this.metrics.requests.byErrorType.set(errorCategory, 0);
    }
    this.metrics.requests.byErrorType.set(errorCategory,
      this.metrics.requests.byErrorType.get(errorCategory) + 1
    );

    // Store recent error
    const errorEntry = {
      timestamp: Date.now(),
      category: errorCategory,
      message: error.message || error.toString(),
      stack: error.stack,
      context
    };

    this.metrics.errors.recentErrors.push(errorEntry);
    
    // Keep only recent errors
    if (this.metrics.errors.recentErrors.length > this.metrics.errors.maxRecentErrors) {
      this.metrics.errors.recentErrors.shift();
    }

    // Log error
    console.error(`❌ [${errorCategory}] ${error.message}`, context);

    // Check if error requires immediate attention
    this.checkCriticalError(errorCategory, error);
  }

  /**
   * Categorize error type
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'RATE_LIMIT';
    }
    if (message.includes('invalid url') || message.includes('url format')) {
      return 'INVALID_URL';
    }
    if (message.includes('not found') || message.includes('expired') || message.includes('404')) {
      return 'CONTENT_NOT_FOUND';
    }
    if (message.includes('private') || message.includes('forbidden') || message.includes('403')) {
      return 'PRIVATE_CONTENT';
    }
    if (message.includes('extraction failed') || message.includes('no media found')) {
      return 'EXTRACTION_FAILED';
    }
    if (message.includes('puppeteer') || message.includes('browser') || message.includes('headless')) {
      return 'HEADLESS_ERROR';
    }
    if (message.includes('cache')) {
      return 'CACHE_ERROR';
    }
    if (message.includes('queue') || message.includes('task')) {
      return 'QUEUE_ERROR';
    }
    
    return 'SYSTEM_ERROR';
  }

  /**
   * Check for critical errors that need immediate attention
   */
  checkCriticalError(category, error) {
    const criticalCategories = ['SYSTEM_ERROR', 'HEADLESS_ERROR'];
    
    if (criticalCategories.includes(category)) {
      console.warn(`🚨 CRITICAL ERROR: ${category} - ${error.message}`);
      
      // Could integrate with external alerting systems here
      // e.g., Slack, email, PagerDuty, etc.
    }
  }

  /**
   * Record headless browser usage
   */
  recordHeadlessBrowserUsage() {
    this.metrics.extraction.headlessBrowserUsage++;
  }

  /**
   * Record cache hit rate
   */
  recordCacheStats(hits, misses) {
    const total = hits + misses;
    this.metrics.extraction.cacheHitRate = total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit() {
    this.metrics.extraction.rateLimitHits++;
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    this.metrics.system.memoryUsage = process.memoryUsage();
    this.metrics.system.cpuUsage = process.cpuUsage();
    this.metrics.system.lastHealthCheck = Date.now();
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const healthChecks = {
        extraction: await this.checkExtractionHealth(),
        headlessBrowser: await this.checkHeadlessBrowserHealth(),
        cache: await this.checkCacheHealth(),
        queue: await this.checkQueueHealth(),
        proxy: await this.checkProxyHealth(),
        system: await this.checkSystemHealth()
      };

      // Update service statuses
      for (const [service, status] of Object.entries(healthChecks)) {
        this.healthStatus.services[service] = status;
      }

      // Determine overall health
      const unhealthyServices = Object.values(this.healthStatus.services)
        .filter(status => status !== 'healthy');
      
      if (unhealthyServices.length === 0) {
        this.healthStatus.overall = 'healthy';
      } else if (unhealthyServices.length <= 2) {
        this.healthStatus.overall = 'degraded';
      } else {
        this.healthStatus.overall = 'unhealthy';
      }

      this.healthStatus.lastUpdated = Date.now();
      this.updateSystemMetrics();

      return this.healthStatus;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.healthStatus.overall = 'error';
      return this.healthStatus;
    }
  }

  /**
   * Check extraction service health
   */
  async checkExtractionHealth() {
    const recentRequests = this.metrics.requests;
    const errorRate = recentRequests.total > 0 ? 
      (recentRequests.failed / recentRequests.total) * 100 : 0;
    
    if (errorRate > 50) return 'unhealthy';
    if (errorRate > 25) return 'degraded';
    return 'healthy';
  }

  /**
   * Check headless browser health
   */
  async checkHeadlessBrowserHealth() {
    try {
      const HeadlessBrowserPool = require('./HeadlessBrowserPool');
      const status = HeadlessBrowserPool.getStatus();
      
      if (status.totalBrowsers === 0) return 'degraded';
      if (status.activeTasks >= status.totalBrowsers * 0.8) return 'busy';
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Check cache health
   */
  async checkCacheHealth() {
    try {
      const CacheManager = require('./CacheManager');
      const stats = CacheManager.getStats();
      
      const hitRate = parseFloat(stats.hitRate);
      if (hitRate < 10) return 'degraded';
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Check queue health
   */
  async checkQueueHealth() {
    try {
      const TaskQueueManager = require('./TaskQueueManager');
      const stats = TaskQueueManager.getQueueStats();
      
      if (stats.totalQueued > 100) return 'busy';
      if (stats.totalQueued > 50) return 'degraded';
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Check proxy health
   */
  async checkProxyHealth() {
    try {
      const ProxyRequestManager = require('./ProxyRequestManager');
      const stats = ProxyRequestManager.getStats();
      
      // Check if any proxy requests are working
      const hasWorkingProxies = Object.values(stats.requestStats)
        .some(stat => stat.success > 0);
      
      if (!hasWorkingProxies && stats.proxiesConfigured > 0) return 'degraded';
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 90) return 'critical';
    if (memUsagePercent > 75) return 'warning';
    return 'healthy';
  }

  /**
   * Start monitoring loops
   */
  startMonitoring() {
    // Health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // System metrics every 10 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 10000);

    // Cleanup old data every 5 minutes
    setInterval(() => {
      this.cleanupOldData();
    }, 300000);

    console.log('📊 Monitoring loops started');
  }

  /**
   * Clean up old monitoring data
   */
  cleanupOldData() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean performance history
    this.metrics.performance.responseTimeHistory = 
      this.metrics.performance.responseTimeHistory.filter(
        entry => entry.time > oneHourAgo
      );

    // Clean recent errors (keep last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics.errors.recentErrors = 
      this.metrics.errors.recentErrors.filter(
        error => error.timestamp > oneDayAgo
      );

    console.log('🧹 Monitoring data cleanup completed');
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      health: this.healthStatus,
      uptime: Date.now() - this.metrics.system.startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Get error summary
   */
  getErrorSummary() {
    const recentErrors = this.metrics.errors.recentErrors.slice(-10);
    
    return {
      total: this.metrics.errors.total,
      byCategory: Object.fromEntries(this.metrics.errors.byCategory),
      recentErrors: recentErrors.map(error => ({
        timestamp: new Date(error.timestamp).toISOString(),
        category: error.category,
        message: error.message,
        context: error.context
      })),
      categoryDescriptions: this.errorCategories
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const recent = this.metrics.performance.responseTimeHistory.slice(-100);
    
    return {
      averageResponseTime: Math.round(this.metrics.performance.averageResponseTime),
      maxResponseTime: this.metrics.performance.maxResponseTime,
      minResponseTime: this.metrics.performance.minResponseTime === Infinity ? 0 : this.metrics.performance.minResponseTime,
      recentSamples: recent.length,
      trend: this.calculatePerformanceTrend()
    };
  }

  /**
   * Calculate performance trend
   */
  calculatePerformanceTrend() {
    const history = this.metrics.performance.responseTimeHistory;
    if (history.length < 10) return 'stable';
    
    const recent10 = history.slice(-10);
    const previous10 = history.slice(-20, -10);
    
    if (previous10.length === 0) return 'stable';
    
    const recentAvg = recent10.reduce((sum, entry) => sum + entry.responseTime, 0) / recent10.length;
    const previousAvg = previous10.reduce((sum, entry) => sum + entry.responseTime, 0) / previous10.length;
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    if (change > 20) return 'degrading';
    if (change < -20) return 'improving';
    return 'stable';
  }

  /**
   * Get success rates by method
   */
  getSuccessRates() {
    const rates = {};
    
    for (const [method, stats] of this.metrics.extraction.methodSuccess.entries()) {
      rates[method] = {
        attempts: stats.attempts,
        successes: stats.successes,
        successRate: stats.attempts > 0 ? 
          ((stats.successes / stats.attempts) * 100).toFixed(2) + '%' : '0%'
      };
    }
    
    return rates;
  }

  /**
   * Export monitoring data for external systems
   */
  exportData() {
    return {
      metrics: this.getMetrics(),
      errors: this.getErrorSummary(),
      performance: this.getPerformanceSummary(),
      successRates: this.getSuccessRates(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Reset metrics (for testing or maintenance)
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byMethod: new Map(),
        byPlatform: new Map(),
        byErrorType: new Map()
      },
      performance: {
        averageResponseTime: 0,
        responseTimeHistory: [],
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      errors: {
        total: 0,
        byCategory: new Map(),
        recentErrors: [],
        maxRecentErrors: 100
      },
      system: {
        startTime: Date.now(),
        lastHealthCheck: Date.now(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      extraction: {
        methodSuccess: new Map(),
        headlessBrowserUsage: 0,
        cacheHitRate: 0,
        rateLimitHits: 0
      }
    };
    
    console.log('📊 Metrics reset');
  }
}

module.exports = new MonitoringService();
