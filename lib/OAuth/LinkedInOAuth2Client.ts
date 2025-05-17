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

  static CLIENT_ID = Homey.env.CLIENT_ID || '';
  static CLIENT_SECRET = Homey.env.CLIENT_SECRET || '';

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
