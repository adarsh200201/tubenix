/**
 * Cache Manager - In-Memory Cache with TTL
 * 
 * Provides Redis-like caching functionality without requiring external dependencies.
 * Features:
 * - TTL (Time To Live) support
 * - Automatic cleanup of expired entries
 * - Memory usage monitoring
 * - Different TTL strategies for different content types
 * - LRU eviction when memory limit is reached
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map(); // Store setTimeout references for TTL cleanup
    
    // Configuration
    this.maxMemoryMB = parseInt(process.env.CACHE_MAX_MEMORY_MB) || 100;
    this.defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL) || 3600000; // 1 hour in ms
    this.cleanupInterval = parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 300000; // 5 minutes in ms
    
    // TTL strategies for different content types
    this.ttlStrategies = {
      'instagram-story': 12 * 60 * 60 * 1000,      // 12 hours (stories expire in 24h)
      'instagram-post': 24 * 60 * 60 * 1000,       // 24 hours
      'instagram-reel': 24 * 60 * 60 * 1000,       // 24 hours
      'instagram-profile': 30 * 60 * 1000,         // 30 minutes (profiles change frequently)
      'instagram-error': 5 * 60 * 1000,            // 5 minutes (retry errors quickly)
      'headless-result': 6 * 60 * 60 * 1000,       // 6 hours (headless results are expensive)
      'api-response': 30 * 60 * 1000,              // 30 minutes (API responses)
      'meta-data': 60 * 60 * 1000                  // 1 hour (meta information)
    };
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0
    };
    
    // Start background cleanup
    this.startCleanupTask();
    
    console.log('📦 Cache Manager initialized');
    console.log(`💾 Max memory: ${this.maxMemoryMB}MB`);
    console.log(`⏰ Cleanup interval: ${this.cleanupInterval / 1000}s`);
  }

  /**
   * Generate cache key for Instagram content
   */
  generateKey(type, identifier, options = {}) {
    const base = `${type}:${identifier}`;
    
    // Add options to key if provided
    if (Object.keys(options).length > 0) {
      const optionsStr = Object.keys(options)
        .sort()
        .map(key => `${key}=${options[key]}`)
        .join('&');
      return `${base}:${Buffer.from(optionsStr).toString('base64')}`;
    }
    
    return base;
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttl = null, contentType = 'default') {
    try {
      // Determine TTL
      const finalTTL = ttl || this.ttlStrategies[contentType] || this.defaultTTL;
      
      // Check memory usage before adding
      if (this.isMemoryLimitReached()) {
        this.evictLRU();
      }
      
      // Create cache entry
      const entry = {
        value: value,
        createdAt: Date.now(),
        expiresAt: Date.now() + finalTTL,
        accessedAt: Date.now(),
        accessCount: 0,
        size: this.estimateSize(value),
        contentType: contentType
      };
      
      // Clear existing timer if key exists
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      // Set new entry
      this.cache.set(key, entry);
      
      // Set TTL timer
      const timer = setTimeout(() => {
        this.delete(key);
        console.log(`⏰ TTL expired for key: ${key}`);
      }, finalTTL);
      
      this.timers.set(key, timer);
      
      this.stats.sets++;
      
      console.log(`📦 Cached: ${key} (TTL: ${Math.round(finalTTL / 1000)}s, Size: ${entry.size} bytes)`);
      
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Get cache entry
   */
  get(key) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        return null;
      }
      
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        console.log(`⏰ Cache expired: ${key}`);
        return null;
      }
      
      // Update access information
      entry.accessedAt = Date.now();
      entry.accessCount++;
      
      this.stats.hits++;
      
      console.log(`✅ Cache hit: ${key} (age: ${Math.round((Date.now() - entry.createdAt) / 1000)}s)`);
      
      return entry.value;
    } catch (error) {
      console.error('❌ Cache get error:', error.message);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    try {
      const existed = this.cache.delete(key);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      
      if (existed) {
        this.stats.deletes++;
        console.log(`🗑️ Deleted cache entry: ${key}`);
      }
      
      return existed;
    } catch (error) {
      console.error('❌ Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache entry with metadata
   */
  getWithMetadata(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    // Update access info
    entry.accessedAt = Date.now();
    entry.accessCount++;
    
    return {
      value: entry.value,
      metadata: {
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
        age: Date.now() - entry.createdAt,
        ttl: entry.expiresAt - Date.now(),
        size: entry.size,
        contentType: entry.contentType
      }
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      const count = this.cache.size;
      this.cache.clear();
      this.timers.clear();
      
      console.log(`🧹 Cache cleared: ${count} entries removed`);
      
      return count;
    } catch (error) {
      console.error('❌ Cache clear error:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : '0.00';
    
    return {
      entries: this.cache.size,
      timers: this.timers.size,
      memoryUsage: this.getMemoryUsage(),
      hitRate: `${hitRate}%`,
      ...this.stats,
      totalRequests
    };
  }

  /**
   * Get memory usage estimation
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    
    return {
      estimatedBytes: totalSize,
      estimatedMB: (totalSize / 1024 / 1024).toFixed(2),
      maxMB: this.maxMemoryMB,
      percentage: ((totalSize / 1024 / 1024) / this.maxMemoryMB * 100).toFixed(2) + '%'
    };
  }

  /**
   * Check if memory limit is reached
   */
  isMemoryLimitReached() {
    const usage = this.getMemoryUsage();
    return parseFloat(usage.estimatedMB) > this.maxMemoryMB;
  }

  /**
   * Evict least recently used entries
   */
  evictLRU() {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => a.accessedAt - b.accessedAt); // Sort by last accessed (oldest first)
    
    // Remove oldest 20% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.2));
    
    for (let i = 0; i < toRemove; i++) {
      const key = entries[i].key;
      this.delete(key);
      this.stats.evictions++;
    }
    
    console.log(`🗑️ LRU eviction: removed ${toRemove} entries`);
  }

  /**
   * Start background cleanup task
   */
  startCleanupTask() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    
    console.log(`🧹 Started cleanup task (every ${this.cleanupInterval / 1000}s)`);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleanup: removed ${cleaned} expired entries`);
        this.stats.cleanups++;
      }
      
      // Log memory usage if high
      const memUsage = this.getMemoryUsage();
      if (parseFloat(memUsage.percentage) > 80) {
        console.log(`⚠️ High memory usage: ${memUsage.percentage} (${memUsage.estimatedMB}MB/${this.maxMemoryMB}MB)`);
      }
      
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }

  /**
   * Estimate size of value in bytes
   */
  estimateSize(value) {
    try {
      const jsonString = JSON.stringify(value);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch (error) {
      // Fallback estimation
      if (typeof value === 'string') return value.length * 2;
      if (typeof value === 'object') return 1000; // Rough estimate
      return 100; // Default estimate
    }
  }

  /**
   * Get all cache keys with pattern matching
   */
  getKeys(pattern = null) {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return keys;
    }
    
    // Simple pattern matching with wildcards
    const regex = new RegExp(pattern.replace('*', '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * Get entries by content type
   */
  getEntriesByType(contentType) {
    const entries = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.contentType === contentType) {
        entries.push({
          key,
          value: entry.value,
          createdAt: entry.createdAt,
          expiresAt: entry.expiresAt,
          accessCount: entry.accessCount,
          size: entry.size
        });
      }
    }
    
    return entries;
  }

  /**
   * Cache Instagram extraction result
   */
  cacheInstagramResult(url, result, contentType = 'instagram-post') {
    const key = this.generateKey('instagram', url);
    return this.set(key, result, null, contentType);
  }

  /**
   * Get cached Instagram result
   */
  getCachedInstagramResult(url) {
    const key = this.generateKey('instagram', url);
    return this.get(key);
  }

  /**
   * Cache headless browser result
   */
  cacheHeadlessResult(url, result) {
    const key = this.generateKey('headless', url);
    return this.set(key, result, null, 'headless-result');
  }

  /**
   * Get cached headless result
   */
  getCachedHeadlessResult(url) {
    const key = this.generateKey('headless', url);
    return this.get(key);
  }

  /**
   * Cache API response
   */
  cacheAPIResponse(endpoint, params, response) {
    const key = this.generateKey('api', endpoint, params);
    return this.set(key, response, null, 'api-response');
  }

  /**
   * Get cached API response
   */
  getCachedAPIResponse(endpoint, params = {}) {
    const key = this.generateKey('api', endpoint, params);
    return this.get(key);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern) {
    const keys = this.getKeys(pattern);
    let invalidated = 0;
    
    for (const key of keys) {
      if (this.delete(key)) {
        invalidated++;
      }
    }
    
    console.log(`🗑️ Invalidated ${invalidated} entries matching pattern: ${pattern}`);
    return invalidated;
  }

  /**
   * Warm up cache with common Instagram URLs
   */
  async warmUp(urls = []) {
    console.log(`🔥 Cache warm-up starting with ${urls.length} URLs...`);
    
    let warmed = 0;
    for (const url of urls) {
      try {
        // This would typically call your extraction service
        // For now, just cache a placeholder
        const key = this.generateKey('warmup', url);
        this.set(key, { warmedUp: true, url }, null, 'meta-data');
        warmed++;
      } catch (error) {
        console.warn(`Failed to warm up ${url}:`, error.message);
      }
    }
    
    console.log(`🔥 Cache warm-up completed: ${warmed} entries cached`);
    return warmed;
  }

  /**
   * Export cache statistics and health info
   */
  getHealthInfo() {
    const stats = this.getStats();
    const memUsage = this.getMemoryUsage();
    
    return {
      status: 'healthy',
      uptime: Date.now() - (this.startTime || Date.now()),
      cache: {
        ...stats,
        memory: memUsage,
        strategies: Object.keys(this.ttlStrategies).length,
        health: {
          memoryOk: parseFloat(memUsage.percentage) < 90,
          hitRateOk: parseFloat(stats.hitRate) > 10,
          entriesCount: stats.entries
        }
      }
    };
  }
}

module.exports = new CacheManager();
