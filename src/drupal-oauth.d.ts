import { AuthAction } from "./auth-context";
import React from "react";

interface DrupalOAuth {
  verifyResponse: () => boolean,
  authSubrequest: (requests: object) => object | boolean,
  drupalFetch: (jsonapiEndpoint: string, method: 'GET' | 'POST' | 'DELETE', body: null | object, headers: null | object) => object | boolean,
  refresh: () => Token | boolean,
  authPost: (grantType: 'password' | 'refresh_token', authValue: null | string , form: null | object) => Token | boolean,
  loginUser: (event: Event, grantType: 'password' | 'authentication_code' | 'refresh_token') => Promise<Token | boolean>,
  logoutUser: () => Promise<boolean>
  isLoggedIn: () => boolean
}

interface Token {

}

declare var DrupalOAuth: {
    new (): DrupalOAuth;
};