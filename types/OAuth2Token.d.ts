export interface OAuth2Token {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export default OAuth2Token;
