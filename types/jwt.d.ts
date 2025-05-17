/**
 * Interface for JWT token payload from LinkedIn OAuth2
 */
export interface JwtPayload {
  /**
   * Issuer - who created and signed this token
   */
  iss?: string;
  
  /**
   * Subject - the principal that is the subject of the JWT (user ID)
   */
  sub?: string;
  
  /**
   * Audience - recipient for which the JWT is intended
   */
  aud?: string;
  
  /**
   * Expiration time - after which the JWT expires
   */
  exp?: number;
  
  /**
   * Not before - when the JWT becomes valid
   */
  nbf?: number;
  
  /**
   * Issued at - when the JWT was issued
   */
  iat?: number;
  
  /**
   * JWT ID - unique identifier for the token
   */
  jti?: string;
  
  /**
   * User's full name
   */
  name?: string;
  
  /**
   * User's given (first) name
   */
  given_name?: string;
  
  /**
   * User's family (last) name
   */
  family_name?: string;
  
  /**
   * User's middle name
   */
  middle_name?: string;
  
  /**
   * User's email address
   */
  email?: string;
  
  /**
   * Whether the email has been verified
   */
  email_verified?: string | boolean;
  
  /**
   * URL to the user's profile picture
   */
  picture?: string;
  
  /**
   * User's locale/language
   */
  locale?: string;
  
  /**
   * Any additional properties that might be in the JWT
   */
  [key: string]: any;
}
