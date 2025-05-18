/**
 * OAuth2Error class for handling OAuth2-specific errors
 */
export class OAuth2Error extends Error {
  constructor(message: string, options?: { statusCode?: number; response?: any });

  readonly statusCode?: number;
  readonly response?: any;
}

export default OAuth2Error;
