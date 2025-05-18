import { EventEmitter } from 'events';
import { OAuth2Token } from './OAuth2Token';
import { ApiResponse } from './ApiResponse';

/**
 * OAuth2Client
 * This class handles all API and token requests, and should be extended by the app.
 *
 * @extends EventEmitter
 */
export class OAuth2Client extends EventEmitter {
  /**
   * The API URL to use for requests.
   *
   * @type {string}
   */
  static API_URL: string;

  /**
   * The authorization URL for the OAuth2 flow.
   *
   * @type {string}
   */
  static AUTHORIZATION_URL: string;

  /**
   * The client ID(s) for the OAuth2 app.
   *
   * @type {string[]}
   */
  static CLIENT_ID: string[];

  /**
   * The client secret(s) for the OAuth2 app.
   *
   * @type {string[]}
   */
  static CLIENT_SECRET: string[];

  /**
   * The redirect URL for the OAuth2 flow.
   *
   * @type {string}
   */
  static REDIRECT_URL: string;

  /**
   * The scopes to request during the OAuth2 flow.
   *
   * @type {string[]}
   */
  static SCOPES: string[];

  /**
   * The current OAuth2 token.
   *
   * @type {OAuth2Token}
   */
  TOKEN: OAuth2Token;

  /**
   * The token URL for the OAuth2 flow.
   *
   * @type {string}
   */
  static TOKEN_URL: string;

  /**
   * Constructor for the OAuth2Client.
   *
   * @param {object} options - The options for the client.
   */
  constructor(options: any);

  /**
   * Helper function for debug logging.
   *
   * @param {...any} props - Properties to log.
   */
  debug(...props: any[]): void;

  /**
   * Perform a DELETE request to the API.
   *
   * @param {object} args - The request arguments.
   * @returns {Promise<ApiResponse>} - The API response.
   */
  delete(args: object): Promise<ApiResponse>;

  /**
   * Helper function to destroy the client.
   */
  destroy(): void;

  /**
   * Helper function for error logging.
   *
   * @param {...any} props - Properties to log.
   */
  error(...props: any[]): void;

  /**
   * Perform a GET request to the API.
   *
   * @param {object} args - The request arguments.
   * @returns {Promise<ApiResponse>} - The API response.
   */
  get(args: object): Promise<ApiResponse>;

  /**
   * Get the authorization URL for the OAuth2 flow.
   *
   * @param {object} args - The arguments for the authorization URL.
   * @returns {string} - The authorization URL.
   */
  getAuthorizationUrl(args: object): string;

  /**
   * Get the title of the client.
   *
   * @returns {string} - The title.
   */
  getTitle(): string;

  /**
   * Get the current OAuth2 token.
   *
   * @returns {OAuth2Token|null} - The OAuth2 token or null if not set.
   */
  getToken(): OAuth2Token | null;

  /**
   * Get an OAuth2 token by authorization code.
   *
   * @param {object|string} args - The authorization code or arguments.
   * @returns {Promise<OAuth2Token>} - The OAuth2 token.
   */
  getTokenByCode(args: object | string): Promise<OAuth2Token>;

  /**
   * Get an OAuth2 token by client credentials.
   *
   * @param {object} args - The client credentials arguments.
   * @returns {Promise<OAuth2Token>} - The OAuth2 token.
   */
  getTokenByCredentials(args: object): Promise<OAuth2Token>;

  /**
   * Helper function to initialize the client.
   *
   * @returns {Promise<void>}
   */
  init(): Promise<void>;

  /**
   * Helper function for logging.
   *
   * @param {...any} props - Properties to log.
   */
  log(...props: any[]): void;

  /**
   * Can be extended to modify requests before they are sent.
   *
   * @param {object} args - The request arguments.
   * @returns {Promise<{opts: object, url: string}>} - The modified request options and URL.
   */
  onBuildRequest(args: object): Promise<{opts: object, url: string}>;

  /**
   * This method returns data that can identify the session.
   *
   * @returns {Promise<{id: any, title: string|null}>} - Session information.
   */
  onGetOAuth2SessionInformation(): Promise<{id: any, title: string|null}>;

  /**
   * Gets a token from an authorization code.
   * https://tools.ietf.org/html/rfc6749#section-4.1.3
   *
   * @param {object} args - The authorization code arguments.
   * @returns {Promise<OAuth2Token>} - The OAuth2 token.
   */
  onGetTokenByCode(args: object): Promise<OAuth2Token>;

  /**
   * Gets a token from client credentials.
   * https://tools.ietf.org/html/rfc6749#section-4.3.2
   *
   * @param {object} args - The client credentials arguments.
   * @returns {Promise<OAuth2Token>} - The OAuth2 token.
   */
  onGetTokenByCredentials(args: object): Promise<OAuth2Token>;

  /**
   * Handles customizing the authorization URL.
   *
   * @param {object} args - The authorization URL arguments.
   * @returns {string} - The modified authorization URL.
   */
  onHandleAuthorizationURL(args: object): string;

  /**
   * Handles customizing the authorization URL scopes.
   * https://tools.ietf.org/html/rfc6749#appendix-A.4
   *
   * @param {object} args - The scope arguments.
   * @returns {any} - The modified scopes.
   */
  onHandleAuthorizationURLScopes(args: object): any;

  /**
   * Can be extended to handle errors during token code exchange.
   *
   * @param {object} args - Error arguments.
   * @returns {Promise<void>}
   */
  onHandleGetTokenByCodeError(args: object): Promise<void>;

  /**
   * Can be extended to handle the response during token code exchange.
   *
   * @param {object} args - Response arguments.
   * @returns {Promise<void>}
   */
  onHandleGetTokenByCodeResponse(args: object): Promise<void>;

  /**
   * This method handles a response that is not OK (400 <= statuscode <= 599).
   *
   * @param {object} args - Error arguments.
   * @returns {Promise<Error>} - A promise that resolves to an Error.
   */
  onHandleNotOK(args: object): Promise<Error>;

  /**
   * Handles errors during token refresh.
   *
   * @param {object} args - Error arguments.
   * @returns {Promise<void>}
   */
  onHandleRefreshTokenError(args: object): Promise<void>;

  /**
   * Handles the response during token refresh.
   *
   * @param {object} args - Response arguments.
   * @returns {Promise<OAuth2Token>} - The refreshed OAuth2 token.
   */
  onHandleRefreshTokenResponse(args: object): Promise<OAuth2Token>;

  /**
   * This method handles a response and downloads the body.
   *
   * @param {object} args - Response arguments.
   * @returns {Promise<any|undefined>} - The parsed response body.
   */
  onHandleResponse(args: object): Promise<any|undefined>;

  /**
   * This method handles a response that is OK.
   *
   * @param {object} args - Response arguments.
   * @returns {Promise<any>} - The parsed response.
   */
  onHandleResult(args: object): Promise<any>;

  /**
   * Can be extended for custom initialization.
   *
   * @returns {Promise<void>}
   */
  onInit(): Promise<void>;

  /**
   * This method returns a boolean if the response is rate limited.
   *
   * @param {object} args - Response arguments.
   * @returns {Promise<boolean>} - Whether the request was rate limited.
   */
  onIsRateLimited(args: object): Promise<boolean>;

  /**
   * Refreshes the OAuth2 token.
   * https://tools.ietf.org/html/rfc6749#section-6
   *
   * @returns {Promise<OAuth2Token>} - The refreshed OAuth2 token.
   */
  onRefreshToken(): Promise<OAuth2Token>;

  /**
   * Handles request errors.
   *
   * @param {object} arg - Error arguments.
   * @returns {Promise<void>}
   */
  onRequestError(arg: object): Promise<void>;

  /**
   * Customizes request headers.
   *
   * @param {object} args - Request arguments.
   * @returns {Promise<object>} - The modified headers.
   */
  onRequestHeaders(args: object): Promise<object>;

  /**
   * Can be extended to customize request query parameters.
   *
   * @param {object} args - Request arguments.
   * @returns {Promise<object>} - The modified query parameters.
   */
  onRequestQuery(args: object): Promise<object>;

  /**
   * This method handles the response from a request.
   *
   * @param {object} args - Response arguments.
   * @returns {Promise<void|any>} - The processed response.
   */
  onRequestResponse(args: object): Promise<void|any>;

  /**
   * This method returns a boolean if the token should be refreshed.
   *
   * @param {object} args - Token arguments.
   * @returns {Promise<boolean>} - Whether the token should be refreshed.
   */
  onShouldRefreshToken(args: object): Promise<boolean>;

  /**
   * Can be extended for custom cleanup.
   *
   * @returns {Promise<void>}
   */
  onUninit(): Promise<void>;

  /**
   * Perform a PATCH request to the API.
   *
   * @param {object} args - The request arguments.
   * @returns {Promise<ApiResponse>} - The API response.
   */
  patch(args: object): Promise<ApiResponse>;

  /**
   * Perform a POST request to the API.
   *
   * @param {object} args - The request arguments.
   * @returns {Promise<ApiResponse>} - The API response.
   */
  post(args: object): Promise<ApiResponse>;

  /**
   * Perform a PUT request to the API.
   *
   * @param {object} args - The request arguments.
   * @returns {Promise<ApiResponse>} - The API response.
   */
  put(args: object): Promise<ApiResponse>;

  /**
   * Refresh the OAuth2 token.
   *
   * @param {...object} args - Refresh token arguments.
   * @returns {Promise<undefined|void|null>} - A promise that resolves when the token is refreshed.
   */
  refreshToken(...args: object[]): Promise<undefined|void|null>;

  /**
   * Helper function to save the client state.
   */
  save(): void;

  /**
   * Set the title of the client.
   *
   * @param {string} title - The new title.
   */
  setTitle(title: string): void;

  /**
   * Set the OAuth2 token.
   *
   * @param {OAuth2Token|object} args - The OAuth2 token or arguments.
   */
  setToken(args: OAuth2Token | object): void;
}

export default OAuth2Client;
