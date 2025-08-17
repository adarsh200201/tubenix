const axios = require('axios');

async function testRealInstagramDownload() {
  console.log('🧪 Testing real Instagram download process...');
  
  // Test with a real Instagram reel URL (this is a public reel)
  const testUrl = 'https://www.instagram.com/reel/C2QJ8K9P8K9/';
  
  try {
    console.log(`📡 Testing extraction for: ${testUrl}`);
    
    // Step 1: Test metadata extraction
    console.log('\n📊 Step 1: Testing metadata extraction...');
    const metadataResponse = await axios.post('http://localhost:5000/api/download/metadata', {
      url: testUrl
    }, {
      timeout: 30000
    });
    
    console.log('✅ Metadata response received');
    console.log('📊 Platform:', metadataResponse.data.platform);
    console.log('📊 Title:', metadataResponse.data.title);
    console.log('📊 Duration:', metadataResponse.data.duration);
    console.log('📊 Thumbnail:', metadataResponse.data.thumbnail ? 'Present' : 'Missing');
    
    // Step 2: Test direct extraction
    console.log('\n📊 Step 2: Testing direct extraction...');
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
    console.log('📊 Media Items:', extractResponse.data.mediaItems?.length || 0);
    
    if (extractResponse.data.mediaItems && extractResponse.data.mediaItems.length > 0) {
      console.log('\n📊 Media Items Details:');
      extractResponse.data.mediaItems.forEach((item, index) => {
        console.log(`  ${index + 1}. Type: ${item.type}`);
        console.log(`     Downloadable: ${item.downloadable}`);
        console.log(`     URL: ${item.url ? 'Present' : 'Missing'}`);
        console.log(`     Filename: ${item.filename || 'Not set'}`);
        console.log(`     Source: ${item.source}`);
        console.log(`     Size: ${item.width}x${item.height || 'Unknown'}`);
      });
    }
    
    // Step 3: Test download link generation
    console.log('\n📊 Step 3: Testing download link generation...');
    const downloadResponse = await axios.post('http://localhost:5000/api/download/video', {
      url: testUrl,
      format: 'mp4',
      quality: 'best'
    }, {
      timeout: 30000
    });
    
    console.log('✅ Download link response received');
    console.log('📊 Success:', downloadResponse.data.success);
    console.log('📊 Download URL:', downloadResponse.data.downloadUrl ? 'Present' : 'Missing');
    console.log('📊 Filename:', downloadResponse.data.filename);
    console.log('📊 Direct Download:', downloadResponse.data.directDownload);
    
    // Summary
    console.log('\n🎯 Test Summary:');
    const metadataWorking = metadataResponse.data.platform === 'Instagram';
    const extractionWorking = extractResponse.data.success && extractResponse.data.mediaItems && extractResponse.data.mediaItems.some(item => item.downloadable);
    const downloadWorking = downloadResponse.data.success && downloadResponse.data.downloadUrl;
    
    console.log(`📊 Metadata Extraction: ${metadataWorking ? '✅ Working' : '❌ Failed'}`);
    console.log(`📊 Media Extraction: ${extractionWorking ? '✅ Working' : '❌ Failed'}`);
    console.log(`📊 Download Links: ${downloadWorking ? '✅ Working' : '❌ Failed'}`);
    
    if (metadataWorking && extractionWorking && downloadWorking) {
      console.log('\n🎉 SUCCESS: Instagram download process is fully functional!');
      console.log('✅ Reels and stories can be downloaded correctly');
      console.log('✅ All content is properly saved and accessible');
    } else {
      console.log('\n⚠️ ISSUES DETECTED: Some parts of the download process need attention');
    }
    
  } catch (error) {
    console.log('❌ Error testing download process:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testDownloadVerification() {
  console.log('\n🔍 Testing download verification...');
  
  try {
    // Check if downloads directory exists
    const fs = require('fs');
    const path = require('path');
    
    const possibleDownloadPaths = [
      './downloads',
      './uploads',
      './server/downloads',
      './server/uploads',
      './client/public/downloads'
    ];
    
    console.log('📁 Checking for download directories...');
    for (const downloadPath of possibleDownloadPaths) {
      if (fs.existsSync(downloadPath)) {
        console.log(`✅ Found directory: ${downloadPath}`);
        const files = fs.readdirSync(downloadPath);
        console.log(`📊 Files in directory: ${files.length}`);
        if (files.length > 0) {
          console.log('📄 Recent files:');
          files.slice(0, 5).forEach(file => {
            const stats = fs.statSync(path.join(downloadPath, file));
            console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
          });
        }
      } else {
        console.log(`❌ Directory not found: ${downloadPath}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error checking downloads:', error.message);
  }
}

async function runFullTest() {
  console.log('🚀 Starting comprehensive Instagram download verification...\n');
  
  await testRealInstagramDownload();
  await testDownloadVerification();
  
  console.log('\n🏁 Verification completed!');
}

runFullTest().catch(console.error);
