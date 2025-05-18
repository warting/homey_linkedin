import Homey from 'homey';
import { OAuth2Client } from './OAuth2Client';

export class OAuth2Driver extends Homey.Driver {
  getOAuth2Client<T extends OAuth2Client>(): T;
  setStoreValue(key: string, value: any): Promise<void>;
  getStoreValue(key: string): Promise<any>;
  onOAuth2Init?(): Promise<void>;
}

export default OAuth2Driver;
