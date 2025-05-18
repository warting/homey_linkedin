import Homey from 'homey';

/**
 * OAuth2Driver
 *
 * @extends Homey.Driver
 */
export class OAuth2Driver extends Homey.Driver {
  /**
   * The Homey instance.
   */
  homey: typeof Homey;

  /**
   * @returns {*}
   */
  getOAuth2ConfigId(): any;

  /**
   * @returns {Promise<void>}
   */
  async onInit(): Promise<void>;

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
  async onOAuth2Uninit(): Promise<void>;

  /**
   * @param {PairSession} socket
   */
  onPair(socket: any): void;

  /**
   * This method can be extended
   *
   * @returns {Promise<*>}
   */
  async onPairListDevices(): Promise<any>;

  /**
   * @param {PairSession} socket
   * @param {Homey.Device} device
   */
  onRepair(socket: any, device: Homey.Device): void;

  /**
   * @returns {Promise<void>}
   */
  async onUninit(): Promise<void>;

  /**
   * @param {string} id
   */
  setOAuth2ConfigId(id: string): void;
}

export default OAuth2Driver;
