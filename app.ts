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
   * onOAuth2Init is called after onInit and after OAuth2 framework is initialized
   */
  async onOAuth2Init() {
    // Use type assertion for log method
    (this as any).log('LinkedIn OAuth2 framework is ready');
    // Additional LinkedIn-specific initialization can go here
  }
}

module.exports = LinkedInApp;
