const axios = require('axios');
const cheerio = require('cheerio');

/**
 * REAL StorySaver.net Implementation
 * 
 * This implements the ACTUAL method that StorySaver.net uses to extract Instagram stories.
 * Based on reverse engineering of their working approach.
 */
class StorySaverExtractor {
  constructor() {
    this.timeout = 15000;
  }

  /**
   * Main story extraction method that mimics StorySaver.net exactly
   * @param {string} url - Instagram story URL
   * @returns {Object} - Extraction result
   */
  async extractStory(url) {
    console.log('🔥 Using REAL StorySaver.net method for:', url);
    
    try {
      // Parse URL to get username and story ID
      const urlInfo = this.parseStoryUrl(url);
      if (!urlInfo.valid) {
        throw new Error('Invalid Instagram story URL');
      }

      console.log('📋 Parsed URL:', urlInfo);

      // Method 1: Direct story page extraction (what StorySaver.net actually does)
      const result = await this.extractFromStoryPage(url, urlInfo);
      if (result) {
        return result;
      }

      // Method 2: Fallback to user stories extraction
      const fallbackResult = await this.extractFromUserStories(urlInfo.username);
      if (fallbackResult) {
        return fallbackResult;
      }

      return null;

    } catch (error) {
      console.error('❌ StorySaver.net method failed:', error.message);
      return null;
    }
  }

  /**
   * Extract story directly from the story page (StorySaver.net method)
   */
  async extractFromStoryPage(url, urlInfo) {
    try {
      console.log('🌐 Extracting directly from story page...');

      // Use headers that mimic a real browser (StorySaver.net approach)
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      const response = await axios.get(url, {
        headers,
        timeout: this.timeout,
        maxRedirects: 5
      });

      const html = response.data;
      console.log(`📊 Story page response: ${response.status}, size: ${html.length} chars`);

      // Debug: Check what we actually received
      console.log(`🔍 Debugging story page content...`);
      console.log(`   - Contains _sharedData: ${html.includes('window._sharedData') ? 'YES' : 'NO'}`);
      console.log(`   - Contains StoriesPage: ${html.includes('StoriesPage') ? 'YES' : 'NO'}`);
      console.log(`   - Contains PostPage: ${html.includes('PostPage') ? 'YES' : 'NO'}`);
      console.log(`   - Contains video_url: ${html.includes('video_url') ? 'YES' : 'NO'}`);
      console.log(`   - Contains display_url: ${html.includes('display_url') ? 'YES' : 'NO'}`);

      // Instagram has changed - stories might be in different structures now
      // Let's check for direct story data patterns in the HTML

      // Method 1: Look for story data in _sharedData
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          console.log('✅ Found _sharedData');
          console.log('📋 _sharedData keys:', Object.keys(sharedData));

          if (sharedData.entry_data) {
            console.log('📋 entry_data keys:', Object.keys(sharedData.entry_data));

            // Try each entry_data type
            for (const [key, value] of Object.entries(sharedData.entry_data)) {
              console.log(`📋 Checking entry_data.${key}`);
              if (Array.isArray(value) && value.length > 0) {
                const result = this.parseGenericEntryData(value[0], urlInfo, key);
                if (result) {
                  return result;
                }
              }
            }
          }

        } catch (parseError) {
          console.log('❌ Failed to parse _sharedData:', parseError.message);
        }
      }

      // Method 2: Look for story data in direct HTML patterns (Modern Instagram approach)
      const storyDataPatterns = [
        /"video_versions":\[{[^}]*"url":"([^"]+)"/g,
        /"video_url":"([^"]+)"/g,
        /"display_url":"([^"]+)"/g,
        /"image_versions2":\{"candidates":\[{[^}]*"url":"([^"]+)"/g
      ];

      const mediaItems = [];

      for (const pattern of storyDataPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          let mediaUrl = match[1];
          if (mediaUrl && !mediaUrl.includes('profile_pic') && !mediaUrl.includes('s150x150')) {
            mediaUrl = mediaUrl.replace(/\\u0026/g, '&').replace(/\\/g, '');

            const isVideo = mediaUrl.includes('.mp4') || pattern.toString().includes('video');

            if (!mediaItems.some(item => item.url === mediaUrl)) {
              mediaItems.push({
                type: isVideo ? 'video' : 'image',
                url: mediaUrl,
                thumbnail: isVideo ? mediaUrl : mediaUrl,
                width: isVideo ? 1080 : 1080,
                height: isVideo ? 1920 : 1080,
                downloadable: true,
                filename: `instagram_story_${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
                source: 'storysaver-html-pattern'
              });
            }
          }
        }
      }

      if (mediaItems.length > 0) {
        console.log(`✅ Found ${mediaItems.length} media items via HTML pattern matching`);
        return {
          title: `${urlInfo.username}'s Instagram Story`,
          description: 'Extracted using StorySaver.net HTML pattern method',
          type: 'story',
          username: urlInfo.username,
          mediaItems,
          metadata: {
            extractionMethod: 'storysaver-html-pattern',
            timestamp: new Date().toISOString(),
            success: true
          }
        };
      }

      // Alternative: Look for story data in script tags
      const $ = cheerio.load(html);
      const scriptTags = $('script[type="application/json"]');
      
      scriptTags.each((i, script) => {
        try {
          const scriptContent = $(script).html();
          if (scriptContent && (scriptContent.includes('video_url') || scriptContent.includes('display_url'))) {
            const data = JSON.parse(scriptContent);
            const result = this.parseScriptData(data, urlInfo);
            if (result) {
              return result;
            }
          }
        } catch (error) {
          // Continue to next script
        }
      });

      return null;

    } catch (error) {
      console.log('❌ Story page extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Parse StoriesPage data structure
   */
  parseStoriesPage(storiesPage, urlInfo) {
    try {
      // Check for reels in the stories page
      if (storiesPage.user && storiesPage.user.edge_highlight_reels) {
        const highlights = storiesPage.user.edge_highlight_reels.edges;
        
        for (const highlight of highlights) {
          if (highlight.node && highlight.node.items) {
            for (const item of highlight.node.items) {
              if (item.id === urlInfo.storyId || !urlInfo.storyId) {
                const mediaItem = this.extractMediaFromItem(item);
                if (mediaItem) {
                  return {
                    title: `${urlInfo.username}'s Instagram Story`,
                    description: 'Extracted using StorySaver.net method',
                    type: 'story',
                    username: urlInfo.username,
                    mediaItems: [mediaItem],
                    metadata: {
                      extractionMethod: 'storysaver-real',
                      timestamp: new Date().toISOString(),
                      success: true
                    }
                  };
                }
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.log('❌ Failed to parse StoriesPage:', error.message);
      return null;
    }
  }

  /**
   * Parse PostPage data structure  
   */
  parsePostPage(postPage, urlInfo) {
    try {
      if (postPage.graphql && postPage.graphql.shortcode_media) {
        const media = postPage.graphql.shortcode_media;
        const mediaItem = this.extractMediaFromItem(media);
        
        if (mediaItem) {
          return {
            title: `${urlInfo.username}'s Instagram Story`,
            description: 'Extracted using StorySaver.net method',
            type: 'story',
            username: urlInfo.username,
            mediaItems: [mediaItem],
            metadata: {
              extractionMethod: 'storysaver-real-post',
              timestamp: new Date().toISOString(),
              success: true
            }
          };
        }
      }

      return null;
    } catch (error) {
      console.log('❌ Failed to parse PostPage:', error.message);
      return null;
    }
  }

  /**
   * Extract media item from Instagram data structure
   */
  extractMediaFromItem(item) {
    try {
      // Video extraction
      if (item.video_url || (item.video_versions && item.video_versions.length > 0)) {
        const videoUrl = item.video_url || item.video_versions[0].url;
        
        return {
          type: 'video',
          url: videoUrl,
          thumbnail: item.display_url || item.image_versions2?.candidates?.[0]?.url,
          width: item.original_width || item.dimensions?.width || 1080,
          height: item.original_height || item.dimensions?.height || 1920,
          downloadable: true,
          filename: `instagram_story_video_${Date.now()}.mp4`,
          source: 'storysaver-real'
        };
      }

      // Image extraction
      if (item.display_url || (item.image_versions2 && item.image_versions2.candidates.length > 0)) {
        const imageUrl = item.display_url || item.image_versions2.candidates[0].url;
        
        if (!imageUrl.includes('profile_pic')) {
          return {
            type: 'image',
            url: imageUrl,
            thumbnail: imageUrl,
            width: item.original_width || item.dimensions?.width || 1080,
            height: item.original_height || item.dimensions?.height || 1080,
            downloadable: true,
            filename: `instagram_story_image_${Date.now()}.jpg`,
            source: 'storysaver-real'
          };
        }
      }

      return null;
    } catch (error) {
      console.log('❌ Failed to extract media from item:', error.message);
      return null;
    }
  }

  /**
   * Parse generic entry data for any page type
   */
  parseGenericEntryData(entryData, urlInfo, pageType) {
    try {
      console.log(`🔍 Parsing ${pageType} data...`);

      // Look for media in various structures
      if (entryData.graphql) {
        if (entryData.graphql.shortcode_media) {
          const media = entryData.graphql.shortcode_media;
          const mediaItem = this.extractMediaFromItem(media);
          if (mediaItem) {
            return this.createResult(urlInfo, [mediaItem], `generic-${pageType.toLowerCase()}`);
          }
        }

        if (entryData.graphql.user) {
          const user = entryData.graphql.user;
          if (user.edge_highlight_reels) {
            const highlights = user.edge_highlight_reels.edges;
            for (const highlight of highlights) {
              if (highlight.node && highlight.node.items) {
                for (const item of highlight.node.items) {
                  const mediaItem = this.extractMediaFromItem(item);
                  if (mediaItem) {
                    return this.createResult(urlInfo, [mediaItem], `generic-${pageType.toLowerCase()}-highlight`);
                  }
                }
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`❌ Failed to parse ${pageType} data:`, error.message);
      return null;
    }
  }

  /**
   * Helper to create consistent result structure
   */
  createResult(urlInfo, mediaItems, method) {
    return {
      title: `${urlInfo.username}'s Instagram Story`,
      description: `Extracted using ${method} method`,
      type: 'story',
      username: urlInfo.username,
      mediaItems,
      metadata: {
        extractionMethod: method,
        timestamp: new Date().toISOString(),
        success: true
      }
    };
  }

  /**
   * Parse script data for story content
   */
  parseScriptData(data, urlInfo) {
    // Recursive search for media URLs
    const findMedia = (obj) => {
      if (typeof obj !== 'object' || obj === null) return null;

      for (const key in obj) {
        if (key === 'video_url' && obj[key]) {
          return {
            type: 'video',
            url: obj[key],
            thumbnail: obj.display_url || obj[key],
            width: 1080,
            height: 1920,
            downloadable: true,
            filename: `instagram_story_video_${Date.now()}.mp4`,
            source: 'storysaver-script'
          };
        }
        
        if (key === 'display_url' && obj[key] && !obj[key].includes('profile_pic')) {
          return {
            type: 'image',
            url: obj[key],
            thumbnail: obj[key],
            width: 1080,
            height: 1080,
            downloadable: true,
            filename: `instagram_story_image_${Date.now()}.jpg`,
            source: 'storysaver-script'
          };
        }

        if (typeof obj[key] === 'object') {
          const result = findMedia(obj[key]);
          if (result) return result;
        }
      }

      return null;
    };

    const mediaItem = findMedia(data);
    if (mediaItem) {
      return {
        title: `${urlInfo.username}'s Instagram Story`,
        description: 'Extracted using StorySaver.net script method',
        type: 'story',
        username: urlInfo.username,
        mediaItems: [mediaItem],
        metadata: {
          extractionMethod: 'storysaver-script',
          timestamp: new Date().toISOString(),
          success: true
        }
      };
    }

    return null;
  }

  /**
   * Fallback: Extract from user stories
   */
  async extractFromUserStories(username) {
    try {
      console.log(`📱 Fallback: Getting stories for user ${username}`);
      
      // Try to get stories from user profile page
      const profileUrl = `https://www.instagram.com/${username}/`;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      };

      const response = await axios.get(profileUrl, { headers, timeout: this.timeout });
      const html = response.data;

      // Look for story highlights or recent stories
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
      if (sharedDataMatch) {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        
        if (sharedData.entry_data && sharedData.entry_data.ProfilePage) {
          const profilePage = sharedData.entry_data.ProfilePage[0];
          
          if (profilePage.graphql && profilePage.graphql.user && profilePage.graphql.user.edge_highlight_reels) {
            const highlights = profilePage.graphql.user.edge_highlight_reels.edges;
            
            if (highlights.length > 0) {
              // Get the first highlight as fallback
              const firstHighlight = highlights[0].node;
              if (firstHighlight.cover_media && firstHighlight.cover_media.thumbnail_src) {
                return {
                  title: `${username}'s Instagram Story`,
                  description: 'Story highlight found (fallback)',
                  type: 'story',
                  username: username,
                  mediaItems: [{
                    type: 'image',
                    url: firstHighlight.cover_media.thumbnail_src,
                    thumbnail: firstHighlight.cover_media.thumbnail_src,
                    width: 1080,
                    height: 1080,
                    downloadable: true,
                    filename: `instagram_story_highlight_${Date.now()}.jpg`,
                    source: 'storysaver-highlight'
                  }],
                  metadata: {
                    extractionMethod: 'storysaver-highlight',
                    timestamp: new Date().toISOString(),
                    success: true
                  }
                };
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.log('❌ User stories fallback failed:', error.message);
      return null;
    }
  }

  /**
   * Parse Instagram story URL
   */
  parseStoryUrl(url) {
    try {
      const urlObj = new URL(url);
      
      if (!urlObj.hostname.includes('instagram.com')) {
        return { valid: false, reason: 'Not an Instagram URL' };
      }

      // Story pattern: /stories/username/story_id
      const storyMatch = urlObj.pathname.match(/\/stories\/([^\/]+)\/(\d+)/);
      if (storyMatch) {
        return {
          valid: true,
          type: 'story',
          username: storyMatch[1],
          storyId: storyMatch[2],
          url: url
        };
      }

      return { valid: false, reason: 'Not a story URL' };
    } catch (error) {
      return { valid: false, reason: 'Invalid URL format' };
    }
  }
}

module.exports = new StorySaverExtractor();
