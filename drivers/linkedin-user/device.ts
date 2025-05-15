import { OAuth2Device } from 'homey-oauth2app';
import LinkedInClient from '../../lib/LinkedIn/LinkedInClient';
import LinkedInOAuth2Client from '../../lib/OAuth/LinkedInOAuth2Client';

module.exports = class LinkedInUserDevice extends OAuth2Device {
  private linkedInClient: LinkedInClient | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('LinkedIn User Device has been initialized');

    // Initialize the LinkedIn client with the OAuth2 client
    await this.initLinkedInClient();

    // Set initial capability values
    await this.setCapabilityValue('linkedin_connected', true).catch(this.error);
    if (!this.hasCapability('last_post_time')) {
      await this.addCapability('last_post_time').catch(this.error);
    }

    // Start polling for connection status
    this.startPolling();

    // Register capabilities listeners
    await this.registerCapabilityListeners();

    // Register flow card actions
    await this.registerFlowCardActions();
  }

  /**
   * Start polling for connection status
   */
  startPolling() {
    // Check connection status every 5 minutes
    this.refreshInterval = this.homey.setInterval(async () => {
      try {
        if (!this.linkedInClient) {
          await this.initLinkedInClient();
        }

        // Attempt to get profile to verify connection
        await this.linkedInClient?.getProfile();
        await this.setCapabilityValue('linkedin_connected', true).catch(this.error);
      } catch (error) {
        this.error('Connection check failed:', error);
        await this.setCapabilityValue('linkedin_connected', false).catch(this.error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Initialize the LinkedIn client
   */
  async initLinkedInClient() {
    try {
      // Get the OAuth2 client and cast it to our specific type
      const oAuth2Client = this.getOAuth2Client() as unknown as LinkedInOAuth2Client;

      // Create LinkedIn client with the OAuth2 client
      this.linkedInClient = new LinkedInClient(oAuth2Client);

      // Initialize the client
      await this.linkedInClient.init();

      // Set connected to true once initialized successfully
      await this.setCapabilityValue('linkedin_connected', true).catch(this.error);

      this.log('LinkedIn client initialized successfully');
    } catch (error) {
      this.error('Failed to initialize LinkedIn client:', error);
      await this.setCapabilityValue('linkedin_connected', false).catch(this.error);
      throw new Error(`Failed to initialize LinkedIn client: ${error}`);
    }
  }

  /**
   * Register capability listeners
   */
  async registerCapabilityListeners() {
    // Nothing to implement for these capabilities as they are read-only
    this.log('Registering capability listeners');
  }

  /**
   * Register flow card actions
   */
  async registerFlowCardActions() {
    // Will be implemented when flow cards are created
    this.log('Registering flow card actions');
  }

  /**
   * Post a text update to LinkedIn
   */
  async postTextUpdate(params: { text: string; visibility?: string }) {
    if (!this.linkedInClient) {
      await this.initLinkedInClient();
    }

    if (!this.linkedInClient) {
      throw new Error('LinkedIn client not available');
    }

    try {
      const { text, visibility } = params;
      const result = await this.linkedInClient.postTextUpdate({
        text,
        visibility: (visibility as 'PUBLIC' | 'CONNECTIONS' | 'CONTAINER') || 'CONNECTIONS',
      });

      // Update last post time
      await this.updateLastPostTime();

      this.log('Text update posted successfully');
      return result;
    } catch (error) {
      this.error('Failed to post text update:', error);
      throw new Error(`Failed to post to LinkedIn: ${error}`);
    }
  }

  /**
   * Post a link to LinkedIn
   */
  async postLinkUpdate(params: {
    text: string;
    linkUrl: string;
    title?: string;
    description?: string;
    visibility?: string;
  }) {
    if (!this.linkedInClient) {
      await this.initLinkedInClient();
    }

    if (!this.linkedInClient) {
      throw new Error('LinkedIn client not available');
    }

    try {
      const {
        text, linkUrl, title, description, visibility,
      } = params;
      const result = await this.linkedInClient.postLinkUpdate({
        text,
        linkUrl,
        title,
        description,
        visibility: (visibility as 'PUBLIC' | 'CONNECTIONS' | 'CONTAINER') || 'CONNECTIONS',
      });

      // Update last post time
      await this.updateLastPostTime();

      this.log('Link update posted successfully');
      return result;
    } catch (error) {
      this.error('Failed to post link update:', error);
      throw new Error(`Failed to post link to LinkedIn: ${error}`);
    }
  }

  /**
   * Update the last post time capability
   */
  async updateLastPostTime() {
    const now = new Date().toISOString();
    await this.setCapabilityValue('last_post_time', now).catch(this.error);
    this.log(`Updated last post time to ${now}`);
  }

  /**
   * Get the user profile information
   */
  async getUserProfile() {
    if (!this.linkedInClient) {
      await this.initLinkedInClient();
    }

    if (!this.linkedInClient) {
      throw new Error('LinkedIn client not available');
    }

    try {
      return await this.linkedInClient.getProfile();
    } catch (error) {
      this.error('Failed to get user profile:', error);
      throw new Error(`Failed to get LinkedIn profile: ${error}`);
    }
  }

  /**
   * onOAuth2Destroy is called when the OAuth2 session is revoked
   */
  async onOAuth2Destroy() {
    // Set connected status to false
    await this.setCapabilityValue('linkedin_connected', false).catch(this.error);

    // Clean up after OAuth2 session is destroyed
    this.log('OAuth2 session destroyed');
  }

  /**
   * onDeleted is called when the device is deleted
   */
  async onDeleted() {
    // Clear the polling interval
    if (this.refreshInterval) {
      this.homey.clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    this.log('LinkedIn User device has been deleted');
  }
};
