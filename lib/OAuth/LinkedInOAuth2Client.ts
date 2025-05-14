import { OAuth2Client, OAuth2Token } from 'homey-oauth2app';
import { URLSearchParams } from 'url';

/**
 * LinkedIn OAuth2 Client
 *
 * This client handles the OAuth2 flow for LinkedIn API integration
 */
export class LinkedInOAuth2Client extends OAuth2Client {
  static API_URL = 'https://api.linkedin.com/v2';
  static TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
  static AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';
  static SCOPES = [
    'r_liteprofile',
    'r_emailaddress',
    'w_member_social',
    'w_organization_social',
  ];

  /**
   * Initialize the OAuth2 client
   */
  async onInit(): Promise<void> {
    this.log('LinkedIn OAuth2Client initialized');
  }

  /**
   * Method that returns the authorization URL for LinkedIn OAuth2 flow
   */
  async getAuthorizationUrl(): Promise<string> {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUrl,
      scope: LinkedInOAuth2Client.SCOPES.join(' '),
      state: this.getRandomId(),
    });

    return `${LinkedInOAuth2Client.AUTHORIZATION_URL}?${params.toString()}`;
  }

  /**
   * Method that exchanges an authorization code for an access token
   */
  async getTokenByCode(code: string): Promise<OAuth2Token> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUrl,
    }).toString();

    const response = await this.post(
      LinkedInOAuth2Client.TOKEN_URL,
      body,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    );

    if (!response.ok) {
      this.error('Error getting token by code:', response.statusCode, response.data);
      throw new Error(`Error getting token by code: ${response.statusCode}`);
    }

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
    };
  }

  /**
   * Method that refreshes the access token using the refresh token
   */
  async refreshToken(token: OAuth2Token): Promise<OAuth2Token> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: token.refresh_token || '',
    }).toString();

    const response = await this.post(
      LinkedInOAuth2Client.TOKEN_URL,
      body,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    );

    if (!response.ok) {
      this.error('Error refreshing token:', response.statusCode, response.data);
      throw new Error(`Error refreshing token: ${response.statusCode}`);
    }

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || token.refresh_token,
      expires_in: response.data.expires_in,
    };
  }

  /**
   * Get LinkedIn user profile with the access token
   */
  async getUserProfile(): Promise<Record<string, unknown>> {
    const response = await this.get({
      path: '/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
    });

    if (!response.ok) {
      this.error('Error getting user profile:', response.statusCode, response.data);
      throw new Error(`Error getting user profile: ${response.statusCode}`);
    }

    return response.data;
  }

  /**
   * Get LinkedIn user email with the access token
   */
  async getUserEmail(): Promise<string> {
    const response = await this.get({
      path: '/emailAddress?q=members&projection=(elements*(handle~))',
    });

    if (!response.ok) {
      this.error('Error getting user email:', response.statusCode, response.data);
      throw new Error(`Error getting user email: ${response.statusCode}`);
    }

    // Extract email from the response
    if (response.data
        && response.data.elements
        && response.data.elements.length > 0
        && response.data.elements[0]['handle~']
        && response.data.elements[0]['handle~'].emailAddress) {
      return response.data.elements[0]['handle~'].emailAddress;
    }

    throw new Error('Email not found in the response');
  }

  /**
   * Helper method to generate a random ID
   */
  private getRandomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export default LinkedInOAuth2Client;
