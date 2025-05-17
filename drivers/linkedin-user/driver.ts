import Homey from 'homey';
import { OAuth2Driver } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

class LinkedInUserDriver extends OAuth2Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('LinkedIn User Driver has been initialized');

    // Initialize the OAuth2Driver properly first
    await super.onInit();

    // Register flow cards
    await this.registerFlowCards();
  }

  // Override this method to provide OAuth2 configuration
  getOAuth2Config() {
    return {
      client: LinkedInOAuth2Client,
      apiUrl: LinkedInOAuth2Client.API_URL,
      tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
      authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL,
      scopes: LinkedInOAuth2Client.SCOPES,
    };
  }

  /**
   * Register flow cards for this driver
   */
  async registerFlowCards() {
    this.log('Registering flow cards for LinkedIn User Driver');

    // Register post_text_update flow card
    const postTextUpdateCard = this.homey.flow.getActionCard('post_text_update');
    postTextUpdateCard.registerRunListener(async (args) => {
      const { device, text, visibility } = args;
      return device.postTextUpdate({ text, visibility });
    });

    // Register post_link_update flow card
    const postLinkUpdateCard = this.homey.flow.getActionCard('post_link_update');
    postLinkUpdateCard.registerRunListener(async (args) => {
      const {
        device, text, linkUrl, title, description, visibility,
      } = args;
      return device.postLinkUpdate({
        text,
        linkUrl,
        title,
        description,
        visibility,
      });
    });
  }

  /**
   * onPair is called when a user starts pairing a new device
   */
  async onPair(session: any) {
    this.log('Starting LinkedIn user pairing');

    try {
      await super.onPair(session);

      // Handle custom pairing steps if needed
      session.setHandler('list_devices', async () => {
        this.log('Listing LinkedIn devices');

        try {
          // Get the OAuth2 client
          const client = this.getOAuth2Client() as unknown as LinkedInOAuth2Client;
          this.log('OAuth2 client obtained successfully');

          // Get the user profile from LinkedIn
          this.log('Fetching LinkedIn profile...');
          const profile = await client.getUserProfile();
          this.log('LinkedIn profile fetched:', profile.id);

          this.log('Fetching LinkedIn email...');
          const email = await client.getUserEmail();
          this.log('LinkedIn email fetched:', email);

          // Ensure we have all required data before returning the device
          if (!profile || !profile.id) {
            this.error('LinkedIn profile data is incomplete:', profile);
            throw new Error('LinkedIn profile data is incomplete or invalid');
          }

          // Return the LinkedIn user as a device
          const device = {
            name: `${profile.localizedFirstName || 'LinkedIn'} ${profile.localizedLastName || 'User'} ${email ? `(${email})` : ''}`,
            data: {
              id: profile.id,
            },
            store: {
              profileId: profile.id,
              email: email || 'unknown@email.com',
              firstName: profile.localizedFirstName || '',
              lastName: profile.localizedLastName || '',
            },
          };

          this.log('Device ready to be added:', device.name);
          return [device];
        } catch (error: any) {
          this.error('Error during device listing:', error);
          throw new Error(`Could not retrieve LinkedIn profile: ${error?.message || 'Unknown error'}`);
        }
      });
    } catch (error: any) {
      this.error('Error in onPair:', error);
      throw error;
    }
  }
}

module.exports = LinkedInUserDriver;
