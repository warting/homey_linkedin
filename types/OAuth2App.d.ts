import Homey from 'homey';
import { OAuth2Client } from './OAuth2Client';

export class OAuth2App extends Homey.App {
  static OAUTH2_CLIENT: typeof OAuth2Client;
  static OAUTH2_DEBUG: boolean;
  static OAUTH2_DRIVERS: string[];

  onOAuth2Init?(): Promise<void>;
}

export default OAuth2App;
