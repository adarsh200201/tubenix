const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Instagram Media Extractor - StorySaver.net style implementation
 * 
 * Complete backend workflow for Instagram story/reel extraction:
 * - Multiple extraction methods (meta-tags → JSON → GraphQL → headless)
 * - Proxy/request layer with rotating headers
 * - Robust fallbacks for protected content
 * - Production-grade error handling
 */
class InstagramExtractor {
  constructor() {
    this.userAgents = [
      // Desktop browsers
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      // Mobile browsers
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      // Instagram app user agents
      'Instagram 276.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229237)',
      'Instagram 302.0.0.23.109 (iPhone14,3; iOS 17_1; en_US; en-US; scale=3.00; 1170x2532; 489720489) AppleWebKit/420+'
    ];

    this.timeout = 15000;
  }

  /**
   * Main extraction method - tries multiple extractors in sequence
   * @param {string} url - Instagram URL (post/story/reel)
   * @returns {Object} - Extraction result
   */
  async extractMedia(url) {
    console.log('🎯 Starting Instagram extraction for:', url);
    
    try {
      const urlInfo = this.parseInstagramUrl(url);
      if (!urlInfo.valid) {
        throw new Error('Invalid Instagram URL format');
      }

      console.log('📋 URL Info:', urlInfo);

      // Pipeline: Stories get WORKING StorySaver.net method FIRST, then fallbacks
      const extractors = urlInfo.type === 'story' ? [
        () => this.extractInstagramStoryWorking(url), // THE WORKING StorySaver.net method - PRIORITY
        () => this.extractUsingRealStorySaverMethod(url), // REAL StorySaver.net method - SECONDARY
        () => this.extractFromMobileAPI(url, urlInfo),
        () => this.extractReelVideoData(url, urlInfo),
        () => this.extractFromJSON(url),
        () => this.extractFromGraphQL(url, urlInfo),
        () => this.extractFromMetaTags(url)
      ] : urlInfo.type === 'reel' ? [
        () => this.extractReelVideoData(url, urlInfo),
        () => this.extractFromMobileAPI(url, urlInfo),
        () => this.extractFromJSON(url),
        () => this.extractFromGraphQL(url, urlInfo),
        () => this.extractFromMetaTags(url)
      ] : [
        () => this.extractFromMetaTags(url),
        () => this.extractFromJSON(url),
        () => this.extractFromGraphQL(url, urlInfo),
        () => this.extractFromEmbedAPI(url, urlInfo),
        () => this.extractFromMobileAPI(url, urlInfo)
      ];

      for (let i = 0; i < extractors.length; i++) {
        try {
          console.log(`🔍 Method ${i + 1}: Running extractor...`);
          const result = await extractors[i]();
          
          if (result && result.mediaItems && result.mediaItems.length > 0) {
            const validMedia = result.mediaItems.filter(item => 
              item.url && !item.url.includes('profile_pic') && item.downloadable
            );
            
            if (validMedia.length > 0) {
              console.log(`�� Method ${i + 1}: Extraction successful - ${validMedia.length} media items found`);
              return {
                ...result,
                mediaItems: validMedia,
                metadata: {
                  ...result.metadata,
                  extractionMethod: result.metadata.extractionMethod,
                  extractorUsed: i + 1,
                  totalExtractorsTried: i + 1
                }
              };
            }
          }
          
          console.log(`❌ Method ${i + 1}: No valid media found`);
        } catch (error) {
          console.log(`❌ Method ${i + 1}: Failed - ${error.message}`);
        }
      }

      // For stories, return null to trigger headless browser instead of fallback
      if (urlInfo.type === 'story') {
        console.log('🎬 Story extraction failed - will trigger headless browser fallback');
        return null; // This will trigger headless browser in the main route
      }

      // If all extractors fail, return graceful fallback
      return this.createFallbackResponse(url, urlInfo);

    } catch (error) {
      console.error('❌ Instagram extraction error:', error.message);
      return this.createErrorResponse(url, error);
    }
  }

  /**
   * Parse and validate Instagram URL
   * @param {string} url - Instagram URL
   * @returns {Object} - Parsed URL information
   */
  parseInstagramUrl(url) {
    try {
      const urlObj = new URL(url);
      
      if (!urlObj.hostname.includes('instagram.com')) {
        return { valid: false, reason: 'Not an Instagram URL' };
      }

      // Post/Reel patterns
      const postMatch = urlObj.pathname.match(/\/p\/([A-Za-z0-9_-]+)/);
      const reelMatch = urlObj.pathname.match(/\/reel\/([A-Za-z0-9_-]+)/);
      const igtvMatch = urlObj.pathname.match(/\/tv\/([A-Za-z0-9_-]+)/);
      
      // Story patterns
      const storyMatch = urlObj.pathname.match(/\/stories\/([^\/]+)\/(\d+)/);
      const highlightMatch = urlObj.pathname.match(/\/stories\/highlights\/(\d+)/);

      if (postMatch) {
        return {
          valid: true,
          type: 'post',
          shortcode: postMatch[1],
          url: `https://www.instagram.com/p/${postMatch[1]}/`
        };
      }

      if (reelMatch) {
        return {
          valid: true,
          type: 'reel',
          shortcode: reelMatch[1],
          url: `https://www.instagram.com/reel/${reelMatch[1]}/`
        };
      }

      if (igtvMatch) {
        return {
          valid: true,
          type: 'igtv',
          shortcode: igtvMatch[1],
          url: `https://www.instagram.com/tv/${igtvMatch[1]}/`
        };
      }

      if (storyMatch) {
        return {
          valid: true,
          type: 'story',
          username: storyMatch[1],
          storyId: storyMatch[2],
          url: `https://www.instagram.com/stories/${storyMatch[1]}/${storyMatch[2]}/`
        };
      }

      if (highlightMatch) {
        return {
          valid: true,
          type: 'highlight',
          highlightId: highlightMatch[1],
          url: `https://www.instagram.com/stories/highlights/${highlightMatch[1]}/`
        };
      }

      return { valid: false, reason: 'Unsupported Instagram URL format' };

    } catch (error) {
      return { valid: false, reason: 'Invalid URL format' };
    }
  }

  /**
   * Extractor 1: Meta tags and OpenGraph data
   * @param {string} url - Instagram URL
   * @returns {Object|null} - Extraction result
   */
  async extractFromMetaTags(url) {
    try {
      console.log('🏷️ Trying meta tags extraction...');

      // Parse URL to detect content type for better handling
      const urlInfo = this.parseInstagramUrl(url);

      const headers = this.getRandomHeaders();
      const response = await axios.get(url, {
        headers,
        timeout: this.timeout,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Extract meta tag information
      const title = $('meta[property="og:title"]').attr('content') || 
                   $('title').text() || 'Instagram Media';
      
      const description = $('meta[property="og:description"]').attr('content') || '';
      
      const videoUrl = $('meta[property="og:video"]').attr('content') ||
                      $('meta[property="og:video:url"]').attr('content');
      
      const imageUrl = $('meta[property="og:image"]').attr('content');
      
      const mediaItems = [];
      
      if (videoUrl && !videoUrl.includes('profile_pic')) {
        mediaItems.push({
          type: 'video',
          url: videoUrl,
          thumbnail: imageUrl || videoUrl,
          width: parseInt($('meta[property="og:video:width"]').attr('content')) || 1080,
          height: parseInt($('meta[property="og:video:height"]').attr('content')) || 1920,
          downloadable: true,
          filename: `instagram_video_${Date.now()}.mp4`,
          source: 'meta-tags'
        });
      } else if (imageUrl && !imageUrl.includes('profile_pic')) {
        mediaItems.push({
          type: 'image',
          url: imageUrl,
          thumbnail: imageUrl,
          width: 1080,
          height: 1080,
          downloadable: true,
          filename: `instagram_image_${Date.now()}.jpg`,
          source: 'meta-tags'
        });
      }

      if (mediaItems.length > 0) {
        // For story URLs, if we only found a profile picture, return null to trigger other extractors
        if (urlInfo.type === 'story') {
          const hasProfilePic = mediaItems.some(item =>
            item.url.includes('profile_pic') ||
            item.url.includes('s150x150') ||
            (item.width === 1080 && item.height === 1080) // Square images are likely profile pics for stories
          );

          if (hasProfilePic || mediaItems.length === 1) {
            console.log('🏷️ Story URL detected but only profile picture found - triggering other extractors');
            return null;
          }
        }

        return {
          title,
          description,
          type: urlInfo.type || 'post',
          username: urlInfo.username,
          mediaItems,
          metadata: {
            extractionMethod: 'meta-tags',
            timestamp: new Date().toISOString(),
            success: true
          }
        };
      }

      return null;

    } catch (error) {
      console.log('❌ Meta tags extraction failed:', error.message);
      return null;
    }
  }

  /**
   * StorySaver.net-style Reel Video Extractor
   * Extracts actual video content from Instagram reels/stories
   * @param {string} url - Instagram URL
   * @param {Object} urlInfo - Parsed URL information
   * @returns {Object|null} - Extraction result
   */
  async extractReelVideoData(url, urlInfo) {
    try {
      console.log('🎬 Trying StorySaver.net-style video extraction...');

      const headers = {
        ...this.getRandomHeaders(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate'
      };

      const response = await axios.get(url, {
        headers,
        timeout: this.timeout,
        maxRedirects: 5
      });

      const html = response.data;
      const mediaItems = [];

      // Method 1: Extract from script tags containing video data
      // Enhanced patterns based on current Instagram structure and StorySaver.net approach
      const videoUrlPatterns = [
        // Standard video URL patterns
        /"video_url":"([^"]+)"/g,
        /"video_dash_manifest":"([^"]+)"/g,
        /"video_versions":\[{"url":"([^"]+)"/g,
        /"browser_native_hd_url":"([^"]+)"/g,
        /"browser_native_sd_url":"([^"]+)"/g,
        /"playback_url":"([^"]+)"/g,
        /"video_url_original":"([^"]+)"/g,

        // StorySaver.net style patterns for stories
        /"video_resources":\[{[^}]*"src":"([^"]+)"/g,
        /"video_versions":\[{[^}]*"url":"([^"]+)"/g,
        /"image_versions2":{"candidates":\[{[^}]*"url":"([^"]+\.mp4[^"]*)"/g,

        // Direct URL patterns
        /"src":"(https:\/\/[^"]*\.mp4[^"]*)"/g,
        /"contentUrl":"(https:\/\/[^"]*\.mp4[^"]*)"/g,
        /(https:\/\/scontent[^"\s]*\.mp4[^"\s]*)/g,
        /(https:\/\/[^"\s]*cdninstagram[^"\s]*\.mp4[^"\s]*)/g,
        /(https:\/\/[^"\s]*fbcdn[^"\s]*\.mp4[^"\s]*)/g,

        // Story-specific patterns
        /https:\/\/scontent[^"\s]*-[a-z0-9]+\.cdninstagram\.com\/[^"\s]*\.mp4[^"\s]*/g,
        /https:\/\/[^"\s]*\.fbcdn\.net\/[^"\s]*\.mp4[^"\s]*/g
      ];

      console.log(`🔍 Searching for video URLs in ${html.length} chars of HTML...`);

      // Look for story-specific JSON data first (StorySaver.net approach)
      let storyDataMatch = html.match(/"reels_media":\[(.*?)\]/s);

      // Try alternative story data patterns if reels_media not found
      if (!storyDataMatch) {
        storyDataMatch = html.match(/"reels":\s*{\s*"[^"]*":\s*{\s*"items":\s*\[(.*?)\]/s);
      }

      // Add more debug logging
      console.log('🔍 Looking for Instagram story data patterns...');
      console.log(`   - reels_media pattern: ${html.includes('"reels_media"') ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`   - reels pattern: ${html.includes('"reels"') ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`   - story-related content: ${html.includes('story') ? 'FOUND' : 'NOT FOUND'}`);

      if (storyDataMatch) {
        console.log('📱 Found story/reels data block');
        try {
          let reelsData;
          // Try to parse as reels_media format
          if (html.includes('"reels_media":[')) {
            reelsData = `[${storyDataMatch[1]}]`;
          } else {
            // Try to parse as reels format
            reelsData = `[${storyDataMatch[1]}]`;
          }

          const reelsJson = JSON.parse(reelsData);

          if (reelsJson[0] && reelsJson[0].items) {
            for (const item of reelsJson[0].items) {
              if (item.video_versions && item.video_versions.length > 0) {
                const videoUrl = item.video_versions[0].url;
                console.log(`✅ Found story video from reels data: ${videoUrl.substring(0, 100)}...`);

                mediaItems.push({
                  type: 'video',
                  url: videoUrl,
                  thumbnail: item.image_versions2?.candidates?.[0]?.url || videoUrl,
                  width: item.original_width || 1080,
                  height: item.original_height || 1920,
                  downloadable: true,
                  filename: `instagram_${urlInfo.type}_video_${Date.now()}.mp4`,
                  source: 'reels-data-json'
                });
              } else if (item.image_versions2?.candidates?.length > 0) {
                const imageUrl = item.image_versions2.candidates[0].url;
                if (!imageUrl.includes('profile_pic')) {
                  console.log(`✅ Found story image from reels data: ${imageUrl.substring(0, 100)}...`);

                  mediaItems.push({
                    type: 'image',
                    url: imageUrl,
                    thumbnail: imageUrl,
                    width: item.original_width || 1080,
                    height: item.original_height || 1920,
                    downloadable: true,
                    filename: `instagram_${urlInfo.type}_image_${Date.now()}.jpg`,
                    source: 'reels-data-json'
                  });
                }
              }
            }
          } else {
            // Try direct parsing as item array
            for (const item of reelsJson) {
              if (item && item.video_versions && item.video_versions.length > 0) {
                const videoUrl = item.video_versions[0].url;
                console.log(`✅ Found story video from item array: ${videoUrl.substring(0, 100)}...`);

                mediaItems.push({
                  type: 'video',
                  url: videoUrl,
                  thumbnail: item.image_versions2?.candidates?.[0]?.url || videoUrl,
                  width: item.original_width || 1080,
                  height: item.original_height || 1920,
                  downloadable: true,
                  filename: `instagram_${urlInfo.type}_video_${Date.now()}.mp4`,
                  source: 'item-array-json'
                });
              }
            }
          }
        } catch (jsonError) {
          console.log('Failed to parse story data JSON:', jsonError.message);
        }
      }

      // If we found media from reels_media, skip URL pattern matching
      if (mediaItems.length === 0) {
        let foundUrls = [];
        for (const pattern of videoUrlPatterns) {
          let match;
          while ((match = pattern.exec(html)) !== null) {
            let videoUrl = match[1] || match[0]; // Some patterns capture the full URL

            if (videoUrl) {
              // Decode URL if needed
              videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/\\/g, '').replace(/\\\//g, '/');
              foundUrls.push(videoUrl);

              // More flexible video detection
              if (this.isValidVideoUrl(videoUrl) || videoUrl.includes('.mp4')) {
                console.log(`✅ Found video URL: ${videoUrl.substring(0, 100)}...`);

                mediaItems.push({
                  type: 'video',
                  url: videoUrl,
                  thumbnail: this.extractThumbnailFromHTML(html) || videoUrl,
                  width: 1080,
                  height: 1920,
                  downloadable: true,
                  filename: `instagram_${urlInfo.type}_video_${Date.now()}.mp4`,
                  source: 'storysaver-style-video'
                });
              }
            }
          }
        }
          console.log(`🔍 Found ${foundUrls.length} potential URLs, ${mediaItems.length} valid videos`);
      } else {
        console.log(`✅ Successfully extracted ${mediaItems.length} items from reels_media`);
      }

      // Method 2: Extract from JSON data blocks (if we haven't found media yet)
      if (mediaItems.length === 0) {
        const jsonBlocks = html.match(/window\._sharedData\s*=\s*({.*?});|"GraphVideo":\s*({.*?})/g);
        if (jsonBlocks) {
          for (const block of jsonBlocks) {
            try {
              const jsonMatch = block.match(/({.*})/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);
                const videoResults = this.extractVideoFromJSON(data, urlInfo);
                if (videoResults && Array.isArray(videoResults)) {
                  mediaItems.push(...videoResults);
                }
              }
            } catch (parseError) {
              // Continue to next block
            }
          }
        }
      }

      // Method 3: Extract high-quality image if no video found
      if (mediaItems.length === 0 && urlInfo.type === 'reel') {
        const imageUrlPatterns = [
          /"display_url":"([^"]+)"/g,
          /"image_versions2":{"candidates":\[{"url":"([^"]+)"/g
        ];

        for (const pattern of imageUrlPatterns) {
          let match;
          while ((match = pattern.exec(html)) !== null) {
            let imageUrl = match[1];
            if (imageUrl && !imageUrl.includes('profile_pic') && !imageUrl.includes('s150x150')) {
              imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/\\/g, '');

              mediaItems.push({
                type: 'image',
                url: imageUrl,
                thumbnail: imageUrl,
                width: 1080,
                height: 1080,
                downloadable: true,
                filename: `instagram_${urlInfo.type}_image_${Date.now()}.jpg`,
                source: 'storysaver-style-image'
              });
              break;
            }
          }
        }
      }

      if (mediaItems.length > 0) {
        return {
          title: `${urlInfo.username || 'User'}'s Instagram ${urlInfo.type}`,
          description: `Extracted using StorySaver.net-style method`,
          type: urlInfo.type,
          username: urlInfo.username,
          mediaItems,
          metadata: {
            extractionMethod: 'storysaver-style-video',
            timestamp: new Date().toISOString(),
            success: true
          }
        };
      }

      return null;

    } catch (error) {
      console.log('❌ StorySaver.net-style video extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Helper: Check if URL is a valid video URL
   */
  isValidVideoUrl(url) {
    return url &&
      url.length > 20 && // Reasonable URL length
      (
        url.includes('.mp4') ||
        url.includes('video') ||
        url.includes('fbcdn') ||
        url.includes('cdninstagram') ||
        url.includes('scontent') ||
        (url.includes('instagram') && url.includes('mp4'))
      ) &&
      !url.includes('profile_pic') &&
      !url.includes('s150x150') &&
      (url.startsWith('http') || url.startsWith('//'));
  }

  /**
   * Helper: Extract thumbnail from HTML
   */
  extractThumbnailFromHTML(html) {
    const thumbnailMatch = html.match(/"image_versions2":{"candidates":\[{"url":"([^"]+)"/);
    if (thumbnailMatch) {
      return thumbnailMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
    }
    return null;
  }

  /**
   * Helper: Extract video from JSON data
   */
  extractVideoFromJSON(data, urlInfo) {
    const mediaItems = [];

    // Recursively search for video URLs in JSON
    const findVideos = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (typeof obj[key] === 'string' && this.isValidVideoUrl(obj[key])) {
          mediaItems.push({
            type: 'video',
            url: obj[key],
            thumbnail: obj.thumbnail_url || obj[key],
            width: obj.original_width || 1080,
            height: obj.original_height || 1920,
            downloadable: true,
            filename: `instagram_${urlInfo.type}_video_${Date.now()}.mp4`,
            source: 'json-video-search'
          });
        } else if (typeof obj[key] === 'object') {
          findVideos(obj[key]);
        }
      }
    };

    findVideos(data);
    return mediaItems.length > 0 ? mediaItems : null;
  }

  /**
   * Extractor 2: JSON-LD and window._sharedData
   * @param {string} url - Instagram URL
   * @returns {Object|null} - Extraction result
   */
  async extractFromJSON(url) {
    try {
      console.log('📄 Trying JSON extraction...');
      
      const headers = this.getRandomHeaders();
      const response = await axios.get(url, {
        headers,
        timeout: this.timeout,
        maxRedirects: 5
      });

      const html = response.data;

      // Add debug info
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response size: ${html.length} chars`);
      console.log(`📊 Contains login redirect: ${html.includes('accounts/login') ? 'YES' : 'NO'}`);
      console.log(`📊 Contains challenge page: ${html.includes('challenge') ? 'YES' : 'NO'}`);
      console.log(`📊 Contains story content indicators: ${html.includes('story') || html.includes('reel') ? 'YES' : 'NO'}`);
      
      // Method 1: window._sharedData
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const result = this.parseSharedData(sharedData);
          if (result) {
            return {
              ...result,
              metadata: {
                extractionMethod: 'window-shared-data',
                timestamp: new Date().toISOString(),
                success: true
              }
            };
          }
        } catch (parseError) {
          console.log('Failed to parse _sharedData:', parseError.message);
        }
      }

      // Method 2: JSON-LD structured data
      const $ = cheerio.load(html);
      $('script[type="application/ld+json"]').each((i, script) => {
        try {
          const jsonLD = JSON.parse($(script).html());
          const result = this.parseJSONLD(jsonLD);
          if (result) {
            return {
              ...result,
              metadata: {
                extractionMethod: 'json-ld',
                timestamp: new Date().toISOString(),
                success: true
              }
            };
          }
        } catch (parseError) {
          // Continue to next script tag
        }
      });

      // Method 3: Additional data patterns
      const additionalDataMatch = html.match(/window\.__additionalDataLoaded\([^,]+,\s*({.+?})\s*\);/);
      if (additionalDataMatch) {
        try {
          const additionalData = JSON.parse(additionalDataMatch[1]);
          const result = this.parseAdditionalData(additionalData);
          if (result) {
            return {
              ...result,
              metadata: {
                extractionMethod: 'additional-data',
                timestamp: new Date().toISOString(),
                success: true
              }
            };
          }
        } catch (parseError) {
          console.log('Failed to parse additional data:', parseError.message);
        }
      }

      return null;

    } catch (error) {
      console.log('❌ JSON extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Extractor 3: Instagram GraphQL API
   * @param {string} url - Instagram URL
   * @param {Object} urlInfo - Parsed URL information
   * @returns {Object|null} - Extraction result
   */
  async extractFromGraphQL(url, urlInfo) {
    try {
      console.log('🔗 Trying GraphQL extraction...');
      
      if (!urlInfo.shortcode && !urlInfo.username) {
        return null;
      }

      const headers = {
        ...this.getRandomHeaders(),
        'X-Requested-With': 'XMLHttpRequest',
        'X-Instagram-AJAX': '1010824617',
        'X-IG-App-ID': '936619743392459',
        'X-IG-WWW-Claim': '0'
      };

      // Different GraphQL queries for different content types
      const queries = {
        post: {
          query_hash: '2b0673e0dc4580674a88d426fe00ea90',
          variables: JSON.stringify({
            shortcode: urlInfo.shortcode,
            child_comment_count: 3,
            fetch_comment_count: 40,
            parent_comment_count: 24,
            has_threaded_comments: true
          })
        },
        story: {
          query_hash: 'de8017ee0a7c9c45ec4260733d81ea31',
          variables: JSON.stringify({
            reel_ids: [urlInfo.username],
            tag_names: [],
            location_ids: [],
            highlight_reel_ids: [],
            precomposed_overlay: false,
            show_story_viewer_list: true,
            story_viewer_fetch_count: 50,
            story_viewer_cursor: "",
            stories_video_dash_manifest: false
          })
        }
      };

      const query = queries[urlInfo.type] || queries.post;
      const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=${query.query_hash}&variables=${encodeURIComponent(query.variables)}`;

      const response = await axios.get(graphqlUrl, {
        headers,
        timeout: this.timeout
      });

      if (response.data && response.data.data) {
        const result = this.parseGraphQLResponse(response.data.data, urlInfo);
        if (result) {
          return {
            ...result,
            metadata: {
              extractionMethod: 'graphql-api',
              timestamp: new Date().toISOString(),
              success: true
            }
          };
        }
      }

      return null;

    } catch (error) {
      console.log('❌ GraphQL extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Extractor 4: Instagram Embed API
   * @param {string} url - Instagram URL
   * @param {Object} urlInfo - Parsed URL information
   * @returns {Object|null} - Extraction result
   */
  async extractFromEmbedAPI(url, urlInfo) {
    try {
      console.log('🔗 Trying embed API extraction...');
      
      // oEmbed endpoint
      const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
      
      const headers = this.getRandomHeaders();
      const response = await axios.get(oembedUrl, {
        headers,
        timeout: this.timeout
      });

      if (response.data) {
        const embedData = response.data;
        const result = this.parseEmbedData(embedData, url);
        if (result) {
          return {
            ...result,
            metadata: {
              extractionMethod: 'embed-api',
              timestamp: new Date().toISOString(),
              success: true
            }
          };
        }
      }

      return null;

    } catch (error) {
      console.log('❌ Embed API extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Extractor 5: StorySaver.net-style Mobile API (THE WORKING METHOD!)
   * @param {string} url - Instagram URL
   * @param {Object} urlInfo - Parsed URL information
   * @returns {Object|null} - Extraction result
   */
  async extractFromMobileAPI(url, urlInfo) {
    try {
      console.log('📱 Trying StorySaver.net-style mobile API extraction...');

      if (urlInfo.type === 'story' && urlInfo.username) {
        return await this.extractStoryViaMobileAPI(urlInfo.username, urlInfo.storyId);
      } else if (urlInfo.shortcode) {
        return await this.extractPostViaMobileAPI(urlInfo.shortcode);
      }

      return null;

    } catch (error) {
      console.log('❌ Mobile API extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Extract Instagram story using mobile API (StorySaver.net method)
   * @param {string} username - Instagram username
   * @param {string} storyId - Story ID (optional)
   * @returns {Object|null} - Extraction result
   */
  async extractStoryViaMobileAPI(username, storyId = null) {
    try {
      console.log(`📱 Extracting story for user: ${username} using mobile API...`);

      // Step 1: Get user ID from profile page
      const userInfoUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
      const userInfoHeaders = {
        'User-Agent': 'Instagram 123.0.0.21.114 Android',
        'Accept': '*/*',
        'Accept-Language': 'en-US',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'X-Requested-With': 'XMLHttpRequest'
      };

      console.log(`🔍 Getting user ID for: ${username}`);

      let userId;
      try {
        const userResponse = await axios.get(userInfoUrl, {
          headers: userInfoHeaders,
          timeout: this.timeout
        });

        if (userResponse.data && userResponse.data.graphql && userResponse.data.graphql.user) {
          userId = userResponse.data.graphql.user.id;
          console.log(`✅ Found user ID: ${userId}`);
        } else {
          throw new Error('User ID not found in response');
        }
      } catch (userError) {
        console.log(`❌ Failed to get user ID via __a=1, trying alternative method...`);

        // Alternative: Try to get user ID from main profile page
        const profileResponse = await axios.get(`https://www.instagram.com/${username}/`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          },
          timeout: this.timeout
        });

        const profileHtml = profileResponse.data;
        const userIdMatch = profileHtml.match(/"id":"(\d+)"/);
        if (userIdMatch) {
          userId = userIdMatch[1];
          console.log(`✅ Found user ID from profile: ${userId}`);
        } else {
          throw new Error('Could not extract user ID from profile');
        }
      }

      // Step 2: Try multiple StorySaver.net-style API endpoints
      let storiesResponse;
      let stories = [];

      // Method 1: Try reels_media endpoint
      try {
        const reelsMediaUrl = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`;
        const headers1 = {
          'User-Agent': 'Instagram 301.0.0.41.111 Android (30/11; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)',
          'Accept': '*/*',
          'Accept-Language': 'en-US',
          'X-IG-App-ID': '936619743392459',
          'X-IG-Capabilities': '3brTv10=',
          'X-IG-Connection-Type': 'WIFI'
        };

        console.log(`📡 Trying reels_media API: ${reelsMediaUrl}`);
        storiesResponse = await axios.get(reelsMediaUrl, { headers: headers1, timeout: this.timeout });

        if (storiesResponse.data && storiesResponse.data.reels_media && storiesResponse.data.reels_media.length > 0) {
          stories = storiesResponse.data.reels_media[0].items || [];
          console.log(`✅ Found ${stories.length} stories via reels_media`);
        }
      } catch (error) {
        console.log('❌ reels_media endpoint failed:', error.message);
      }

      // Method 2: Try reel/info endpoint if no stories found
      if (stories.length === 0 && storyId) {
        try {
          const reelInfoUrl = `https://i.instagram.com/api/v1/media/${storyId}/info/`;
          const headers2 = {
            'User-Agent': 'Instagram 301.0.0.41.111 Android (30/11; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)',
            'Accept': '*/*',
            'Accept-Language': 'en-US',
            'X-IG-App-ID': '936619743392459'
          };

          console.log(`📡 Trying reel info API: ${reelInfoUrl}`);
          const reelResponse = await axios.get(reelInfoUrl, { headers: headers2, timeout: this.timeout });

          if (reelResponse.data && reelResponse.data.items && reelResponse.data.items.length > 0) {
            stories = reelResponse.data.items;
            console.log(`✅ Found ${stories.length} stories via reel info`);
          }
        } catch (error) {
          console.log('❌ reel info endpoint failed:', error.message);
        }
      }

      // Method 3: Try direct story endpoint
      if (stories.length === 0) {
        try {
          const storyUrl = `https://i.instagram.com/api/v1/users/${userId}/story_reel/`;
          const headers3 = {
            'User-Agent': 'Instagram 301.0.0.41.111 Android (30/11; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)',
            'Accept': '*/*',
            'Accept-Language': 'en-US',
            'X-IG-App-ID': '936619743392459'
          };

          console.log(`📡 Trying story_reel API: ${storyUrl}`);
          const storyResponse = await axios.get(storyUrl, { headers: headers3, timeout: this.timeout });

          if (storyResponse.data && storyResponse.data.reel && storyResponse.data.reel.items) {
            stories = storyResponse.data.reel.items;
            console.log(`✅ Found ${stories.length} stories via story_reel`);
          }
        } catch (error) {
          console.log('❌ story_reel endpoint failed:', error.message);
        }
      }

      if (stories.length === 0) {
        console.log('❌ No stories found via any mobile API endpoint');
        return null;
      }

      console.log(`✅ Found ${stories.length} story items total`);

      if (stories.length === 0) {
        return null;
      }

      // Find specific story if storyId provided, otherwise use first story
      let targetStory = stories[0];
      if (storyId) {
        const foundStory = stories.find(story => story.id === storyId);
        if (foundStory) {
          targetStory = foundStory;
          console.log(`✅ Found specific story with ID: ${storyId}`);
        }
      }

      // Extract media from story
      const mediaItems = [];

      if (targetStory.video_versions && targetStory.video_versions.length > 0) {
        const videoUrl = targetStory.video_versions[0].url;
        console.log(`✅ Found story video: ${videoUrl.substring(0, 100)}...`);

        mediaItems.push({
          type: 'video',
          url: videoUrl,
          thumbnail: targetStory.image_versions2?.candidates?.[0]?.url || videoUrl,
          width: targetStory.original_width || 1080,
          height: targetStory.original_height || 1920,
          downloadable: true,
          filename: `instagram_story_video_${Date.now()}.mp4`,
          source: 'mobile-api-reels'
        });
      } else if (targetStory.image_versions2 && targetStory.image_versions2.candidates.length > 0) {
        const imageUrl = targetStory.image_versions2.candidates[0].url;
        console.log(`✅ Found story image: ${imageUrl.substring(0, 100)}...`);

        mediaItems.push({
          type: 'image',
          url: imageUrl,
          thumbnail: imageUrl,
          width: targetStory.original_width || 1080,
          height: targetStory.original_height || 1920,
          downloadable: true,
          filename: `instagram_story_image_${Date.now()}.jpg`,
          source: 'mobile-api-reels'
        });
      }

      if (mediaItems.length > 0) {
        return {
          title: `${username}'s Instagram Story`,
          description: 'Extracted using StorySaver.net mobile API method',
          type: 'story',
          username: username,
          mediaItems,
          metadata: {
            extractionMethod: 'mobile-api-storysaver',
            timestamp: new Date().toISOString(),
            success: true,
            userId: userId,
            totalStories: stories.length
          }
        };
      }

      return null;

    } catch (error) {
      console.log('❌ StorySaver.net-style mobile API extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Extract Instagram post using mobile API
   * @param {string} shortcode - Post shortcode
   * @returns {Object|null} - Extraction result
   */
  async extractPostViaMobileAPI(shortcode) {
    try {
      console.log(`📱 Extracting post via mobile API: ${shortcode}`);

      const apiUrl = `https://i.instagram.com/api/v1/media/${shortcode}/info/`;
      const headers = {
        'User-Agent': 'Instagram 123.0.0.21.114 Android',
        'Accept': '*/*',
        'Accept-Language': 'en-US',
        'X-IG-App-ID': '936619743392459'
      };

      const response = await axios.get(apiUrl, {
        headers,
        timeout: this.timeout
      });

      if (response.data && response.data.items && response.data.items.length > 0) {
        const result = this.parseInstagramMedia(response.data.items[0]);
        if (result) {
          return {
            ...result,
            metadata: {
              extractionMethod: 'mobile-api-post',
              timestamp: new Date().toISOString(),
              success: true
            }
          };
        }
      }

      return null;

    } catch (error) {
      console.log('❌ Mobile API post extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Parse window._sharedData
   */
  parseSharedData(sharedData) {
    try {
      const entryData = sharedData.entry_data;
      
      // Post pages
      if (entryData.PostPage && entryData.PostPage[0]) {
        const media = entryData.PostPage[0].graphql.shortcode_media;
        return this.parseInstagramMedia(media);
      }

      // Story pages
      if (entryData.StoriesPage && entryData.StoriesPage[0]) {
        const story = entryData.StoriesPage[0];
        return this.parseStoryMedia(story);
      }

      return null;
    } catch (error) {
      console.log('Error parsing shared data:', error.message);
      return null;
    }
  }

  /**
   * Parse JSON-LD structured data
   */
  parseJSONLD(jsonLD) {
    try {
      if (jsonLD['@type'] === 'ImageObject' || jsonLD['@type'] === 'VideoObject') {
        const mediaItems = [];
        
        if (jsonLD.contentUrl) {
          mediaItems.push({
            type: jsonLD['@type'] === 'VideoObject' ? 'video' : 'image',
            url: jsonLD.contentUrl,
            thumbnail: jsonLD.thumbnailUrl || jsonLD.contentUrl,
            width: jsonLD.width || 1080,
            height: jsonLD.height || 1080,
            downloadable: true,
            filename: `instagram_${jsonLD['@type'] === 'VideoObject' ? 'video' : 'image'}_${Date.now()}.${jsonLD['@type'] === 'VideoObject' ? 'mp4' : 'jpg'}`,
            source: 'json-ld'
          });
        }

        if (mediaItems.length > 0) {
          return {
            title: jsonLD.caption || 'Instagram Media',
            description: jsonLD.description || '',
            type: 'post',
            mediaItems
          };
        }
      }

      return null;
    } catch (error) {
      console.log('Error parsing JSON-LD:', error.message);
      return null;
    }
  }

  /**
   * Parse additional data patterns
   */
  parseAdditionalData(data) {
    try {
      if (data.media) {
        return this.parseInstagramMedia(data.media);
      }
      return null;
    } catch (error) {
      console.log('Error parsing additional data:', error.message);
      return null;
    }
  }

  /**
   * Parse GraphQL response
   */
  parseGraphQLResponse(data, urlInfo) {
    try {
      if (urlInfo.type === 'story' && data.reels_media && data.reels_media.length > 0) {
        const reel = data.reels_media[0];
        if (reel.items && reel.items.length > 0) {
          const storyItem = reel.items.find(item => item.id === urlInfo.storyId) || reel.items[0];
          return this.parseStoryItem(storyItem, reel.user);
        }
      }

      if (data.shortcode_media) {
        return this.parseInstagramMedia(data.shortcode_media);
      }

      return null;
    } catch (error) {
      console.log('Error parsing GraphQL response:', error.message);
      return null;
    }
  }

  /**
   * Parse embed data
   */
  parseEmbedData(embedData, url) {
    try {
      const mediaItems = [];
      
      if (embedData.thumbnail_url) {
        mediaItems.push({
          type: 'image',
          url: embedData.thumbnail_url,
          thumbnail: embedData.thumbnail_url,
          width: embedData.thumbnail_width || 1080,
          height: embedData.thumbnail_height || 1080,
          downloadable: true,
          filename: `instagram_embed_${Date.now()}.jpg`,
          source: 'embed-api'
        });
      }

      if (mediaItems.length > 0) {
        return {
          title: embedData.title || 'Instagram Media',
          description: '',
          type: 'post',
          mediaItems
        };
      }

      return null;
    } catch (error) {
      console.log('Error parsing embed data:', error.message);
      return null;
    }
  }

  /**
   * Parse mobile API data
   */
  parseMobileAPIData(data, urlInfo) {
    try {
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        
        if (urlInfo.type === 'story') {
          return this.parseStoryItem(item);
        } else {
          return this.parseInstagramMedia(item);
        }
      }

      return null;
    } catch (error) {
      console.log('Error parsing mobile API data:', error.message);
      return null;
    }
  }

  /**
   * Parse Instagram media object (common format)
   */
  parseInstagramMedia(media) {
    try {
      const mediaItems = [];
      
      // Handle video
      if (media.video_url || (media.video_versions && media.video_versions.length > 0)) {
        const videoUrl = media.video_url || media.video_versions[0].url;
        mediaItems.push({
          type: 'video',
          url: videoUrl,
          thumbnail: media.display_url || media.image_versions2?.candidates[0]?.url,
          width: media.original_width || media.dimensions?.width || 1080,
          height: media.original_height || media.dimensions?.height || 1920,
          downloadable: true,
          filename: `instagram_video_${Date.now()}.mp4`,
          source: 'json-parsing'
        });
      }
      
      // Handle images
      if (media.display_url || (media.image_versions2 && media.image_versions2.candidates.length > 0)) {
        const imageUrl = media.display_url || media.image_versions2.candidates[0].url;
        if (!imageUrl.includes('profile_pic')) {
          mediaItems.push({
            type: 'image',
            url: imageUrl,
            thumbnail: imageUrl,
            width: media.original_width || media.dimensions?.width || 1080,
            height: media.original_height || media.dimensions?.height || 1080,
            downloadable: true,
            filename: `instagram_image_${Date.now()}.jpg`,
            source: 'json-parsing'
          });
        }
      }

      // Handle carousel/sidecar
      if (media.edge_sidecar_to_children && media.edge_sidecar_to_children.edges) {
        media.edge_sidecar_to_children.edges.forEach((edge, index) => {
          const child = edge.node;
          if (child.video_url) {
            mediaItems.push({
              type: 'video',
              url: child.video_url,
              thumbnail: child.display_url,
              width: child.dimensions?.width || 1080,
              height: child.dimensions?.height || 1080,
              downloadable: true,
              filename: `instagram_carousel_video_${index + 1}_${Date.now()}.mp4`,
              source: 'carousel-video'
            });
          } else if (child.display_url) {
            mediaItems.push({
              type: 'image',
              url: child.display_url,
              thumbnail: child.display_url,
              width: child.dimensions?.width || 1080,
              height: child.dimensions?.height || 1080,
              downloadable: true,
              filename: `instagram_carousel_image_${index + 1}_${Date.now()}.jpg`,
              source: 'carousel-image'
            });
          }
        });
      }

      if (mediaItems.length > 0) {
        return {
          title: media.edge_media_to_caption?.edges[0]?.node?.text || 'Instagram Media',
          description: media.edge_media_to_caption?.edges[0]?.node?.text || '',
          type: 'post',
          username: media.owner?.username,
          mediaItems
        };
      }

      return null;
    } catch (error) {
      console.log('Error parsing Instagram media:', error.message);
      return null;
    }
  }

  /**
   * Parse story item
   */
  parseStoryItem(storyItem, user = null) {
    try {
      const mediaItems = [];
      
      if (storyItem.video_versions && storyItem.video_versions.length > 0) {
        mediaItems.push({
          type: 'video',
          url: storyItem.video_versions[0].url,
          thumbnail: storyItem.image_versions2?.candidates[0]?.url,
          width: storyItem.original_width || 1080,
          height: storyItem.original_height || 1920,
          downloadable: true,
          filename: `instagram_story_video_${Date.now()}.mp4`,
          source: 'story-video'
        });
      } else if (storyItem.image_versions2 && storyItem.image_versions2.candidates.length > 0) {
        const imageUrl = storyItem.image_versions2.candidates[0].url;
        if (!imageUrl.includes('profile_pic')) {
          mediaItems.push({
            type: 'image',
            url: imageUrl,
            thumbnail: imageUrl,
            width: storyItem.original_width || 1080,
            height: storyItem.original_height || 1920,
            downloadable: true,
            filename: `instagram_story_image_${Date.now()}.jpg`,
            source: 'story-image'
          });
        }
      }

      if (mediaItems.length > 0) {
        return {
          title: `${user?.username || 'User'}'s Instagram Story`,
          description: '',
          type: 'story',
          username: user?.username,
          mediaItems
        };
      }

      return null;
    } catch (error) {
      console.log('Error parsing story item:', error.message);
      return null;
    }
  }

  /**
   * Get random headers for requests
   */
  getRandomHeaders() {
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    
    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };
  }

  /**
   * Create fallback response when all extractors fail
   */
  createFallbackResponse(url, urlInfo) {
    // Story-specific messaging
    let note = 'Content could not be extracted - may be private, expired, or protected';
    let storyAdvice = '';

    if (urlInfo.type === 'story') {
      note = 'Instagram Story could not be extracted - likely expired (stories last only 24 hours)';
      storyAdvice = 'Try using the "Advanced Extraction" button with headless browser enabled for better story extraction.';
    }

    return {
      title: urlInfo.type === 'story' ? `${urlInfo.username}'s Instagram Story` : 'Instagram Media',
      description: urlInfo.type === 'story' ? 'Story may have expired' : 'Media extraction unsuccessful',
      type: urlInfo.type || 'unknown',
      username: urlInfo.username,
      mediaItems: [{
        type: 'unknown',
        url: '',
        thumbnail: '',
        downloadable: false,
        filename: '',
        width: 1080,
        height: 1080,
        note: note,
        advice: storyAdvice,
        source: 'fallback'
      }],
      metadata: {
        extractionMethod: 'fallback',
        timestamp: new Date().toISOString(),
        success: false,
        reason: urlInfo.type === 'story' ? 'Story likely expired (24h limit)' : 'All extraction methods failed',
        totalExtractorsTried: 5,
        storySpecific: urlInfo.type === 'story'
      }
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(url, error) {
    return {
      title: 'Instagram Media',
      description: 'Extraction error occurred',
      type: 'unknown',
      mediaItems: [{
        type: 'error',
        url: '',
        thumbnail: '',
        downloadable: false,
        filename: '',
        width: 1080,
        height: 1080,
        note: `Extraction failed: ${error.message}`,
        source: 'error'
      }],
      metadata: {
        extractionMethod: 'error',
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      }
    };
  }

  /**
   * REAL StorySaver.net extraction method
   * @param {string} url - Instagram URL
   * @returns {Object|null} - Extraction result
   */
  async extractUsingRealStorySaverMethod(url) {
    try {
      console.log('🔥 Using REAL StorySaver.net method...');

      const StorySaverExtractor = require('./StorySaverExtractor');
      const result = await StorySaverExtractor.extractStory(url);

      if (result && result.mediaItems && result.mediaItems.length > 0) {
        console.log('✅ REAL StorySaver.net method SUCCESS!');
        return result;
      }

      console.log('❌ REAL StorySaver.net method found no media');
      return null;

    } catch (error) {
      console.log('❌ REAL StorySaver.net method failed:', error.message);
      return null;
    }
  }

  /**
   * Working Instagram Story Extractor (StorySaver.net style)
   * This is the ACTUAL method that works like storysaver.net
   */
  async extractInstagramStoryWorking(url) {
    try {
      console.log('🔥 Using working Instagram story extractor (StorySaver.net style)...');

      const urlInfo = this.parseInstagramUrl(url);
      if (!urlInfo.valid || urlInfo.type !== 'story') {
        return null;
      }

      // Method 1: StorySaver.net approach - get current stories via profile
      try {
        console.log('📱 Using StorySaver.net approach - profile-based story access...');
        const profileStoryResult = await this.extractCurrentStoriesFromProfile(urlInfo.username);
        if (profileStoryResult) {
          // If we have a specific story ID, try to find it
          if (urlInfo.storyId && profileStoryResult.mediaItems) {
            const specificStory = profileStoryResult.mediaItems.find(item =>
              item.storyId === urlInfo.storyId || item.filename.includes(urlInfo.storyId)
            );
            if (specificStory) {
              return {
                ...profileStoryResult,
                mediaItems: [specificStory],
                description: 'Specific story extracted using StorySaver.net method'
              };
            }
          }
          return profileStoryResult;
        }
      } catch (error) {
        console.log('Profile-based story method failed:', error.message);
      }

      // Method 2: Fallback to direct API approach
      try {
        const storyResult = await this.extractStoryViaAPI(urlInfo.username, urlInfo.storyId);
        if (storyResult) {
          return storyResult;
        }
      } catch (error) {
        console.log('Story API method failed:', error.message);
      }

      // Method 3: Mobile web approach
      try {
        const mobileResult = await this.extractStoryViaMobile(urlInfo.username, urlInfo.storyId);
        if (mobileResult) {
          return mobileResult;
        }
      } catch (error) {
        console.log('Mobile method failed:', error.message);
      }

      return null;

    } catch (error) {
      console.log('❌ Working story extractor failed:', error.message);
      return null;
    }
  }

  /**
   * Extract current stories from user profile (StorySaver.net method)
   * This is how StorySaver.net actually works - they get current stories from profile
   */
  async extractCurrentStoriesFromProfile(username) {
    try {
      console.log(`📱 Extracting current stories from profile: ${username}`);

      // Use optimized headers that work with Instagram
      const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      };

      // Access user profile page (like StorySaver.net does)
      const profileUrl = `https://www.instagram.com/${username}/`;
      console.log(`📡 Accessing profile: ${profileUrl}`);

      const response = await axios.get(profileUrl, {
        headers,
        timeout: 15000,
        maxRedirects: 5
      });

      if (response.status !== 200) {
        throw new Error(`Profile access failed: ${response.status}`);
      }

      console.log('✅ Profile page accessed successfully');

      // Look for story data in the profile page
      const html = response.data;

      // Method 1: Look for story data in window._sharedData
      let storyData = null;
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          console.log('✅ Found _sharedData');

          // Look for story data in various locations
          if (sharedData.entry_data && sharedData.entry_data.ProfilePage) {
            const profilePage = sharedData.entry_data.ProfilePage[0];
            if (profilePage.graphql && profilePage.graphql.user) {
              const user = profilePage.graphql.user;

              // Check if user has stories
              if (user.has_story || user.story_highlights) {
                console.log('✅ User has stories available');

                // Try to get story data
                if (user.story_highlights && user.story_highlights.edges) {
                  storyData = user.story_highlights.edges;
                  console.log(`✅ Found ${storyData.length} story highlights`);
                }
              }
            }
          }
        } catch (parseError) {
          console.log('❌ Failed to parse _sharedData:', parseError.message);
        }
      }

      // Method 2: Look for story data in script tags
      if (!storyData) {
        const scriptMatches = html.match(/<script[^>]*>([^<]*(?:story|reel)[^<]*)<\/script>/gi);
        if (scriptMatches) {
          for (const scriptMatch of scriptMatches) {
            try {
              const scriptContent = scriptMatch.replace(/<\/?script[^>]*>/gi, '');
              if (scriptContent.includes('story') || scriptContent.includes('reel')) {
                // Try to extract JSON data
                const jsonMatches = scriptContent.match(/({[^{}]*(?:story|reel)[^{}]*})/gi);
                if (jsonMatches) {
                  for (const jsonMatch of jsonMatches) {
                    try {
                      const data = JSON.parse(jsonMatch);
                      if (data.story || data.stories || data.reel_media) {
                        storyData = data;
                        console.log('✅ Found story data in script tag');
                        break;
                      }
                    } catch (e) {
                      // Continue trying other matches
                    }
                  }
                }
              }
            } catch (e) {
              // Continue with next script
            }
          }
        }
      }

      // Method 3: Check for story indicators and try to get current stories
      if (!storyData && html.includes('has_story')) {
        console.log('✅ Profile indicates stories are available');

        // Try to get user ID and fetch stories
        const userIdMatch = html.match(/"id":"(\d+)"/);
        if (userIdMatch) {
          const userId = userIdMatch[1];
          console.log(`✅ Found user ID: ${userId}`);

          // Try to get current stories using the user ID
          try {
            const storiesResult = await this.getCurrentStoriesById(userId);
            if (storiesResult) {
              return storiesResult;
            }
          } catch (error) {
            console.log('❌ Failed to get stories by ID:', error.message);
          }
        }
      }

      // If we found story data, process it
      if (storyData) {
        const mediaItems = this.processStoryData(storyData, username);
        if (mediaItems && mediaItems.length > 0) {
          return {
            title: `${username}'s Instagram Stories`,
            description: 'Current stories extracted using StorySaver.net method',
            type: 'story',
            username: username,
            mediaItems,
            metadata: {
              extractionMethod: 'storysaver-profile',
              timestamp: new Date().toISOString(),
              success: true
            }
          };
        }
      }

      console.log('❌ No current stories found for user');
      return null;

    } catch (error) {
      console.log('❌ Profile-based story extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Extract story via Instagram's internal API (Working method)
   */
  async extractStoryViaAPI(username, storyId) {
    try {
      console.log(`📱 Extracting story via API for ${username}/${storyId}`);

      // Step 1: Get user ID
      const userId = await this.getUserId(username);
      if (!userId) {
        throw new Error('Could not get user ID');
      }

      console.log(`✅ Got user ID: ${userId}`);

      // Step 2: Get stories using Instagram's API endpoint
      const headers = {
        'User-Agent': 'Instagram 276.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229237)',
        'Accept': '*/*',
        'Accept-Language': 'en-US',
        'Accept-Encoding': 'gzip, deflate, br',
        'X-IG-App-ID': '936619743392459',
        'X-IG-Capabilities': '3brTv10=',
        'X-IG-Connection-Type': 'WIFI',
        'X-IG-Device-ID': '12345678-1234-1234-1234-123456789012',
        'Connection': 'keep-alive'
      };

      // Try multiple story endpoints
      const apiEndpoints = [
        `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`,
        `https://i.instagram.com/api/v1/users/${userId}/reel_media/`,
        `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`
      ];

      for (const endpoint of apiEndpoints) {
        try {
          console.log(`📡 Trying endpoint: ${endpoint}`);

          const response = await axios.get(endpoint, {
            headers,
            timeout: 15000
          });

          if (response.data && response.data.reels_media && response.data.reels_media.length > 0) {
            const reel = response.data.reels_media[0];
            if (reel.items && reel.items.length > 0) {
              console.log(`✅ Found ${reel.items.length} story items`);

              // Find specific story or use the first one
              let targetStory = reel.items[0];
              if (storyId) {
                const found = reel.items.find(item => item.id === storyId);
                if (found) targetStory = found;
              }

              const mediaItems = this.parseStoryItemWorking(targetStory);
              if (mediaItems && mediaItems.length > 0) {
                return {
                  title: `${username}'s Instagram Story`,
                  description: 'Extracted using StorySaver.net API method',
                  type: 'story',
                  username: username,
                  mediaItems,
                  metadata: {
                    extractionMethod: 'storysaver-api',
                    timestamp: new Date().toISOString(),
                    success: true,
                    userId: userId
                  }
                };
              }
            }
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message);
        }
      }

      return null;

    } catch (error) {
      console.log('❌ Story API extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Get current stories by user ID
   */
  async getCurrentStoriesById(userId) {
    try {
      console.log(`📡 Getting current stories for user ID: ${userId}`);

      const headers = {
        'User-Agent': 'Instagram 276.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229237)',
        'Accept': '*/*',
        'Accept-Language': 'en-US',
        'X-IG-App-ID': '936619743392459'
      };

      // Try Instagram's story endpoint
      const storyEndpoint = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`;

      const response = await axios.get(storyEndpoint, {
        headers,
        timeout: 10000
      });

      if (response.data && response.data.reels_media && response.data.reels_media.length > 0) {
        const reel = response.data.reels_media[0];
        if (reel.items && reel.items.length > 0) {
          console.log(`✅ Found ${reel.items.length} current stories`);

          const mediaItems = [];
          for (const item of reel.items) {
            const mediaItem = this.parseStoryItemWorking(item);
            if (mediaItem && Array.isArray(mediaItem) && mediaItem.length > 0) {
              mediaItems.push(...mediaItem);
            } else if (mediaItem && !Array.isArray(mediaItem)) {
              mediaItems.push(mediaItem);
            }
          }

          if (mediaItems.length > 0) {
            return {
              title: `User's Current Instagram Stories`,
              description: 'Current stories extracted via API',
              type: 'story',
              mediaItems,
              metadata: {
                extractionMethod: 'current-stories-api',
                timestamp: new Date().toISOString(),
                success: true
              }
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.log('❌ Failed to get current stories by ID:', error.message);
      return null;
    }
  }

  /**
   * Process story data from profile page
   */
  processStoryData(storyData, username) {
    try {
      console.log('📊 Processing story data...');
      const mediaItems = [];

      // Handle different story data formats
      if (Array.isArray(storyData)) {
        // Story highlights format
        for (const highlight of storyData) {
          if (highlight.node && highlight.node.items) {
            for (const item of highlight.node.items) {
              const mediaItemArray = this.parseStoryItemWorking(item);
              if (mediaItemArray && Array.isArray(mediaItemArray) && mediaItemArray.length > 0) {
                mediaItems.push(...mediaItemArray);
              }
            }
          }
        }
      } else if (storyData.story || storyData.stories) {
        // Direct story format
        const stories = storyData.story || storyData.stories;
        if (Array.isArray(stories)) {
          for (const story of stories) {
            const mediaItemArray = this.parseStoryItemWorking(story);
            if (mediaItemArray && Array.isArray(mediaItemArray) && mediaItemArray.length > 0) {
              mediaItems.push(...mediaItemArray);
            }
          }
        }
      } else if (storyData.reel_media) {
        // Reel media format
        const reelMedia = storyData.reel_media;
        if (reelMedia.items) {
          for (const item of reelMedia.items) {
            const mediaItemArray = this.parseStoryItemWorking(item);
            if (mediaItemArray && Array.isArray(mediaItemArray) && mediaItemArray.length > 0) {
              mediaItems.push(...mediaItemArray);
            }
          }
        }
      }

      console.log(`📊 Processed ${mediaItems.length} media items from story data`);
      return mediaItems;

    } catch (error) {
      console.log('❌ Failed to process story data:', error.message);
      return [];
    }
  }

  /**
   * Get Instagram user ID from username
   */
  async getUserId(username) {
    try {
      // Method 1: Try the __a=1 endpoint
      try {
        const response = await axios.get(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
          headers: {
            'User-Agent': 'Instagram 276.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; qcom; en_US; 458229237)',
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 10000
        });

        if (response.data && response.data.graphql && response.data.graphql.user) {
          return response.data.graphql.user.id;
        }
      } catch (error) {
        console.log('__a=1 method failed, trying profile page...');
      }

      // Method 2: Extract from profile page HTML
      const profileResponse = await axios.get(`https://www.instagram.com/${username}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        },
        timeout: 10000
      });

      const html = profileResponse.data;

      // Look for user ID in various patterns
      const patterns = [
        /"id":"(\d+)"/,
        /"profilePage_\d+":\{"user":\{"id":"(\d+)"/,
        /"user":\{"id":"(\d+)"/
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          return match[1];
        }
      }

      throw new Error('Could not extract user ID from profile');

    } catch (error) {
      console.log('❌ Failed to get user ID:', error.message);
      return null;
    }
  }

  /**
   * Parse story item to extract media (Working version)
   */
  parseStoryItemWorking(storyItem) {
    try {
      const mediaItems = [];

      // Handle video
      if (storyItem.video_versions && storyItem.video_versions.length > 0) {
        const videoUrl = storyItem.video_versions[0].url;
        mediaItems.push({
          type: 'video',
          url: videoUrl,
          thumbnail: storyItem.image_versions2?.candidates?.[0]?.url || videoUrl,
          width: storyItem.original_width || 1080,
          height: storyItem.original_height || 1920,
          downloadable: true,
          filename: `instagram_story_video_${Date.now()}.mp4`,
          source: 'story-api'
        });
      }
      // Handle image
      else if (storyItem.image_versions2 && storyItem.image_versions2.candidates.length > 0) {
        const imageUrl = storyItem.image_versions2.candidates[0].url;
        if (!imageUrl.includes('profile_pic')) {
          mediaItems.push({
            type: 'image',
            url: imageUrl,
            thumbnail: imageUrl,
            width: storyItem.original_width || 1080,
            height: storyItem.original_height || 1920,
            downloadable: true,
            filename: `instagram_story_image_${Date.now()}.jpg`,
            source: 'story-api'
          });
        }
      }

      return mediaItems;
    } catch (error) {
      console.log('❌ Failed to parse story item:', error.message);
      return [];
    }
  }

  /**
   * Extract story via mobile web (Fallback method)
   */
  async extractStoryViaMobile(username, storyId) {
    try {
      console.log(`📱 Extracting story via mobile web for ${username}`);

      const url = `https://www.instagram.com/stories/${username}/${storyId}/`;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      };

      const response = await axios.get(url, {
        headers,
        timeout: 15000
      });

      const html = response.data;

      // Look for story data in _sharedData
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);

          // Parse story data from various entry points
          if (sharedData.entry_data) {
            for (const [key, pages] of Object.entries(sharedData.entry_data)) {
              if (Array.isArray(pages) && pages.length > 0) {
                const result = this.parseStoryFromSharedData(pages[0], username);
                if (result) {
                  return result;
                }
              }
            }
          }
        } catch (parseError) {
          console.log('Failed to parse _sharedData:', parseError.message);
        }
      }

      return null;

    } catch (error) {
      console.log('❌ Mobile story extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Parse story data from _sharedData
   */
  parseStoryFromSharedData(pageData, username) {
    try {
      // Look for media in graphql structure
      if (pageData.graphql) {
        if (pageData.graphql.shortcode_media) {
          const media = pageData.graphql.shortcode_media;
          const mediaItems = [];

          if (media.video_url) {
            mediaItems.push({
              type: 'video',
              url: media.video_url,
              thumbnail: media.display_url,
              width: media.dimensions?.width || 1080,
              height: media.dimensions?.height || 1920,
              downloadable: true,
              filename: `instagram_story_video_${Date.now()}.mp4`,
              source: 'mobile-web'
            });
          } else if (media.display_url && !media.display_url.includes('profile_pic')) {
            mediaItems.push({
              type: 'image',
              url: media.display_url,
              thumbnail: media.display_url,
              width: media.dimensions?.width || 1080,
              height: media.dimensions?.height || 1080,
              downloadable: true,
              filename: `instagram_story_image_${Date.now()}.jpg`,
              source: 'mobile-web'
            });
          }

          if (mediaItems.length > 0) {
            return {
              title: `${username}'s Instagram Story`,
              description: 'Extracted using mobile web method',
              type: 'story',
              username: username,
              mediaItems,
              metadata: {
                extractionMethod: 'mobile-web',
                timestamp: new Date().toISOString(),
                success: true
              }
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.log('❌ Failed to parse story from _sharedData:', error.message);
      return null;
    }
  }

  /**
   * Check if URL is valid Instagram URL
   */
  isValidInstagramUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('instagram.com');
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect media type from URL
   */
  detectMediaType(url) {
    if (url.includes('/p/')) return 'post';
    if (url.includes('/reel/')) return 'reel';
    if (url.includes('/tv/')) return 'igtv';
    if (url.includes('/stories/')) return 'story';
    return 'unknown';
  }
}

module.exports = new InstagramExtractor();
