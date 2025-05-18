import Homey from 'homey';
import { OAuth2Client } from './OAuth2Client';

/**
 * OAuth2App is the main class for Homey apps that use OAuth2 authentication.
 * It extends Homey.App and provides utility methods for OAuth2 client management.
 *
 * @extends Homey.App
 */
export class OAuth2App extends Homey.App {
  /**
   * The OAuth2Client class to be used by this app.
   * This should be set by the extending class.
   *
   * @static
   * @type {typeof OAuth2Client}
   */
  static OAUTH2_CLIENT: typeof OAuth2Client;

  /**
   * Whether to enable debug logging for OAuth2 operations.
   *
   * @static
   * @type {boolean}
   */
  static OAUTH2_DEBUG: boolean;

  /**
   * Array of driver IDs that use OAuth2.
   * We assume all drivers use OAuth2. In some cases, some drivers may never become ready.
   * Make sure to exclude those drivers from this array.
   *
   * @static
   * @type {string[]}
   */
  static OAUTH2_DRIVERS: string[];

  /**
   * Whether to enable support for multiple OAuth2 sessions.
   *
   * @static
   * @type {boolean}
   */
  static OAUTH2_MULTI_SESSION: boolean;

  /**
   * Check if a configuration exists.
   *
   * @param {object} args - Configuration arguments.
   */
  checkHasConfig(args: object): void;

  /**
   * Check if an OAuth2Client exists for the given configuration.
   *
   * @param {object} args - Configuration arguments.
   */
  checkHasOAuth2Client(args: object): void;

  /**
   * Create a new OAuth2Client instance.
   *
   * @param {object} args - Configuration arguments.
   * @returns {OAuth2Client} - The created OAuth2Client instance.
   */
  createOAuth2Client(args: object): OAuth2Client;

  /**
   * Delete an OAuth2Client instance.
   *
   * @param {object} args - Configuration arguments.
   */
  deleteOAuth2Client(args: object): void;

  /**
   * Disable debug logging for OAuth2 operations.
   */
  disableOAuth2Debug(): void;

  /**
   * Enable debug logging for OAuth2 operations.
   */
  enableOAuth2Debug(): void;

  /**
   * Get a configuration for the given arguments.
   *
   * @param {object} args - Configuration arguments.
   * @returns {*} - The configuration.
   */
  getConfig(args: object): any;

  /**
   * Get the first saved OAuth2Client instance.
   * Useful for apps that don't support multiple sessions.
   *
   * @returns {OAuth2Client} - The first OAuth2Client instance.
   */
  getFirstSavedOAuth2Client(): OAuth2Client;

  /**
   * Get an OAuth2Client instance for the given configuration.
   *
   * @param {object} args - Configuration arguments.
   * @returns {OAuth2Client} - The OAuth2Client instance.
   */
  getOAuth2Client(args: object): OAuth2Client;

  /**
   * Get all OAuth2 devices for the given configuration.
   *
   * @param {object} args - Configuration arguments.
   * @returns {Promise<any[]>} - Promise resolving to an array of devices.
   */
  getOAuth2Devices(args: object): Promise<any[]>;

  /**
   * Get all saved OAuth2 sessions.
   *
   * @returns {object} - Object mapping session IDs to session data.
   */
  getSavedOAuth2Sessions(): object;

  /**
   * Initialize the app.
   * This is called automatically when the app is started.
   *
   * @returns {Promise<void>}
   */
  onInit(): Promise<void>;

  /**
   * Initialize OAuth2 functionality.
   * This is called after onInit.
   *
   * @returns {Promise<void>}
   */
  onOAuth2Init?(): Promise<void>;

  /**
   * Clean up OAuth2 functionality before the app is stopped.
   *
   * @returns {Promise<void>}
   */
  onOAuth2Uninit?(): Promise<void>;

  /**
   * Determine whether a session should be deleted.
   *
   * @param {object} args - Arguments containing session information.
   * @returns {Promise<boolean>} - Promise resolving to true if the session should be deleted.
   */
  onShouldDeleteSession(args: object): Promise<boolean>;

  /**
   * Clean up before the app is stopped.
   * This is called automatically when the app is about to be stopped.
   *
   * @returns {Promise<void>}
   */
  onUninit(): Promise<void>;

  /**
   * Save an OAuth2Client instance.
   *
   * @param {object} args - Configuration arguments.
   */
  saveOAuth2Client(args: object): void;

  /**
   * Set the app's config.
   * Most apps will only use one config, default. All methods default to this config.
   * For apps using multiple clients, a configId can be provided.
   *
   * @param {object} args - Configuration arguments.
   */
  setOAuth2Config(args: object): void;

  /**
   * Try to clean up a session.
   *
   * @param {object} args - Configuration arguments.
   */
  tryCleanSession(args: object): void;
}

export default OAuth2App;
