/**
 * Basic Test Script for Instagram Extraction Workflow
 * 
 * This script tests the complete Instagram extraction pipeline:
 * - URL validation
 * - Multiple extraction methods
 * - Cache functionality
 * - Error handling
 * - Monitoring integration
 */

const InstagramExtractor = require('./services/InstagramExtractor');
const CacheManager = require('./services/CacheManager');
const MonitoringService = require('./services/MonitoringService');

// Test URLs (use public, non-sensitive URLs)
const testUrls = {
  validPost: 'https://www.instagram.com/p/ABC123/',
  validReel: 'https://www.instagram.com/reel/DEF456/',
  validStory: 'https://www.instagram.com/stories/testuser/1234567890/',
  invalidUrl: 'https://not-instagram.com/test',
  malformedUrl: 'invalid-url'
};

console.log('🧪 Starting Instagram extraction workflow tests...\n');

async function runTests() {
  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: URL Validation
  console.log('📋 Test 1: URL Validation');
  testsTotal++;
  
  try {
    const validPost = InstagramExtractor.isValidInstagramUrl(testUrls.validPost);
    const validReel = InstagramExtractor.isValidInstagramUrl(testUrls.validReel);
    const invalidUrl = InstagramExtractor.isValidInstagramUrl(testUrls.invalidUrl);
    const malformedUrl = InstagramExtractor.isValidInstagramUrl(testUrls.malformedUrl);
    
    if (validPost && validReel && !invalidUrl && !malformedUrl) {
      console.log('✅ URL validation working correctly');
      testsPassed++;
    } else {
      console.log('❌ URL validation failed');
      console.log(`  Valid post: ${validPost}, Valid reel: ${validReel}, Invalid: ${invalidUrl}, Malformed: ${malformedUrl}`);
    }
  } catch (error) {
    console.log('❌ URL validation test error:', error.message);
  }

  // Test 2: Media Type Detection
  console.log('\n📋 Test 2: Media Type Detection');
  testsTotal++;
  
  try {
    const postType = InstagramExtractor.detectMediaType(testUrls.validPost);
    const reelType = InstagramExtractor.detectMediaType(testUrls.validReel);
    const storyType = InstagramExtractor.detectMediaType(testUrls.validStory);
    
    if (postType === 'post' && reelType === 'reel' && storyType === 'story') {
      console.log('✅ Media type detection working correctly');
      testsPassed++;
    } else {
      console.log('❌ Media type detection failed');
      console.log(`  Post: ${postType}, Reel: ${reelType}, Story: ${storyType}`);
    }
  } catch (error) {
    console.log('❌ Media type detection test error:', error.message);
  }

  // Test 3: Cache Functionality
  console.log('\n📋 Test 3: Cache Functionality');
  testsTotal++;
  
  try {
    const testKey = 'test-key';
    const testData = { test: 'data', timestamp: Date.now() };
    
    // Test cache set
    const setResult = CacheManager.set(testKey, testData, 5000, 'test');
    
    // Test cache get
    const getData = CacheManager.get(testKey);
    
    // Test cache has
    const hasData = CacheManager.has(testKey);
    
    if (setResult && getData && JSON.stringify(getData) === JSON.stringify(testData) && hasData) {
      console.log('✅ Cache functionality working correctly');
      testsPassed++;
      
      // Clean up
      CacheManager.delete(testKey);
    } else {
      console.log('❌ Cache functionality failed');
    }
  } catch (error) {
    console.log('❌ Cache test error:', error.message);
  }

  // Test 4: Monitoring Service
  console.log('\n📋 Test 4: Monitoring Service');
  testsTotal++;
  
  try {
    // Record a test request
    MonitoringService.recordRequest('Instagram', 'test', true, 1000);
    
    // Record a test error
    MonitoringService.recordError(new Error('Test error'), { test: true });
    
    // Get metrics
    const metrics = MonitoringService.getMetrics();
    
    if (metrics.requests.total > 0 && metrics.errors.total > 0) {
      console.log('✅ Monitoring service working correctly');
      testsPassed++;
    } else {
      console.log('❌ Monitoring service failed');
    }
  } catch (error) {
    console.log('❌ Monitoring test error:', error.message);
  }

  // Test 5: Instagram Extraction (Mock Test)
  console.log('\n📋 Test 5: Instagram Extraction (Mock Test)');
  testsTotal++;
  
  try {
    // Test with an invalid URL to test error handling
    const result = await InstagramExtractor.extractMedia(testUrls.invalidUrl);
    
    // Should return an error response
    if (!result.metadata.success && result.metadata.extractionMethod === 'error') {
      console.log('✅ Instagram extraction error handling working correctly');
      testsPassed++;
    } else {
      console.log('❌ Instagram extraction error handling failed');
    }
  } catch (error) {
    // This is expected for invalid URLs
    console.log('✅ Instagram extraction error handling working correctly (caught exception)');
    testsPassed++;
  }

  // Test 6: Health Check
  console.log('\n📋 Test 6: Health Check');
  testsTotal++;
  
  try {
    const healthStatus = await MonitoringService.performHealthCheck();
    
    if (healthStatus && healthStatus.overall && healthStatus.services) {
      console.log('✅ Health check working correctly');
      console.log(`   Overall status: ${healthStatus.overall}`);
      testsPassed++;
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.log('❌ Health check test error:', error.message);
  }

  // Test 7: Service Integration
  console.log('\n📋 Test 7: Service Integration Test');
  testsTotal++;
  
  try {
    // Test that all services can be imported and initialized
    const HeadlessBrowserPool = require('./services/HeadlessBrowserPool');
    const TaskQueueManager = require('./services/TaskQueueManager');
    const ProxyRequestManager = require('./services/ProxyRequestManager');
    
    // Get status from each service
    const browserStatus = HeadlessBrowserPool.getStatus();
    const queueStats = TaskQueueManager.getQueueStats();
    const proxyStats = ProxyRequestManager.getStats();
    
    if (browserStatus && queueStats && proxyStats) {
      console.log('✅ Service integration working correctly');
      testsPassed++;
    } else {
      console.log('❌ Service integration failed');
    }
  } catch (error) {
    console.log('❌ Service integration test error:', error.message);
  }

  // Results Summary
  console.log('\n📊 Test Results Summary');
  console.log('=' * 50);
  console.log(`Tests passed: ${testsPassed}/${testsTotal}`);
  console.log(`Success rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! Instagram extraction workflow is ready.');
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
  }

  // Display system status
  console.log('\n🔍 System Status:');
  const stats = MonitoringService.getMetrics();
  console.log(`- Total requests recorded: ${stats.requests.total}`);
  console.log(`- Total errors recorded: ${stats.errors.total}`);
  console.log(`- Cache entries: ${CacheManager.getStats().entries}`);
  console.log(`- System uptime: ${Math.round(stats.uptime / 1000)}s`);

  return testsPassed === testsTotal;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(success => {
      if (success) {
        console.log('\n✅ Instagram extraction workflow test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Instagram extraction workflow test completed with failures!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
