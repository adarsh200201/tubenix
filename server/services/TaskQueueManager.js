/**
 * Task Queue Manager - Rate Limiting and Queue System
 * 
 * Manages task queuing and rate limiting for Instagram extraction:
 * - Priority-based task queuing
 * - Rate limiting per IP and globally
 * - Queue management for headless browser tasks
 * - Task retry logic with exponential backoff
 * - Concurrent task limiting
 * - Task monitoring and statistics
 */
class TaskQueueManager {
  constructor() {
    // Queue configuration
    this.queues = {
      high: [],      // High priority (API requests, quick extraction)
      normal: [],    // Normal priority (standard requests)
      low: [],       // Low priority (batch processing)
      headless: []   // Headless browser tasks (most expensive)
    };
    
    // Rate limiting configuration
    this.rateLimits = {
      global: {
        maxRequests: parseInt(process.env.GLOBAL_RATE_LIMIT) || 100,
        windowMs: parseInt(process.env.GLOBAL_RATE_WINDOW) || 60000, // 1 minute
        requests: [],
        blocked: false
      },
      perIP: {
        maxRequests: parseInt(process.env.IP_RATE_LIMIT) || 10,
        windowMs: parseInt(process.env.IP_RATE_WINDOW) || 60000, // 1 minute
        ips: new Map() // IP -> { requests: [], blocked: boolean }
      },
      headless: {
        maxConcurrent: parseInt(process.env.HEADLESS_MAX_CONCURRENT) || 3,
        maxPerMinute: parseInt(process.env.HEADLESS_RATE_LIMIT) || 20,
        windowMs: 60000,
        requests: [],
        activeTasks: 0
      }
    };
    
    // Processing configuration
    this.processing = {
      isRunning: false,
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS) || 5,
      activeTasks: new Map(),
      processInterval: parseInt(process.env.QUEUE_PROCESS_INTERVAL) || 100 // ms
    };

    // Task storage for completed/failed tasks (with TTL cleanup)
    this.completedTasks = new Map(); // taskId -> task with result
    this.taskTTL = 30 * 60 * 1000; // 30 minutes TTL for completed tasks
    
    // Task configuration
    this.taskConfig = {
      defaultTimeout: parseInt(process.env.TASK_TIMEOUT) || 30000, // 30 seconds
      maxRetries: parseInt(process.env.TASK_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.TASK_RETRY_DELAY) || 1000, // 1 second base delay
      priorities: {
        'instagram-extract': 'normal',
        'headless-extract': 'low',
        'api-request': 'high',
        'batch-process': 'low'
      }
    };
    
    // Statistics
    this.stats = {
      tasksProcessed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksRetried: 0,
      tasksQueued: 0,
      rateLimitHits: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };
    
    // Start processing
    this.startProcessing();
    
    console.log('🚦 Task Queue Manager initialized');
    console.log(`📊 Rate limits - Global: ${this.rateLimits.global.maxRequests}/min, Per IP: ${this.rateLimits.perIP.maxRequests}/min`);
    console.log(`🎯 Max concurrent: ${this.processing.maxConcurrent}, Headless concurrent: ${this.rateLimits.headless.maxConcurrent}`);
  }

  /**
   * Add task to queue
   */
  async addTask(taskType, data, options = {}) {
    const taskId = this.generateTaskId();
    const clientIP = options.clientIP || 'unknown';
    
    // Check rate limits
    if (!this.checkRateLimit(clientIP, taskType)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Determine priority and queue
    const priority = options.priority || this.taskConfig.priorities[taskType] || 'normal';
    const queueName = taskType === 'headless-extract' ? 'headless' : priority;
    
    const task = {
      id: taskId,
      type: taskType,
      data: data,
      priority: priority,
      clientIP: clientIP,
      createdAt: Date.now(),
      scheduledAt: options.scheduledAt || Date.now(),
      timeout: options.timeout || this.taskConfig.defaultTimeout,
      maxRetries: options.maxRetries || this.taskConfig.maxRetries,
      retryCount: 0,
      retryDelay: this.taskConfig.retryDelay,
      status: 'queued',
      metadata: options.metadata || {}
    };
    
    // Add to appropriate queue
    this.queues[queueName].push(task);
    
    // Sort queue by priority and creation time
    this.sortQueue(queueName);
    
    this.stats.tasksQueued++;
    
    console.log(`📋 Task queued: ${taskId} (${taskType}) in ${queueName} queue`);
    
    return {
      taskId: taskId,
      queuePosition: this.getQueuePosition(taskId),
      estimatedWaitTime: this.estimateWaitTime(queueName)
    };
  }

  /**
   * Check if request is within rate limits
   */
  checkRateLimit(clientIP, taskType) {
    const now = Date.now();
    
    // Check global rate limit
    if (!this.checkGlobalRateLimit(now)) {
      this.stats.rateLimitHits++;
      return false;
    }
    
    // Check per-IP rate limit
    if (!this.checkIPRateLimit(clientIP, now)) {
      this.stats.rateLimitHits++;
      return false;
    }
    
    // Check headless-specific rate limit
    if (taskType === 'headless-extract' && !this.checkHeadlessRateLimit(now)) {
      this.stats.rateLimitHits++;
      return false;
    }
    
    return true;
  }

  /**
   * Check global rate limit
   */
  checkGlobalRateLimit(now) {
    const global = this.rateLimits.global;
    
    // Clean old requests
    global.requests = global.requests.filter(time => now - time < global.windowMs);
    
    // Check if limit exceeded
    if (global.requests.length >= global.maxRequests) {
      return false;
    }
    
    // Add current request
    global.requests.push(now);
    return true;
  }

  /**
   * Check per-IP rate limit
   */
  checkIPRateLimit(clientIP, now) {
    const perIP = this.rateLimits.perIP;
    
    if (!perIP.ips.has(clientIP)) {
      perIP.ips.set(clientIP, { requests: [], blocked: false });
    }
    
    const ipData = perIP.ips.get(clientIP);
    
    // Clean old requests
    ipData.requests = ipData.requests.filter(time => now - time < perIP.windowMs);
    
    // Check if limit exceeded
    if (ipData.requests.length >= perIP.maxRequests) {
      ipData.blocked = true;
      return false;
    }
    
    // Add current request
    ipData.requests.push(now);
    ipData.blocked = false;
    return true;
  }

  /**
   * Check headless browser rate limit
   */
  checkHeadlessRateLimit(now) {
    const headless = this.rateLimits.headless;
    
    // Check concurrent limit
    if (headless.activeTasks >= headless.maxConcurrent) {
      return false;
    }
    
    // Clean old requests
    headless.requests = headless.requests.filter(time => now - time < headless.windowMs);
    
    // Check rate limit
    if (headless.requests.length >= headless.maxPerMinute) {
      return false;
    }
    
    return true;
  }

  /**
   * Start queue processing
   */
  startProcessing() {
    if (this.processing.isRunning) {
      return;
    }
    
    this.processing.isRunning = true;
    
    const processLoop = async () => {
      try {
        await this.processQueues();
      } catch (error) {
        console.error('❌ Queue processing error:', error.message);
      }
      
      if (this.processing.isRunning) {
        setTimeout(processLoop, this.processing.processInterval);
      }
    };
    
    processLoop();
    console.log('▶️ Queue processing started');
  }

  /**
   * Stop queue processing
   */
  stopProcessing() {
    this.processing.isRunning = false;
    console.log('⏸️ Queue processing stopped');
  }

  /**
   * Process all queues
   */
  async processQueues() {
    // Check if we can process more tasks
    if (this.processing.activeTasks.size >= this.processing.maxConcurrent) {
      return;
    }
    
    // Process queues in priority order
    const queueOrder = ['high', 'normal', 'headless', 'low'];
    
    for (const queueName of queueOrder) {
      const queue = this.queues[queueName];
      
      if (queue.length === 0) {
        continue;
      }
      
      // Check queue-specific limits
      if (queueName === 'headless' && this.rateLimits.headless.activeTasks >= this.rateLimits.headless.maxConcurrent) {
        continue;
      }
      
      // Get next task
      const task = queue.shift();
      
      if (!task) {
        continue;
      }
      
      // Check if it's time to process this task
      if (Date.now() < task.scheduledAt) {
        // Put it back and try later
        queue.unshift(task);
        continue;
      }
      
      // Process the task
      this.processTask(task);
      
      // Only process one task per loop to maintain fairness
      break;
    }
  }

  /**
   * Process individual task
   */
  async processTask(task) {
    const startTime = Date.now();
    task.status = 'processing';
    task.startedAt = startTime;
    
    // Add to active tasks
    this.processing.activeTasks.set(task.id, task);
    
    // Update headless counter if needed
    if (task.type === 'headless-extract') {
      this.rateLimits.headless.activeTasks++;
      this.rateLimits.headless.requests.push(startTime);
    }
    
    this.stats.tasksProcessed++;
    
    console.log(`⚡ Processing task: ${task.id} (${task.type})`);
    
    try {
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeout);
      });
      
      // Execute task
      const resultPromise = this.executeTask(task);
      const result = await Promise.race([resultPromise, timeoutPromise]);
      
      // Task completed successfully
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      
      const processingTime = task.completedAt - startTime;
      this.updateAverageProcessingTime(processingTime);
      
      this.stats.tasksCompleted++;
      
      console.log(`✅ Task completed: ${task.id} (${processingTime}ms)`);

      // Store completed task for status lookup
      this.storeCompletedTask(task);

    } catch (error) {
      console.error(`❌ Task failed: ${task.id} - ${error.message}`);

      // Handle task failure
      await this.handleTaskFailure(task, error);
    } finally {
      // Remove from active tasks
      this.processing.activeTasks.delete(task.id);

      // Update headless counter if needed
      if (task.type === 'headless-extract') {
        this.rateLimits.headless.activeTasks--;
      }
    }
  }

  /**
   * Execute task based on type
   */
  async executeTask(task) {
    switch (task.type) {
      case 'instagram-extract':
        return await this.executeInstagramExtraction(task);
      
      case 'headless-extract':
        return await this.executeHeadlessExtraction(task);
      
      case 'api-request':
        return await this.executeAPIRequest(task);
      
      case 'batch-process':
        return await this.executeBatchProcess(task);
      
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Execute Instagram extraction task
   */
  async executeInstagramExtraction(task) {
    const InstagramExtractor = require('./InstagramExtractor');
    const HeadlessBrowserPool = require('./HeadlessBrowserPool');
    const CacheManager = require('./CacheManager');

    const { url, options = {} } = task.data;
    const startTime = Date.now();

    console.log('🎯 Starting Instagram extraction for:', url);

    // Try regular extraction first
    const extractionResult = await InstagramExtractor.extractMedia(url);

    // Parse URL to determine content type
    const contentType = InstagramExtractor.detectMediaType(url);

    // Create basic URL info for username extraction
    let username = null;
    try {
      const urlObj = new URL(url);
      const storyMatch = urlObj.pathname.match(/\/stories\/([^\/]+)\/(\d+)/);
      if (storyMatch) {
        username = storyMatch[1];
      }
    } catch (error) {
      // ignore URL parsing errors
    }

    // If extraction failed and it's a story or reel, try headless browser fallback
    if ((!extractionResult || !extractionResult.mediaItems || extractionResult.mediaItems.length === 0 ||
         !extractionResult.mediaItems.some(item => item.downloadable)) &&
        (contentType === 'story' || contentType === 'reel') &&
        options.enableHeadless !== false) {

      console.log('🎬 Attempting headless browser fallback for story/reel...');

      try {
        const headlessResult = await HeadlessBrowserPool.extractInstagramContent(url, {
          timeout: 15000,
          ...options
        });

        if (headlessResult.success) {
          // Format headless result to match standard format
          const formattedResult = {
            title: `Instagram ${contentType}`,
            description: 'Extracted using headless browser',
            type: contentType,
            username: username,
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

          // Cache the successful result
          if (CacheManager && CacheManager.cacheInstagramResult) {
            CacheManager.cacheInstagramResult(url, formattedResult, contentType);
          }

          console.log('✅ Headless browser fallback successful');
          return formattedResult;
        }
      } catch (headlessError) {
        console.warn('🎬 Headless browser fallback failed:', headlessError.message);
      }
    }

    // Return original result or create fallback response
    if (extractionResult) {
      return extractionResult;
    }

    // Create fallback response for failed extractions
    return {
      title: contentType === 'story' ? `Instagram Story` : 'Instagram Media',
      description: contentType === 'story' ? 'Story may have expired (24-hour limit)' : 'Media extraction unsuccessful',
      type: contentType,
      username: username,
      mediaItems: [{
        type: 'unknown',
        url: '',
        thumbnail: '',
        downloadable: false,
        filename: '',
        width: 1080,
        height: 1080,
        note: contentType === 'story' ?
          'Instagram Story could not be extracted - likely expired (stories last only 24 hours)' :
          'Content could not be extracted - may be private, expired, or protected',
        source: 'fallback'
      }],
      metadata: {
        extractionMethod: 'fallback',
        timestamp: new Date().toISOString(),
        success: false,
        reason: contentType === 'story' ? 'Story likely expired (24h limit)' : 'All extraction methods failed',
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Execute headless browser extraction task
   */
  async executeHeadlessExtraction(task) {
    const HeadlessBrowserPool = require('./HeadlessBrowserPool');
    return await HeadlessBrowserPool.extractInstagramContent(task.data.url, task.data.options);
  }

  /**
   * Execute API request task
   */
  async executeAPIRequest(task) {
    const ProxyRequestManager = require('./ProxyRequestManager');
    return await ProxyRequestManager.makeRequest(task.data.url, task.data.options);
  }

  /**
   * Execute batch processing task
   */
  async executeBatchProcess(task) {
    const results = [];
    
    for (const item of task.data.items) {
      try {
        const result = await this.executeInstagramExtraction({ data: item });
        results.push({ success: true, data: result, item });
      } catch (error) {
        results.push({ success: false, error: error.message, item });
      }
    }
    
    return results;
  }

  /**
   * Handle task failure and retry logic
   */
  async handleTaskFailure(task, error) {
    task.status = 'failed';
    task.failedAt = Date.now();
    task.error = error.message;
    
    // Check if we should retry
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = 'queued';
      
      // Calculate exponential backoff delay
      const delay = task.retryDelay * Math.pow(2, task.retryCount - 1);
      task.scheduledAt = Date.now() + delay;
      
      // Determine queue for retry (lower priority)
      const queueName = task.priority === 'high' ? 'normal' : 'low';
      
      // Re-queue the task
      this.queues[queueName].push(task);
      this.sortQueue(queueName);
      
      this.stats.tasksRetried++;
      
      console.log(`🔄 Task retry ${task.retryCount}/${task.maxRetries}: ${task.id} (delay: ${delay}ms)`);
    } else {
      this.stats.tasksFailed++;
      console.log(`💀 Task permanently failed: ${task.id} - ${error.message}`);

      // Store permanently failed task for status lookup
      this.storeCompletedTask(task);
    }
  }

  /**
   * Store completed or failed task for status lookup
   */
  storeCompletedTask(task) {
    // Store with TTL
    this.completedTasks.set(task.id, {
      ...task,
      storedAt: Date.now()
    });

    // Clean up old completed tasks (TTL cleanup)
    this.cleanupCompletedTasks();
  }

  /**
   * Clean up old completed tasks that exceed TTL
   */
  cleanupCompletedTasks() {
    const now = Date.now();
    for (const [taskId, task] of this.completedTasks.entries()) {
      if (now - task.storedAt > this.taskTTL) {
        this.completedTasks.delete(taskId);
      }
    }
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Sort queue by priority and creation time
   */
  sortQueue(queueName) {
    this.queues[queueName].sort((a, b) => {
      // First by scheduled time
      if (a.scheduledAt !== b.scheduledAt) {
        return a.scheduledAt - b.scheduledAt;
      }
      // Then by creation time
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Get task position in queue
   */
  getQueuePosition(taskId) {
    for (const [queueName, queue] of Object.entries(this.queues)) {
      const position = queue.findIndex(task => task.id === taskId);
      if (position !== -1) {
        return { queue: queueName, position: position + 1 };
      }
    }
    return null;
  }

  /**
   * Estimate wait time for queue
   */
  estimateWaitTime(queueName) {
    const queue = this.queues[queueName];
    const avgProcessingTime = this.stats.averageProcessingTime || 5000; // Default 5 seconds
    
    return queue.length * avgProcessingTime;
  }

  /**
   * Update average processing time
   */
  updateAverageProcessingTime(newTime) {
    if (this.stats.averageProcessingTime === 0) {
      this.stats.averageProcessingTime = newTime;
    } else {
      // Exponential moving average
      this.stats.averageProcessingTime = this.stats.averageProcessingTime * 0.9 + newTime * 0.1;
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    // Check active tasks
    if (this.processing.activeTasks.has(taskId)) {
      return this.processing.activeTasks.get(taskId);
    }

    // Check completed/failed tasks
    if (this.completedTasks.has(taskId)) {
      return this.completedTasks.get(taskId);
    }

    // Check queues
    for (const queue of Object.values(this.queues)) {
      const task = queue.find(t => t.id === taskId);
      if (task) {
        return task;
      }
    }

    return null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const queueSizes = {};
    let totalQueued = 0;
    
    for (const [name, queue] of Object.entries(this.queues)) {
      queueSizes[name] = queue.length;
      totalQueued += queue.length;
    }
    
    return {
      queues: queueSizes,
      totalQueued,
      activeTasks: this.processing.activeTasks.size,
      maxConcurrent: this.processing.maxConcurrent,
      headlessActive: this.rateLimits.headless.activeTasks,
      headlessMaxConcurrent: this.rateLimits.headless.maxConcurrent,
      ...this.stats,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(clientIP = null) {
    const now = Date.now();
    
    const status = {
      global: {
        current: this.rateLimits.global.requests.filter(time => now - time < this.rateLimits.global.windowMs).length,
        limit: this.rateLimits.global.maxRequests,
        resetIn: this.rateLimits.global.windowMs
      },
      headless: {
        concurrent: this.rateLimits.headless.activeTasks,
        maxConcurrent: this.rateLimits.headless.maxConcurrent,
        current: this.rateLimits.headless.requests.filter(time => now - time < this.rateLimits.headless.windowMs).length,
        limit: this.rateLimits.headless.maxPerMinute
      }
    };
    
    if (clientIP && this.rateLimits.perIP.ips.has(clientIP)) {
      const ipData = this.rateLimits.perIP.ips.get(clientIP);
      status.ip = {
        current: ipData.requests.filter(time => now - time < this.rateLimits.perIP.windowMs).length,
        limit: this.rateLimits.perIP.maxRequests,
        blocked: ipData.blocked
      };
    }
    
    return status;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId) {
    // Remove from queues
    for (const queue of Object.values(this.queues)) {
      const index = queue.findIndex(task => task.id === taskId);
      if (index !== -1) {
        const task = queue.splice(index, 1)[0];
        task.status = 'cancelled';
        task.cancelledAt = Date.now();
        console.log(`❌ Task cancelled: ${taskId}`);
        return true;
      }
    }
    
    // Check if it's currently processing (can't cancel)
    if (this.processing.activeTasks.has(taskId)) {
      console.log(`⚠️ Cannot cancel active task: ${taskId}`);
      return false;
    }
    
    return false;
  }

  /**
   * Clear queue
   */
  clearQueue(queueName = null) {
    if (queueName && this.queues[queueName]) {
      const count = this.queues[queueName].length;
      this.queues[queueName] = [];
      console.log(`🧹 Cleared ${queueName} queue: ${count} tasks removed`);
      return count;
    } else if (!queueName) {
      let totalCount = 0;
      for (const [name, queue] of Object.entries(this.queues)) {
        totalCount += queue.length;
        this.queues[name] = [];
      }
      console.log(`🧹 Cleared all queues: ${totalCount} tasks removed`);
      return totalCount;
    }
    
    return 0;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const stats = this.getQueueStats();
    const now = Date.now();
    
    return {
      status: 'healthy',
      timestamp: now,
      uptime: stats.uptime,
      queues: {
        healthy: stats.totalQueued < 100, // Arbitrary threshold
        sizes: stats.queues,
        processing: stats.activeTasks > 0
      },
      rateLimits: {
        healthy: this.stats.rateLimitHits < this.stats.tasksProcessed * 0.1, // Less than 10% rate limit hits
        hits: this.stats.rateLimitHits
      },
      performance: {
        avgProcessingTime: Math.round(this.stats.averageProcessingTime),
        successRate: this.stats.tasksProcessed > 0 ? 
          ((this.stats.tasksCompleted / this.stats.tasksProcessed) * 100).toFixed(2) + '%' : '0%'
      }
    };
  }
}

module.exports = new TaskQueueManager();
