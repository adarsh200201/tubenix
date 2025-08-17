const axios = require('axios');

// Test the YouTube rate limiting fixes
async function testYouTubeExtraction() {
  console.log('🧪 Testing YouTube extraction with rate limiting fixes...\n');
  
  // The actual URL from the error logs
  const testUrl = 'https://www.youtube.com/watch?v=sZEQZMFDrEk&list=RDsZEQZMFDrEk&start_radio=1';
  
  // Test against local server
  const apiBaseUrl = 'http://localhost:5000/api';
  
  try {
    console.log('📋 Testing metadata extraction...');
    console.log('🔗 URL:', testUrl);
    console.log('🌐 API Base:', apiBaseUrl);
    console.log();
    
    const startTime = Date.now();
    
    const response = await axios.post(`${apiBaseUrl}/download/metadata`, {
      url: testUrl
    }, {
      timeout: 60000 // 1 minute timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('✅ Extraction successful!');
    console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
    console.log('📊 Response data:');
    console.log({
      platform: response.data.platform,
      title: response.data.title?.substring(0, 50) + '...',
      author: response.data.author,
      duration: response.data.duration,
      videoFormats: response.data.videoFormats?.length || 0,
      audioFormats: response.data.audioFormats?.length || 0,
      hasRealData: response.data.extraction_method === 'real_data'
    });
    
    if (response.data.videoFormats && response.data.videoFormats.length > 0) {
      console.log('\n🎥 Sample video formats:');
      response.data.videoFormats.slice(0, 3).forEach((format, index) => {
        console.log(`  ${index + 1}. ${format.quality_label || format.resolution} - ${format.approx_human_size || format.filesize || 'Unknown size'}`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    return true;
    
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log('Status:', error.response?.status || 'Unknown');
    console.log('Message:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 429) {
      console.log('🚦 Rate limiting is still occurring');
      console.log('Suggestion:', error.response?.data?.suggestion || 'Wait and try again');
      
      if (error.response?.data?.retryAfter) {
        const retryTime = new Date(error.response.data.retryAfter);
        console.log('⏳ Retry after:', retryTime.toLocaleString());
      }
    }
    
    return false;
  }
}

// Test multiple times to verify rate limiting works
async function runMultipleTests() {
  console.log('🔄 Running multiple tests to verify rate limiting...\n');
  
  const results = [];
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Test ${i}/3 ---`);
    const success = await testYouTubeExtraction();
    results.push(success);
    
    if (i < 3) {
      console.log('⏱️ Waiting 10 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Successful: ${results.filter(r => r).length}/3`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}/3`);
  
  if (results.some(r => r)) {
    console.log('\n🎉 Rate limiting fixes appear to be working!');
  } else {
    console.log('\n⚠️ All tests failed - may need additional adjustments');
  }
}

// Check if we can connect to the server first
async function checkServerHealth() {
  try {
    console.log('🏥 Checking server health...');
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    console.log('✅ Server is healthy:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    console.log('💡 Make sure the development server is running with: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🧪 YouTube Rate Limiting Fix Test Suite');
  console.log('=' .repeat(50));
  console.log();
  
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }
  
  console.log();
  await runMultipleTests();
  
  console.log('\n🏁 Test suite completed!');
}

// Run the tests
main().catch(console.error);
