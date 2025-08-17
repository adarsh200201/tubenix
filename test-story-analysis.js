const axios = require('axios');

async function analyzeStoryUrl() {
  const storyUrl = 'https://www.instagram.com/stories/pdfpage_official/3697565265603759740?igsh=MWV4am1wd3JrajM0bA==';
  
  console.log('🔍 Analyzing Instagram Story URL...');
  console.log('📡 URL:', storyUrl);
  
  // Extract components
  const urlParts = storyUrl.match(/instagram\.com\/stories\/([^\/]+)\/(\d+)/);
  if (urlParts) {
    const username = urlParts[1];
    const storyId = urlParts[2];
    
    console.log('👤 Username:', username);
    console.log('🆔 Story ID:', storyId);
    
    // Test if we can access the user's profile
    console.log('\n🔍 Testing user profile access...');
    try {
      const profileUrl = `https://www.instagram.com/${username}/`;
      const response = await axios.get(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      console.log('✅ Profile accessible');
      console.log('📊 Response status:', response.status);
      
      // Check if profile contains story indicators
      if (response.data.includes('has_story')) {
        console.log('📊 Profile indicates stories are available');
      } else {
        console.log('📊 No story indicators found in profile');
      }
      
    } catch (error) {
      console.log('❌ Profile access failed:', error.message);
    }
    
    // Test story-specific extraction methods
    console.log('\n🔍 Testing story extraction methods...');
    
    // Method 1: Try direct story API
    try {
      console.log('📡 Method 1: Direct story API...');
      const storyApiUrl = `https://i.instagram.com/api/v1/media/${storyId}/info/`;
      const apiResponse = await axios.get(storyApiUrl, {
        headers: {
          'User-Agent': 'Instagram 301.0.0.41.111 Android (30/11; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)',
          'Accept': '*/*',
          'Accept-Language': 'en-US',
          'X-IG-App-ID': '936619743392459'
        },
        timeout: 10000
      });
      
      console.log('✅ Story API accessible');
      console.log('📊 Response status:', apiResponse.status);
      
      if (apiResponse.data && apiResponse.data.items) {
        console.log('📊 Story items found:', apiResponse.data.items.length);
        
        apiResponse.data.items.forEach((item, index) => {
          console.log(`  Item ${index + 1}:`);
          console.log(`    Media type: ${item.media_type}`);
          console.log(`    Has video: ${!!item.video_versions}`);
          console.log(`    Has image: ${!!item.image_versions2}`);
          
          if (item.video_versions && item.video_versions.length > 0) {
            console.log(`    Video URL: ${item.video_versions[0].url.substring(0, 100)}...`);
          }
          if (item.image_versions2 && item.image_versions2.candidates.length > 0) {
            console.log(`    Image URL: ${item.image_versions2.candidates[0].url.substring(0, 100)}...`);
          }
        });
      }
      
    } catch (error) {
      console.log('❌ Story API failed:', error.message);
    }
    
    // Method 2: Try embed approach
    try {
      console.log('\n📡 Method 2: Embed approach...');
      const embedUrl = `https://www.instagram.com/p/${storyId}/embed/`;
      const embedResponse = await axios.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      console.log('✅ Embed accessible');
      console.log('📊 Response status:', embedResponse.status);
      
      // Look for media URLs in the embed
      const videoMatches = embedResponse.data.match(/"video_url":"([^"]+)"/g);
      const imageMatches = embedResponse.data.match(/"display_url":"([^"]+)"/g);
      
      if (videoMatches) {
        console.log('📊 Video URLs found:', videoMatches.length);
      }
      if (imageMatches) {
        console.log('📊 Image URLs found:', imageMatches.length);
      }
      
    } catch (error) {
      console.log('❌ Embed approach failed:', error.message);
    }
    
  } else {
    console.log('❌ Could not parse story URL');
  }
}

async function testStoryAvailability() {
  console.log('\n🕐 Testing story availability...');
  
  // Stories expire after 24 hours
  const storyId = '3697565265603759740';
  const storyTimestamp = parseInt(storyId.substring(0, 10)) * 1000; // First 10 digits are timestamp
  const storyDate = new Date(storyTimestamp);
  const now = new Date();
  const hoursSincePosted = (now - storyDate) / (1000 * 60 * 60);
  
  console.log('📅 Story posted:', storyDate.toISOString());
  console.log('📅 Current time:', now.toISOString());
  console.log('⏰ Hours since posted:', hoursSincePosted.toFixed(2));
  
  if (hoursSincePosted > 24) {
    console.log('⚠️ Story has likely expired (>24 hours old)');
  } else {
    console.log('✅ Story should still be available (<24 hours old)');
  }
}

async function runAnalysis() {
  console.log('🚀 Starting Instagram Story Analysis...\n');
  
  await testStoryAvailability();
  await analyzeStoryUrl();
  
  console.log('\n🏁 Analysis completed!');
  console.log('\n💡 Recommendations:');
  console.log('1. If story is >24 hours old, it has expired');
  console.log('2. Try with a more recent story (posted within last 24 hours)');
  console.log('3. Ensure the story is from a public account');
  console.log('4. Test with a regular post/reel instead of a story');
}

runAnalysis().catch(console.error);
