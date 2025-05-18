import { OAuth2Device } from 'homey-oauth2app';
import * as console from 'node:console';

// Create a class that combines OAuth2Device with explicit log methods
class LinkedInUserDevice extends OAuth2Device {
  /**
     * This method is called when the device is initialized with OAuth2
     * This is where you should set up device capabilities and handle the OAuth2 client
     */
  async onOAuth2Init(): Promise<void> {
    console.log('onOAuth2Init');
  }

  /**
     * This method is called when the device is added
     */
  async onOAuth2Added(): Promise<void> {
    console.log('LinkedIn User Device has been added');
  }

  /**
     * This method is called when the device is deleted
     */
  async onOAuth2Deleted(): Promise<void> {
    console.log('LinkedIn User Device is being deleted');
  }

  /**
     * Post a text update to LinkedIn
     */
  async postTextUpdate({ text, visibility = 'CONNECTIONS' }: { text: string, visibility?: string }): Promise<boolean> {
    console.log('Posting text update to LinkedIn');
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
    console.log('Posting link update to LinkedIn');
    console.log('text', text);
    console.log('linkUrl', linkUrl);
    console.log('title', title);
    console.log('description', description);
    console.log('visibility', visibility);
    return true;
  }
}

module.exports = LinkedInUserDevice;
