const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeStorySaver() {
  console.log('🔍 Analyzing StorySaver.net implementation...');
  
  try {
    // Step 1: Get the main page to understand their approach
    console.log('\n📊 Step 1: Analyzing StorySaver.net main page...');
    const mainPageResponse = await axios.get('https://www.storysaver.net/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(mainPageResponse.data);
    
    // Look for form action and API endpoints
    const forms = $('form');
    console.log('📊 Found forms:', forms.length);
    
    forms.each((i, form) => {
      const action = $(form).attr('action');
      const method = $(form).attr('method');
      console.log(`  Form ${i + 1}: Action="${action}", Method="${method}"`);
    });
    
    // Look for JavaScript that might reveal API endpoints
    const scripts = $('script');
    console.log('📊 Found scripts:', scripts.length);
    
    let apiEndpoints = [];
    scripts.each((i, script) => {
      const scriptContent = $(script).html();
      if (scriptContent) {
        // Look for API endpoints
        const apiMatches = scriptContent.match(/['"`](https?:\/\/[^'"`\s]+api[^'"`\s]*)/gi);
        if (apiMatches) {
          apiEndpoints.push(...apiMatches);
        }
        
        // Look for fetch/axios calls
        const fetchMatches = scriptContent.match(/fetch\s*\(\s*['"`]([^'"`]+)/gi);
        if (fetchMatches) {
          console.log('📡 Found fetch calls:', fetchMatches);
        }
      }
    });
    
    if (apiEndpoints.length > 0) {
      console.log('📡 Found potential API endpoints:', [...new Set(apiEndpoints)]);
    }
    
    // Step 2: Try to understand their download process
    console.log('\n📊 Step 2: Testing StorySaver.net download process...');
    
    // Look for their download endpoint by testing common patterns
    const testEndpoints = [
      'https://www.storysaver.net/api/download',
      'https://www.storysaver.net/download',
      'https://www.storysaver.net/api/stories',
      'https://api.storysaver.net/download',
      'https://api.storysaver.net/stories'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`📡 Testing endpoint: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });
        console.log(`✅ ${endpoint} - Status: ${response.status}`);
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.response?.status || error.message}`);
      }
    }
    
    // Step 3: Analyze their approach vs our approach
    console.log('\n📊 Step 3: Comparing approaches...');
    
    console.log('\n🔍 StorySaver.net Analysis:');
    console.log('• Uses username-based lookup (not direct story URLs)');
    console.log('• Likely uses Instagram\'s public API endpoints');
    console.log('• May use session management or cookies');
    console.log('• Focuses on current stories, not specific story IDs');
    
    console.log('\n🔍 Our Current Approach:');
    console.log('• Uses direct story URLs with specific IDs');
    console.log('• Tries to extract from story-specific endpoints');
    console.log('• May be hitting rate limits or blocks');
    console.log('• More targeted but potentially more restricted');
    
    // Step 4: Test their method with a username
    console.log('\n📊 Step 4: Testing username-based approach...');
    
    // Try to simulate their approach
    const testUsername = 'pdfpage_official';
    console.log(`📡 Testing with username: ${testUsername}`);
    
    // Test Instagram's user story endpoint (what StorySaver likely uses)
    try {
      const userStoryEndpoint = `https://www.instagram.com/${testUsername}/`;
      const userResponse = await axios.get(userStoryEndpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      console.log('✅ User profile accessible');
      
      // Look for story indicators
      if (userResponse.data.includes('has_story')) {
        console.log('✅ Profile indicates stories are available');
      }
      
      // Look for story data in the page
      const storyDataMatch = userResponse.data.match(/"stories":\s*({[^}]+})/);
      if (storyDataMatch) {
        console.log('✅ Found story data in profile page');
      }
      
    } catch (error) {
      console.log('❌ User profile test failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ StorySaver analysis failed:', error.message);
  }
}

async function compareWithOurMethod() {
  console.log('\n🔄 Comparing with our current method...');
  
  console.log('\n📊 Key Differences:');
  console.log('1. StorySaver.net uses USERNAME → get current stories');
  console.log('2. Our system uses DIRECT STORY URL → extract specific story');
  console.log('3. StorySaver likely accesses "current" stories via profile');
  console.log('4. We try to access "specific" stories via ID');
  
  console.log('\n💡 Why StorySaver.net works:');
  console.log('• They get ALL current stories for a user');
  console.log('• They don\'t target specific expired stories');
  console.log('• They use Instagram\'s profile-based story access');
  console.log('• They may have better session management');
  
  console.log('\n🛠️ How to improve our system:');
  console.log('1. Add username-based story fetching');
  console.log('2. Get ALL current stories, not specific ones');
  console.log('3. Improve session/cookie management');
  console.log('4. Use Instagram\'s profile story endpoints');
  console.log('5. Add better user agent rotation');
}

async function runAnalysis() {
  console.log('🚀 Starting StorySaver.net analysis...\n');
  
  await analyzeStorySaver();
  await compareWithOurMethod();
  
  console.log('\n🏁 Analysis completed!');
}

runAnalysis().catch(console.error);
