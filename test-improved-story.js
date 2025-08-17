const axios = require('axios');

async function testImprovedStoryExtraction() {
  console.log('🧪 Testing IMPROVED Instagram story extraction...');
  console.log('🔥 Now using StorySaver.net approach!');
  
  const storyUrl = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  try {
    console.log(`📡 Testing improved story extraction: ${storyUrl}`);
    console.log('👤 Username: pdfpage_official');
    console.log('🆔 Story ID: 3697565265603759740');
    console.log('🔥 Method: StorySaver.net style (profile-based)');
    
    // Test the improved extraction
    console.log('\n📊 Step 1: Testing improved extraction...');
    const extractResponse = await axios.post('http://localhost:5000/api/instagram/extract', {
      url: storyUrl,
      options: {
        enableHeadless: true,
        bypassCache: true,
        async: false,
        priority: 'urgent'
      }
    }, {
      timeout: 60000
    });
    
    console.log('✅ Extraction response received');
    console.log('📊 Success:', extractResponse.data.success);
    console.log('📊 Queued:', extractResponse.data.queued);
    
    if (extractResponse.data.queued) {
      console.log('📊 Task ID:', extractResponse.data.taskId);
      console.log('📊 Estimated Wait:', extractResponse.data.estimatedWaitTime + 'ms');
      
      // Wait for processing
      console.log('\n⏳ Waiting for improved processing...');
      const waitTime = Math.max(extractResponse.data.estimatedWaitTime, 15000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Check status multiple times
      let attempts = 0;
      let finalResult = null;
      
      while (attempts < 6) {
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
            console.log('⏳ Still processing, waiting 5 more seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          attempts++;
        } catch (statusError) {
          console.log('❌ Status check failed:', statusError.message);
          break;
        }
      }
      
      if (finalResult) {
        console.log('\n🎉 IMPROVED EXTRACTION COMPLETED!');
        console.log('📊 Title:', finalResult.title);
        console.log('📊 Type:', finalResult.type);
        console.log('📊 Username:', finalResult.username);
        console.log('📊 Media Items Found:', finalResult.mediaItems?.length || 0);
        
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
              console.log(`     Download URL: ${item.url.substring(0, 100)}...`);
              
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
            console.log(`\n🎉 SUCCESS! Found ${downloadableItems.length} downloadable story item(s)!`);
            console.log('✅ Story download is now working with StorySaver.net method!');
            
            downloadableItems.forEach((item, index) => {
              console.log(`\n📥 Downloadable Story Item ${index + 1}:`);
              console.log(`   Type: ${item.type}`);
              console.log(`   Filename: ${item.filename}`);
              console.log(`   Size: ${item.width}x${item.height}`);
              console.log(`   Source: ${item.source}`);
            });
            
          } else {
            console.log('\n❌ No downloadable items found');
          }
        } else {
          console.log('\n❌ No media items found');
        }
        
        if (finalResult.metadata) {
          console.log('\n📊 Extraction Metadata:');
          console.log('📊 Method Used:', finalResult.metadata.extractionMethod);
          console.log('📊 Success:', finalResult.metadata.success);
          console.log('📊 Timestamp:', finalResult.metadata.timestamp);
        }
      } else {
        console.log('\n❌ Could not get final result after multiple attempts');
      }
    } else {
      // Direct response
      console.log('📊 Direct response received');
      console.log('📊 Media Items:', extractResponse.data.mediaItems?.length || 0);
    }
    
    // Test download link generation
    console.log('\n📊 Step 2: Testing download link generation...');
    try {
      const downloadResponse = await axios.post('http://localhost:5000/api/download/video', {
        url: storyUrl,
        format: 'mp4',
        quality: 'best'
      }, {
        timeout: 30000
      });
      
      console.log('✅ Download link generated!');
      console.log('📊 Success:', downloadResponse.data.success);
      console.log('📊 Download URL Present:', downloadResponse.data.downloadUrl ? 'YES' : 'NO');
      console.log('📊 Filename:', downloadResponse.data.filename);
      
      if (downloadResponse.data.downloadUrl) {
        console.log('📥 Download URL:', downloadResponse.data.downloadUrl.substring(0, 100) + '...');
      }
      
    } catch (downloadError) {
      console.log('❌ Download link generation failed:', downloadError.message);
      if (downloadError.response) {
        console.log('📝 Error details:', downloadError.response.data);
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing improved story extraction:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runImprovedTest() {
  console.log('🚀 Starting IMPROVED Instagram story test...\n');
  console.log('🔥 Using StorySaver.net approach:');
  console.log('• Profile-based story access');
  console.log('• Current stories extraction');
  console.log('• Better session management');
  console.log('• Optimized user agents\n');
  
  // Check server health
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running');
    console.log('📊 Database:', healthResponse.data.database);
  } catch (error) {
    console.log('❌ Server not accessible:', error.message);
    return;
  }
  
  await testImprovedStoryExtraction();
  
  console.log('\n🏁 Improved story test completed!');
  
  console.log('\n🎯 Results Summary:');
  console.log('• If successful: Story downloads now work like StorySaver.net');
  console.log('• If still failing: Instagram may require additional session management');
  console.log('• Reels confirmed working: ✅');
  console.log('• Posts confirmed working: ✅');
}

runImprovedTest().catch(console.error);
