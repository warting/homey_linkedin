import Homey from 'homey';
import { OAuth2Token } from './OAuth2Token';
import { ApiResponse } from './ApiResponse';

export class OAuth2Client extends Homey.SimpleClass {
  constructor(options: any);
  getTokenByCode(code: string): Promise<OAuth2Token>;
  get(options: any): Promise<ApiResponse>;
  post(options: any): Promise<ApiResponse>;
  put(options: any): Promise<ApiResponse>;
  delete(options: any): Promise<ApiResponse>;
  emit(event: string, ...args: any[]): Promise<void>;
  getToken(): OAuth2Token | undefined;
  setToken(token: OAuth2Token): void;
  getSessionId(): string;
  onInit?(): Promise<void>;
}

export default OAuth2Client;
