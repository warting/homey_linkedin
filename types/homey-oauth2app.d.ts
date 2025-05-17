declare module 'homey-oauth2app' {
  import Homey from 'homey';

  export interface OAuth2Token {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  }

  export interface ApiResponse {
    ok: boolean;
    status: number;
    data: any;
    headers: Record<string, string>;
  }

  export class OAuth2Client extends Homey.SimpleClass {
    constructor(options: any);
    getTokenByCode(code: string): Promise<OAuth2Token>;
    get(options: any): Promise<ApiResponse>;
    post(options: any): Promise<ApiResponse>;
    put(options: any): Promise<ApiResponse>;
    delete(options: any): Promise<ApiResponse>;
    emit(event: string, ...args: any[]): Promise<void>;
  }

  export class OAuth2Driver extends Homey.Driver {
    getOAuth2Client<T extends OAuth2Client>(): T;
  }

  export class OAuth2Device extends Homey.Device {
    getOAuth2Client<T extends OAuth2Client>(): T;
  }

  export class OAuth2App extends Homey.App {
    static OAUTH2_CLIENT: typeof OAuth2Client;
    static OAUTH2_DEBUG: boolean;
    static OAUTH2_DRIVERS: string[];
  }
}
