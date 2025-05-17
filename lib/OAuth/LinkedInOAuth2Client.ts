import Homey from 'homey';
import { OAuth2Client, OAuth2Token, ApiResponse } from 'homey-oauth2app';

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
      redirectUrl: LinkedInOAuth2Client.REDIRECT_URL || options.redirectUrl
    };

    super(safeOptions);
  }
  
  // We don't need to override getAuthorizationUrl
  // The parent OAuth2Client class will use the redirectUrl provided in the constructor

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
          'Accept': 'application/json',
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
      this.log('Successfully parsed token response');

      // Check that we have a valid access token
      if (!tokenResponse.access_token) {
        this.error('Missing access token in response:', tokenResponse);
        throw new Error('Invalid token response: Missing access_token');
      }

      this.log(`Received access token: ${tokenResponse.access_token.substring(0, 5)}...`);

      return {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_type: tokenResponse.token_type,
        expires_in: tokenResponse.expires_in,
      };
    } catch (error) {
      this.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Get the user's LinkedIn profile information
   */
  async getUserProfile() {
    try {
      this.log('Fetching LinkedIn profile data from API');
      
      // Make a request to the LinkedIn API with proper fields
      // Note: Using fields parameter instead of projection for reliable results
      const response = await this.get({
        path: '/me',
        query: {
          fields: 'id,localizedFirstName,localizedLastName',
        },
        headers: {
          'X-RestLi-Protocol-Version': '2.0.0',
          'Accept': 'application/json',
        },
      });
  
      this.log('LinkedIn profile API response received:', response.status);
      
      // Check if the response is OK
      if (!response || !response.data) {
        this.error('Invalid response from LinkedIn API:', response);
        throw new Error('Invalid response from LinkedIn API');
      }
      
      // Check for API errors in the response
      if (!response.ok) {
        this.error('Failed to fetch user profile:', response.status, JSON.stringify(response.data));
        throw new Error(`Failed to fetch LinkedIn profile: HTTP ${response.status}`);
      }
  
      this.log('Successfully retrieved LinkedIn profile with ID:', response.data.id);
      return response.data;
    } catch (error) {
      // Improve error logging with more details
      this.error('Error in getUserProfile:', error);
      if (error instanceof Error) {
        this.error('Error details:', error.message);
        if (error.stack) {
          this.error('Stack trace:', error.stack);
        }
      }
      
      // Re-throw with more descriptive message
      throw new Error(`Failed to get LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the user's LinkedIn email address
   */
  async getUserEmail() {
    try {
      this.log('Fetching LinkedIn email data from API');
      
      // Try to get email using the emailAddress endpoint
      const response = await this.get({
        path: '/emailAddress',
        query: {
          q: 'members',
          fields: 'elements,elements.handle~',
        },
        headers: {
          'X-RestLi-Protocol-Version': '2.0.0',
          'Accept': 'application/json',
        },
      });
  
      this.log('LinkedIn email API response received:', response.status);
      
      // Check if the response is valid
      if (!response || !response.data) {
        this.log('Invalid response from LinkedIn email API, falling back to default email');
        return 'unknown@email.com';
      }
      
      // Check for API errors
      if (!response.ok) {
        this.log('Failed to fetch email but continuing with flow:', response.status);
        return 'unknown@email.com';
      }
  
      // Extract the email from LinkedIn's response structure
      if (response.data?.elements?.[0]?.['handle~']?.emailAddress) {
        const email = response.data.elements[0]['handle~'].emailAddress;
        this.log('Successfully retrieved LinkedIn email:', email);
        return email;
      }
  
      // Try alternative response format if available
      if (response.data?.elements?.[0]?.handle?.emailAddress) {
        const email = response.data.elements[0].handle.emailAddress;
        this.log('Successfully retrieved LinkedIn email (alt format):', email);
        return email;
      }
  
      this.log('Email not found in response, using default value');
      return 'unknown@email.com'; // Fallback value
    } catch (error) {
      this.log('Error fetching email, using default value:', error);
      return 'unknown@email.com'; // Return default on any error to allow flow to continue
    }
  }

  /**
   * This method is called when a request is made to the API
   * Can be used to modify the request before it is sent
   */
  async onRequestHeaders({ headers }: {
    headers: Record<string, string>;
  }): Promise<Record<string, string>> {
    try {
      // Add diagnostic logging for headers
      this.log('Preparing request headers for LinkedIn API call');
      
      // Create mutable headers object with the correct type
      const updatedHeaders: Record<string, string> = {
        ...headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-RestLi-Protocol-Version': '2.0.0',
      };
      
      // Check if we have an authorization header and add if needed
      if (!headers['Authorization'] && this.getToken() && this.getToken().access_token) {
        this.log('Adding authorization header to request');
        updatedHeaders['Authorization'] = `Bearer ${this.getToken().access_token}`;
      }
      
      return updatedHeaders;
    } catch (error) {
      this.error('Error setting request headers:', error);
      // Return basic headers to avoid breaking the request entirely
      return {
        ...headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
    }
  }

  /**
   * This method is called when a request to the API returns an error
   * Used to handle specific API error cases, like token expiration
   */
  async onHandleResult({ result }: { result: ApiResponse }): Promise<ApiResponse> {
    try {
      // Check for missing or empty response
      if (!result) {
        this.error('Empty result received from API call');
        throw new Error('Empty response received from LinkedIn API');
      }
      
      // Log response status for debugging
      this.log(`API response status: ${result.status}`);
      
      // Handle 401 Unauthorized errors (expired token)
      if (!result.ok && result.status === 401) {
        this.log('Received 401 Unauthorized response from LinkedIn API');
        
        // Check if we have data in the response
        if (result.data) {
          this.log('Error response data:', JSON.stringify(result.data));
        }
        
        try {
          // Emit refresh_token event which the parent class will handle
          this.log('Attempting to refresh token...');
          await this.emit('refresh_token');
          this.log('Token refreshed successfully');
          
          // Return a simple success response to let the caller know to retry
          // Include all required properties of ApiResponse
          return {
            ok: true,
            status: 200,
            data: { refreshed: true, message: 'Token refreshed, please retry operation' },
            headers: result.headers || {}, // Preserve original headers or use empty object
          };
        } catch (refreshError) {
          this.error('Failed to refresh token:', refreshError);
          throw new Error('Token refresh failed');
        }
      }
      
      // Handle 400 Bad Request errors
      if (!result.ok && result.status === 400) {
        this.error('Received 400 Bad Request from LinkedIn API:', result.data);
        throw new Error(`LinkedIn API error: ${JSON.stringify(result.data)}`);
      }
      
      // Handle rate limiting
      if (!result.ok && result.status === 429) {
        this.error('LinkedIn API rate limit exceeded');
        throw new Error('LinkedIn API rate limit exceeded. Please try again later.');
      }
  
      return result;
    } catch (error) {
      this.error('Error in onHandleResult:', error);
      // Rethrow with additional context
      throw error instanceof Error 
        ? new Error(`LinkedIn API error: ${error.message}`) 
        : new Error('Unknown error handling LinkedIn API response');
    }
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

  /**
   * Get the current OAuth2 token
   * @returns The current OAuth2 token
   */
  getToken(): OAuth2Token {
    // Access the token from the OAuth2Client parent class
    // @ts-expect-error: Accessing protected property from parent class
    return this._token;
  }
}
