const express = require('express');
const router = express.Router();

// Import services
const InstagramExtractor = require('../services/InstagramExtractor');
const HeadlessBrowserPool = require('../services/HeadlessBrowserPool');
const CacheManager = require('../services/CacheManager');
const TaskQueueManager = require('../services/TaskQueueManager');
const ProxyRequestManager = require('../services/ProxyRequestManager');
const MonitoringService = require('../services/MonitoringService');

console.log('📸 Instagram API routes loading...');

// Simple test route to verify loading
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Instagram routes are working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * Instagram Media Extraction API - StorySaver.net Style
 * 
 * Complete workflow:
 * 1. URL validation and parsing
 * 2. Cache check
 * 3. Rate limiting
 * 4. Multiple extraction methods
 * 5. Headless browser fallback
 * 6. Response caching
 * 7. Error handling
 */

// Helper function to get client IP
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

// Helper function to determine content type
function getContentType(url) {
  if (url.includes('/stories/')) return 'instagram-story';
  if (url.includes('/reel/')) return 'instagram-reel';
  if (url.includes('/p/')) return 'instagram-post';
  if (url.includes('/tv/')) return 'instagram-igtv';
  return 'instagram-unknown';
}

/**
 * POST /api/instagram/extract
 * Main extraction endpoint - comprehensive Instagram media extraction
 */
router.post('/extract', async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  try {
    const { url, options = {} } = req.body;
    
    console.log(`📸 Instagram extraction request from ${clientIP}:`, url);
    
    // Validation
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    if (!InstagramExtractor.isValidInstagramUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URL format',
        code: 'INVALID_URL',
        supportedFormats: [
          'https://www.instagram.com/p/[shortcode]/',
          'https://www.instagram.com/reel/[shortcode]/',
          'https://www.instagram.com/stories/[username]/[story_id]/',
          'https://www.instagram.com/tv/[shortcode]/'
        ]
      });
    }

    // Check cache first
    const cachedResult = CacheManager.getCachedInstagramResult(url);
    if (cachedResult && !options.bypassCache) {
      console.log(`✅ Cache hit for: ${url}`);
      return res.json({
        success: true,
        cached: true,
        extractedAt: cachedResult.metadata?.timestamp,
        processingTime: Date.now() - startTime,
        ...cachedResult
      });
    }

    // Get rate limit status
    const rateLimitStatus = TaskQueueManager.getRateLimitStatus(clientIP);
    
    // Check if we should use queue for this request
    const contentType = getContentType(url);
    const useQueue = options.async || contentType === 'instagram-story' || options.enableHeadless;

    if (useQueue) {
      // Add to task queue
      try {
        const taskInfo = await TaskQueueManager.addTask('instagram-extract', {
          url,
          options,
          contentType
        }, {
          clientIP,
          priority: options.priority || 'normal',
          metadata: { userAgent: req.headers['user-agent'] }
        });

        return res.status(202).json({
          success: true,
          queued: true,
          taskId: taskInfo.taskId,
          queuePosition: taskInfo.queuePosition,
          estimatedWaitTime: taskInfo.estimatedWaitTime,
          message: 'Task queued for processing. Use /status endpoint to check progress.',
          statusEndpoint: `/api/instagram/status/${taskInfo.taskId}`
        });

      } catch (error) {
        if (error.message.includes('Rate limit')) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            rateLimits: rateLimitStatus,
            retryAfter: 60 // seconds
          });
        }
        throw error;
      }
    }

    // Direct processing (synchronous)
    console.log('⚡ Processing Instagram extraction directly...');

    const extractionResult = await InstagramExtractor.extractMedia(url);

    // Record monitoring metrics
    const processingTime = Date.now() - startTime;
    const success = extractionResult && extractionResult.mediaItems && extractionResult.mediaItems.some(item => item.downloadable);
    MonitoringService.recordRequest('Instagram', extractionResult?.metadata?.extractionMethod || 'unknown', success, processingTime, success ? null : new Error('No downloadable media found'));
    
    // If extraction failed and headless is not disabled, try headless fallback
    if ((!extractionResult || !extractionResult.mediaItems || extractionResult.mediaItems.length === 0 ||
         !extractionResult.mediaItems.some(item => item.downloadable)) &&
        !options.disableHeadless) {
      
      console.log('🎬 Attempting headless browser fallback...');
      console.log('🔍 Extraction result was:', extractionResult ? 'object' : 'null');

      try {
        const headlessResult = await HeadlessBrowserPool.extractInstagramContent(url, {
          timeout: 15000,  // Reduced from 20s to 15s
          ...options
        });

        if (headlessResult.success) {
          // Format headless result to match standard format
          const formattedResult = {
            title: `Instagram ${contentType.replace('instagram-', '')}`,
            description: 'Extracted using headless browser',
            type: contentType.replace('instagram-', ''),
            mediaItems: [{
              type: headlessResult.mediaType,
              url: headlessResult.mediaUrl,
              thumbnail: headlessResult.mediaType === 'video' ? headlessResult.mediaUrl : headlessResult.mediaUrl,
              width: headlessResult.width || 1080,
              height: headlessResult.height || 1920,
              downloadable: true,
              filename: `instagram_${headlessResult.mediaType}_${Date.now()}.${headlessResult.mediaType === 'video' ? 'mp4' : 'jpg'}`,
              source: 'headless-browser'
            }],
            metadata: {
              extractionMethod: 'headless-browser-fallback',
              timestamp: new Date().toISOString(),
              success: true,
              processingTime: Date.now() - startTime,
              headlessInfo: {
                totalUrlsFound: headlessResult.totalUrlsFound,
                source: headlessResult.source
              }
            }
          };

          console.log('📊 Headless browser result:', {
            success: true,
            mediaUrl: headlessResult.mediaUrl,
            mediaType: headlessResult.mediaType,
            hasValidUrl: headlessResult.mediaUrl && headlessResult.mediaUrl.length > 10
          });

          // Cache the successful result
          CacheManager.cacheInstagramResult(url, formattedResult, contentType);

          return res.json({
            success: true,
            processingTime: Date.now() - startTime,
            method: 'headless-browser',
            ...formattedResult
          });
        }
      } catch (headlessError) {
        console.warn('🎬 Headless browser fallback failed:', headlessError.message);
      }
    }

    // Cache the result (even if failed, to avoid repeated requests)
    if (extractionResult) {
      const cacheType = extractionResult.mediaItems && extractionResult.mediaItems.some(item => item.downloadable) ? 
                       contentType : 'instagram-error';
      CacheManager.cacheInstagramResult(url, extractionResult, cacheType);
    }

    // Format response
    const hasDownloadableMedia = extractionResult.mediaItems &&
      extractionResult.mediaItems.some(item => item.downloadable && item.url && item.url.length > 10);

    const response = {
      success: hasDownloadableMedia,
      processingTime: Date.now() - startTime,
      method: extractionResult.metadata?.extractionMethod || 'multi-method',
      ...extractionResult
    };

    // Add debug information
    console.log('📊 Server response analysis:', {
      success: response.success,
      hasMediaItems: !!extractionResult.mediaItems,
      mediaItemsCount: extractionResult.mediaItems?.length || 0,
      hasDownloadableMedia: hasDownloadableMedia,
      extractionMethod: extractionResult.metadata?.extractionMethod,
      mediaItems: extractionResult.mediaItems?.map(item => ({
        type: item.type,
        downloadable: item.downloadable,
        hasUrl: !!item.url,
        urlLength: item.url?.length || 0,
        source: item.source
      }))
    });

    // Add metadata
    response.metadata = {
      ...response.metadata,
      processingTime: Date.now() - startTime,
      clientIP: clientIP.replace(/\d+$/, 'xxx'), // Anonymize IP
      rateLimits: rateLimitStatus
    };

    const statusCode = response.success ? 200 : 404;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('❌ Instagram extraction error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Extraction failed',
      code: 'EXTRACTION_ERROR',
      message: error.message,
      processingTime: Date.now() - startTime,
      troubleshooting: [
        'Verify the Instagram URL is correct and accessible',
        'Check if the content is public (private accounts are not supported)',
        'For stories, ensure they have not expired (24-hour limit)',
        'Try again in a few minutes if rate limits were hit'
      ]
    });
  }
});

/**
 * GET /api/instagram/status/:taskId
 * Check task status for queued extractions
 */
router.get('/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const taskStatus = TaskQueueManager.getTaskStatus(taskId);
    
    if (!taskStatus) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    const response = {
      success: true,
      taskId: taskId,
      status: taskStatus.status,
      createdAt: new Date(taskStatus.createdAt).toISOString(),
      metadata: {
        type: taskStatus.type,
        retryCount: taskStatus.retryCount,
        maxRetries: taskStatus.maxRetries
      }
    };

    // Add status-specific information
    switch (taskStatus.status) {
      case 'queued':
        const position = TaskQueueManager.getQueuePosition(taskId);
        response.queue = position;
        response.estimatedWaitTime = TaskQueueManager.estimateWaitTime(position?.queue);
        break;
        
      case 'processing':
        response.startedAt = new Date(taskStatus.startedAt).toISOString();
        response.processingTime = Date.now() - taskStatus.startedAt;
        break;
        
      case 'completed':
        response.completedAt = new Date(taskStatus.completedAt).toISOString();
        response.processingTime = taskStatus.completedAt - taskStatus.startedAt;
        response.result = taskStatus.result;
        break;
        
      case 'failed':
        response.failedAt = new Date(taskStatus.failedAt).toISOString();
        response.error = taskStatus.error;
        if (taskStatus.retryCount < taskStatus.maxRetries) {
          response.nextRetryAt = new Date(taskStatus.scheduledAt).toISOString();
        }
        break;
    }

    res.json(response);

  } catch (error) {
    console.error('�� Task status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get task status',
      code: 'STATUS_ERROR'
    });
  }
});

/**
 * POST /api/instagram/batch
 * Batch extraction for multiple URLs
 */
router.post('/batch', async (req, res) => {
  const clientIP = getClientIP(req);
  
  try {
    const { urls, options = {} } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required',
        code: 'MISSING_URLS'
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 URLs allowed per batch',
        code: 'BATCH_LIMIT_EXCEEDED'
      });
    }

    // Validate all URLs
    const invalidUrls = urls.filter(url => !InstagramExtractor.isValidInstagramUrl(url));
    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URLs found',
        code: 'INVALID_URLS',
        invalidUrls
      });
    }

    // Add batch task to queue
    const taskInfo = await TaskQueueManager.addTask('batch-process', {
      items: urls.map(url => ({ url, options }))
    }, {
      clientIP,
      priority: 'low',
      metadata: { batchSize: urls.length }
    });

    res.status(202).json({
      success: true,
      queued: true,
      taskId: taskInfo.taskId,
      batchSize: urls.length,
      queuePosition: taskInfo.queuePosition,
      estimatedWaitTime: taskInfo.estimatedWaitTime,
      message: 'Batch task queued for processing',
      statusEndpoint: `/api/instagram/status/${taskInfo.taskId}`
    });

  } catch (error) {
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for batch processing',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    console.error('❌ Batch processing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Batch processing failed',
      code: 'BATCH_ERROR'
    });
  }
});

/**
 * GET /api/instagram/info
 * Get Instagram media information without downloading
 */
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required',
        code: 'MISSING_URL'
      });
    }

    if (!InstagramExtractor.isValidInstagramUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URL',
        code: 'INVALID_URL'
      });
    }

    // Try cache first
    const cached = CacheManager.getCachedInstagramResult(url);
    if (cached) {
      const info = {
        success: true,
        cached: true,
        type: cached.type,
        title: cached.title,
        description: cached.description,
        username: cached.username,
        mediaCount: cached.mediaItems ? cached.mediaItems.length : 0,
        hasDownloadableMedia: cached.mediaItems ? cached.mediaItems.some(item => item.downloadable) : false,
        extractionMethod: cached.metadata?.extractionMethod,
        extractedAt: cached.metadata?.timestamp
      };
      
      return res.json(info);
    }

    // Quick extraction for info only
    const result = await InstagramExtractor.extractMedia(url);
    
    const info = {
      success: true,
      type: result.type,
      title: result.title,
      description: result.description,
      username: result.username,
      mediaCount: result.mediaItems ? result.mediaItems.length : 0,
      hasDownloadableMedia: result.mediaItems ? result.mediaItems.some(item => item.downloadable) : false,
      extractionMethod: result.metadata?.extractionMethod
    };

    res.json(info);

  } catch (error) {
    console.error('❌ Info extraction error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get media info',
      code: 'INFO_ERROR'
    });
  }
});

/**
 * GET /api/instagram/validate
 * Validate Instagram URL format
 */
router.get('/validate', (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }

    const isValid = InstagramExtractor.isValidInstagramUrl(url);
    const mediaType = InstagramExtractor.detectMediaType(url);
    
    const validation = {
      success: true,
      url: url,
      valid: isValid,
      mediaType: mediaType,
      supported: isValid
    };

    if (isValid) {
      validation.features = {
        cacheable: true,
        extractable: true,
        headlessSupport: mediaType === 'story',
        batchSupport: true
      };
      
      if (mediaType === 'story') {
        validation.limitations = [
          'Stories expire after 24 hours',
          'Private account stories are not accessible',
          'May require headless browser extraction'
        ];
      }
    }

    res.json(validation);

  } catch (error) {
    console.error('❌ URL validation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
});

/**
 * GET /api/instagram/health
 * Service health and statistics
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await MonitoringService.performHealthCheck();
    const queueStats = TaskQueueManager.getQueueStats();
    const cacheStats = CacheManager.getStats();
    const browserPoolStatus = HeadlessBrowserPool.getStatus();
    const proxyStats = ProxyRequestManager.getStats();
    const monitoringMetrics = MonitoringService.getMetrics();

    const health = {
      status: healthStatus.overall,
      timestamp: new Date().toISOString(),
      services: {
        extraction: {
          status: healthStatus.services.extraction,
          methods: ['meta-tags', 'json-ld', 'graphql', 'embed-api', 'mobile-api'],
          successRates: MonitoringService.getSuccessRates()
        },
        headlessBrowser: {
          status: healthStatus.services.headlessBrowser,
          browsers: browserPoolStatus.totalBrowsers,
          activeTasks: browserPoolStatus.activeTasks,
          usage: monitoringMetrics.extraction.headlessBrowserUsage
        },
        cache: {
          status: healthStatus.services.cache,
          hitRate: cacheStats.hitRate,
          entries: cacheStats.entries,
          memoryUsage: cacheStats.memoryUsage
        },
        queue: {
          status: healthStatus.services.queue,
          totalQueued: queueStats.totalQueued,
          activeTasks: queueStats.activeTasks,
          tasksProcessed: queueStats.tasksProcessed
        },
        proxy: {
          status: healthStatus.services.proxy,
          proxiesConfigured: proxyStats.proxiesConfigured,
          requestStats: proxyStats.requestStats
        },
        monitoring: {
          status: 'operational',
          uptime: monitoringMetrics.uptime,
          totalRequests: monitoringMetrics.requests.total,
          errorRate: monitoringMetrics.requests.total > 0 ?
            ((monitoringMetrics.requests.failed / monitoringMetrics.requests.total) * 100).toFixed(2) + '%' : '0%'
        }
      },
      performance: MonitoringService.getPerformanceSummary(),
      errors: MonitoringService.getErrorSummary()
    };

    res.json(health);

  } catch (error) {
    console.error('❌ Health check error:', error.message);
    MonitoringService.recordError(error, { endpoint: '/health' });
    res.status(500).json({
      status: 'error',
      error: 'Health check failed'
    });
  }
});

/**
 * DELETE /api/instagram/cache
 * Clear cache (admin endpoint)
 */
router.delete('/cache', async (req, res) => {
  try {
    const { pattern, confirm } = req.query;
    
    if (!confirm || confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Cache clear requires confirmation',
        usage: 'Add ?confirm=true to confirm cache clear'
      });
    }

    let clearedCount;
    
    if (pattern) {
      clearedCount = CacheManager.invalidatePattern(pattern);
    } else {
      clearedCount = CacheManager.clear();
    }

    res.json({
      success: true,
      message: `Cache cleared: ${clearedCount} entries removed`,
      clearedCount,
      pattern: pattern || 'all'
    });

  } catch (error) {
    console.error('❌ Cache clear error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Cache clear failed'
    });
  }
});

/**
 * GET /api/instagram/stats
 * Detailed service statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = {
      monitoring: MonitoringService.getMetrics(),
      queue: TaskQueueManager.getQueueStats(),
      cache: CacheManager.getStats(),
      browserPool: HeadlessBrowserPool.getStatus(),
      proxy: ProxyRequestManager.getStats(),
      performance: MonitoringService.getPerformanceSummary(),
      errors: MonitoringService.getErrorSummary(),
      successRates: MonitoringService.getSuccessRates()
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats
    });

  } catch (error) {
    console.error('❌ Stats error:', error.message);
    MonitoringService.recordError(error, { endpoint: '/stats' });
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Initialize browser pool on startup
HeadlessBrowserPool.initializePool().catch(error => {
  console.warn('⚠️ Failed to initialize browser pool:', error.message);
});

console.log('📸 Instagram API routes loaded successfully');
console.log('�� Available endpoints:');
console.log('  POST /api/instagram/extract - Main extraction endpoint');
console.log('  GET  /api/instagram/status/:taskId - Task status');
console.log('  POST /api/instagram/batch - Batch processing');
console.log('  GET  /api/instagram/info - Media information');
console.log('  GET  /api/instagram/validate - URL validation');
console.log('  GET  /api/instagram/health - Service health');
console.log('  GET  /api/instagram/stats - Service statistics');
console.log('  DELETE /api/instagram/cache - Clear cache');

module.exports = router;
