const TeraBoxExtractor = require('./server/services/TeraBoxExtractor');

async function debugTeraBoxDirect() {
  console.log('🔍 Debug TeraBox extractor directly...');
  
  const testUrl = 'https://1024terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw';
  
  try {
    console.log('📡 Testing URL validation...');
    const isValid = TeraBoxExtractor.isValidTeraBoxUrl(testUrl);
    console.log('✅ URL valid:', isValid);
    
    if (isValid) {
      console.log('📋 Parsing URL...');
      const urlInfo = TeraBoxExtractor.parseTeraBoxUrl(testUrl);
      console.log('📊 URL Info:', urlInfo);
      
      console.log('🎯 Starting extraction...');
      const result = await TeraBoxExtractor.extractVideo(testUrl);
      
      if (result) {
        console.log('✅ Extraction successful!');
        console.log('📊 Title:', result.title);
        console.log('📊 Video URL:', result.videoUrl ? 'Available' : 'Not available');
        console.log('📊 Metadata:', result.metadata);
      } else {
        console.log('❌ Extraction returned null');
      }
    }
    
  } catch (error) {
    console.log('❌ Direct extraction failed:', error.message);
    console.log('📝 Stack trace:', error.stack);
  }
}

debugTeraBoxDirect();
