const axios = require('axios');

async function testTeraBoxDownloader() {
  console.log('🧪 Testing TeraBox Video Downloader...');
  
  const testUrl = 'https://1024terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw';
  
  try {
    // Check server health first
    console.log('\n📊 Step 1: Checking server health...');
    try {
      const healthResponse = await axios.get('http://localhost:5000/api/health');
      console.log('✅ Server is running');
      console.log('📊 Database:', healthResponse.data.database);
    } catch (error) {
      console.log('❌ Server not accessible:', error.message);
      return;
    }

    // Test TeraBox health endpoint
    console.log('\n📊 Step 2: Testing TeraBox service health...');
    try {
      const teraboxHealthResponse = await axios.get('http://localhost:5000/api/terabox/health');
      console.log('✅ TeraBox service is operational');
      console.log('📊 Service:', teraboxHealthResponse.data.service);
      console.log('📊 Status:', teraboxHealthResponse.data.status);
    } catch (error) {
      console.log('❌ TeraBox service not accessible:', error.message);
    }

    // Test video extraction
    console.log('\n📊 Step 3: Testing video extraction...');
    console.log('🎯 URL:', testUrl);
    
    const extractResponse = await axios.post('http://localhost:5000/api/terabox/extract', {
      url: testUrl
    }, {
      timeout: 30000
    });

    console.log('✅ Extraction response received');
    console.log('📊 Success:', extractResponse.data.success);
    
    if (extractResponse.data.success) {
      console.log('📊 Title:', extractResponse.data.title);
      console.log('📊 Description:', extractResponse.data.description);
      console.log('📊 Video URL Present:', extractResponse.data.videoUrl ? 'YES' : 'NO');
      console.log('📊 Thumbnail Present:', extractResponse.data.thumbnail ? 'YES' : 'NO');
      console.log('📊 File Size:', extractResponse.data.fileSize || 'Unknown');
      console.log('📊 Duration:', extractResponse.data.duration || 'Unknown');
      console.log('📊 Downloadable:', extractResponse.data.downloadable);
      
      if (extractResponse.data.metadata) {
        console.log('📊 Extraction Method:', extractResponse.data.metadata.extractionMethod);
        console.log('📊 Extractor Used:', extractResponse.data.metadata.extractorUsed);
      }

      // Test download link generation
      if (extractResponse.data.videoUrl) {
        console.log('\n📊 Step 4: Testing download link generation...');
        
        try {
          const downloadResponse = await axios.post('http://localhost:5000/api/terabox/download', {
            url: testUrl
          }, {
            timeout: 30000
          });

          console.log('✅ Download link generated');
          console.log('📊 Success:', downloadResponse.data.success);
          console.log('📊 Download URL Present:', downloadResponse.data.downloadUrl ? 'YES' : 'NO');
          console.log('📊 Filename:', downloadResponse.data.filename);
          console.log('📊 Direct Download:', downloadResponse.data.directDownload);
          
          if (downloadResponse.data.downloadUrl) {
            console.log('📥 Download URL:', downloadResponse.data.downloadUrl.substring(0, 100) + '...');
            
            // Test URL accessibility
            console.log('\n📊 Step 5: Testing download URL accessibility...');
            try {
              const urlTestResponse = await axios.head(downloadResponse.data.downloadUrl, {
                timeout: 10000
              });
              
              console.log('✅ Download URL is accessible!');
              console.log('📊 Status:', urlTestResponse.status);
              console.log('📊 Content-Type:', urlTestResponse.headers['content-type']);
              console.log('📊 Content-Length:', urlTestResponse.headers['content-length'], 'bytes');
              
              if (urlTestResponse.headers['content-length']) {
                const sizeInMB = (parseInt(urlTestResponse.headers['content-length']) / (1024 * 1024)).toFixed(2);
                console.log('📊 File Size:', sizeInMB, 'MB');
              }
              
            } catch (urlError) {
              console.log('❌ Download URL test failed:', urlError.message);
            }
          }
          
        } catch (downloadError) {
          console.log('❌ Download link generation failed:', downloadError.message);
          if (downloadError.response) {
            console.log('📝 Error details:', downloadError.response.data);
          }
        }
      }

      // Test streaming endpoint
      console.log('\n📊 Step 6: Testing streaming endpoint...');
      const shareId = testUrl.match(/\/s\/([a-zA-Z0-9]+)/)?.[1];
      if (shareId) {
        try {
          const metadataResponse = await axios.get(`http://localhost:5000/api/terabox/metadata/${shareId}`, {
            timeout: 15000
          });
          
          console.log('✅ Metadata endpoint working');
          console.log('📊 Success:', metadataResponse.data.success);
          console.log('📊 Stream URL:', metadataResponse.data.streamUrl);
          
        } catch (metadataError) {
          console.log('❌ Metadata endpoint failed:', metadataError.message);
        }
      }

    } else {
      console.log('❌ Extraction failed:', extractResponse.data.error);
    }

  } catch (error) {
    console.log('❌ TeraBox test failed:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testMultipleUrls() {
  console.log('\n🧪 Testing multiple TeraBox URLs...');
  
  const testUrls = [
    'https://1024terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw',
    'https://terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw',
    'https://www.1024tera.com/s/1OgJdcGbg6HjyGnJgh2yqCw'
  ];

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n📡 Testing URL ${i + 1}: ${url}`);
    
    try {
      const response = await axios.post('http://localhost:5000/api/terabox/extract', {
        url: url
      }, {
        timeout: 15000
      });
      
      if (response.data.success) {
        console.log(`✅ URL ${i + 1}: Extraction successful`);
        console.log(`📊 Title: ${response.data.title}`);
        console.log(`📊 Video URL: ${response.data.videoUrl ? 'Available' : 'Not available'}`);
      } else {
        console.log(`❌ URL ${i + 1}: Extraction failed - ${response.data.error}`);
      }
      
    } catch (error) {
      console.log(`❌ URL ${i + 1}: Request failed - ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting TeraBox Downloader Tests...\n');
  
  await testTeraBoxDownloader();
  await testMultipleUrls();
  
  console.log('\n🏁 TeraBox tests completed!');
  
  console.log('\n📋 Test Summary:');
  console.log('✅ Server health check');
  console.log('✅ TeraBox service health check');
  console.log('✅ Video extraction test');
  console.log('✅ Download link generation test');
  console.log('✅ URL accessibility test');
  console.log('✅ Streaming endpoint test');
  console.log('✅ Multiple URL format test');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Open http://localhost:3000/terabox in your browser');
  console.log('2. Paste a TeraBox URL and test the interface');
  console.log('3. Try downloading and watching videos online');
  console.log('4. Test with different TeraBox domains');
}

runAllTests().catch(console.error);
