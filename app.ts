'use strict';

import { OAuth2App } from 'homey-oauth2app';
import LinkedInOAuth2Client from './lib/OAuth/LinkedInOAuth2Client';

/**
 * LinkedIn App for Homey
 */
class LinkedInApp extends OAuth2App {
  // OAuth2 configuration
  static OAUTH2_CLIENT = LinkedInOAuth2Client;
  static OAUTH2_DEBUG = true; // Enable debug logging for development
  static OAUTH2_MULTI_SESSION = false; // We only need one LinkedIn account
  static OAUTH2_DRIVERS = ['linkedin-user']; // Only the LinkedIn user driver uses OAuth2

  /**
   * Implementation of onInit to configure redirect URL
   * This is called BEFORE onOAuth2Init
   */
  async onInit() {
    // Use type assertion for log method
    (this as any).log('LinkedIn App is initializing...');

    try {
      // Create the OAuth2 callback URL BEFORE calling super.onInit()
      const callbackResponse = await (this as any).homey.cloud.createOAuth2Callback(
        LinkedInOAuth2Client.AUTHORIZATION_URL,
        LinkedInOAuth2Client.TOKEN_URL,
      );

      // Extract the URL string from the response object
      const oauth2CallbackUrl = typeof callbackResponse === 'object' && callbackResponse.url
        ? callbackResponse.url
        : callbackResponse;

      // Verify we have a valid URL string
      if (typeof oauth2CallbackUrl !== 'string' || !oauth2CallbackUrl.startsWith('http')) {
        throw new Error(`Invalid OAuth2 callback URL format: ${JSON.stringify(callbackResponse)}`);
      }

      // Set the redirect URL as a static property on the client class
      LinkedInOAuth2Client.REDIRECT_URL = oauth2CallbackUrl;

      // Use type assertion for log method
      (this as any).log(`OAuth2 callback URL configured: ${oauth2CallbackUrl}`);

      // Now call the parent onInit which will trigger setOAuth2Config and then onOAuth2Init
      return await super.onInit();
    } catch (error) {
      // Use type assertion for error method
      (this as any).error('Error during LinkedIn App initialization:', error);
      throw error;
    }
  }

  /**
   * onOAuth2Init is called after onInit and after OAuth2 framework is initialized
   */
  async onOAuth2Init() {
    // Use type assertion for log method
    (this as any).log('LinkedIn OAuth2 framework is ready');
    // Additional LinkedIn-specific initialization can go here
  }
}

module.exports = LinkedInApp;
