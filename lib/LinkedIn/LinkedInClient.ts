import { ApiResponse } from 'homey-oauth2app';
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
 * Interface for LinkedIn share media
 */
interface ShareMedia {
  status: string;
  originalUrl?: string;
  media?: string;
  title?: { text: string };
  description?: { text: string };
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
    await this.getUserId();
  }

  /**
   * Get the user's LinkedIn profile
   */
  async getProfile(): Promise<LinkedInProfile> {
    const response = await this.oAuth2Client.getUserProfile();
    return response as LinkedInProfile;
  }

  /**
   * Get or fetch the user's LinkedIn ID
   */
  async getUserId(): Promise<string> {
    if (!this.userId) {
      const profile = await this.getProfile();
      this.userId = profile.id;
    }
    return this.userId;
  }

  /**
   * Post a text update to LinkedIn
   * @param options Post options containing text and visibility
   */
  async postTextUpdate(options: { text: string; visibility?: string }): Promise<ApiResponse> {
    const userId = await this.getUserId();
    const visibility = options.visibility || 'CONNECTIONS';

    return this.oAuth2Client.post({
      path: '/ugcPosts',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: {
        author: `urn:li:person:${userId}`,
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
      },
    });
  }

  /**
   * Post a link/article update to LinkedIn
   * @param options Post options containing text, link URL, title, description and visibility
   */
  async postLinkUpdate(options: {
    text: string;
    linkUrl: string;
    title?: string;
    description?: string;
    visibility?: string
  }): Promise<ApiResponse> {
    const userId = await this.getUserId();
    const visibility = options.visibility || 'CONNECTIONS';

    const media: ShareMedia[] = [{
      status: 'READY',
      originalUrl: options.linkUrl,
    }];

    if (options.title) {
      media[0].title = { text: options.title };
    }

    if (options.description) {
      media[0].description = { text: options.description };
    }

    return this.oAuth2Client.post({
      path: '/ugcPosts',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: options.text,
            },
            shareMediaCategory: 'ARTICLE',
            media,
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      },
    });
  }

  /**
   * Register an image for upload to LinkedIn
   * @returns The upload URL and asset URN
   */
  async registerImageUpload(): Promise<{ uploadUrl: string; asset: string }> {
    const userId = await this.getUserId();

    const response = await this.oAuth2Client.post({
      path: '/assets',
      query: {
        action: 'registerUpload',
      },
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: {
        registerUploadRequest: {
          recipes: [
            'urn:li:digitalmediaRecipe:feedshare-image',
          ],
          owner: `urn:li:person:${userId}`,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      },
    });

    if (!response.ok || !response.data || !response.data.value) {
      throw new Error('Failed to register image upload');
    }

    return {
      uploadUrl: response.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
      asset: response.data.value.asset,
    };
  }

  /**
   * Upload an image binary to LinkedIn
   * @param uploadUrl The upload URL from registerImageUpload
   * @param imageBuffer The image binary data
   */
  async uploadImage(uploadUrl: string, imageBuffer: Buffer): Promise<void> {
    // Since this is a binary upload, we need to use fetch directly
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.oAuth2Client.getToken().access_token}`,
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Post an image update to LinkedIn
   * @param options Post options containing text, image buffer, title, description and visibility
   */
  async postImageUpdate(options: {
    text: string;
    imageBuffer: Buffer;
    title?: string;
    description?: string;
    visibility?: string;
  }): Promise<ApiResponse> {
    const userId = await this.getUserId();
    const visibility = options.visibility || 'CONNECTIONS';

    // Step 1: Register the upload
    const { uploadUrl, asset } = await this.registerImageUpload();

    // Step 2: Upload the image
    await this.uploadImage(uploadUrl, options.imageBuffer);

    // Step 3: Create the post with the image
    const media: ShareMedia[] = [{
      status: 'READY',
      media: asset,
    }];

    if (options.title) {
      media[0].title = { text: options.title };
    }

    if (options.description) {
      media[0].description = { text: options.description };
    }

    return this.oAuth2Client.post({
      path: '/ugcPosts',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: options.text,
            },
            shareMediaCategory: 'IMAGE',
            media,
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      },
    });
  }
}

export default LinkedInClient;
