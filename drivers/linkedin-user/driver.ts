import { OAuth2Driver } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

module.exports = class LinkedInUserDriver extends OAuth2Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('LinkedIn User Driver has been initialized');

    // Register flow cards
    await this.registerFlowCards();

    // Use the LinkedIn OAuth2 Client
    this.setOAuth2Config({
      client: LinkedInOAuth2Client,
    });
  }

  /**
   * Register flow cards for this driver
   */
  async registerFlowCards() {
    this.log('Registering flow cards for LinkedIn User Driver');

    // Register post_text_update flow card
    const postTextUpdateCard = this.homey.flow.getActionCard('post_text_update');
    postTextUpdateCard.registerRunListener(async (args, state) => {
      const { device, text, visibility } = args;
      return device.postTextUpdate({ text, visibility });
    });

    // Register post_link_update flow card
    const postLinkUpdateCard = this.homey.flow.getActionCard('post_link_update');
    postLinkUpdateCard.registerRunListener(async (args, state) => {
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
    await super.onPair(session);

    // Handle custom pairing steps if needed
    session.setHandler('list_devices', async () => {
      // Get the OAuth2 client
      const client = this.getOAuth2Client() as unknown as LinkedInOAuth2Client;

      try {
        // Get the user profile from LinkedIn
        const profile = await client.getUserProfile();
        const email = await client.getUserEmail();

        // Return the LinkedIn user as a device
        return [
          {
            name: `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''} (${email})`,
            data: {
              id: profile.id,
            },
            store: {
              profileId: profile.id,
              email,
              firstName: profile.localizedFirstName,
              lastName: profile.localizedLastName,
            },
          },
        ];
      } catch (error) {
        this.error('Error during device listing:', error);
        throw new Error('Could not retrieve LinkedIn profile. Please try again.');
      }
    });
  }
};
