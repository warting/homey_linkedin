import Homey from 'homey';

/**
 * OAuth2Device
 *
 * @extends Homey.Device
 */
export class OAuth2Device extends Homey.Device {
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
  async onInit();

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
