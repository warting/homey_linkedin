/**
 * OAuth2Util
 */
export class OAuth2Util {
  /**
   * @returns {string}
   */
  static getRandomId(): string;

  /**
   * @param {number} [delay=1000]
   * @returns {Promise<void>}
   */
  static async wait(delay?: number): Promise<void>;
}

export default OAuth2Util;
