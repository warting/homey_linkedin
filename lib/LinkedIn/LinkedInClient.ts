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
    try {
      const profile = await this.oAuth2Client.getUserProfile();
      this.userId = profile.id;
    } catch (error) {
      throw new Error(`Failed to initialize LinkedIn client: ${error}`);
    }
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<any> {
    try {
      return await this.oAuth2Client.getUserProfile();
    } catch (error) {
      throw new Error(`Failed to get profile: ${error}`);
    }
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
  async postTextUpdate(options: LinkedInPostOptions): Promise<any> {
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
      const response = await this.oAuth2Client.post({
        path: '/ugcPosts',
        body: postData,
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.statusCode} ${JSON.stringify(response.data)}`);
      }

      return response.data;
    } catch (error) {
      throw new Error(`Failed to post text update: ${error}`);
    }
  }

  /**
   * Post an update with a link to LinkedIn
   */
  async postLinkUpdate(options: LinkedInPostOptions): Promise<any> {
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
      const response = await this.oAuth2Client.post({
        path: '/ugcPosts',
        body: postData,
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.statusCode} ${JSON.stringify(response.data)}`);
      }

      return response.data;
    } catch (error) {
      throw new Error(`Failed to post link update: ${error}`);
    }
  }

  /**
   * Post an update with an image to LinkedIn
   * Note: This is a simplified implementation. LinkedIn requires a more complex
   * process for image uploads that involves registering the media and then uploading it.
   */
  async postImageUpdate(options: LinkedInPostOptions): Promise<any> {
    if (!options.imageUrl) {
      throw new Error('Image URL is required for image updates');
    }

    // Note: This is a placeholder for the actual image upload implementation
    // LinkedIn requires a multi-step process for image uploads
    throw new Error('Image posting is not fully implemented yet');
  }

  /**
   * Post from a company page instead of a user
   * Note: Requires organization admin permissions
   */
  async postAsCompanyPage(companyId: string, options: LinkedInPostOptions): Promise<any> {
    // Placeholder for company page posting implementation
    // Similar to personal posts but with different author type
    throw new Error('Company page posting not implemented yet');
  }
}

export default LinkedInClient;
