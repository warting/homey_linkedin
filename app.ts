'use strict';

import { OAuth2App } from 'homey-oauth2app';
import LinkedInOAuth2Client from './lib/OAuth/LinkedInOAuth2Client';

class LinkedInApp extends OAuth2App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit(): Promise<void> {
    this.log('Initializing LinkedIn app...');

    // First, check settings and set the OAuth client credentials
    this.updateOAuthCredentials();

    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
      this.log(`Setting changed: ${key}`);
      if (key === 'client_id' || key === 'client_secret') {
        this.updateOAuthCredentials();
      }
    });

    // Then initialize the OAuth app
    await super.onInit();

    this.log('LinkedIn App has been initialized');

    // Register the OAuth2 client
    this.setOAuth2Config({
      client: LinkedInOAuth2Client,
      apiUrl: LinkedInOAuth2Client.API_URL,
      tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
      authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL,
      scopes: LinkedInOAuth2Client.SCOPES,
    });

    // Register flow cards (will be implemented later)
    await this.registerFlowCards();
  }

  /**
   * Update OAuth credentials from app settings
   */
  updateOAuthCredentials(): void {
    this.log('Updating OAuth credentials from settings...');

    const clientId = this.homey.settings.get('client_id');
    const clientSecret = this.homey.settings.get('client_secret');

    if (!clientId) {
      this.error('LinkedIn Client ID not found in app settings!');
      throw new Error('LinkedIn Client ID is required but not configured in app settings. Please add your LinkedIn Client ID in the app settings.');
    }

    if (!clientSecret) {
      this.error('LinkedIn Client Secret not found in app settings!');
      throw new Error('LinkedIn Client Secret is required but not configured in app settings. Please add your LinkedIn Client Secret in the app settings.');
    }

    this.log('LinkedIn OAuth credentials found in settings');
    LinkedInOAuth2Client.setClientId(clientId);
    LinkedInOAuth2Client.setClientSecret(clientSecret);

    // Verify credentials were set properly
    const configuredId = LinkedInOAuth2Client.CLIENT_ID;
    const configuredSecret = LinkedInOAuth2Client.CLIENT_SECRET;

    if (!configuredId || configuredId.length === 0) {
      this.error('Failed to set LinkedIn Client ID!');
      throw new Error('Failed to set LinkedIn Client ID. Please check your app settings.');
    }

    if (!configuredSecret || configuredSecret.length === 0) {
      this.error('Failed to set LinkedIn Client Secret!');
      throw new Error('Failed to set LinkedIn Client Secret. Please check your app settings.');
    }

    this.log('LinkedIn OAuth credentials successfully configured');
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
