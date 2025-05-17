'use strict';

import { OAuth2App } from 'homey-oauth2app';
import LinkedInOAuth2Client from './lib/OAuth/LinkedInOAuth2Client';

class LinkedInApp extends OAuth2App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit(): Promise<void> {
    this.log('Initializing LinkedIn app...');

    try {
      // First initialize the base OAuth app
      await super.onInit();

      // Then check settings and set the OAuth client credentials
      // But don't throw errors if they're missing
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

      // Re-initialize the OAuth2 configuration with the new credentials
      this.setOAuth2Config({
        client: LinkedInOAuth2Client,
        apiUrl: LinkedInOAuth2Client.API_URL,
        tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
        authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL,
        scopes: LinkedInOAuth2Client.SCOPES,
      });

      this.log('OAuth2 configuration updated with new credentials');
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
