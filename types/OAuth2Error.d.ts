/**
 * OAuth2Error
 *
 * @extends Error
 */
export class OAuth2Error extends Error {
  /**
   * @param {string} message
   */
  constructor(message: string);

  /**
   * @returns {string}
   */
  toString(): string;
}

export default OAuth2Error;
