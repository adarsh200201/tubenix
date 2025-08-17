const axios = require('axios');

async function checkTaskResult() {
  try {
    const response = await axios.get('http://localhost:5000/api/instagram/status/task-1755004772931-gq4ter');
    
    console.log('📊 Task Status:', response.data.status);
    console.log('📊 Completed At:', response.data.completedAt);
    
    if (response.data.result) {
      const result = response.data.result;
      console.log('\n📊 Extraction Result:');
      console.log('📊 Title:', result.title);
      console.log('📊 Type:', result.type);
      console.log('📊 Username:', result.username);
      console.log('📊 Media Items:', result.mediaItems?.length || 0);
      
      if (result.mediaItems && result.mediaItems.length > 0) {
        console.log('\n📊 Media Items Details:');
        result.mediaItems.forEach((item, index) => {
          console.log(`\n  ${index + 1}. Media Item:`);
          console.log(`     Type: ${item.type}`);
          console.log(`     Downloadable: ${item.downloadable}`);
          console.log(`     URL: ${item.url ? 'Present' : 'Missing'}`);
          console.log(`     Filename: ${item.filename || 'Not set'}`);
          console.log(`     Source: ${item.source}`);
          console.log(`     Size: ${item.width}x${item.height || 'Unknown'}`);
          
          if (item.url) {
            console.log(`     Full URL: ${item.url}`);
            
            // Test if the URL is accessible
            console.log(`     Testing URL accessibility...`);
            axios.head(item.url, { timeout: 5000 })
              .then(() => console.log(`     ✅ URL is accessible`))
              .catch(err => console.log(`     ❌ URL test failed: ${err.message}`));
          }
        });
        
        // Check if we have downloadable content
        const downloadableItems = result.mediaItems.filter(item => item.downloadable && item.url);
        if (downloadableItems.length > 0) {
          console.log(`\n🎉 SUCCESS: Found ${downloadableItems.length} downloadable item(s)!`);
          console.log('📥 Ready for download');
        } else {
          console.log('\n❌ No downloadable items found');
        }
      } else {
        console.log('\n❌ No media items found');
      }
      
      if (result.metadata) {
        console.log('\n📊 Extraction Metadata:');
        console.log('📊 Method:', result.metadata.extractionMethod);
        console.log('📊 Success:', result.metadata.success);
        console.log('📊 Timestamp:', result.metadata.timestamp);
      }
    } else {
      console.log('❌ No result data found');
    }
    
  } catch (error) {
    console.log('❌ Error checking task result:', error.message);
    if (error.response) {
      console.log('📝 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkTaskResult();
