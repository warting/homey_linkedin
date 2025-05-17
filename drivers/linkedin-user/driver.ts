import Homey from 'homey';
import { OAuth2Driver } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

class LinkedInUserDriver extends OAuth2Driver {
  /**
   * onOAuth2Init is called when the driver is initialized.
   */
  async onOAuth2Init() {
    this.log('LinkedIn User Driver has been initialized');

    // Register flow cards
    await this.registerFlowCards();
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
   * This method is called when a user is pairing devices
   * It should return an array of devices that will be added
   */
  async onPairListDevices() {
    this.log('Listing LinkedIn devices');

    try {
      // Get the OAuth2 client from the driver
      const oAuth2Client = this.getOAuth2Client() as unknown as LinkedInOAuth2Client;
      
      // Get the user profile from LinkedIn
      this.log('Fetching LinkedIn profile...');
      const profile = await oAuth2Client.getUserProfile();
      this.log('LinkedIn profile fetched:', profile.id);

      this.log('Fetching LinkedIn email...');
      const email = await oAuth2Client.getUserEmail();
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
  }
}

module.exports = LinkedInUserDriver;
