/**
 * OAuth2Token
 */
export class OAuth2Token {
  /**
   * @param {object} args
   */
  constructor(args: object);

  /**
   * @returns {boolean}
   */
  isRefreshable(): boolean;

  /**
   * @returns {Object}
   */
  toJSON(): Object;
}

export default OAuth2Token;
