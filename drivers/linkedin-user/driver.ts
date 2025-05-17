import Homey from 'homey';
import { OAuth2Driver, OAuth2Client } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';
import { JwtPayload } from '../../types/jwt';

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
      // Get the OAuth2 app instance to access sessions
      // @ts-expect-error: Accessing protected property
      const app = this._app;
      
      let savedSessions = null;
      let hasActiveSessions = false;
      
      // Only try to access sessions if we have access to the app
      if (app) {
        try {
          // Get sessions from the app using the app's method
          savedSessions = app.getSavedOAuth2Sessions();
          hasActiveSessions = savedSessions && Object.keys(savedSessions).length > 0;
          
          this.log(`Active OAuth2 sessions found: ${hasActiveSessions ? 'Yes' : 'No'}`);
          
          if (hasActiveSessions) {
            // Get session details for debugging
            const sessionIds = Object.keys(savedSessions);
            this.log(`Found ${sessionIds.length} session(s). First session ID: ${sessionIds[0]}`);
            
            // Check if the first session has a token
            const firstSession = savedSessions[sessionIds[0]];
            if (firstSession && firstSession.token) {
              this.log('Session has a token');
              
              // Check if token has id_token
              if (firstSession.token.id_token) {
                this.log('Token includes id_token, will attempt to extract user info from JWT');
              }
            }
          }
        } catch (sessionsError) {
          this.error('Error accessing OAuth2 sessions:', sessionsError);
          // Continue without sessions
          savedSessions = null;
        }
      } else {
        this.log('Could not access app instance, continuing without sessions');
      }
      
      // Get the OAuth2 client from the driver - ensure we have access to it
      const oAuth2Client = this.getOAuth2Client<LinkedInOAuth2Client>();
      
      if (!oAuth2Client) {
        this.error('OAuth2 client is not available');
        // Instead of throwing, create a fallback device
        return this.createFallbackDevice('auth-error');
      }
      
      // Check if the client has a token
      const token = oAuth2Client.getToken();
      if (!token || !token.access_token) {
        this.log('No access token available in client, attempting to use saved session');
        
        // If we have active sessions but no token in the client, try to manually load the token
        if (hasActiveSessions && savedSessions) {
          const sessionIds = Object.keys(savedSessions);
          const firstSession = savedSessions[sessionIds[0]];
          
          if (firstSession && firstSession.token) {
            this.log('Manually setting token from saved session');
            oAuth2Client.setToken(firstSession.token);
            
            // Verify token was set
            const verifyToken = oAuth2Client.getToken();
            if (verifyToken && verifyToken.access_token) {
              this.log('Successfully set token from saved session');
              
              // Also save the OAuth2 sessions in the app if possible
              try {
                // @ts-expect-error: Accessing protected property
                const app = this._app;
                if (app && typeof app.saveOAuth2Sessions === 'function') {
                  this.log('Saving OAuth2 sessions through app after token set');
                  app.saveOAuth2Sessions();
                  this.log('Successfully saved OAuth2 sessions with token');
                }
              } catch (saveError) {
                this.error('Error saving OAuth2 sessions after setting token:', saveError);
              }
            } else {
              this.error('Failed to set token from saved session');
            }
          }
        } else {
          this.log('No active sessions available to retrieve token');
          
          // Try to get a new authentication token instead of immediately returning a fallback device
          try {
            this.log('Attempting to get fresh authentication');
            
            // Try to get the app instance to trigger authentication
            // @ts-expect-error: Accessing protected property  
            const app = this._app;
            if (app) {
              this.log('App instance available, checking if we can authenticate');
              
              // Instead of trying to trigger authentication here, just warn that we need to authenticate
              this.log('No authentication present. User should authenticate before pairing');
            }
            
            // Return fallback device that indicates authentication is needed
            return this.createFallbackDevice('auth-needed');
          } catch (authError) {
            this.error('Error during authentication attempt:', authError);
            return this.createFallbackDevice('auth-error');
          }
        }
      } else {
        this.log('Client has valid access token');
      }
      
      // Since we have a valid client with token, let's get the profile data
      this.log('Fetching LinkedIn profile...');
      let profile;
      try {
        profile = await oAuth2Client.getUserProfile();
        if (profile) {
          this.log('LinkedIn profile fetched:', profile.id || 'no id found');
        } else {
          this.log('Profile response was empty or invalid');
          
          // Try to get user info from the token if available
          const profileToken = oAuth2Client.getToken();
          if (profileToken && profileToken.id_token) {
            this.log('Trying to extract profile data from JWT token');
            const jwtPayload = oAuth2Client.parseJwtToken(profileToken.id_token);
            
            if (jwtPayload) {
              this.log('JWT token contains user info');
              profile = {
                id: jwtPayload.sub || 'jwt-profile',
                localizedFirstName: jwtPayload.given_name || 'LinkedIn',
                localizedLastName: jwtPayload.family_name || 'User',
                // Include all JWT fields for reference
                jwt: jwtPayload
              };
            } else {
              profile = { id: 'unknown-profile', localizedFirstName: 'LinkedIn', localizedLastName: 'User' };
            }
          } else {
            profile = { id: 'unknown-profile', localizedFirstName: 'LinkedIn', localizedLastName: 'User' };
          }
        }
      } catch (profileError) {
        this.error('Error fetching LinkedIn profile:', profileError);
        
        // Try to extract profile from token instead of failing
        const errorToken = oAuth2Client.getToken();
        if (errorToken && errorToken.id_token) {
          this.log('Extracting profile from JWT after API error');
          const jwtPayload = oAuth2Client.parseJwtToken(errorToken.id_token);
          
          if (jwtPayload) {
            profile = {
              id: jwtPayload.sub || 'jwt-profile',
              localizedFirstName: jwtPayload.given_name || 'LinkedIn',
              localizedLastName: jwtPayload.family_name || 'User',
              jwt: jwtPayload
            };
          } else {
            // Last resort fallback
            profile = { id: 'error-profile', localizedFirstName: 'LinkedIn', localizedLastName: 'User' };
          }
        } else {
          // If we can't get profile at all, create a fallback
          return this.createFallbackDevice('profile-error');
        }
      }
        
      // Fetch email - first try from JWT token, then from API
      this.log('Getting LinkedIn email...');
      let email = 'unknown@email.com';
      
      // First try to get email from JWT token if available
      const emailToken = oAuth2Client.getToken();
      if (emailToken && emailToken.id_token) {
        const jwtPayload = oAuth2Client.parseJwtToken(emailToken.id_token);
        if (jwtPayload && jwtPayload.email) {
          email = jwtPayload.email;
          this.log('Got email from JWT token:', email);
        }
      }
      
      // If we didn't get email from JWT, try the API
      if (email === 'unknown@email.com') {
        try {
          email = await oAuth2Client.getUserEmail();
          this.log('LinkedIn email fetched from API:', email);
        } catch (emailError) {
          this.log('Could not fetch LinkedIn email, using fallback');
          // Check if we have email in profile.jwt as a last resort
          if (profile && profile.jwt && profile.jwt.email) {
            email = profile.jwt.email;
            this.log('Found email in profile JWT data:', email);
          }
        }
      }
        
      // Ensure we have all required data - or use fallbacks
      if (!profile || !profile.id) {
        this.log('LinkedIn profile data incomplete, using fallback values');
        profile = { 
          id: 'incomplete-profile', 
          localizedFirstName: 'LinkedIn', 
          localizedLastName: 'User' 
        };
      }
        
      // Return the LinkedIn user as a device
      const device = {
        name: `${profile.localizedFirstName || 'LinkedIn'} ${profile.localizedLastName || 'User'} ${email ? `(${email})` : ''}`,
        data: {
          id: profile.id || 'unknown-id',  // Ensure we always have an ID
        },
        store: {
          profileId: profile.id || 'unknown-id',
          email: email,
          firstName: profile.localizedFirstName || '',
          lastName: profile.localizedLastName || '',
          // Store the OAuth client info so we can reconnect later
          oauthSessionId: oAuth2Client.getSessionId(),
          // Also store JWT data if available for future use
          jwtData: profile.jwt || null
        },
      };
        
      this.log('Device ready to be added:', device.name);
      
      // Make sure we save the session
      this.log('At least one device has been added, saving the client session if possible...');
      try {
        // Try to get app to save the session
        // @ts-expect-error: Accessing protected property
        const app = this._app;
        if (app && typeof app.saveOAuth2Sessions === 'function') {
          this.log('Saving OAuth2 sessions through app');
          app.saveOAuth2Sessions();
          this.log('Successfully saved OAuth2 sessions');
        } else {
          this.log('Could not access app.saveOAuth2Sessions, client will be saved automatically');
        }
      } catch (saveError) {
        this.error('Error saving OAuth2 client:', saveError);
      }
      
      return [device];
    } catch (error: any) {
      this.error('Unexpected error during device listing:', error);
      
      // Always return at least one device even on errors
      return this.createFallbackDevice('unexpected-error');
    }
  }
  
  /**
   * Create a fallback device when there are errors in the pairing process
   */
  private createFallbackDevice(errorType: string): Array<any> {
    this.log(`Creating fallback device due to ${errorType}`);
    
    // Define user-friendly names based on error type
    let deviceName = 'LinkedIn User (Connection Error)';
    let firstName = 'LinkedIn';
    let lastName = 'User';
    
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
        firstName: firstName,
        lastName: lastName,
        errorType: errorType
      },
    }];
  }
  
  /**
   * Implementation of getOAuth2Client to handle client access
   * This needs to properly handle type conversion for TypeScript
   */
  getOAuth2Client<T extends OAuth2Client>(): T {
    try {
      // First try to get the existing OAuth2 client that's created during init
      // @ts-expect-error: Accessing protected property from parent class
      const client = this._oAuth2Client;
      
      if (client) {
        this.log('Using existing OAuth2Client instance from driver');
        // Return the existing client
        return client as unknown as T;
      }
      
      // If we don't have a client yet, try to get the most recently authenticated one
      this.log('No OAuth2Client exists in driver, looking for authenticated sessions');
      
      // Get all saved sessions from the app
      // @ts-expect-error: Accessing protected app property
      const app = this._app;
      if (app) {
        try {
          // Try to get sessions from app instead
          const savedSessions = app.getSavedOAuth2Sessions ? app.getSavedOAuth2Sessions() : null;
          
          if (savedSessions && Object.keys(savedSessions).length > 0) {
            this.log('Found saved OAuth2 sessions, using the most recent one');
            
            // Get the most recent session ID
            const sessionId = Object.keys(savedSessions)[0];
            this.log(`Using session ID: ${sessionId}`);
            
            // Create a client with the session
            const clientWithSession = new LinkedInOAuth2Client({
              sessionId,
              clientId: LinkedInOAuth2Client.CLIENT_ID, 
              clientSecret: LinkedInOAuth2Client.CLIENT_SECRET,
              redirectUrl: LinkedInOAuth2Client.REDIRECT_URL,
              apiUrl: LinkedInOAuth2Client.API_URL,
              tokenUrl: LinkedInOAuth2Client.TOKEN_URL,
              authorizationUrl: LinkedInOAuth2Client.AUTHORIZATION_URL
            });
            
            // Save this client for future use
            // @ts-expect-error: Setting protected property
            this._oAuth2Client = clientWithSession;
            
            // Load the saved session data
            try {
              const sessionData = savedSessions[sessionId];
              this.log('Loading saved session token');
              
              if (sessionData && sessionData.token) {
                clientWithSession.setToken(sessionData.token);
                this.log('Successfully loaded saved session token');
              } else {
                this.log('Session data exists but has no token property');
              }
            } catch (sessionError) {
              this.error('Error loading saved session:', sessionError);
            }
            
            return clientWithSession as unknown as T;
          } else {
            this.log('No saved OAuth2 sessions found in app');
          }
        } catch (sessionError) {
          this.error('Error accessing saved sessions:', sessionError);
        }
      } else {
        this.log('Could not access OAuth2 app from driver');
      }
    } catch (error) {
      this.error('Error accessing OAuth2 client:', error);
    }
    
    // As a last resort, create a new client instance
    this.log('Creating new OAuth2Client instance (no authenticated sessions found)');
    
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
    // @ts-expect-error: Setting protected property
    this._oAuth2Client = client;
    
    // Cast through unknown to satisfy TypeScript
    return client as unknown as T;
  }
}

module.exports = LinkedInUserDriver;
