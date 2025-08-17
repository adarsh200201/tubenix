const axios = require('axios');

async function testInstagramExtraction() {
  console.log('🧪 Testing Instagram extraction fix...');
  
  // Test with a sample Instagram story URL pattern
  const testUrl = 'https://www.instagram.com/stories/instagram/123456789/';
  
  try {
    console.log(`📡 Testing extraction for: ${testUrl}`);
    
    const response = await axios.post('http://localhost:5000/api/instagram/extract', {
      url: testUrl,
      options: {
        enableHeadless: true,
        bypassCache: true,
        async: false,
        priority: 'high'
      }
    }, {
      timeout: 30000
    });
    
    console.log('✅ Response received');
    console.log('📊 Status:', response.status);
    console.log('📊 Success:', response.data.success);
    console.log('📊 Method:', response.data.method);
    console.log('��� Media Items:', response.data.mediaItems?.length || 0);
    
    if (response.data.mediaItems && response.data.mediaItems.length > 0) {
      console.log('📊 Media Items Details:');
      response.data.mediaItems.forEach((item, index) => {
        console.log(`  ${index + 1}. Type: ${item.type}, Downloadable: ${item.downloadable}, URL: ${item.url ? 'Present' : 'Missing'}, Source: ${item.source}`);
      });
    }
    
    if (response.data.metadata) {
      console.log('📊 Extraction Method:', response.data.metadata.extractionMethod);
      console.log('📊 Processing Time:', response.data.metadata.processingTime || response.data.processingTime);
    }
    
    console.log('\n🎯 Test Result:');
    if (response.data.success && response.data.mediaItems && response.data.mediaItems.some(item => item.downloadable)) {
      console.log('✅ SUCCESS: Instagram extraction is working properly!');
    } else {
      console.log('❌ ISSUE: Instagram extraction needs more work');
      console.log('📝 Response data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Error testing extraction:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Test the health endpoint first
async function testHealth() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await axios.get('http://localhost:5000/api/instagram/health');
    console.log('✅ Health check passed');
    console.log('📊 Overall status:', response.data.status);
    console.log('📊 Services status:', Object.keys(response.data.services).map(key => `${key}: ${response.data.services[key].status}`).join(', '));
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Instagram extraction tests...\n');
  
  await testHealth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testInstagramExtraction();
  
  console.log('\n🏁 Tests completed!');
}

runTests().catch(console.error);
