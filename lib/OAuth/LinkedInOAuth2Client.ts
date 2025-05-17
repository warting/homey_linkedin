import { OAuth2Client, OAuth2Token, ApiResponse } from 'homey-oauth2app';
import Homey from 'homey';

/**
 * LinkedIn OAuth2 Client
 *
 * This client handles the OAuth2 flow for LinkedIn API integration
 */
export default class LinkedInOAuth2Client extends OAuth2Client {
  static API_URL = 'https://api.linkedin.com/v2';
  static TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
  static AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';
  static REDIRECT_URL = 'https://homey.app/oauth2/callback';
  static SCOPES = [
    'r_liteprofile',
    'r_emailaddress',
    'w_member_social',
    'w_organization_social',
  ];

  // Get credentials from app settings
  static get CLIENT_ID(): string {
    try {
      // Only use the value set from app settings
      return LinkedInOAuth2Client._clientId || '';
    } catch (error) {
      console.error('Error getting CLIENT_ID:', error);
      return '';
    }
  }

  static get CLIENT_SECRET(): string {
    try {
      // Only use the value set from app settings
      return LinkedInOAuth2Client._clientSecret || '';
    } catch (error) {
      console.error('Error getting CLIENT_SECRET:', error);
      return '';
    }
  }

  // Temporary properties to hold runtime settings from the app
  private static _clientId: string = '';
  private static _clientSecret: string = '';

  // Methods to set credentials at runtime (to be called from the app)
  static setClientId(clientId: string): void {
    LinkedInOAuth2Client._clientId = clientId;
  }

  static setClientSecret(clientSecret: string): void {
    LinkedInOAuth2Client._clientSecret = clientSecret;
  }

  /**
   * Initialize the OAuth2 client
   */
  async onInit(): Promise<void> {
    this.log('LinkedIn OAuth2Client initialized');
  }

  /**
   * Get the user's LinkedIn profile information
   */
  async getUserProfile() {
    const response = await this.get({
      path: '/me',
      query: {
        projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.data;
  }

  /**
   * Get the user's LinkedIn email address
   */
  async getUserEmail() {
    const response = await this.get({
      path: '/emailAddress',
      query: {
        q: 'members',
        projection: '(elements*(handle~))',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user email');
    }

    return response.data;
  }

  /**
   * This method is called when a request is made to the API
   * Can be used to modify the request before it is sent
   */
  async onRequestHeaders({ headers }: {
    headers: Record<string, string>;
  }): Promise<Record<string, string>> {
    // Add any custom headers or modify existing ones
    return {
      ...headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-RestLi-Protocol-Version': '2.0.0',
    };
  }

  /**
   * This method is called when a request to the API returns an error
   * Used to handle specific API error cases, like token expiration
   */
  async onHandleResult({ result }: { result: ApiResponse }): Promise<ApiResponse> {
    // Handle any LinkedIn-specific error responses
    if (!result.ok && result.status === 401) {
      // Token might be expired or invalid, attempt to refresh
      this.log('Received 401 response, refreshing token...');
      try {
        // Since we can't directly access the token, we'll just
        // assume the parent class handles storing the current token
        // and will use it for refreshing
        await this.emit('refresh_token');

        // After refreshing the token, make a simple profile request
        // to verify the token is working
        return this.get({
          path: '/me',
          query: {
            projection: '(id)',
          },
        });
      } catch (error) {
        this.error('Error refreshing token', error);
        throw error;
      }
    }

    return result;
  }

  /**
   * Post a message to LinkedIn
   * @param message The message text
   * @param visibility Who can see this post (public, connections, etc.)
   */
  async postMessage(message: string, visibility: string = 'CONNECTIONS'): Promise<ApiResponse> {
    const userId = await this.getUserId();

    return this.post({
      path: '/ugcPosts',
      body: {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: message,
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
   * Get the user's LinkedIn ID
   */
  async getUserId(): Promise<string> {
    const profile = await this.getUserProfile();
    return profile.id;
  }
}
