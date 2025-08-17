const axios = require('axios');

async function testRealDownloads() {
  try {
    console.log('🧪 Testing real file downloads...');

    // Test YouTube URL
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll for testing
    const serverUrl = 'http://localhost:5000';

    console.log('\n1️⃣ Testing metadata extraction...');
    const metadataResponse = await axios.post(`${serverUrl}/api/download/metadata`, {
      url: testUrl
    });

    const metadata = metadataResponse.data;
    console.log(`✅ Title: ${metadata.title}`);
    console.log(`✅ Duration: ${metadata.duration_formatted || metadata.duration}`);
    console.log(`✅ Total formats: ${metadata.allFormats?.length || 0}`);

    // Check for real file sizes
    const formatsWithRealSizes = metadata.allFormats?.filter(f => 
      f.approx_human_size && 
      f.approx_human_size !== 'Unknown' && 
      f.approx_human_size !== 'Calculating...' &&
      !f.approx_human_size.includes('MB') // Filter out static sizes
    ) || [];

    console.log(`✅ Formats with real sizes: ${formatsWithRealSizes.length}`);

    // Check for 8K support
    const eightKFormats = metadata.allFormats?.filter(f => f.height >= 4320) || [];
    console.log(`✅ 8K formats available: ${eightKFormats.length}`);

    // Test quality summary
    if (metadata.quality_summary) {
      console.log(`✅ Has 8K: ${metadata.quality_summary.has_8k}`);
      console.log(`✅ Has 4K: ${metadata.quality_summary.has_4k}`);
      console.log(`✅ Max resolution: ${metadata.quality_summary.max_video_resolution}p`);
      console.log(`✅ Extraction method: ${metadata.quality_summary.extraction_method || 'ytdl-core'}`);
    }

    // Test a sample format
    if (metadata.videoFormats && metadata.videoFormats.length > 0) {
      console.log('\n2️⃣ Testing sample format details...');
      const sampleFormat = metadata.videoFormats[0];
      console.log(`📋 Sample format: ${sampleFormat.quality_label}`);
      console.log(`📋 Container: ${sampleFormat.container}`);
      console.log(`📋 File size: ${sampleFormat.approx_human_size}`);
      console.log(`📋 Real format: ${sampleFormat.isRealFormat || 'unknown'}`);
      console.log(`📋 Notes: ${sampleFormat.notes}`);
    }

    console.log('\n✅ Test completed successfully!');
    
    return {
      success: true,
      totalFormats: metadata.allFormats?.length || 0,
      realSizeFormats: formatsWithRealSizes.length,
      has8K: metadata.quality_summary?.has_8k || false,
      extractionMethod: metadata.quality_summary?.extraction_method || 'fallback'
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testRealDownloads().then(result => {
  console.log('\n📊 Test Results:', result);
  process.exit(result.success ? 0 : 1);
});
