declare module 'homey-oauth2app' {
  import Homey from 'homey';

  export interface OAuth2Token {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  }

  export interface OAuth2ClientOptions {
    clientId: string;
    clientSecret: string;
    redirectUrl: string;
    tokenUrl: string;
    authorizationUrl: string;
    scopes: string[];
  }

  export interface ApiCallOptions {
    path?: string;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
  }

  export interface ApiResponse {
    ok: boolean;
    status: number;
    statusCode: number;
    headers: Record<string, string>;
    data: any;
  }

  export class OAuth2Client extends Homey.SimpleClass {
    constructor(options: OAuth2ClientOptions);

    clientId: string;
    clientSecret: string;
    redirectUrl: string;

    onInit(): Promise<void>;

    log(...args: any[]): void;
    error(...args: any[]): void;

    getAuthorizationUrl(scopes?: string[]): Promise<string>;
    getTokenByCode(code: string): Promise<OAuth2Token>;
    refreshToken(token: OAuth2Token): Promise<OAuth2Token>;

    get(options: ApiCallOptions | string): Promise<ApiResponse>;
    post(options: ApiCallOptions | string, body?: any, headers?: Record<string, string>): Promise<ApiResponse>;
    put(options: ApiCallOptions | string, body?: any, headers?: Record<string, string>): Promise<ApiResponse>;
    delete(options: ApiCallOptions | string, body?: any, headers?: Record<string, string>): Promise<ApiResponse>;
  }

  export class OAuth2App extends Homey.App {
    setOAuth2Config(config: {
      client: typeof OAuth2Client;
      apiUrl: string;
      tokenUrl: string;
      authorizationUrl: string;
      scopes: string[];
    }): void;

    getOAuth2Client(): OAuth2Client;
    getOAuth2ClientId(): string;
  }

  export class OAuth2Device extends Homey.Device {
    getOAuth2Client(): OAuth2Client;
    onOAuth2Init(): Promise<void>;
    onOAuth2Added(): Promise<void>;
    onOAuth2Deleted(): Promise<void>;
  }

  export class OAuth2Driver extends Homey.Driver {
    getOAuth2Client(): OAuth2Client;
    onOAuth2Init(): Promise<void>;
  }
}
