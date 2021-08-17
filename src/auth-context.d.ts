import React from 'react';
import { DrupalOAuth } from "./drupal-oauth";

export const AuthContextProvider: React.FunctionComponent;
export const AuthContext: React.Context<[AuthState, React.Dispatch<AuthAction>]>;
export interface AuthState{
  isAuthenticated: boolean,
}

export type AuthAction = AuthenticateUserAction | LogoutUserAction;
interface AuthenticateUserAction{
  type: 'AUTHENTICATE_USER',
}

interface LogoutUserAction{
  type: 'LOGOUT_USER',
}

export function handleLogin(authContext: [AuthState, React.Dispatch<AuthAction>], event: Event): null;
export function submitLogin(authContext: [AuthState, React.Dispatch<AuthAction>], formData: FormData): null;
export function handleLogout(authContext: [AuthState, React.Dispatch<AuthAction>], event: Event): null;
export function fetchAuthenticatedContent(auth: DrupalOAuth,
                                          dispatch: React.Dispatch<AuthAction>,
                                          jsonapi_endpoint: string,
                                          method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
                                          body?: object,
                                          headers?: object): Promise<object | Boolean>
