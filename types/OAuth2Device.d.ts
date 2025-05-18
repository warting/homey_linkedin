import Homey from 'homey';
import { OAuth2Client } from './OAuth2Client';

export class OAuth2Device extends Homey.Device {
  // The OAuth2Client instance for this device
  oAuth2Client: OAuth2Client;

  // Methods
  onOAuth2Init(): Promise<void>;
  onOAuth2Added?(): Promise<void>;
  onOAuth2Deleted?(): Promise<void>;
}

export default OAuth2Device;
