'use strict';

import { OAuth2App } from 'homey-oauth2app';
import LinkedInOAuth2Client from './lib/OAuth/LinkedInOAuth2Client';

class LinkedInApp extends OAuth2App {
  // Define OAuth2 client as a static property per documentation
  static OAUTH2_CLIENT = LinkedInOAuth2Client;
  static OAUTH2_DEBUG = true;
  // Configure which drivers should use OAuth2
  static OAUTH2_DRIVERS = ['linkedin-user'];

  /**
   * onInit is called when the app is initialized.
   */
  async onOAuth2Init(): Promise<void> {
    this.log('Initializing LinkedIn app...');

    try {
      // Initialize the OAuth2 callback URL first
      try {
        await this.initOAuth2Callback();
      } catch (callbackError) {
        // If there's an error with the callback URL, log it but continue
        this.error('Failed to get OAuth2 callback URL:', callbackError);
        this.log('LinkedIn authentication will not work without a valid callback URL');
      }
      
      // Make sure we have a redirect URL (should be set by initOAuth2Callback)
      if (!LinkedInOAuth2Client.REDIRECT_URL) {
        this.error('No OAuth2 callback URL configured. LinkedIn authentication will not work.');
      } else {
        this.log(`Using OAuth2 callback URL: ${LinkedInOAuth2Client.REDIRECT_URL}`);
      }
      
      // Update OAuth credentials from settings
      this.updateOAuthCredentials(false);
  
      // Listen for settings changes
      this.homey.settings.on('set', (key) => {
        this.log(`Setting changed: ${key}`);
        if (key === 'client_id' || key === 'client_secret') {
          this.updateOAuthCredentials(true);
        }
      });
  
      this.log('LinkedIn App has been initialized');

      // Register flow cards
      await this.registerFlowCards();

    } catch (error) {
      this.error('Error during app initialization:', error);
      // Log error but don't crash the app
      this.log('App will continue running with limited functionality');
    }
  }
  
    /**
     * Store of the active OAuth2 client that has been authenticated
     * This is used to share the authenticated client with drivers
     */
    public activeOAuth2Client: LinkedInOAuth2Client | null = null;
  
    /**
     * Initialize the OAuth2 callback URL using Homey's API
     */
    async initOAuth2Callback(): Promise<void> {
      try {
        this.log('Initializing OAuth2 callback URL');
        
        // Register the callback with Homey Cloud API
        const callbackObj = await this.homey.cloud.createOAuth2Callback(this.homey.manifest.id);
        
        // Standard Homey callback format for OAuth2
        const callbackUrl = `https://callback.athom.com/oauth2/callback`;
        this.log(`Using standard Homey callback URL: ${callbackUrl}`);
        
        // Store this standard URL for the OAuth2 client to use
        LinkedInOAuth2Client.REDIRECT_URL = callbackUrl;
        
        // Log event handling for debugging
        callbackObj.on('url', (url: string) => {
          this.log(`OAuth2 callback URL event received (for reference): ${url}`);
          // We don't use this dynamic URL as it may contain OAuth parameters
        });
        
        callbackObj.on('code', (code: any) => {
          // Ensure code is a string and safely log it
          let codeStr: string;
          if (typeof code === 'string') {
            codeStr = code;
          } else if (code && typeof code === 'object') {
            if (code.code && typeof code.code === 'string') {
              codeStr = code.code;
              this.log('Extracted code from object property');
            } else {
              this.log('Code is an object, storing the whole object for debugging:', JSON.stringify(code));
              codeStr = 'object';
            }
          } else {
            codeStr = String(code || '');
          }
          
          const codePreview = codeStr && codeStr.length > 5 ? `${codeStr.substring(0, 5)}...` : codeStr;
          this.log(`OAuth2 code received: ${codePreview}`);
        });
        
        this.log(`OAuth2 callback URL configured successfully`);
        return;
      } catch (error) {
        this.error('Error initializing OAuth2 callback URL:', error);
        throw error; // Let the caller handle this error
      }
    }
    
    /**
     * Get the active OAuth2 client that is authenticated
     * Used by drivers to get the client for API calls
     */
    public getActiveOAuth2Client(): LinkedInOAuth2Client | null {
      // If we already have an active client, return it
      if (this.activeOAuth2Client && this.activeOAuth2Client.getToken()) {
        this.log('Returning existing active OAuth2 client');
        return this.activeOAuth2Client;
      }
      
      this.log('No active OAuth2 client found, checking saved sessions');
      
      try {
        // Try to find an OAuth2 client from the saved sessions
        // @ts-expect-error: Protected method in homey-oauth2app
        const savedSessions = this.getSavedOAuth2Sessions ? this.getSavedOAuth2Sessions() : null;
        
        if (savedSessions && Object.keys(savedSessions).length > 0) {
          this.log('Found saved OAuth2 sessions, creating client with most recent session');
          
          // Get the most recent session ID
          const sessionId = Object.keys(savedSessions)[0];
          this.log(`Using session ID: ${sessionId}`);
          
          // Create a client with the session
          const client = new LinkedInOAuth2Client({
            sessionId,
            clientId: LinkedInOAuth2Client.CLIENT_ID,
            clientSecret: LinkedInOAuth2Client.CLIENT_SECRET,
            redirectUrl: LinkedInOAuth2Client.REDIRECT_URL,
            apiUrl: LinkedInOAuth2Client.API_URL,
            tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
            authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL
          });
          
          // Store this client for future use
          this.activeOAuth2Client = client;
          
          // Load the saved session data
          try {
            const sessionData = savedSessions[sessionId];
            this.log('Loading saved session token into active client');
            
            if (sessionData && sessionData.token) {
              client.setToken(sessionData.token);
              this.log('Successfully loaded saved session token into active client');
              
              // Verify token was loaded
              const verifyToken = client.getToken();
              if (verifyToken && verifyToken.access_token) {
                this.log('Active client has valid token');
              } else {
                this.log('Token verification failed');
              }
            } else {
              this.log('No token in saved session');
            }
          } catch (sessionError) {
            this.error('Error loading saved session:', sessionError);
          }
          
          return client;
        } else {
          this.log('No saved OAuth2 sessions found');
        }
      } catch (error) {
        this.error('Error getting active OAuth2 client:', error);
      }
      
      return null;
    }
    
    /**
     * Store the OAuth2 client as the active client
     * Called when a new client is authenticated
     */
    public setActiveOAuth2Client(client: LinkedInOAuth2Client): void {
      this.log('Setting new active OAuth2 client');
      this.activeOAuth2Client = client;
      
      // Verify client has a token
      const token = client.getToken();
      if (token && token.access_token) {
        this.log('New active client has valid token');
      } else {
        this.log('Warning: New active client has no valid token');
    }
  }

  /**
   * Update OAuth credentials from app settings
   */
  updateOAuthCredentials(throwErrors: boolean = true): void {
    this.log('Updating OAuth credentials from settings...');

    const clientId = this.homey.settings.get('client_id');
    const clientSecret = this.homey.settings.get('client_secret');

    if (!clientId) {
      this.error('LinkedIn Client ID not found in app settings!');
      if (throwErrors) {
        throw new Error('LinkedIn Client ID is required for full functionality. Please add your LinkedIn Client ID in the app settings.');
      } else {
        this.log('WARNING: LinkedIn Client ID is required for full functionality. Please add your LinkedIn Client ID in the app settings.');
      }
    } else {
      this.log('LinkedIn Client ID found in settings');
      LinkedInOAuth2Client.setClientId(clientId);
    }

    if (!clientSecret) {
      this.error('LinkedIn Client Secret not found in app settings!');
      if (throwErrors) {
        throw new Error('LinkedIn Client Secret is required for full functionality. Please add your LinkedIn Client Secret in the app settings.');
      } else {
        this.log('WARNING: LinkedIn Client Secret is required for full functionality. Please add your LinkedIn Client Secret in the app settings.');
      }
    } else {
      this.log('LinkedIn Client Secret found in settings');
      LinkedInOAuth2Client.setClientSecret(clientSecret);
    }

    // Only log status, don't throw errors if credentials are missing
    const configuredId = LinkedInOAuth2Client.CLIENT_ID;
    const configuredSecret = LinkedInOAuth2Client.CLIENT_SECRET;

    if (!configuredId || configuredId.length === 0) {
      this.error('LinkedIn Client ID not configured!');
    }

    if (!configuredSecret || configuredSecret.length === 0) {
      this.error('LinkedIn Client Secret not configured!');
    }

    if (configuredId && configuredId.length > 0 && configuredSecret && configuredSecret.length > 0) {
      this.log('LinkedIn OAuth credentials successfully configured');
    } else {
      this.log('LinkedIn app will run with limited functionality until credentials are properly configured');
    }
  }

  /**
   * Register flow cards for LinkedIn actions
   */
  async registerFlowCards(): Promise<void> {
    this.log('Registering flow cards');

    // To be implemented: Action cards for posting to LinkedIn
  }
}

module.exports = LinkedInApp;
