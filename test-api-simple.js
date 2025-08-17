const axios = require('axios');

async function testApiSimple() {
  console.log('🧪 Testing TeraBox API directly...');
  
  const testUrl = 'https://www.terabox.app/sharing/link?surl=OgJdcGbg6HjyGnJgh2yqCw';
  
  try {
    console.log('📡 Testing extraction API...');
    console.log('🎯 URL:', testUrl);
    
    const response = await axios.post('http://localhost:5000/api/terabox/extract', {
      url: testUrl
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API response received');
    console.log('📊 Status:', response.status);
    console.log('📊 Success:', response.data.success);
    
    if (response.data.success) {
      console.log('🎉 Extraction successful!');
      console.log('📊 Title:', response.data.title);
      console.log('📊 Video URL:', response.data.videoUrl ? 'Available' : 'Not available');
    } else {
      console.log('❌ Extraction failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ API request failed:', error.message);
    
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    }
  }
}

testApiSimple();
