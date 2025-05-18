import Homey from 'homey';
import { OAuth2Client, OAuth2Token as BaseOAuth2Token, ApiResponse } from 'homey-oauth2app';

// Extend the OAuth2Token interface to include id_token
interface OAuth2Token extends BaseOAuth2Token {
  id_token?: string;
}

/**
 * Interface for LinkedIn OAuth token response
 * Using snake_case to match LinkedIn's actual API response format
 * @eslint-disable camelcase
 */
interface LinkedInTokenResponse {
  // LinkedIn API returns snake_case properties
  // eslint-disable-next-line camelcase
  access_token: string;
  // eslint-disable-next-line camelcase
  refresh_token?: string;
  // eslint-disable-next-line camelcase
  token_type?: string;
  // eslint-disable-next-line camelcase
  expires_in?: number;
  // eslint-disable-next-line camelcase
  id_token?: string; // OpenID Connect ID token that contains user info
}

/**
 * Interface for JWT payload in the id_token
 */
interface JwtPayload {
  email?: string;
  name?: string;
  // eslint-disable-next-line camelcase
  given_name?: string;
  // eslint-disable-next-line camelcase
  family_name?: string;
  picture?: string;
  sub?: string;
  [key: string]: any;
}

/**
 * Interface for LinkedIn user profile response
 */
interface LinkedInProfileResponse {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for LinkedIn email response
 */
interface LinkedInEmailResponse {
  elements?: Array<{
    'handle~'?: {
      emailAddress?: string;
    };
    handle?: {
      emailAddress?: string;
    };
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * LinkedIn OAuth2 Client
 *
 * This client handles the OAuth2 flow for LinkedIn API integration
 */
export default class LinkedInOAuth2Client extends OAuth2Client {
  static API_URL = 'https://api.linkedin.com/v2';
  static TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
  static AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';

  // Update scopes to match those from LinkedIn developer page
  static SCOPES = [
    'openid', // Use your name and photo
    'profile', // Use your name and photo
    'email', // Use the primary email address associated with your LinkedIn account
    'w_member_social', // Share content on your behalf
  ];

  // Static credentials, can be set at runtime
  private static _clientId: string = '';
  private static _clientSecret: string = '';
  private static _redirectUrl: string = '';

  // Get credentials from app settings only
  static get CLIENT_ID(): string {
    return LinkedInOAuth2Client._clientId || '';
  }

  static get CLIENT_SECRET(): string {
    return LinkedInOAuth2Client._clientSecret || '';
  }

  // Access the redirect URL through getter/setter
  static get REDIRECT_URL(): string {
    return LinkedInOAuth2Client._redirectUrl || '';
  }

  // Set the redirect URL
  static set REDIRECT_URL(url: string) {
    LinkedInOAuth2Client._redirectUrl = url;
  }

  // Methods to set credentials at runtime (to be called from the app)
  static setClientId(clientId: string): void {
    if (clientId && clientId.trim() !== '') {
      LinkedInOAuth2Client._clientId = clientId;
    } else {
      LinkedInOAuth2Client._clientId = '';
    }
  }

  static setClientSecret(clientSecret: string): void {
    if (clientSecret && clientSecret.trim() !== '') {
      LinkedInOAuth2Client._clientSecret = clientSecret;
    } else {
      LinkedInOAuth2Client._clientSecret = '';
    }
  }

  /**
   * Initialize the OAuth2 client
   */
  async onInit(): Promise<void> {
    this.log('LinkedIn OAuth2Client initialized');

    // Log authentication status but hide full credentials for security
    if (LinkedInOAuth2Client.CLIENT_ID) {
      const idPreview = `${LinkedInOAuth2Client.CLIENT_ID.substring(0, 4)}...${
        LinkedInOAuth2Client.CLIENT_ID.substring(LinkedInOAuth2Client.CLIENT_ID.length - 4)}`;
      this.log(`Using LinkedIn Client ID: ${idPreview}`);
    } else {
      this.error('LinkedIn Client ID is not set!');
    }

    if (LinkedInOAuth2Client.CLIENT_SECRET) {
      this.log('LinkedIn Client Secret is configured');
    } else {
      this.error('LinkedIn Client Secret is not set!');
    }

    if (LinkedInOAuth2Client.REDIRECT_URL) {
      this.log(`Using redirect URL: ${LinkedInOAuth2Client.REDIRECT_URL}`);
    } else {
      this.error('OAuth2 redirect URL is not set!');
    }
  }

  /**
   * Override the getTokenByCode method to handle LinkedIn's token response
   */
  async onGetTokenByCode(args: { code: string }): Promise<OAuth2Token> {
    this.log('Getting token by authorization code');

    const { code } = args;
    if (!code) {
      throw new Error('Invalid authorization code');
    }

    // Log the code preview (first few characters) for debugging
    const codePreview = code.length > 5 ? `${code.substring(0, 5)}...` : code;
    this.log(`Authorization code: ${codePreview}`);

    try {
      // Use URL encoded form data which LinkedIn requires
      const body = new URLSearchParams();
      body.append('grant_type', 'authorization_code');
      body.append('code', code);
      body.append('client_id', LinkedInOAuth2Client.CLIENT_ID);
      body.append('client_secret', LinkedInOAuth2Client.CLIENT_SECRET);
      body.append('redirect_uri', LinkedInOAuth2Client.REDIRECT_URL);

      this.log(`Request body params: grant_type=authorization_code&code=${codePreview}`);

      const response = await fetch(LinkedInOAuth2Client.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      this.log(`Token response status: ${response.status}`);

      const responseText = await response.text();
      if (!response.ok) {
        this.error('Token request failed:', response.status, responseText);
        throw new Error(`Failed to exchange code for token: ${response.status} ${responseText}`);
      }

      // Parse the response as JSON
      const tokenResponse = JSON.parse(responseText) as LinkedInTokenResponse;
      this.log('Successfully parsed token response');

      // Check that we have a valid access token
      if (!tokenResponse.access_token) {
        this.error('Missing access token in response:', tokenResponse);
        throw new Error('Invalid token response: Missing access_token');
      }

      this.log(`Received access token: ${tokenResponse.access_token.substring(0, 5)}...`);

      // Create token object
      const token: OAuth2Token = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_type: tokenResponse.token_type,
        expires_in: tokenResponse.expires_in,
        id_token: tokenResponse.id_token,
      };

      return token;
    } catch (error) {
      this.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Get user profile information from LinkedIn
   */
  async getUserProfile(): Promise<LinkedInProfileResponse> {
    this.log('Getting LinkedIn user profile');

    // Check if we have an id_token that contains user info
    const token = this.getToken();
    if (token && token.id_token) {
      try {
        this.log('Using id_token to extract profile information');
        // Parse the JWT token
        const jwtPayload = this.parseJwtToken(token.id_token);

        if (jwtPayload && jwtPayload.sub) {
          this.log('Successfully extracted profile from id_token');
          // Create profile object from JWT claims
          return {
            id: jwtPayload.sub,
            localizedFirstName: jwtPayload.given_name || '',
            localizedLastName: jwtPayload.family_name || '',
            profilePicture: jwtPayload.picture ? { displayImage: jwtPayload.picture } : undefined,
          };
        }
        this.log('id_token did not contain expected profile data, falling back to API');
      } catch (error) {
        this.error('Error extracting profile from id_token:', error);
        this.log('Falling back to LinkedIn API for profile');
      }
    }

    // If we don't have an id_token or it failed, fetch from the API
    try {
      this.log('Fetching user profile from LinkedIn API');

      // Make API request to get LinkedIn profile
      const response = await this.get({
        path: '/me',
        query: {
          projection: '(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
        },
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      this.log('Successfully fetched profile from LinkedIn API');
      return response.data as LinkedInProfileResponse;
    } catch (error) {
      this.error('Error fetching LinkedIn profile:', error);
      throw error;
    }
  }

  /**
   * Get user's email address from LinkedIn
   */
  async getUserEmail(): Promise<string> {
    this.log('Getting LinkedIn user email');

    // First try to get email from id_token (OpenID Connect)
    const token = this.getToken();
    if (token && token.id_token) {
      try {
        const jwtPayload = this.parseJwtToken(token.id_token);
        if (jwtPayload && jwtPayload.email) {
          this.log('Successfully extracted email from id_token');
          return jwtPayload.email;
        }
      } catch (error) {
        this.error('Error extracting email from id_token:', error);
      }
    }

    // Fallback to LinkedIn API for email
    try {
      this.log('Fetching user email from LinkedIn API');

      // Make API request to get LinkedIn email
      const response = await this.get({
        path: '/emailAddress',
        query: {
          q: 'members',
          projection: '(elements*(handle~))',
        },
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const { data } = response;

      if (data.elements && data.elements.length > 0) {
        // Try to find primary email address
        for (const element of data.elements) {
          // Handle different API response formats
          const emailAddress = element['handle~']?.emailAddress || element.handle?.emailAddress;
          if (emailAddress) {
            this.log('Successfully fetched email from LinkedIn API');
            return emailAddress;
          }
        }
      }

      throw new Error('No email found in LinkedIn API response');
    } catch (error) {
      this.error('Error fetching LinkedIn email:', error);
      throw error;
    }
  }

  /**
   * Parse a JWT token
   */
  private parseJwtToken(token: string): JwtPayload {
    try {
      this.log('Parsing JWT token');

      // JWT tokens have three parts: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      // Decode the base64-encoded payload (second part)
      const payload = parts[1];
      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const decodedPayload = Buffer.from(normalizedPayload, 'base64').toString('utf-8');

      // Parse JSON
      const jwtPayload = JSON.parse(decodedPayload) as JwtPayload;

      this.log('Successfully parsed JWT token');
      return jwtPayload;
    } catch (error) {
      this.error('Error parsing JWT token:', error);
      throw error;
    }
  }

  /**
   * Post a message to LinkedIn
   */
  async postMessage(text: string, visibility: string = 'CONNECTIONS'): Promise<ApiResponse> {
    this.log('Posting message to LinkedIn');

    try {
      // First get the user's ID
      const profile = await this.getUserProfile();
      const userId = profile.id;

      if (!userId) {
        throw new Error('Could not determine user ID for post');
      }

      this.log(`Creating post for user ${userId} with visibility ${visibility}`);

      // Create the post
      const response = await this.post({
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
                text,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility,
          },
        },
      });

      if (!response.ok) {
        this.error('LinkedIn post failed:', response.status, response.data);
      } else {
        this.log('Successfully posted message to LinkedIn');
      }

      return response;
    } catch (error) {
      this.error('Error posting message to LinkedIn:', error);
      throw error;
    }
  }
}
