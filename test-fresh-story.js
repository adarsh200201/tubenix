const axios = require('axios');

async function testFreshStoryDownload() {
  console.log('🧪 Testing FRESH Instagram story download...');
  console.log('📱 Story posted: 13 minutes ago (very fresh!)');
  console.log('🎬 Video duration: 0:22');
  console.log('👤 Account: pdfpage_official');
  
  const storyUrl = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  try {
    console.log(`\n📡 Testing fresh story: ${storyUrl}`);
    
    // Step 1: Test with maximum extraction power
    console.log('\n📊 Step 1: Full extraction with all methods...');
    const extractResponse = await axios.post('http://localhost:5000/api/instagram/extract', {
      url: storyUrl,
      options: {
        enableHeadless: true,
        bypassCache: true,
        async: false,
        priority: 'urgent', // Highest priority
        timeout: 60000,
        retries: 3
      }
    }, {
      timeout: 60000 // 1 minute timeout
    });
    
    console.log('✅ Extraction response received');
    console.log('📊 Success:', extractResponse.data.success);
    console.log('📊 Queued:', extractResponse.data.queued);
    
    if (extractResponse.data.queued) {
      console.log('📊 Task ID:', extractResponse.data.taskId);
      console.log('📊 Queue Position:', extractResponse.data.queuePosition);
      console.log('📊 Estimated Wait:', extractResponse.data.estimatedWaitTime + 'ms');
      
      // Wait for processing with longer timeout for fresh content
      console.log('\n⏳ Waiting for fresh story processing...');
      const waitTime = Math.max(extractResponse.data.estimatedWaitTime, 15000); // At least 15 seconds
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Check task status multiple times if needed
      let attempts = 0;
      let taskResult = null;
      
      while (attempts < 5) {
        try {
          const statusResponse = await axios.get(`http://localhost:5000/api/instagram/status/${extractResponse.data.taskId}`);
          console.log(`📊 Attempt ${attempts + 1} - Task Status: ${statusResponse.data.status}`);
          
          if (statusResponse.data.status === 'completed') {
            taskResult = statusResponse.data.result;
            break;
          } else if (statusResponse.data.status === 'failed') {
            console.log('❌ Task failed:', statusResponse.data.error);
            break;
          } else if (statusResponse.data.status === 'processing') {
            console.log('⏳ Still processing, waiting 5 more seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          attempts++;
        } catch (statusError) {
          console.log('❌ Status check failed:', statusError.message);
          break;
        }
      }
      
      if (taskResult) {
        console.log('\n🎉 Task completed! Analyzing results...');
        console.log('📊 Title:', taskResult.title);
        console.log('📊 Type:', taskResult.type);
        console.log('📊 Username:', taskResult.username);
        console.log('📊 Media Items Found:', taskResult.mediaItems?.length || 0);
        
        if (taskResult.mediaItems && taskResult.mediaItems.length > 0) {
          console.log('\n📊 Media Items Details:');
          taskResult.mediaItems.forEach((item, index) => {
            console.log(`\n  ${index + 1}. Media Item:`);
            console.log(`     Type: ${item.type}`);
            console.log(`     Downloadable: ${item.downloadable}`);
            console.log(`     URL Present: ${item.url ? 'YES' : 'NO'}`);
            console.log(`     Filename: ${item.filename || 'Not set'}`);
            console.log(`     Source: ${item.source}`);
            console.log(`     Size: ${item.width}x${item.height || 'Unknown'}`);
            
            if (item.url) {
              console.log(`     URL: ${item.url}`);
              
              // Test URL accessibility
              console.log(`     Testing URL...`);
              axios.head(item.url, { timeout: 10000 })
                .then(response => {
                  console.log(`     ✅ URL accessible!`);
                  console.log(`     Content-Type: ${response.headers['content-type']}`);
                  console.log(`     Content-Length: ${response.headers['content-length']} bytes`);
                })
                .catch(err => console.log(`     ❌ URL test failed: ${err.message}`));
            }
          });
          
          // Check for downloadable content
          const downloadableItems = taskResult.mediaItems.filter(item => item.downloadable && item.url);
          if (downloadableItems.length > 0) {
            console.log(`\n🎉 SUCCESS! Found ${downloadableItems.length} downloadable item(s)!`);
            
            downloadableItems.forEach((item, index) => {
              console.log(`\n📥 Downloadable Item ${index + 1}:`);
              console.log(`   Type: ${item.type}`);
              console.log(`   Filename: ${item.filename}`);
              console.log(`   Download URL: ${item.url}`);
              console.log(`   Size: ${item.width}x${item.height}`);
            });
            
            console.log('\n✅ VERIFICATION COMPLETE: Story download is working!');
            console.log('✅ Fresh content can be extracted and downloaded');
            console.log('✅ Direct download URLs are available');
            
          } else {
            console.log('\n❌ No downloadable items found');
          }
        } else {
          console.log('\n❌ No media items found');
        }
        
        if (taskResult.metadata) {
          console.log('\n📊 Extraction Metadata:');
          console.log('📊 Method Used:', taskResult.metadata.extractionMethod);
          console.log('📊 Success:', taskResult.metadata.success);
          console.log('📊 Timestamp:', taskResult.metadata.timestamp);
        }
      } else {
        console.log('\n❌ Could not get task result after multiple attempts');
      }
    } else {
      // Direct response (not queued)
      console.log('📊 Direct response received');
      console.log('📊 Media Items:', extractResponse.data.mediaItems?.length || 0);
      
      if (extractResponse.data.mediaItems && extractResponse.data.mediaItems.length > 0) {
        console.log('\n📊 Direct Media Items:');
        extractResponse.data.mediaItems.forEach((item, index) => {
          console.log(`  ${index + 1}. Type: ${item.type}, Downloadable: ${item.downloadable}, URL: ${item.url ? 'Present' : 'Missing'}`);
        });
      }
    }
    
    // Step 2: Test download link generation for the fresh story
    console.log('\n📊 Step 2: Testing download link generation...');
    try {
      const downloadResponse = await axios.post('http://localhost:5000/api/download/video', {
        url: storyUrl,
        format: 'mp4',
        quality: 'best'
      }, {
        timeout: 30000
      });
      
      console.log('✅ Download link generated successfully!');
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
    console.log('❌ Error testing fresh story:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runFreshStoryTest() {
  console.log('🚀 Starting FRESH Instagram story download test...\n');
  console.log('🕐 Story is very fresh (13 minutes old)');
  console.log('🎬 Contains video content (0:22 duration)');
  console.log('👤 Public account: pdfpage_official\n');
  
  await testFreshStoryDownload();
  
  console.log('\n🏁 Fresh story test completed!');
}

runFreshStoryTest().catch(console.error);
