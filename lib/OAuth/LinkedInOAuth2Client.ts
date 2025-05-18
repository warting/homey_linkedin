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
 * Base64 decode function that works in Node.js (polyfill for atob)
 */
function base64Decode(str: string): string {
  // In Node.js environment, use Buffer
  return Buffer.from(str, 'base64').toString('utf-8');
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

  // Temporary properties to hold runtime settings from the app
  private static _clientId: string = '';
  private static _clientSecret: string = '';
  private static _redirectUrl: string = '';

  // Reference to the driver for settings access
  private driver: any = null;

  // Get credentials from app settings only
  static get CLIENT_ID(): string {
    return LinkedInOAuth2Client._clientId || ''; // Return empty string instead of undefined
  }

  static get CLIENT_SECRET(): string {
    return LinkedInOAuth2Client._clientSecret || ''; // Return empty string instead of undefined
  }

  // Access the redirect URL through getter/setter
  static get REDIRECT_URL(): string {
    return LinkedInOAuth2Client._redirectUrl || '';
  }

  // Set the redirect URL
  static set REDIRECT_URL(url: string) {
    LinkedInOAuth2Client._redirectUrl = url;
  }

  // Constructor to override parent with safer initialization
  constructor(options: any) {
    // Ensure options has clientId and clientSecret properties
    const safeOptions = {
      ...options,
      clientId: LinkedInOAuth2Client.CLIENT_ID || options.clientId || 'placeholder-id',
      clientSecret: LinkedInOAuth2Client.CLIENT_SECRET || options.clientSecret || 'placeholder-secret',
      redirectUrl: LinkedInOAuth2Client.REDIRECT_URL || options.redirectUrl,
    };

    super(safeOptions);

    // Store reference to driver if provided
    if (options.driver) {
      this.driver = options.driver;
    }
  }

  // Methods to set credentials at runtime (to be called from the app)
  static setClientId(clientId: string): void {
    if (clientId && clientId.trim() !== '') {
      // Just set the ID silently
      LinkedInOAuth2Client._clientId = clientId;
    } else {
      // Just set to empty string silently
      LinkedInOAuth2Client._clientId = '';
    }
  }

  static setClientSecret(clientSecret: string): void {
    if (clientSecret && clientSecret.trim() !== '') {
      // Just set the secret silently
      LinkedInOAuth2Client._clientSecret = clientSecret;
    } else {
      // Just set to empty string silently
      LinkedInOAuth2Client._clientSecret = '';
    }
  }

  // Set the callback URL using Homey's OAuth2 callback
  static initRedirectUrl(): void {
    try {
      console.log('The redirect URL should be set by the app during initialization');
      console.log('No default redirect URL will be used');

      // We'll leave the redirect URL empty
      // The app will handle setting this URL from the Homey Cloud API
    } catch (error) {
      console.error('Failed to initialize redirect URL information:', error);
      // Don't set any value - the app will handle this
    }
  }

  /**
   * Initialize the OAuth2 client
   */
  async onInit(): Promise<void> {
    this.log('LinkedIn OAuth2Client initialized');

    // Ensure we have a valid redirect URL
    if (!LinkedInOAuth2Client.REDIRECT_URL) {
      this.log('Setting up OAuth2 callback URL');
      LinkedInOAuth2Client.initRedirectUrl();
    }

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

    // Try to load token from driver settings
    await this.loadTokenFromSettings();
  }

  /**
   * Load token from driver settings
   */
  private async loadTokenFromSettings(): Promise<void> {
    try {
      if (!this.driver) {
        this.log('No driver reference available to load token from settings');
        return;
      }

      // Get token from driver settings
      const tokenStr = await this.driver.getSetting('oauth2_token');
      if (!tokenStr) {
        this.log('No token found in driver settings');
        return;
      }

      // Parse token from string
      try {
        const token = JSON.parse(tokenStr);
        this.log('Successfully loaded token from driver settings');

        // Set token in client
        // @ts-expect-error: Setting protected property from parent class
        this._token = token;

        this.log('Token loaded from settings successfully');
      } catch (parseError) {
        this.error('Error parsing token from settings:', parseError);
      }
    } catch (error) {
      this.error('Error loading token from settings:', error);
    }
  }

  /**
   * Save token to driver settings
   */
  private async saveTokenToSettings(token: OAuth2Token): Promise<void> {
    try {
      if (!this.driver) {
        this.log('No driver reference available to save token to settings');
        return;
      }

      // Stringify token for storage
      const tokenStr = JSON.stringify(token);

      // Save token to driver settings
      await this.driver.setSettings({
        oauth2_token: tokenStr
      });

      this.log('Token saved to driver settings successfully');
    } catch (error) {
      this.error('Error saving token to settings:', error);
    }
  }

  /**
   * Override the getTokenByCode method to handle LinkedIn's token response
   */
  async getTokenByCode(code: string | any): Promise<OAuth2Token> {
    this.log('Exchanging authorization code for access token...');

    // Extract the actual code value from the object or string
    let codeStr: string = '';
    if (typeof code === 'string') {
      codeStr = code;
    } else if (code && typeof code === 'object') {
      // The OAuth2 callback might pass an object with the code as a property
      if (code.code && typeof code.code === 'string') {
        codeStr = code.code;
      } else if (code.url && typeof code.url === 'string') {
        // Try to extract code from URL parameter
        try {
          const url = new URL(code.url);
          const params = new URLSearchParams(url.search);
          const codeParam = params.get('code');
          if (codeParam) {
            codeStr = codeParam;
          } else {
            this.error('Could not find code parameter in URL:', code.url);
            codeStr = String(code);
          }
        } catch (error) {
          this.error('Failed to parse URL:', error);
          codeStr = String(code);
        }
      } else {
        // Fallback: stringify the first field we can find
        let foundStringField = false;
        for (const key in code) {
          if (typeof code[key] === 'string') {
            codeStr = code[key];
            this.log(`Using field '${key}' as code value`);
            foundStringField = true;
            break;
          }
        }
        if (!foundStringField) {
          codeStr = JSON.stringify(code);
        }
      }
    } else {
      codeStr = String(code || '');
    }

    // Make sure we have a valid code string
    if (!codeStr || codeStr === 'undefined' || codeStr === '[object Object]') {
      this.error('Invalid authorization code:', code);
      throw new Error('Invalid authorization code. Please try again.');
    }

    // Log the code preview (first few characters) for debugging
    const codePreview = codeStr.length > 5 ? `${codeStr.substring(0, 5)}...` : codeStr;
    this.log(`Authorization code: ${codePreview}`);
    this.log(`Using TOKEN_URL: ${LinkedInOAuth2Client.TOKEN_URL}`);

    // Safely get a client ID preview
    const clientId = LinkedInOAuth2Client.CLIENT_ID;
    const clientIdPreview = clientId.length > 5 ? `${clientId.substring(0, 5)}...` : clientId;
    this.log(`Using client ID: ${clientIdPreview}`);

    this.log(`Using redirect URI: ${LinkedInOAuth2Client.REDIRECT_URL}`);

    try {
      // Use URL encoded form data which LinkedIn requires
      const body = new URLSearchParams();
      body.append('grant_type', 'authorization_code');
      body.append('code', codeStr);
      body.append('client_id', LinkedInOAuth2Client.CLIENT_ID);
      body.append('client_secret', LinkedInOAuth2Client.CLIENT_SECRET);
      body.append('redirect_uri', LinkedInOAuth2Client.REDIRECT_URL);

      this.log(`Request body params: grant_type=authorization_code&code=${codePreview}`);

      this.log(`Sending token request to: ${LinkedInOAuth2Client.TOKEN_URL}`);
      this.log(`Full request body: ${body.toString()}`);

      const response = await fetch(LinkedInOAuth2Client.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      this.log(`Token response status: ${response.status}`);

      let responseText: string;
      try {
        responseText = await response.text();
        this.log(`Token response body: ${responseText}`);
      } catch (err) {
        this.error('Error reading response body:', err);
        responseText = '';
      }

      if (!response.ok) {
        this.error('Token request failed:', response.status, responseText);
        throw new Error(`Failed to exchange code for token: ${response.status} ${responseText}`);
      }

      // Try to parse the response as JSON
      let tokenResponse: LinkedInTokenResponse;
      try {
        tokenResponse = JSON.parse(responseText) as LinkedInTokenResponse;
        this.log('Successfully parsed token response');
      } catch (err) {
        this.error('Error parsing token response as JSON:', err);
        throw new Error(`Invalid token response format: ${responseText}`);
      }

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

      // Save token to driver settings
      await this.saveTokenToSettings(token);

      return token;
    } catch (error) {
      this.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Get the current OAuth2 token
   * @returns The current OAuth2 token
   */
  getToken(): OAuth2Token {
    // Access the token from the OAuth2Client parent class
    // @ts-expect-error: Accessing protected property from parent class
    return this._token;
  }

  /**
   * Set the current OAuth2 token directly
   * Only use this method for debugging or special cases
   * @param token Token to set
   */
  setToken(token: OAuth2Token): void {
    if (!token) {
      this.error('[LinkedInOAuth2Client] Cannot set null token');
      return;
    }

    this.log('[LinkedInOAuth2Client] Setting token');

    // Set the token to the protected property
    // @ts-expect-error: Setting protected property from parent class
    this._token = token;

    // Save token to driver settings
    this.saveTokenToSettings(token).catch(error =>
      this.error('Error saving token to settings:', error)
    );

    // Verify token was set
    const verifyToken = this.getToken();
    if (verifyToken && verifyToken.access_token) {
      this.log('[LinkedInOAuth2Client] Token successfully set');
    } else {
      this.error('[LinkedInOAuth2Client] Failed to set token');
    }
  }

  /**
   * Get user profile information from LinkedIn
   * This uses OpenID Connect id_token if available, or the LinkedIn API otherwise
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
   * Using the id_token (preferred) or the LinkedIn API
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

      const data = response.data as LinkedInEmailResponse;

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
   * @param token JWT token to parse
   * @returns The parsed JWT payload
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

      const decodedPayload = base64Decode(normalizedPayload);

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
   * @param text The text content to post
   * @param visibility The visibility setting for the post (PUBLIC, CONNECTIONS, CONTAINER)
   * @returns API response object
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
                text: text,
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
