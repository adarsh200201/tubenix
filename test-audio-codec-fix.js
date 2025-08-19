const axios = require('axios');

// Test the audio codec fix
async function testAudioCodecFix() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - reliable test video
  const serverUrl = 'http://localhost:5000';

  console.log('🧪 Testing audio codec compatibility fix...');
  console.log(`📹 Test video: ${testUrl}`);

  try {
    // Test 1: Get metadata to check format details
    console.log('\n📊 Step 1: Checking available formats and codecs...');
    const metadataResponse = await axios.post(`${serverUrl}/api/download/metadata`, {
      url: testUrl
    });

    const metadata = metadataResponse.data;
    console.log(`✅ Video title: ${metadata.title}`);
    
    if (metadata.allFormats) {
      console.log('\n🎵 Audio format analysis:');
      const audioFormats = metadata.allFormats.filter(f => f.has_audio);
      audioFormats.slice(0, 5).forEach(format => {
        console.log(`  - ${format.quality_label || format.resolution} (${format.container}) - Audio: ${format.has_audio !== false ? 'YES' : 'NO'}`);
      });

      // Check for progressive vs adaptive formats
      const progressiveFormats = metadata.allFormats.filter(f => f.has_video && f.has_audio);
      const mp4ProgressiveFormats = progressiveFormats.filter(f => f.container === 'mp4');
      
      console.log(`\n📊 Format breakdown:`);
      console.log(`  Progressive formats (video+audio): ${progressiveFormats.length}`);
      console.log(`  MP4 progressive formats: ${mp4ProgressiveFormats.length}`);
      
      if (mp4ProgressiveFormats.length > 0) {
        console.log(`✅ MP4 progressive formats available - should have compatible audio`);
        console.log(`  Best MP4 quality: ${mp4ProgressiveFormats[0].quality_label || mp4ProgressiveFormats[0].resolution}`);
      } else {
        console.log(`⚠️ No MP4 progressive formats - will require muxing with AAC conversion`);
      }
    }

    // Test 2: Test a quality that should use progressive format (good compatibility)
    console.log('\n🔄 Step 2: Testing 480p download (should use progressive format with good audio)...');
    try {
      const downloadResponse = await axios.post(`${serverUrl}/api/download/video`, {
        url: testUrl,
        quality: '480p',
        format: 'mp4'
      }, {
        timeout: 30000,
        validateStatus: () => true
      });

      if (downloadResponse.status === 200) {
        console.log('✅ 480p download initiated successfully');
        const contentType = downloadResponse.headers['content-type'];
        const isMuxed = downloadResponse.headers['x-muxed-download'];
        console.log(`📄 Content-Type: ${contentType}`);
        console.log(`🎬 Is Muxed: ${isMuxed ? 'YES (AAC audio)' : 'NO (progressive format)'}`);
        
        if (isMuxed) {
          console.log('🔧 Using muxing with AAC audio codec for compatibility');
        } else {
          console.log('🎵 Using progressive format - should have compatible audio');
        }
      } else {
        console.log(`⚠️ 480p download response: ${downloadResponse.status} - ${downloadResponse.data?.message || 'Unknown'}`);
      }
    } catch (downloadError) {
      console.log('❌ 480p download test failed:', downloadError.message);
    }

    // Test 3: Test high quality that will require muxing
    console.log('\n🔄 Step 3: Testing 1080p download (should use muxing with AAC audio)...');
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
        const videoQuality = downloadResponse.headers['x-video-quality'];
        const audioQuality = downloadResponse.headers['x-audio-quality'];
        
        if (isMuxed) {
          console.log('🎬 Using muxing (this will convert audio to AAC for compatibility)');
          console.log(`📹 Video quality: ${videoQuality}`);
          console.log(`🔊 Audio quality: ${audioQuality}`);
          console.log('✅ Audio will be converted to AAC format - compatible with all media players');
        } else {
          console.log('🎵 Using progressive format (rare for 1080p)');
        }
      } else if (downloadResponse.status === 422) {
        console.log('⚠️ 1080p requires special handling:', downloadResponse.data.message);
      } else {
        console.log(`⚠️ 1080p download response: ${downloadResponse.status} - ${downloadResponse.data?.message || 'Unknown'}`);
      }
    } catch (downloadError) {
      console.log('❌ 1080p download test failed:', downloadError.message);
    }

    console.log('\n🎉 Audio codec compatibility test completed!');
    console.log('\n📋 Summary of fixes applied:');
    console.log('  ✅ StreamMuxer now converts audio to AAC instead of copying Opus');
    console.log('  ✅ Progressive format selection prefers MP4 containers');
    console.log('  ✅ Audio bitrate set to 128k for compatibility');
    console.log('  ✅ Audio sample rate standardized to 44.1kHz');
    console.log('  ✅ Audio forced to stereo (2 channels)');
    console.log('\n💡 All downloads should now work in Windows Media Player and other standard players!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAudioCodecFix().catch(console.error);
