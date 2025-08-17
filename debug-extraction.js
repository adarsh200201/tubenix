const extractor = require('./server/services/InstagramExtractor');

async function debugExtraction() {
  console.log('🔍 Debug Instagram extraction...');
  const url = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  try {
    console.log('📡 Starting extraction...');
    
    // Parse URL first
    const urlInfo = extractor.parseInstagramUrl(url);
    console.log('📋 URL Info:', urlInfo);
    
    if (urlInfo.valid && urlInfo.type === 'story') {
      console.log('✅ Valid story URL detected');
      console.log('👤 Username:', urlInfo.username);
      console.log('🆔 Story ID:', urlInfo.storyId);
      
      // Test the working story extractor directly
      console.log('\n🔥 Testing working story extractor...');
      const result = await extractor.extractInstagramStoryWorking(url);
      
      if (result) {
        console.log('✅ Extraction successful!');
        console.log('📊 Title:', result.title);
        console.log('📊 Type:', result.type);
        console.log('📊 Media Items:', result.mediaItems?.length || 0);
        
        if (result.mediaItems && result.mediaItems.length > 0) {
          result.mediaItems.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.type} - ${item.downloadable ? 'Downloadable' : 'Not downloadable'}`);
            if (item.url) {
              console.log(`     URL: ${item.url.substring(0, 100)}...`);
            }
          });
        }
      } else {
        console.log('❌ Extraction returned null');
      }
    } else {
      console.log('❌ Invalid URL or not a story');
    }
    
  } catch (error) {
    console.log('❌ Debug extraction failed:', error.message);
    console.log('📝 Stack trace:', error.stack);
  }
}

debugExtraction();
