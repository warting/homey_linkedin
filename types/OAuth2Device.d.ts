import Homey from 'homey';

/**
 * OAuth2Device
 *
 * @extends Homey.Device
 */
export class OAuth2Device extends Homey.Device {
  /**
   * The OAuth2Client instance for this device.
   */
  oAuth2Client: any;

  /**
   * The Homey instance.
   */
  homey: typeof Homey;

  /**
   * Get device settings.
   */
  getSettings(): Record<string, any>;

  /**
   * Get device store data.
   */
  getStore(): Record<string, any>;

  /**
   * Get a value from the device store.
   */
  getStoreValue(key: string): any;

  /**
   * Set a value in the device store.
   */
  setStoreValue(key: string, value: any): Promise<void>;

  /**
   * Remove a value from the device store.
   */
  unsetStoreValue(key: string): Promise<void>;

  /**
   * Set a capability value.
   */
  setCapabilityValue(capability: string, value: any): Promise<void>;

  /**
   * @returns {Promise<void>}
   */
  async onAdded(): Promise<void>;

  /**
   * @returns {Promise<void>}
   */
  async onDeleted(): Promise<void>;

  /**
   * @returns {Promise<void>}
   */
  async onInit(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Added(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Deleted(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Destroyed(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Expired(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Init(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Saved(): Promise<void>;

  /**
   * This method can be extended
   *
   * @returns {Promise<void>}
   */
  async onOAuth2Uninit(): Promise<void>;

  /**
   * @returns {Promise<void>}
   */
  async onUninit(): Promise<void>;
}

export default OAuth2Device;
