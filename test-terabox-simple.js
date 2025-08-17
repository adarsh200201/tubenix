const axios = require('axios');

async function testTeraBoxSimple() {
  console.log('🧪 Testing TeraBox extraction...');
  
  const testUrl = 'https://1024terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw';
  
  try {
    console.log('📡 Testing extraction for:', testUrl);
    
    const response = await axios.post('http://localhost:5000/api/terabox/extract', {
      url: testUrl
    }, {
      timeout: 30000
    });
    
    console.log('✅ Response received');
    console.log('📊 Success:', response.data.success);
    
    if (response.data.success) {
      console.log('🎉 TeraBox extraction successful!');
      console.log('📊 Title:', response.data.title);
      console.log('📊 Video URL:', response.data.videoUrl ? 'Available' : 'Not available');
      console.log('📊 Downloadable:', response.data.downloadable);
      
      if (response.data.metadata) {
        console.log('📊 Method:', response.data.metadata.extractionMethod);
      }
    } else {
      console.log('❌ Extraction failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    if (error.response) {
      console.log('📝 Error details:', error.response.data);
    }
  }
}

testTeraBoxSimple();
