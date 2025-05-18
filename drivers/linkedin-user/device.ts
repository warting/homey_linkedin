import { OAuth2Device } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

class LinkedInUserDevice extends OAuth2Device {
  // Declare class properties
  private lastPostTime: Date | null = null;

  // Store a reference to the client - we access this directly from oAuth2Client property
  private linkedInClient: LinkedInOAuth2Client | null = null;

  /**
   * onOAuth2Init is called when the device is initialized.
   */
  async onOAuth2Init() {
    this.log('LinkedIn User Device has been initialized');

    // Get the device settings
    const settings = this.getSettings();
    this.log('Device settings:', settings);

    // Get the stored values
    const store = this.getStore();
    this.log('Device store contains profile ID:', store.profileId);

    // Set initial capability values
    await this.setCapabilityValue('linkedin_connected', true).catch(this.error);

    // If we have a last post time in store, use it
    const storedLastPostTime = this.getStoreValue('lastPostTime');
    if (storedLastPostTime) {
      this.lastPostTime = new Date(storedLastPostTime);
      await this.setCapabilityValue('last_post_time', storedLastPostTime).catch(this.error);
    } else {
      // Initialize with current time
      this.lastPostTime = new Date();
      await this.setCapabilityValue('last_post_time', this.lastPostTime.toISOString()).catch(this.error);
    }

    // Ensure we have a valid OAuth2 client by accessing the oAuth2Client property directly
    try {
      // The oAuth2Client property is set by the OAuth2App framework
      // @ts-expect-error: The typing for homey-oauth2app doesn't include this property
      this.linkedInClient = this.oAuth2Client;

      if (!this.linkedInClient) {
        throw new Error('OAuth2 client not available - please check app credentials');
      }

      this.log('Device has valid OAuth2 client, ready for use');
    } catch (error) {
      this.error('Error initializing OAuth2 client:', error);
    }

    this.log('LinkedIn User Device has been initialized with capabilities');
  }

  /**
   * onOAuth2Added is called when the device is added.
   */
  async onOAuth2Added() {
    this.log('LinkedIn User Device has been added');
  }

  /**
   * Called when the device is deleted
   */
  async onOAuth2Deleted() {
    this.log('Device deleted');

    // Clean up device storage
    try {
      await this.unsetStoreValue('lastPostTime');
      this.log('Removed stored data');
    } catch (error) {
      this.error('Error cleaning up device storage:', error);
    }
  }

  /**
   * Get the OAuth2 client associated with this device
   */
  getLinkedInClient(): LinkedInOAuth2Client {
    // If we don't have the client stored yet, get it from the oAuth2Client property
    // @ts-expect-error: The typing for homey-oauth2app doesn't include this property
    if (!this.linkedInClient && this.oAuth2Client) {
      // @ts-expect-error: The typing for homey-oauth2app doesn't include this property
      this.linkedInClient = this.oAuth2Client;
    }

    if (!this.linkedInClient) {
      throw new Error('LinkedIn OAuth2 client not available');
    }

    return this.linkedInClient;
  }

  /**
   * Post a text update to LinkedIn
   */
  async postTextUpdate({ text, visibility = 'CONNECTIONS' }: { text: string, visibility?: string }): Promise<boolean> {
    this.log('Posting text update to LinkedIn');

    try {
      // Get the client with our helper method that doesn't use getOAuth2Client
      const client = this.getLinkedInClient();

      if (typeof client.postMessage !== 'function') {
        throw new Error('LinkedIn client does not have postMessage method');
      }

      const result = await client.postMessage(text, visibility);

      if (result.ok) {
        this.log('Successfully posted text update to LinkedIn');

        // Update the last post time
        this.lastPostTime = new Date();
        await this.setStoreValue('lastPostTime', this.lastPostTime.toISOString());
        await this.setCapabilityValue('last_post_time', this.lastPostTime.toISOString());

        return true;
      }

      this.error('Failed to post text update to LinkedIn', result.status, result.data);
      return false;
    } catch (error) {
      this.error('Error posting text update to LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Post a link update to LinkedIn
   */
  async postLinkUpdate({
    text,
    linkUrl,
    title,
    description,
    visibility = 'CONNECTIONS',
  }: {
    text: string,
    linkUrl: string,
    title: string,
    description: string,
    visibility?: string
  }): Promise<boolean> {
    this.log('Posting link update to LinkedIn');

    try {
      // Get the client with our helper method that doesn't use getOAuth2Client
      const client = this.getLinkedInClient();

      if (typeof client.postMessage !== 'function') {
        throw new Error('LinkedIn client does not have postMessage method');
      }

      const fullText = `${text}\n\n${title}\n${description}\n${linkUrl}`;
      const result = await client.postMessage(fullText, visibility);

      if (result.ok) {
        this.log('Successfully posted link update to LinkedIn');

        // Update the last post time
        this.lastPostTime = new Date();
        await this.setStoreValue('lastPostTime', this.lastPostTime.toISOString());
        await this.setCapabilityValue('last_post_time', this.lastPostTime.toISOString());

        return true;
      }

      this.error('Failed to post link update to LinkedIn', result.status, result.data);
      return false;
    } catch (error) {
      this.error('Error posting link update to LinkedIn:', error);
      throw error;
    }
  }
}

module.exports = LinkedInUserDevice;
