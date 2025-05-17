import LinkedInOAuth2Client from '../OAuth/LinkedInOAuth2Client';

/**
 * Interface for LinkedIn post options
 */
export interface LinkedInPostOptions {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS' | 'CONTAINER'; // Default is CONNECTIONS
  mediaId?: string;
  imageUrl?: string;
  linkUrl?: string;
  title?: string;
  description?: string;
}

/**
 * LinkedIn profile information
 */
export interface LinkedInProfile {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  profilePicture?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * LinkedIn post response
 */
export interface LinkedInPostResponse {
  id: string;
  [key: string]: unknown;
}

/**
 * LinkedIn API Client
 *
 * This class handles communication with LinkedIn API
 */
export class LinkedInClient {
  private oAuth2Client: LinkedInOAuth2Client;
  private userId: string | null = null;

  constructor(oAuth2Client: LinkedInOAuth2Client) {
    this.oAuth2Client = oAuth2Client;
  }

  /**
   * Initialize the client and fetch user ID
   */
  async init(): Promise<void> {
    let profile;

    try {
      profile = await this.oAuth2Client.getUserProfile();
    } catch (error) {
      throw new Error(`Failed to initialize LinkedIn client: ${error}`);
    }

    // Profile validation happens outside the try/catch block
    if (typeof profile !== 'object' || profile === null || !('id' in profile) || typeof profile.id !== 'string') {
      throw new Error('Invalid profile data: missing id field');
    }

    // Set the user ID if validation passed
    this.userId = profile.id;
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<LinkedInProfile> {
    let profileData;

    try {
      profileData = await this.oAuth2Client.getUserProfile();
    } catch (error) {
      throw new Error(`Failed to get profile: ${error}`);
    }

    // Profile validation happens outside the try/catch block
    if (typeof profileData !== 'object' || profileData === null || !('id' in profileData) || typeof profileData.id !== 'string') {
      throw new Error('Invalid profile data returned from LinkedIn');
    }

    // Return the profile data if validation passed
    return profileData as LinkedInProfile;
  }

  /**
   * Get user's email address
   */
  async getEmail(): Promise<string> {
    try {
      return await this.oAuth2Client.getUserEmail();
    } catch (error) {
      throw new Error(`Failed to get email: ${error}`);
    }
  }

  /**
   * Post a text update to LinkedIn
   */
  async postTextUpdate(options: LinkedInPostOptions): Promise<LinkedInPostResponse> {
    if (!this.userId) {
      await this.init();
    }

    const visibility = options.visibility || 'CONNECTIONS';

    const postData = {
      author: `urn:li:person:${this.userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    try {
      const response = await this.oAuth2Client.makeRequest({
        path: '/ugcPosts',
        method: 'POST',
        body: postData,
      });

      // Check for success response
      if (response.ok) {
        return response.data;
      }

      // Handle error case outside the conditional
      const errorMessage = `LinkedIn API error: ${response.statusCode} ${JSON.stringify(response.data)}`;
      throw new Error(errorMessage);
    } catch (error) {
      throw new Error(`Failed to post text update: ${error}`);
    }
  }

  /**
   * Post an update with a link to LinkedIn
   */
  async postLinkUpdate(options: LinkedInPostOptions): Promise<LinkedInPostResponse> {
    if (!options.linkUrl) {
      throw new Error('Link URL is required for link updates');
    }

    if (!this.userId) {
      await this.init();
    }

    const visibility = options.visibility || 'CONNECTIONS';

    const postData = {
      author: `urn:li:person:${this.userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text,
          },
          shareMediaCategory: 'ARTICLE',
          media: [
            {
              status: 'READY',
              description: {
                text: options.description || '',
              },
              originalUrl: options.linkUrl,
              title: {
                text: options.title || options.linkUrl,
              },
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    try {
      const response = await this.oAuth2Client.makeRequest({
        path: '/ugcPosts',
        method: 'POST',
        body: postData,
      });

      // Check for success
      if (response.ok) {
        return response.data;
      }

      // Handle error case outside the conditional
      const errorMessage = `LinkedIn API error: ${response.statusCode} ${JSON.stringify(response.data)}`;
      throw new Error(errorMessage);
    } catch (error) {
      throw new Error(`Failed to post link update: ${error}`);
    }
  }

  /**
   * Post an update with an image to LinkedIn
   * This implements LinkedIn's multi-step process for image uploads
   */
  async postImageUpdate(options: LinkedInPostOptions): Promise<LinkedInPostResponse> {
    if (!options.imageUrl) {
      throw new Error('Image URL is required for image updates');
    }

    if (!this.userId) {
      await this.init();
    }

    try {
      // Step 1: Register the image upload
      const registerUploadResponse = await this.oAuth2Client.makeRequest({
        path: '/assets?action=registerUpload',
        method: 'POST',
        body: {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${this.userId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        },
      });

      if (!registerUploadResponse.ok) {
        // Restructure to return early on success
        const errorMessage = `Failed to register image upload: ${JSON.stringify(registerUploadResponse.data)}`;
        throw new Error(errorMessage);
      }

      // Step 2: Get the upload URL and asset URN from the response
      const {
        value: {
          uploadMechanism: {
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
              uploadUrl,
            },
          },
          asset: assetUrn,
        },
      } = registerUploadResponse.data;

      // Step 3: Fetch the image from the provided URL
      const imageResponse = await fetch(options.imageUrl);

      // Check for success instead of failure
      if (!imageResponse.ok) {
        const errorMessage = 'Failed to fetch image from provided URL';
        throw new Error(errorMessage);
      }

      const imageBuffer = await imageResponse.arrayBuffer();

      // Step 4: Upload the image to LinkedIn's servers
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!uploadResponse.ok) {
        const errorMessage = 'Failed to upload image to LinkedIn';
        throw new Error(errorMessage);
      }

      // Step 5: Create the post with the uploaded image
      const visibility = options.visibility || 'CONNECTIONS';
      const postData = {
        author: `urn:li:person:${this.userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: options.text,
            },
            shareMediaCategory: 'IMAGE',
            media: [
              {
                status: 'READY',
                description: {
                  text: options.description || '',
                },
                media: assetUrn,
                title: {
                  text: options.title || '',
                },
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };

      const postResponse = await this.oAuth2Client.makeRequest({
        path: '/ugcPosts',
        method: 'POST',
        body: postData,
      });

      if (postResponse.ok) {
        return postResponse.data;
      }

      // Handle error outside the conditional
      const errorMessage = `LinkedIn API error: ${postResponse.statusCode} ${JSON.stringify(postResponse.data)}`;
      throw new Error(errorMessage);
    } catch (error) {
      throw new Error(`Failed to post image update: ${error}`);
    }
  }

  /**
   * Post from a company page instead of a user
   * Note: Requires organization admin permissions
   */
  async postAsCompanyPage(companyId: string, options: LinkedInPostOptions): Promise<LinkedInPostResponse> {
    // Placeholder for company page posting implementation
    // Similar to personal posts but with different author type
    throw new Error('Company page posting not implemented yet');
  }
}

export default LinkedInClient;
