const TeraBoxExtractor = require('./server/services/TeraBoxExtractor');

async function testWorkingTeraBox() {
  console.log('🧪 Testing with WORKING TeraBox URL format...');
  
  const workingUrl = 'https://www.terabox.app/sharing/link?surl=OgJdcGbg6HjyGnJgh2yqCw';
  const oldUrl = 'https://1024terabox.com/s/1OgJdcGbg6HjyGnJgh2yqCw';
  
  console.log('\n📊 Testing URL validation...');
  console.log('✅ Working URL valid:', TeraBoxExtractor.isValidTeraBoxUrl(workingUrl));
  console.log('✅ Old URL valid:', TeraBoxExtractor.isValidTeraBoxUrl(oldUrl));
  
  console.log('\n📊 Testing URL parsing...');
  const workingUrlInfo = TeraBoxExtractor.parseTeraBoxUrl(workingUrl);
  const oldUrlInfo = TeraBoxExtractor.parseTeraBoxUrl(oldUrl);
  
  console.log('📋 Working URL Info:', workingUrlInfo);
  console.log('📋 Old URL Info:', oldUrlInfo);
  
  console.log('\n🎯 Testing extraction with WORKING URL...');
  try {
    const result = await TeraBoxExtractor.extractVideo(workingUrl);
    
    if (result) {
      console.log('🎉 WORKING URL extraction successful!');
      console.log('📊 Title:', result.title);
      console.log('📊 Description:', result.description);
      console.log('📊 Video URL:', result.videoUrl ? 'Available' : 'Not available');
      console.log('📊 Thumbnail:', result.thumbnail ? 'Available' : 'Not available');
      console.log('📊 File Size:', result.fileSize || 'Unknown');
      console.log('📊 Duration:', result.duration || 'Unknown');
      
      if (result.metadata) {
        console.log('📊 Extraction Method:', result.metadata.extractionMethod);
        console.log('📊 Extractor Used:', result.metadata.extractorUsed);
        console.log('📊 Success:', result.metadata.success);
      }
      
      if (result.videoUrl) {
        console.log('📥 Video URL Preview:', result.videoUrl.substring(0, 100) + '...');
      }
    } else {
      console.log('❌ Working URL extraction returned null');
    }
    
  } catch (error) {
    console.log('❌ Working URL extraction failed:', error.message);
    console.log('📝 Stack trace:', error.stack);
  }
}

async function testViaAPI() {
  console.log('\n🌐 Testing via API endpoint...');
  
  const axios = require('axios');
  const workingUrl = 'https://www.terabox.app/sharing/link?surl=OgJdcGbg6HjyGnJgh2yqCw';
  
  try {
    console.log('📡 Testing API extraction...');
    
    const response = await axios.post('http://localhost:5000/api/terabox/extract', {
      url: workingUrl
    }, {
      timeout: 45000
    });
    
    console.log('✅ API response received');
    console.log('📊 Success:', response.data.success);
    
    if (response.data.success) {
      console.log('🎉 API extraction successful!');
      console.log('📊 Title:', response.data.title);
      console.log('📊 Video URL:', response.data.videoUrl ? 'Available' : 'Not available');
      console.log('📊 Downloadable:', response.data.downloadable);
      
      if (response.data.metadata) {
        console.log('📊 Method:', response.data.metadata.extractionMethod);
      }
      
      // Test download endpoint
      console.log('\n📥 Testing download endpoint...');
      const downloadResponse = await axios.post('http://localhost:5000/api/terabox/download', {
        url: workingUrl
      }, {
        timeout: 30000
      });
      
      console.log('✅ Download response received');
      console.log('📊 Success:', downloadResponse.data.success);
      console.log('📊 Filename:', downloadResponse.data.filename);
      console.log('📊 Direct Download:', downloadResponse.data.directDownload);
      
    } else {
      console.log('❌ API extraction failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ API request failed:', error.message);
    if (error.response) {
      console.log('📝 Error details:', error.response.data);
    }
  }
}

async function runWorkingTests() {
  console.log('🚀 Starting WORKING TeraBox URL tests...\n');
  
  await testWorkingTeraBox();
  await testViaAPI();
  
  console.log('\n🏁 Working TeraBox tests completed!');
  
  console.log('\n📋 Summary:');
  console.log('✅ Updated URL validation for terabox.app');
  console.log('✅ Added support for /sharing/link?surl= format');
  console.log('✅ Enhanced API endpoints');
  console.log('✅ Improved mobile view handling');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Test the web interface with the working URL');
  console.log('2. Try downloading and streaming the video');
  console.log('3. Verify all TeraBox formats work correctly');
}

runWorkingTests().catch(console.error);
