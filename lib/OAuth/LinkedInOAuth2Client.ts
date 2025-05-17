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

      // Check if response includes an id_token (OpenID Connect)
      if ('id_token' in tokenResponse) {
        this.log(`Received id_token from LinkedIn`);
        
        // Return token including id_token
        return {
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          token_type: tokenResponse.token_type,
          expires_in: tokenResponse.expires_in,
          id_token: tokenResponse.id_token,
        };
      }
      
      // Standard OAuth2 token without id_token
      return {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_type: tokenResponse.token_type,
        expires_in: tokenResponse.expires_in,
        id_token: tokenResponse.id_token, // Include the ID token if available
      };
    } catch (error) {
      this.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Safe console logging that doesn't emit events
   * This avoids the unhandled error issues that can occur with this.error()
   */
  private safeLog(level: 'log' | 'warn' | 'error', ...args: any[]): void {
    try {
      const prefix = `[LinkedInOAuth2Client] ${level.toUpperCase()}:`;
      
      // Use console methods directly instead of this.log or this.error
      if (level === 'error') {
        console.error(prefix, ...args);
      } else if (level === 'warn') {
        console.warn(prefix, ...args);
      } else {
        console.log(prefix, ...args);
        // Also try to use this.log for normal logs if it's available
        try {
          this.log(...args);
        } catch (e) {
          // Ignore errors from this.log
        }
      }
    } catch (e) {
      // Last resort fallback - should never get here
      console.error('[LinkedInOAuth2Client] Error in safeLog:', e);
    }
  }
  
  /**
   * Get the user's LinkedIn profile information - with robust error handling
   * @returns A LinkedIn profile object with at least an id field
   */
  async getUserProfile(): Promise<LinkedInProfileResponse> {
    // Use direct console.log instead of this.log to avoid any potential errors
    console.log('[LinkedInOAuth2Client] Fetching LinkedIn profile data from API');
    
    // Define fallback profile
    const fallbackProfile: LinkedInProfileResponse = { 
      id: 'unknown-profile', 
      localizedFirstName: 'LinkedIn', 
      localizedLastName: 'User' 
    };
    
    // First try/catch block for the API request
    try {
      // Use a direct fetch approach instead of this.get to have more control
      const token = this.getToken();
      if (!token || !token.access_token) {
        console.error('[LinkedInOAuth2Client] No access token available for API request');
        return fallbackProfile;
      }
      
      const apiUrl = `${LinkedInOAuth2Client.API_URL}/me?fields=id,localizedFirstName,localizedLastName`;
      console.log(`[LinkedInOAuth2Client] Making direct request to: ${apiUrl}`);
      
      const fetchResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[LinkedInOAuth2Client] API response status: ${fetchResponse.status}`);
      
      // Check if the response is OK
      if (!fetchResponse.ok) {
        console.error(`[LinkedInOAuth2Client] LinkedIn API returned error status: ${fetchResponse.status}`);
        
        // Try to read the error response
        try {
          const errorText = await fetchResponse.text();
          console.error(`[LinkedInOAuth2Client] Error response: ${errorText}`);
        } catch (textError) {
          console.error('[LinkedInOAuth2Client] Could not read error response text');
        }
        
        // Return fallback profile data to prevent app crash
        return { 
          id: `error-${fetchResponse.status}`, 
          localizedFirstName: 'LinkedIn', 
          localizedLastName: 'User' 
        };
      }
      
      // Try to parse the JSON response
      let data: any;
      try {
        data = await fetchResponse.json();
        console.log('[LinkedInOAuth2Client] Successfully parsed profile response');
      } catch (jsonError) {
        console.error('[LinkedInOAuth2Client] Failed to parse JSON response:', jsonError);
        return { 
          id: 'parse-error', 
          localizedFirstName: 'LinkedIn', 
          localizedLastName: 'User' 
        };
      }
      
      // Verify the data has an ID
      if (!data || !data.id) {
        console.error('[LinkedInOAuth2Client] Profile data is missing ID:', data);
        return { 
          id: 'missing-id', 
          localizedFirstName: 'LinkedIn', 
          localizedLastName: 'User' 
        };
      }
      
      console.log(`[LinkedInOAuth2Client] Successfully retrieved profile with ID: ${data.id}`);
      
      // Return the profile data as a proper LinkedInProfileResponse
      const profile: LinkedInProfileResponse = {
        id: data.id,
        localizedFirstName: data.localizedFirstName || 'LinkedIn',
        localizedLastName: data.localizedLastName || 'User',
      };
      
      return profile;
    } catch (error) {
      // Catch any errors from the API request
      console.error('[LinkedInOAuth2Client] Error fetching profile:', error);
      
      // Return fallback profile data to prevent app crash
      return { 
        id: 'api-error', 
        localizedFirstName: 'LinkedIn', 
        localizedLastName: 'User',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the user's LinkedIn email address, first from id_token if available, then from API
   * @returns Email address as string, or unknown@email.com if unavailable
   */
  async getUserEmail(): Promise<string> {
    console.log('[LinkedInOAuth2Client] Attempting to get LinkedIn email');
    
    // Default fallback email
    const fallbackEmail = 'unknown@email.com';
    
    try {
      // Get the token from our OAuth2 client
      const token = this.getToken();
      if (!token) {
        console.error('[LinkedInOAuth2Client] No token available');
        return fallbackEmail;
      }
      
      // Try to get email from id_token if available
      if (token.id_token) {
        console.log('[LinkedInOAuth2Client] Found id_token, trying to extract email from JWT');
        const jwt = this.parseJwtToken(token.id_token);
        
        if (jwt && jwt.email) {
          console.log(`[LinkedInOAuth2Client] Successfully extracted email from JWT: ${jwt.email}`);
          return jwt.email;
        } else {
          console.log('[LinkedInOAuth2Client] No email found in JWT, falling back to API');
        }
      } else {
        console.log('[LinkedInOAuth2Client] No id_token available, using API to get email');
      }
      
      // If we don't have an access token, return the fallback
      if (!token.access_token) {
        console.error('[LinkedInOAuth2Client] No access_token available for API request');
        return fallbackEmail;
      }
      
      console.log('[LinkedInOAuth2Client] Fetching LinkedIn email data from API');
      
      // Build the API URL
      const apiUrl = `${LinkedInOAuth2Client.API_URL}/emailAddress?q=members&fields=elements,elements.handle~`;
      console.log(`[LinkedInOAuth2Client] Requesting email from: ${apiUrl}`);
      
      // Make direct fetch request
      const fetchResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[LinkedInOAuth2Client] Email API response status: ${fetchResponse.status}`);
      
      // Check if response was successful
      if (!fetchResponse.ok) {
        console.error(`[LinkedInOAuth2Client] Failed to fetch email: ${fetchResponse.status}`);
        return fallbackEmail;
      }
      
      // Parse response
      let data: LinkedInEmailResponse | null = null;
      try {
        const jsonData = await fetchResponse.json();
        data = jsonData as LinkedInEmailResponse;
      } catch (jsonError) {
        console.error('[LinkedInOAuth2Client] Failed to parse email response JSON:', jsonError);
        return fallbackEmail;
      }
      
      // Make sure data is not null
      if (!data) {
        console.error('[LinkedInOAuth2Client] Email data is null');
        return fallbackEmail;
      }
      
      // Extract email from LinkedIn's response structure
      if (data.elements && 
          data.elements.length > 0 && 
          data.elements[0]['handle~'] && 
          data.elements[0]['handle~'].emailAddress) {
        const email = data.elements[0]['handle~'].emailAddress;
        console.log(`[LinkedInOAuth2Client] Successfully retrieved email: ${email}`);
        return email;
      }
      
      // Try alternative response format
      if (data.elements && 
          data.elements.length > 0 && 
          data.elements[0].handle && 
          data.elements[0].handle.emailAddress) {
        const email = data.elements[0].handle.emailAddress;
        console.log(`[LinkedInOAuth2Client] Retrieved email (alt format): ${email}`);
        return email;
      }
      
      console.log('[LinkedInOAuth2Client] Email not found in response');
      return fallbackEmail;
    } catch (error) {
      console.error('[LinkedInOAuth2Client] Error fetching email:', error);
      return fallbackEmail; // Return default on any error
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
   * Hook that's called before any request is made
   * Useful for logging request details for debugging
   */
  async onRequest({
    method,
    path,
    body,
    query,
    headers,
  }: {
    method: string;
    path: string;
    body?: any;
    query?: Record<string, any>;
    headers: Record<string, string>;
  }) {
    try {
      // Log request details without sensitive info
      this.log(`API Request: ${method} ${path}`);
      
      // Log token information for debugging but hide the full token
      const token = this.getToken();
      if (token && token.access_token) {
        const tokenPreview = `${token.access_token.substring(0, 5)}...${token.access_token.substring(token.access_token.length - 5)}`;
        this.log(`Using access token: ${tokenPreview}`);
      } else {
        this.log('No access token available for request');
      }
      
      // Log query parameters for debugging
      if (query && Object.keys(query).length > 0) {
        this.log(`Query parameters: ${JSON.stringify(query)}`);
      }
      
      // Log headers for debugging but hide authorization value
      const debugHeaders = { ...headers };
      if (debugHeaders['Authorization']) {
        debugHeaders['Authorization'] = 'Bearer [hidden]';
      }
      this.log(`Request headers: ${JSON.stringify(debugHeaders)}`);
      
      // Log request body if it exists (for POST/PUT requests)
      if (body) {
        this.log(`Request body: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
      }
    } catch (error) {
      // Don't let logging errors break the request
      this.error('Error in onRequest hook (continuing with request):', error);
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
   * Get the user's LinkedIn ID with fallback handling
   * @returns User ID as string, or a fallback ID if unavailable
   */
  async getUserId(): Promise<string> {
    try {
      const profile: LinkedInProfileResponse = await this.getUserProfile();
      // TypeScript now knows profile has an id property
      return profile.id || 'unknown-user-id';
    } catch (error) {
      console.error('[LinkedInOAuth2Client] Error in getUserId:', error);
      return 'error-user-id'; // Fallback ID on error
    }
  }

  /**
   * Parse a JWT token to extract the payload
   * @param token JWT token string
   * @returns Decoded payload or null if invalid
   */
  private parseJwtToken(token: string): JwtPayload | null {
    try {
      // JWT tokens are three base64 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('[LinkedInOAuth2Client] Invalid JWT token format');
        return null;
      }
  
      // Decode the middle part (payload)
      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      
      // Use Buffer for base64 decoding in Node.js
      const decoded = base64Decode(base64);
      
      // Parse the JSON payload
      const jwt = JSON.parse(decoded);
      console.log('[LinkedInOAuth2Client] Successfully parsed JWT token');
      
      return jwt;
    } catch (error) {
      console.error('[LinkedInOAuth2Client] Error parsing JWT token:', error);
      return null;
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
   * Decode a JWT token
   * @param token JWT token string to decode
   * @returns Decoded token payload or null if invalid
   */
  private decodeJwt(token: string): any | null {
    try {
      // Split the token into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[LinkedInOAuth2Client] Invalid JWT token format');
        return null;
      }
      
      // Decode the payload (middle part)
      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString()
          .split('')
          .map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('[LinkedInOAuth2Client] Failed to decode JWT token:', error);
      return null;
    }
  }
}
