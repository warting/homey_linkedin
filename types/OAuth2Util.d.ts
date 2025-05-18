/**
 * Utility functions for the OAuth2 library
 */
export class OAuth2Util {
  /**
   * Generates a random string to use as a session identifier
   */
  static getRandomId(length?: number): string;

  /**
   * Converts an object to a URL query string
   */
  static objectToQueryString(obj: Record<string, any>): string;

  /**
   * Checks if a token is expired
   */
  static isTokenExpired(token: { expires_in?: number; timestamp?: number }): boolean;
}

export default OAuth2Util;
