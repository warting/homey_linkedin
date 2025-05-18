import { OAuth2Device } from 'homey-oauth2app';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

class LinkedInUserDevice extends OAuth2Device {
  // Declare class properties
  private lastPostTime: Date | null = null;

  /**
   * This method is called when the device is initialized with OAuth2
   * This is where you should set up device capabilities and handle the OAuth2 client
   */
  async onOAuth2Init(): Promise<void> {
    this.log('LinkedIn User Device is being initialized with OAuth2');

    // Get the device settings and store data
    const settings = this.getSettings();
    this.log('Device settings:', settings);

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

    // Verify OAuth2 client availability
    if (this.oAuth2Client) {
      this.log('OAuth2 client is available');
    } else {
      this.error('OAuth2 client is not available, device may not function correctly');
    }

    this.log('LinkedIn User Device has been initialized with OAuth2');
  }

  /**
   * This method is called when the device is added
   */
  async onOAuth2Added(): Promise<void> {
    this.log('LinkedIn User Device has been added');
  }

  /**
   * This method is called when the device is deleted
   */
  async onOAuth2Deleted(): Promise<void> {
    this.log('LinkedIn User Device is being deleted');

    // Clean up device storage
    try {
      await this.unsetStoreValue('lastPostTime');
      this.log('Removed stored data');
    } catch (error) {
      this.error('Error cleaning up device storage:', error);
    }
  }

  /**
   * Post a text update to LinkedIn
   */
  async postTextUpdate({ text, visibility = 'CONNECTIONS' }: { text: string, visibility?: string }): Promise<boolean> {
    this.log('Posting text update to LinkedIn');

    try {
      // Get the OAuth2Client instance from the device
      const client = this.oAuth2Client as LinkedInOAuth2Client;

      if (!client) {
        throw new Error('LinkedIn OAuth2 client not available');
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
      // Get the OAuth2Client instance from the device
      const client = this.oAuth2Client as LinkedInOAuth2Client;

      if (!client) {
        throw new Error('LinkedIn OAuth2 client not available');
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
