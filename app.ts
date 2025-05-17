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
      
      callbackObj.on('code', (code: string) => {
        this.log(`OAuth2 code received: ${code.substring(0, 5)}...`);
      });
      
      this.log(`OAuth2 callback URL configured successfully`);
      return;
    } catch (error) {
      this.error('Error initializing OAuth2 callback URL:', error);
      throw error; // Let the caller handle this error
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
