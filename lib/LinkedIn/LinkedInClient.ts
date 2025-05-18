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
    return response.data as unknown as LinkedInProfile;
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
    // Use the postMessage method from the OAuth2Client
    return this.oAuth2Client.postMessage(options.text, options.visibility);
  }

  /**
   * Post a link update to LinkedIn
   * @param options Post options containing text, link URL, title, description, and visibility
   */
  async postLinkUpdate(options: {
    text: string;
    linkUrl: string;
    title?: string;
    description?: string;
    visibility?: string;
  }): Promise<ApiResponse> {
    // For link updates, we'll use the same postMessage method but format the text to include the link
    const fullText = `${options.text
      + (options.title ? `\n\n${options.title}` : '')
      + (options.description ? `\n${options.description}` : '')
    }\n${options.linkUrl}`;

    return this.oAuth2Client.postMessage(fullText, options.visibility);
  }

  /**
   * Post an image update to LinkedIn
   * @param options Post options containing text, image URL, and visibility
   */
  async postImageUpdate(options: {
    text: string;
    imageUrl: string;
    title?: string;
    description?: string;
    visibility?: string;
  }): Promise<ApiResponse> {
    // For now, we'll use the same approach as link updates
    // In a future implementation, we could add proper image upload support
    const fullText = `${options.text
      + (options.title ? `\n\n${options.title}` : '')
      + (options.description ? `\n${options.description}` : '')
    }\n[Image: ${options.imageUrl}]`;

    return this.oAuth2Client.postMessage(fullText, options.visibility);
  }

  /**
   * Check if the user is authenticated with LinkedIn
   */
  isAuthenticated(): boolean {
    // Check if the OAuth2 client has a valid token
    const token = (this.oAuth2Client as any).getToken?.();
    return !!token?.access_token;
  }
}

export default LinkedInClient;
