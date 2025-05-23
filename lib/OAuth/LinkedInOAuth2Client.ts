import { OAuth2Client, OAuth2Error } from 'homey-oauth2app';
import Homey from 'homey';

/**
 * LinkedIn OAuth2 Client
 * This client handles the OAuth2 flow for LinkedIn API integration
 */
export default class LinkedInOAuth2Client extends OAuth2Client {
  // Required static properties
  static API_URL = 'https://api.linkedin.com/v2';
  static TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
  static AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';

  // Use environment variables instead of hardcoded values
  static CLIENT_ID = Homey.env.CLIENT_ID;
  static CLIENT_SECRET = Homey.env.CLIENT_SECRET;
  static SCOPES = [
    'openid', // Use your name and photo
    'profile', // Use your name and photo
    'email', // Use the primary email address associated with your LinkedIn account
    'w_member_social', // Share content on your behalf
  ];

  // The redirect URL will be set dynamically by the app in app.ts

  /**
   * Initialize the OAuth2 client
   */
  async onInit(): Promise<void> {
    // Use type assertion for log method
    (this as any).log('LinkedIn OAuth2Client initialized');
    return super.onInit();
  }

  /**
   * Handle API responses that are not OK
   */
  async onHandleNotOK({ body, status, headers }: { body: any; status: number; headers: any }): Promise<never> {
    // Log the full error details for debugging
    (this as any).error(`LinkedIn API error: Status ${status}`);
    (this as any).error('Headers:', headers);
    (this as any).error('Body:', body);

    throw new OAuth2Error(body?.error?.message || `LinkedIn API error (${status}): ${JSON.stringify(body)}`);
  }

  /**
   * Get user profile information from LinkedIn
   */
  async getUserProfile() {
    return (this as any).get({
      path: '/userinfo',
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
