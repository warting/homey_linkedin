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

  // Update scopes to match those from LinkedIn developer page
  static SCOPES = [
    'openid',     // Use your name and photo
    'profile',    // Use your name and photo
    'email'       // Use the primary email address associated with your LinkedIn account
  ];

  // Temporary properties to hold runtime settings from the app
  private static _clientId: string = '';
  private static _clientSecret: string = '';

  // Get credentials from app settings only
  static get CLIENT_ID(): string {
    return LinkedInOAuth2Client._clientId;
  }

  static get CLIENT_SECRET(): string {
    return LinkedInOAuth2Client._clientSecret;
  }

  // Methods to set credentials at runtime (to be called from the app)
  static setClientId(clientId: string): void {
    if (clientId && clientId.trim() !== '') {
      console.log(`Setting LinkedIn Client ID: ${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}`);
      LinkedInOAuth2Client._clientId = clientId;
    } else {
      console.error('Attempted to set empty or invalid LinkedIn Client ID');
    }
  }

  static setClientSecret(clientSecret: string): void {
    if (clientSecret && clientSecret.trim() !== '') {
      console.log(`Setting LinkedIn Client Secret: ${clientSecret.substring(0, 2)}...${clientSecret.substring(clientSecret.length - 2)}`);
      LinkedInOAuth2Client._clientSecret = clientSecret;
    } else {
      console.error('Attempted to set empty or invalid LinkedIn Client Secret');
    }
  }

  /**
   * Initialize the OAuth2 client
   */
  async onInit(): Promise<void> {
    this.log('LinkedIn OAuth2Client initialized');

    // Log authentication status but hide full credentials for security
    if (LinkedInOAuth2Client.CLIENT_ID) {
      const idPreview = LinkedInOAuth2Client.CLIENT_ID.substring(0, 4) + '...' +
                        LinkedInOAuth2Client.CLIENT_ID.substring(LinkedInOAuth2Client.CLIENT_ID.length - 4);
      this.log(`Using LinkedIn Client ID: ${idPreview}`);
    } else {
      this.error('LinkedIn Client ID is not set!');
    }

    if (LinkedInOAuth2Client.CLIENT_SECRET) {
      this.log('LinkedIn Client Secret is configured');
    } else {
      this.error('LinkedIn Client Secret is not set!');
    }
  }

  /**
   * Get the user's LinkedIn profile information
   */
  async getUserProfile() {
    try {
      const response = await this.get({
        path: '/me',
        query: {
          projection: '(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
        },
      });

      if (!response.ok) {
        this.error('Failed to fetch user profile:', response.status, response.data);
        throw new Error(`Failed to fetch LinkedIn profile: ${response.status} ${JSON.stringify(response.data)}`);
      }

      return response.data;
    } catch (error) {
      this.error('Error in getUserProfile:', error);
      throw error;
    }
  }

  /**
   * Get the user's LinkedIn email address
   */
  async getUserEmail() {
    try {
      const response = await this.get({
        path: '/emailAddress',
        query: {
          q: 'members',
          projection: '(elements*(handle~))',
        },
      });

      if (!response.ok) {
        this.error('Failed to fetch user email:', response.status, response.data);
        throw new Error(`Failed to fetch LinkedIn email: ${response.status} ${JSON.stringify(response.data)}`);
      }

      // Extract the email from LinkedIn's response structure
      if (response.data &&
          response.data.elements &&
          response.data.elements.length > 0 &&
          response.data.elements[0]['handle~'] &&
          response.data.elements[0]['handle~'].emailAddress) {
        return response.data.elements[0]['handle~'].emailAddress;
      }

      this.error('Email not found in response:', response.data);
      return 'unknown@email.com'; // Fallback value
    } catch (error) {
      this.error('Error in getUserEmail:', error);
      throw error;
    }
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
