const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testYouTubeFormats() {
  console.log('🧪 Testing YouTube format extraction...');
  
  // Test with the same video you're using
  const testUrl = 'https://www.youtube.com/watch?v=QcQpqWhTBCE&list=RDQcQpqWhTBCE&start_radio=1';
  
  try {
    console.log('\n1️⃣ Testing Debug Endpoint...');
    const debugResponse = await axios.post(`${API_BASE}/download/debug-formats`, {
      url: testUrl
    });
    
    const debug = debugResponse.data;
    console.log('📊 Format Analysis:');
    console.log(`   Total formats: ${debug.total}`);
    console.log(`   Video qualities: ${debug.qualities.join(', ')}`);
    console.log(`   Containers: ${debug.containers.join(', ')}`);
    console.log(`   Video+Audio: ${debug.videoAndAudio}`);
    console.log(`   Video only: ${debug.videoOnly}`);
    console.log(`   Audio only: ${debug.audioOnly}`);
    
    console.log('\n📋 All available formats:');
    debug.formats.forEach((f, i) => {
      if (f.hasVideo) {
        console.log(`   ${i+1}. ${f.quality || f.height+'p'} ${f.container} (${f.hasAudio ? 'with audio' : 'video only'}) - itag: ${f.itag}`);
      }
    });
    
    console.log('\n2️⃣ Testing Extract Links Endpoint...');
    const extractResponse = await axios.post(`${API_BASE}/download/extract-links`, {
      url: testUrl,
      format: 'mp4',
      quality: 'best'
    });
    
    const extract = extractResponse.data;
    console.log('🔗 Extract Links Result:');
    console.log(`   Success: ${extract.success}`);
    console.log(`   Video formats: ${extract.videoFormats?.length || 0}`);
    console.log(`   Audio formats: ${extract.audioFormats?.length || 0}`);
    
    if (extract.videoFormats && extract.videoFormats.length > 0) {
      console.log('\n📹 Video formats returned:');
      extract.videoFormats.forEach((f, i) => {
        console.log(`   ${i+1}. ${f.quality} ${f.container} - ${f.filesize_human} (${f.hasAudio ? 'with audio' : 'video only'})`);
      });
    }
    
    if (extract.qualityStats) {
      console.log('\n📊 Quality Statistics:');
      Object.entries(extract.qualityStats).forEach(([quality, count]) => {
        if (count > 0) {
          console.log(`   ${quality}: ${count} formats`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testYouTubeFormats();
