const axios = require('axios');

async function testPostDownload() {
  console.log('🧪 Testing Instagram POST download (instead of story)...');
  
  // Let's try with a public Instagram post/reel instead
  // Using a generic public post URL format
  const testUrls = [
    'https://www.instagram.com/p/C2QJ8K9P8K9/', // Generic post format
    'https://www.instagram.com/reel/C2QJ8K9P8K9/', // Generic reel format
  ];
  
  for (const testUrl of testUrls) {
    try {
      console.log(`\n📡 Testing: ${testUrl}`);
      
      // Test extraction
      const extractResponse = await axios.post('http://localhost:5000/api/instagram/extract', {
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
      
      console.log('✅ Extraction response received');
      console.log('📊 Success:', extractResponse.data.success);
      console.log('📊 Queued:', extractResponse.data.queued);
      
      if (extractResponse.data.queued) {
        console.log('📊 Task ID:', extractResponse.data.taskId);
        
        // Wait and check result
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const statusResponse = await axios.get(`http://localhost:5000/api/instagram/status/${extractResponse.data.taskId}`);
        console.log('📊 Task Status:', statusResponse.data.status);
        
        if (statusResponse.data.status === 'completed' && statusResponse.data.result) {
          const result = statusResponse.data.result;
          console.log('📊 Media Items Found:', result.mediaItems?.length || 0);
          
          if (result.mediaItems && result.mediaItems.length > 0) {
            console.log('🎉 SUCCESS: Found downloadable content!');
            result.mediaItems.forEach((item, index) => {
              console.log(`  ${index + 1}. Type: ${item.type}, Downloadable: ${item.downloadable}`);
              if (item.url) {
                console.log(`     URL: ${item.url.substring(0, 100)}...`);
              }
            });
          }
        }
      } else {
        console.log('📊 Direct response - Media Items:', extractResponse.data.mediaItems?.length || 0);
      }
      
    } catch (error) {
      console.log('❌ Error with', testUrl, ':', error.message);
    }
  }
}

async function testStoryAccessibility() {
  console.log('\n🔍 Testing story accessibility directly...');
  
  const storyUrl = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  try {
    // Test direct access to the story URL
    const response = await axios.get(storyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000,
      maxRedirects: 5
    });
    
    console.log('✅ Story URL is accessible');
    console.log('📊 Response status:', response.status);
    console.log('📊 Content length:', response.data.length);
    
    // Check if the response contains story data
    if (response.data.includes('video_versions') || response.data.includes('image_versions2')) {
      console.log('✅ Story contains media data');
    } else if (response.data.includes('login')) {
      console.log('⚠️ Story requires login');
    } else if (response.data.includes('expired') || response.data.includes('not found')) {
      console.log('❌ Story appears to be expired or not found');
    } else {
      console.log('❓ Story status unclear');
    }
    
  } catch (error) {
    console.log('❌ Story URL not accessible:', error.message);
    
    if (error.response) {
      console.log('📊 Status code:', error.response.status);
      if (error.response.status === 404) {
        console.log('❌ Story not found (404) - likely expired');
      } else if (error.response.status === 403) {
        console.log('❌ Story access forbidden (403) - private or blocked');
      }
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Instagram download verification tests...\n');
  
  await testStoryAccessibility();
  await testPostDownload();
  
  console.log('\n🏁 Tests completed!');
  
  console.log('\n💡 Summary:');
  console.log('1. Instagram stories are heavily protected and often expire quickly');
  console.log('2. Instagram actively blocks automated access to stories');
  console.log('3. The download system works better with regular posts/reels');
  console.log('4. For testing, try using a recent public post or reel URL');
}

runTests().catch(console.error);
