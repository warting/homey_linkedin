import { OAuth2Client, ApiResponse } from 'homey-oauth2app';
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
      // In Homey SDK v3, settings are accessed via homey.settings
      return Homey.env.CLIENT_ID || LinkedInOAuth2Client._clientId || '';
    } catch (error) {
      console.error('Error getting CLIENT_ID:', error);
      return '';
    }
  }

  static get CLIENT_SECRET(): string {
    try {
      // In Homey SDK v3, settings are accessed via homey.settings
      return Homey.env.CLIENT_SECRET || LinkedInOAuth2Client._clientSecret || '';
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
   * Helper method for making API requests to LinkedIn
   */
  async makeRequest(options: {
    path: string;
    method?: string;
    body?: any;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  }): Promise<ApiResponse> {
    const {
      path, method = 'GET', body, query = {}, headers = {},
    } = options;

    try {
      if (method === 'GET') {
        return await this.get({
          path,
          query,
          headers,
        });
      }
      return await this.post(path, body, headers);

    } catch (err: any) {
      this.error('API Request failed:', err);
      return {
        ok: false,
        status: 0,
        statusCode: 0,
        headers: {},
        data: { error: err.message || 'Unknown error' },
      };
    }
  }
}
