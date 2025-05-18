import { OAuth2Client, OAuth2Error } from 'homey-oauth2app';
import console from 'node:console';

/**
 * LinkedIn OAuth2 Client
 * This client handles the OAuth2 flow for LinkedIn API integration
 */
export default class LinkedInOAuth2Client extends OAuth2Client {
  // Required static properties
  static API_URL = 'https://api.linkedin.com/v2';
  static TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
  static AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';

  static CLIENT_ID = '779l2eheibpxgq'
  static CLIENT_SECRET = 'WPL_AP1.fDt8mFOxZcQsYaaJ.QhBl4g==';
  static SCOPES = [
    'openid', // Use your name and photo
    'profile', // Use your name and photo
    'email', // Use the primary email address associated with your LinkedIn account
    'w_member_social', // Share content on your behalf
  ];

  onInit(): Promise<void> {

    try {
      // Set up the OAuth2 callback URL via Homey Cloud
      // Use type assertion to access the homey property
      const oauth2CallbackUrl = (this as any).homey.cloud.createOAuth2Callback(
        LinkedInOAuth2Client.AUTHORIZATION_URL,
        LinkedInOAuth2Client.TOKEN_URL,
      );

      // Make sure to set the redirect URL for the OAuth2 client
      (LinkedInOAuth2Client as any).REDIRECT_URL = oauth2CallbackUrl;

      console.log(`OAuth2 callback URL configured: ${oauth2CallbackUrl}`);
    } catch (error) {
      console.error('Error setting up OAuth2 credentials:', error);
      throw error; // Re-throw the error to prevent the app from starting with invalid credentials
    }

    return super.onInit();
  }

  // The redirect URL will be set dynamically by the app

  /**
   * Handle API responses that are not OK
   */
  async onHandleNotOK({ body, status }: { body: any; status: number }): Promise<never> {
    throw new OAuth2Error(body?.error || `LinkedIn API error (${status})`);
  }

  /**
   * Get user profile information from LinkedIn
   */
  async getUserProfile() {
    // Use type assertion for get method
    return (this as any).get({
      path: '/me',
      query: {
        projection: '(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
      },
    });
  }

  /**
   * Get user's email address from LinkedIn
   */
  async getUserEmail() {
    // Use type assertion for get method
    const response = await (this as any).get({
      path: '/emailAddress',
      query: {
        q: 'members',
        projection: '(elements*(handle~))',
      },
    });

    // Extract email from the response
    if (response.data?.elements?.length > 0) {
      for (const element of response.data.elements) {
        const emailAddress = element['handle~']?.emailAddress || element.handle?.emailAddress;
        if (emailAddress) {
          return emailAddress;
        }
      }
    }

    throw new Error('No email found in LinkedIn API response');
  }

  /**
   * Post a message to LinkedIn
   */
  async postMessage(text: string, visibility: string = 'CONNECTIONS') {
    // First get the user's ID from profile
    const profile = await this.getUserProfile();
    const userId = profile.data?.id;

    if (!userId) {
      throw new Error('Could not determine user ID for post');
    }

    // Use type assertion for post method
    return (this as any).post({
      path: '/ugcPosts',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      },
    });
  }
}
