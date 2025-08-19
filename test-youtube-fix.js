const YouTubeDownloader = require('./server/services/YouTubeDownloader');

async function testYouTubeDownloader() {
  console.log('🔧 Testing improved YouTube downloader...');
  
  // Test with the URL provided by the user
  const testUrl = 'https://www.youtube.com/watch?v=QcQpqWhTBCE&list=RDQcQpqWhTBCE&start_radio=1';
  
  try {
    console.log('📹 Testing video:', testUrl);
    
    // Test extraction
    const result = await YouTubeDownloader.extractRealDownloadUrls(testUrl);
    
    if (result.success) {
      console.log('✅ Extraction successful!');
      console.log('📝 Title:', result.title);
      console.log('🎬 Video ID:', result.videoId);
      console.log('⏱️ Duration:', result.duration, 'seconds');
      console.log('🎨 Thumbnail:', result.thumbnail);
      console.log('📊 Available formats:', result.formats.length);
      
      // Show some format details
      result.formats.slice(0, 5).forEach((format, index) => {
        console.log(`  ${index + 1}. ${format.quality} (${format.container}) - ${format.type}`);
      });
      
      // Test getting download URL
      console.log('\n🔗 Testing download URL extraction...');
      const downloadResult = await YouTubeDownloader.getDownloadUrl(testUrl, '1080');
      
      if (downloadResult.success) {
        console.log('✅ Download URL extraction successful!');
        console.log('📎 Format:', downloadResult.format.quality, downloadResult.format.container);
        console.log('💾 File size:', downloadResult.filesize ? `${Math.round(downloadResult.filesize / (1024 * 1024))}MB` : 'Unknown');
        console.log('🔗 URL length:', downloadResult.downloadUrl.length);
      } else {
        console.log('❌ Download URL extraction failed');
      }
      
    } else {
      console.log('❌ Extraction failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testYouTubeDownloader().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
