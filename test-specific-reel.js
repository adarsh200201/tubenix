const axios = require('axios');

async function testSpecificReel() {
  console.log('🧪 Testing specific Instagram reel download...');
  
  const reelUrl = 'https://www.instagram.com/reel/DNFZbyzNKWA/?igsh=ODI4eWdlaWJoNjhz';
  
  try {
    console.log(`📡 Testing reel: ${reelUrl}`);
    
    // Step 1: Test URL accessibility
    console.log('\n📊 Step 1: Testing URL accessibility...');
    try {
      const directResponse = await axios.get(reelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      console.log('✅ Reel URL is accessible');
      console.log('📊 Response status:', directResponse.status);
      console.log('📊 Content length:', directResponse.data.length);
      
      // Check for video indicators
      if (directResponse.data.includes('video_url') || directResponse.data.includes('videoUrl')) {
        console.log('✅ Video content detected in response');
      } else {
        console.log('❓ No obvious video content in response');
      }
      
    } catch (accessError) {
      console.log('❌ URL access failed:', accessError.message);
    }
    
    // Step 2: Test extraction
    console.log('\n📊 Step 2: Testing extraction...');
    const extractResponse = await axios.post('http://localhost:5000/api/instagram/extract', {
      url: reelUrl,
      options: {
        enableHeadless: true,
        bypassCache: true,
        async: false,
        priority: 'high'
      }
    }, {
      timeout: 45000
    });
    
    console.log('✅ Extraction response received');
    console.log('📊 Success:', extractResponse.data.success);
    console.log('📊 Queued:', extractResponse.data.queued);
    
    if (extractResponse.data.queued) {
      console.log('📊 Task ID:', extractResponse.data.taskId);
      console.log('📊 Estimated Wait:', extractResponse.data.estimatedWaitTime + 'ms');
      
      // Wait for processing
      console.log('\n⏳ Waiting for processing...');
      await new Promise(resolve => setTimeout(resolve, Math.max(extractResponse.data.estimatedWaitTime, 10000)));
      
      // Check status multiple times
      let attempts = 0;
      let finalResult = null;
      
      while (attempts < 5) {
        try {
          const statusResponse = await axios.get(`http://localhost:5000/api/instagram/status/${extractResponse.data.taskId}`);
          console.log(`📊 Attempt ${attempts + 1} - Status: ${statusResponse.data.status}`);
          
          if (statusResponse.data.status === 'completed') {
            finalResult = statusResponse.data.result;
            break;
          } else if (statusResponse.data.status === 'failed') {
            console.log('❌ Task failed:', statusResponse.data.error);
            break;
          } else {
            console.log('⏳ Still processing, waiting 3 more seconds...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          attempts++;
        } catch (statusError) {
          console.log('❌ Status check failed:', statusError.message);
          break;
        }
      }
      
      if (finalResult) {
        console.log('\n🎉 Extraction completed!');
        console.log('📊 Title:', finalResult.title);
        console.log('📊 Type:', finalResult.type);
        console.log('📊 Media Items:', finalResult.mediaItems?.length || 0);
        
        if (finalResult.mediaItems && finalResult.mediaItems.length > 0) {
          console.log('\n📊 Media Items Details:');
          finalResult.mediaItems.forEach((item, index) => {
            console.log(`\n  ${index + 1}. Media Item:`);
            console.log(`     Type: ${item.type}`);
            console.log(`     Downloadable: ${item.downloadable}`);
            console.log(`     URL Present: ${item.url ? 'YES' : 'NO'}`);
            console.log(`     Filename: ${item.filename || 'Not set'}`);
            console.log(`     Source: ${item.source}`);
            console.log(`     Size: ${item.width}x${item.height || 'Unknown'}`);
            
            if (item.url && item.downloadable) {
              console.log(`     Download URL: ${item.url}`);
              
              // Test URL accessibility
              console.log(`     Testing download URL...`);
              axios.head(item.url, { timeout: 10000 })
                .then(response => {
                  console.log(`     ✅ Download URL accessible!`);
                  console.log(`     Content-Type: ${response.headers['content-type']}`);
                  console.log(`     Content-Length: ${response.headers['content-length']} bytes`);
                })
                .catch(err => console.log(`     ❌ Download URL test failed: ${err.message}`));
            }
          });
          
          // Check for downloadable content
          const downloadableItems = finalResult.mediaItems.filter(item => item.downloadable && item.url);
          if (downloadableItems.length > 0) {
            console.log(`\n🎉 SUCCESS! Found ${downloadableItems.length} downloadable item(s)!`);
            console.log('✅ Reel can be downloaded');
            
            downloadableItems.forEach((item, index) => {
              console.log(`\n📥 Downloadable Item ${index + 1}:`);
              console.log(`   Type: ${item.type}`);
              console.log(`   Filename: ${item.filename}`);
              console.log(`   Size: ${item.width}x${item.height}`);
              console.log(`   URL: ${item.url}`);
            });
            
          } else {
            console.log('\n❌ No downloadable items found');
          }
        } else {
          console.log('\n❌ No media items found');
        }
        
        if (finalResult.metadata) {
          console.log('\n📊 Extraction Metadata:');
          console.log('📊 Method:', finalResult.metadata.extractionMethod);
          console.log('📊 Success:', finalResult.metadata.success);
        }
      } else {
        console.log('\n❌ Could not get final result');
      }
    } else {
      // Direct response
      console.log('📊 Direct response received');
      console.log('📊 Media Items:', extractResponse.data.mediaItems?.length || 0);
    }
    
    // Step 3: Test download link generation
    console.log('\n📊 Step 3: Testing download link generation...');
    try {
      const downloadResponse = await axios.post('http://localhost:5000/api/download/video', {
        url: reelUrl,
        format: 'mp4',
        quality: 'best'
      }, {
        timeout: 30000
      });
      
      console.log('✅ Download link generated!');
      console.log('📊 Success:', downloadResponse.data.success);
      console.log('📊 Download URL Present:', downloadResponse.data.downloadUrl ? 'YES' : 'NO');
      console.log('📊 Filename:', downloadResponse.data.filename);
      console.log('📊 Direct Download:', downloadResponse.data.directDownload);
      
      if (downloadResponse.data.downloadUrl) {
        console.log('📥 Download URL:', downloadResponse.data.downloadUrl);
      }
      
    } catch (downloadError) {
      console.log('❌ Download link generation failed:', downloadError.message);
      if (downloadError.response) {
        console.log('📝 Error details:', downloadError.response.data);
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing reel:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runReelTest() {
  console.log('🚀 Starting Instagram reel download test...\n');
  
  // Check server health first
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running');
    console.log('📊 Database:', healthResponse.data.database);
  } catch (error) {
    console.log('❌ Server not accessible:', error.message);
    return;
  }
  
  await testSpecificReel();
  
  console.log('\n🏁 Reel test completed!');
  
  console.log('\n⚖️ Legal Reminder:');
  console.log('• Only download content you have permission to use');
  console.log('• Respect copyright and Instagram\'s Terms of Service');
  console.log('• Use downloads responsibly and ethically');
}

runReelTest().catch(console.error);
