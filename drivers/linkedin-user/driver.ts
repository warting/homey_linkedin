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
        // Get the OAuth2 client with this driver as parameter
        const oAuth2Client = this.getOAuth2Client<LinkedInOAuth2Client>();

        // Check if the client has a token
        const token = oAuth2Client.getToken();
        if (!token || !token.access_token) {
          this.log('No access token available in client, creating fallback device');
          return this.createFallbackDevice('auth-needed');
        }

        // Since we have a valid client with token, let's get the profile data
        this.log('Fetching LinkedIn profile...');
        let profile;
        try {
          // Make sure getUserProfile method exists
          if (typeof oAuth2Client.getUserProfile !== 'function') {
            throw new Error('getUserProfile method not available on client');
          }

          profile = await oAuth2Client.getUserProfile();
          if (!profile || !profile.id) {
            this.log('Profile response was empty or invalid');
            return this.createFallbackDevice('profile-error');
          }
        } catch (profileError) {
          this.error('Error fetching LinkedIn profile:', profileError);
          return this.createFallbackDevice('profile-error');
        }

        // Get email address
        let email = 'unknown@email.com';
        try {
          // Make sure getUserEmail method exists
          if (typeof oAuth2Client.getUserEmail !== 'function') {
            throw new Error('getUserEmail method not available on client');
          }

          email = await oAuth2Client.getUserEmail();
          this.log('LinkedIn email fetched:', email);
        } catch (emailError) {
          this.log('Could not fetch LinkedIn email, using fallback');
        }

        // Return the LinkedIn user as a device
        const device = {
          name: `${profile.localizedFirstName || 'LinkedIn'} ${profile.localizedLastName || 'User'} ${email ? `(${email})` : ''}`,
          data: {
            id: profile.id || 'unknown-id', // Ensure we always have an ID
          },
          store: {
            profileId: profile.id || 'unknown-id',
            email,
            firstName: profile.localizedFirstName || '',
            lastName: profile.localizedLastName || '',
          },
        };

        this.log('Device ready to be added:', device.name);
        return [device];
      } catch (error: any) {
        this.error('Unexpected error during device listing:', error);
        return this.createFallbackDevice('unexpected-error');
      }
    }

    /**
     * Create a fallback device when there are errors in the pairing process
     */
    private createFallbackDevice(errorType: string): Array<any> {
      this.log(`Creating fallback device due to ${errorType}`);

      // Define user-friendly names based on error type
      let deviceName = '';
      const firstName = 'LinkedIn';
      let lastName = '';

      // Customize the error message based on the type
      switch (errorType) {
        case 'auth-needed':
          deviceName = 'LinkedIn (Authentication Required)';
          lastName = 'Authentication Required';
          break;
        case 'auth-error':
          deviceName = 'LinkedIn (Authentication Failed)';
          lastName = 'Auth Failed';
          break;
        case 'profile-error':
          deviceName = 'LinkedIn (Profile Access Error)';
          lastName = 'Profile Error';
          break;
        case 'no-auth-session':
          deviceName = 'LinkedIn (Not Authenticated)';
          lastName = 'Not Authenticated';
          break;
        default:
          deviceName = `LinkedIn (${errorType})`;
          lastName = errorType;
      }

      return [{
        name: deviceName,
        data: {
          id: `error-${errorType}-${Date.now()}`,
        },
        store: {
          profileId: `error-${errorType}`,
          email: 'unknown@email.com',
          firstName,
          lastName,
          errorType,
        },
      }];
    }

    /**
     * Implementation of getOAuth2Client to handle client access
     * This method must be synchronous to match the parent class signature
     */
    getOAuth2Client<T extends OAuth2Client>(): T {
      // Create a new client with this driver as a parameter
      const client = new LinkedInOAuth2Client({
        clientId: LinkedInOAuth2Client.CLIENT_ID,
        clientSecret: LinkedInOAuth2Client.CLIENT_SECRET,
        redirectUrl: LinkedInOAuth2Client.REDIRECT_URL,
        apiUrl: LinkedInOAuth2Client.API_URL,
        tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
        authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL,
        driver: this, // Pass driver reference for settings access
      });

      // Store this client for future use
      // @ts-expect-error: Setting protected property
      this._oAuth2Client = client;

      // Cast through unknown to satisfy TypeScript
      return client as unknown as T;
    }
}

module.exports = LinkedInUserDriver;
