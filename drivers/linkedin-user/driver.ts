import { OAuth2Driver } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

/**
 * LinkedIn User Driver
 * Handles discovering and managing LinkedIn user devices
 */
class LinkedInUserDriver extends OAuth2Driver {
  /**
   * This method is called when the driver is initialized with OAuth2
   */
  async onOAuth2Init(): Promise<void> {
    // Use type assertion to access log method
    (this as any).log('LinkedIn User Driver has been initialized');

    // Register flow cards
    await this.registerFlowCards();
  }

  /**
   * Register flow cards for this driver
   */
  async registerFlowCards(): Promise<void> {
    // Use type assertion to access log method
    (this as any).log('Registering flow cards for LinkedIn User Driver');

    // Use type assertion to access homey property
    const postTextUpdateCard = (this as any).homey.flow.getActionCard('post_text_update');
    postTextUpdateCard.registerRunListener(async (args: any) => {
      const { device, text, visibility } = args;
      return device.postTextUpdate({ text, visibility });
    });

    // Use type assertion to access homey property
    const postLinkUpdateCard = (this as any).homey.flow.getActionCard('post_link_update');
    postLinkUpdateCard.registerRunListener(async (args: any) => {
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
  async onPairListDevices({ oAuth2Client }: { oAuth2Client: LinkedInOAuth2Client }): Promise<Array<any>> {
    // Use type assertion to access log method
    (this as any).log('Listing LinkedIn devices');

    try {
      // Check if we have a valid oAuth2Client
      if (!oAuth2Client) {
        throw new Error('No OAuth2 client available');
      }

      // Fetch the user profile from LinkedIn
      const profileResponse = await oAuth2Client.getUserProfile();
      (this as any).log('Profile response:', profileResponse);

      // The userinfo endpoint returns data directly, not nested in a data property
      const profile = profileResponse;

      // For userinfo endpoint, the ID is in the 'sub' property
      if (!profile || !profile.sub) {
        throw new Error('Profile response was empty or invalid');
      }

      // Create a device for this user
      return [
        {
          name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'LinkedIn User',
          data: {
            id: profile.sub,
          },
          store: {
            profileId: profile.sub,
          },
        },
      ];
    } catch (err) {
      // Cast error to a type with message property
      const error = err as Error;

      // Use type assertion to access error method
      (this as any).error('Error during device pairing:', error);

      // Return a fallback device for error cases
      return [{
        name: `LinkedIn (${error.message || 'Error'})`,
        data: {
          id: `error-${Date.now()}`,
        },
        store: {
          profileId: 'error',
          email: 'unknown@email.com',
          firstName: 'LinkedIn',
          lastName: 'Error',
          errorType: error.message || 'unknown-error',
        },
      }];
    }
  }
}

module.exports = LinkedInUserDriver;
