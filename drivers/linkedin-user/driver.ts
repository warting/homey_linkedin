import Homey from 'homey';
import { OAuth2Driver, OAuth2Client } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

// Update the type definition to properly extend OAuth2Driver
class LinkedInUserDriver extends OAuth2Driver {
  // Define the OAuth2Client type used by this driver
  static CLIENT_CLASS = LinkedInOAuth2Client;
  static OAUTH2_CLIENT = LinkedInOAuth2Client; // Ensure this property is set

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
      // Get the OAuth2 client from the driver - ensure we have access to it
      // Override TypeScript typing with our custom implementation
      const oAuth2Client = this.getOAuth2Client<LinkedInOAuth2Client>();
      
      if (!oAuth2Client) {
        this.error('OAuth2 client is not available');
        throw new Error('Authentication failed: OAuth2 client not available');
      }
      
      // Get the user profile from LinkedIn
      this.log('Fetching LinkedIn profile...');
      let profile;
      try {
        profile = await oAuth2Client.getUserProfile();
        this.log('LinkedIn profile fetched successfully:', profile?.id || 'no id found');
      } catch (profileError) {
        this.error('Error fetching LinkedIn profile:', profileError);
        throw new Error(`Failed to fetch LinkedIn profile: ${profileError instanceof Error ? profileError.message : 'Unknown error'}`);
      }
  
      // Fetch email - but don't fail if we can't get it
      this.log('Fetching LinkedIn email...');
      let email = 'unknown@email.com';
      try {
        email = await oAuth2Client.getUserEmail();
        this.log('LinkedIn email fetched:', email);
      } catch (emailError) {
        this.log('Could not fetch LinkedIn email, using default:', emailError);
        // Continue with default email
      }
  
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
          email: email,
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
  
  /**
   * Implementation of getOAuth2Client to handle client access
   * This needs to properly handle type conversion for TypeScript
   */
  getOAuth2Client<T extends OAuth2Client>(): T {
    try {
      // Directly access the OAuth2Client instance that should be created by the framework
      // @ts-expect-error: Accessing private property
      const client = this._oAuth2Client;
      
      if (client) {
        // Cast through unknown to avoid TypeScript type checking errors
        return client as unknown as T;
      }
    } catch (error) {
      this.error('Could not access OAuth2 client from driver:', error);
    }
    
    // Create a new client instance as a fallback
    this.log('Creating new OAuth2Client instance');
    
    // Create the client with all necessary options
    const client = new LinkedInOAuth2Client({
      clientId: LinkedInOAuth2Client.CLIENT_ID, 
      clientSecret: LinkedInOAuth2Client.CLIENT_SECRET,
      redirectUrl: LinkedInOAuth2Client.REDIRECT_URL,
      apiUrl: LinkedInOAuth2Client.API_URL,
      tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
      authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL
    });
    
    // Store this client for future use
    // @ts-expect-error: Setting private property
    this._oAuth2Client = client;
    
    // Cast through unknown to satisfy TypeScript
    return client as unknown as T;
  }
}

module.exports = LinkedInUserDriver;
