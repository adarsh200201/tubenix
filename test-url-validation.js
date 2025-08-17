const TeraBoxExtractor = require('./server/services/TeraBoxExtractor');

function testUrlValidation() {
  console.log('🧪 Testing URL validation directly...');
  
  const testUrls = [
    'https://www.terabox.app/sharing/link?surl=OgJdcGbg6HjyGnJgh2yqCw',
    'https://1024terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw',
    'https://terabox.com/s/example123',
    'https://invalid-url.com/test'
  ];
  
  testUrls.forEach((url, index) => {
    console.log(`\n📡 Testing URL ${index + 1}: ${url}`);
    
    const isValid = TeraBoxExtractor.isValidTeraBoxUrl(url);
    console.log(`✅ Valid: ${isValid}`);
    
    if (isValid) {
      const urlInfo = TeraBoxExtractor.parseTeraBoxUrl(url);
      console.log(`📋 URL Info:`, urlInfo);
    }
  });
}

testUrlValidation();
