'use strict';

import { OAuth2App } from 'homey-oauth2app';
import LinkedInOAuth2Client from './lib/OAuth/LinkedInOAuth2Client';

class LinkedInApp extends OAuth2App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit(): Promise<void> {
    // First, check settings and set the OAuth client credentials
    this.updateOAuthCredentials();

    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
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
    const clientId = this.homey.settings.get('client_id');
    const clientSecret = this.homey.settings.get('client_secret');

    if (clientId) {
      LinkedInOAuth2Client.setClientId(clientId);
    }

    if (clientSecret) {
      LinkedInOAuth2Client.setClientSecret(clientSecret);
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
