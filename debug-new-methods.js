const extractor = require('./server/services/InstagramExtractor');

async function debugNewMethods() {
  console.log('🔍 Debug new StorySaver.net methods...');
  
  const url = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  try {
    console.log('📡 Testing URL parsing...');
    const urlInfo = extractor.parseInstagramUrl(url);
    console.log('📋 URL Info:', urlInfo);
    
    if (urlInfo.valid && urlInfo.type === 'story') {
      console.log('✅ Valid story URL');
      console.log('👤 Username:', urlInfo.username);
      
      // Test the new profile-based method directly
      console.log('\n📱 Testing profile-based story extraction...');
      const profileResult = await extractor.extractCurrentStoriesFromProfile(urlInfo.username);
      
      if (profileResult) {
        console.log('✅ Profile extraction successful!');
        console.log('📊 Title:', profileResult.title);
        console.log('📊 Media Items:', profileResult.mediaItems?.length || 0);
        
        if (profileResult.mediaItems && profileResult.mediaItems.length > 0) {
          profileResult.mediaItems.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.type} - ${item.downloadable ? 'Downloadable' : 'Not downloadable'}`);
          });
        }
      } else {
        console.log('❌ Profile extraction returned null');
      }
      
      // Test the working story extractor
      console.log('\n🔥 Testing working story extractor...');
      const workingResult = await extractor.extractInstagramStoryWorking(url);
      
      if (workingResult) {
        console.log('✅ Working extractor successful!');
        console.log('📊 Title:', workingResult.title);
        console.log('📊 Media Items:', workingResult.mediaItems?.length || 0);
      } else {
        console.log('❌ Working extractor returned null');
      }
      
    } else {
      console.log('❌ Invalid URL');
    }
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
    console.log('📝 Stack trace:', error.stack);
  }
}

debugNewMethods();
