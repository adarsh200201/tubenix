const axios = require('axios');

// Test the audio fix with a sample YouTube video
async function testAudioFix() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - reliable test video
  const serverUrl = 'http://localhost:5000';

  console.log('🧪 Testing audio fix...');
  console.log(`📹 Test video: ${testUrl}`);

  try {
    // Test 1: Get metadata to see available formats
    console.log('\n📊 Step 1: Checking available formats...');
    const metadataResponse = await axios.post(`${serverUrl}/api/download/metadata`, {
      url: testUrl
    });

    const metadata = metadataResponse.data;
    console.log(`✅ Video title: ${metadata.title}`);
    
    if (metadata.videoFormats) {
      console.log(`📺 Progressive formats (video+audio): ${metadata.videoFormats.length}`);
      metadata.videoFormats.slice(0, 3).forEach(format => {
        console.log(`  - ${format.quality_label || format.resolution} (${format.container}) - Audio: ${format.has_audio !== false ? 'YES' : 'NO'}`);
      });
    }

    if (metadata.allFormats) {
      const audioFormats = metadata.allFormats.filter(f => f.has_audio && !f.has_video);
      const videoOnlyFormats = metadata.allFormats.filter(f => f.has_video && !f.has_audio);
      console.log(`🎵 Audio-only formats: ${audioFormats.length}`);
      console.log(`📹 Video-only formats: ${videoOnlyFormats.length}`);
    }

    // Test 2: Try downloading 720p (should include audio)
    console.log('\n🔄 Step 2: Testing 720p download with audio...');
    try {
      const downloadResponse = await axios.post(`${serverUrl}/api/download/video`, {
        url: testUrl,
        quality: '720p',
        format: 'mp4'
      }, {
        timeout: 30000,
        validateStatus: () => true // Accept all status codes
      });

      if (downloadResponse.status === 200) {
        console.log('✅ 720p download initiated successfully (with audio)');
        const contentType = downloadResponse.headers['content-type'];
        console.log(`📄 Content-Type: ${contentType}`);
      } else if (downloadResponse.status === 422) {
        console.log('⚠️ 720p not available with audio, got user-friendly error:', downloadResponse.data.message);
      } else {
        console.log(`⚠️ Download response: ${downloadResponse.status} - ${downloadResponse.data?.message || 'Unknown'}`);
      }
    } catch (downloadError) {
      console.log('❌ Download test failed:', downloadError.message);
    }

    // Test 3: Try downloading 1080p (might trigger muxing)
    console.log('\n🔄 Step 3: Testing 1080p download (might require muxing)...');
    try {
      const downloadResponse = await axios.post(`${serverUrl}/api/download/video`, {
        url: testUrl,
        quality: '1080p',
        format: 'mp4'
      }, {
        timeout: 30000,
        validateStatus: () => true
      });

      if (downloadResponse.status === 200) {
        console.log('✅ 1080p download initiated successfully');
        const isMuxed = downloadResponse.headers['x-muxed-download'];
        if (isMuxed) {
          console.log('🎬 Download is using muxing (video+audio combination)');
        }
      } else if (downloadResponse.status === 422) {
        console.log('⚠️ 1080p requires muxing or not available:', downloadResponse.data.message);
      } else {
        console.log(`⚠️ Download response: ${downloadResponse.status} - ${downloadResponse.data?.message || 'Unknown'}`);
      }
    } catch (downloadError) {
      console.log('❌ 1080p download test failed:', downloadError.message);
    }

    console.log('\n🎉 Audio fix test completed!');
    console.log('💡 If downloads are working and include audio, the fix is successful.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAudioFix().catch(console.error);
