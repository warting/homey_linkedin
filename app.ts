'use strict';

import Homey from 'homey';
import { OAuth2App } from 'homey-oauth2app';
import LinkedInOAuth2Client from './lib/OAuth/LinkedInOAuth2Client';

class LinkedInApp extends OAuth2App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
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
   * Register flow cards for LinkedIn actions
   */
  async registerFlowCards() {
    this.log('Registering flow cards');

    // To be implemented: Action cards for posting to LinkedIn
  }
}

module.exports = LinkedInApp;
