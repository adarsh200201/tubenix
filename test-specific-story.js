const axios = require('axios');

async function testSpecificStoryDownload() {
  console.log('🧪 Testing specific Instagram story download...');
  
  // The story URL you provided
  const storyUrl = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  try {
    console.log(`📡 Testing story: ${storyUrl}`);
    console.log('👤 Username: pdfpage_official');
    console.log('🆔 Story ID: 3697565265603759740');
    
    // Step 1: Test direct extraction with high priority
    console.log('\n📊 Step 1: Testing direct extraction...');
    const extractResponse = await axios.post('http://localhost:5000/api/instagram/extract', {
      url: storyUrl,
      options: {
        enableHeadless: true,
        bypassCache: true,
        async: false,
        priority: 'high'
      }
    }, {
      timeout: 45000 // Longer timeout for stories
    });
    
    console.log('✅ Extraction response received');
    console.log('📊 Success:', extractResponse.data.success);
    console.log('📊 Queued:', extractResponse.data.queued);
    
    if (extractResponse.data.queued) {
      console.log('📊 Task ID:', extractResponse.data.taskId);
      console.log('📊 Queue Position:', extractResponse.data.queuePosition);
      console.log('📊 Estimated Wait:', extractResponse.data.estimatedWaitTime + 'ms');
      
      // Wait for processing
      console.log('\n⏳ Waiting for task to complete...');
      await new Promise(resolve => setTimeout(resolve, extractResponse.data.estimatedWaitTime + 2000));
      
      // Check task status
      const statusResponse = await axios.get(`http://localhost:5000/api/instagram/status/${extractResponse.data.taskId}`);
      console.log('📊 Task Status:', statusResponse.data.status);
      
      if (statusResponse.data.status === 'completed' && statusResponse.data.result) {
        const result = statusResponse.data.result;
        console.log('📊 Media Items Found:', result.mediaItems?.length || 0);
        
        if (result.mediaItems && result.mediaItems.length > 0) {
          console.log('\n📊 Media Details:');
          result.mediaItems.forEach((item, index) => {
            console.log(`  ${index + 1}. Type: ${item.type}`);
            console.log(`     Downloadable: ${item.downloadable}`);
            console.log(`     URL: ${item.url ? 'Present' : 'Missing'}`);
            console.log(`     Filename: ${item.filename || 'Not set'}`);
            console.log(`     Source: ${item.source}`);
            console.log(`     Size: ${item.width}x${item.height || 'Unknown'}`);
            
            if (item.url) {
              console.log(`     Direct URL: ${item.url.substring(0, 100)}...`);
            }
          });
          
          // Test actual download
          const downloadableItem = result.mediaItems.find(item => item.downloadable && item.url);
          if (downloadableItem) {
            console.log('\n📥 Testing direct download...');
            try {
              const downloadTest = await axios.head(downloadableItem.url, { timeout: 10000 });
              console.log('✅ Download URL is accessible');
              console.log('📊 Content Type:', downloadTest.headers['content-type']);
              console.log('📊 Content Length:', downloadTest.headers['content-length']);
              
              console.log('\n🎉 SUCCESS: Story can be downloaded!');
              console.log(`📥 Download URL: ${downloadableItem.url}`);
              console.log(`📄 Filename: ${downloadableItem.filename}`);
              
            } catch (downloadError) {
              console.log('❌ Download URL test failed:', downloadError.message);
            }
          }
        } else {
          console.log('❌ No media items found in completed task');
        }
      } else if (statusResponse.data.status === 'failed') {
        console.log('❌ Task failed:', statusResponse.data.error);
      } else {
        console.log('⏳ Task still processing, status:', statusResponse.data.status);
      }
    } else {
      // Direct response
      console.log('📊 Media Items:', extractResponse.data.mediaItems?.length || 0);
      
      if (extractResponse.data.mediaItems && extractResponse.data.mediaItems.length > 0) {
        console.log('\n📊 Media Details:');
        extractResponse.data.mediaItems.forEach((item, index) => {
          console.log(`  ${index + 1}. Type: ${item.type}`);
          console.log(`     Downloadable: ${item.downloadable}`);
          console.log(`     URL: ${item.url ? 'Present' : 'Missing'}`);
          console.log(`     Filename: ${item.filename || 'Not set'}`);
          console.log(`     Source: ${item.source}`);
        });
      }
    }
    
    // Step 2: Test metadata extraction
    console.log('\n📊 Step 2: Testing metadata extraction...');
    try {
      const metadataResponse = await axios.post('http://localhost:5000/api/download/metadata', {
        url: storyUrl
      }, {
        timeout: 30000
      });
      
      console.log('✅ Metadata response received');
      console.log('📊 Platform:', metadataResponse.data.platform);
      console.log('📊 Title:', metadataResponse.data.title);
      console.log('📊 Thumbnail:', metadataResponse.data.thumbnail ? 'Present' : 'Missing');
      
    } catch (metadataError) {
      console.log('❌ Metadata extraction failed:', metadataError.message);
    }
    
    // Step 3: Test download link generation
    console.log('\n📊 Step 3: Testing download link generation...');
    try {
      const downloadResponse = await axios.post('http://localhost:5000/api/download/video', {
        url: storyUrl,
        format: 'mp4',
        quality: 'best'
      }, {
        timeout: 30000
      });
      
      console.log('✅ Download link response received');
      console.log('📊 Success:', downloadResponse.data.success);
      console.log('📊 Download URL:', downloadResponse.data.downloadUrl ? 'Present' : 'Missing');
      console.log('📊 Filename:', downloadResponse.data.filename);
      
    } catch (downloadError) {
      console.log('❌ Download link generation failed:', downloadError.message);
      if (downloadError.response) {
        console.log('📝 Error details:', downloadError.response.data);
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing story download:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runStoryTest() {
  console.log('🚀 Starting specific Instagram story test...\n');
  
  // First check if server is running
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running');
    console.log('📊 Database:', healthResponse.data.database);
  } catch (error) {
    console.log('❌ Server not accessible:', error.message);
    return;
  }
  
  await testSpecificStoryDownload();
  
  console.log('\n🏁 Story test completed!');
}

runStoryTest().catch(console.error);
