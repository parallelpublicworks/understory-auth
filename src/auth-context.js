import React from "react";

import { DrupalOAuth, } from "./drupal-oauth";

const initialState = {};
export const AuthContext = React.createContext(initialState);

const LOGOUT_USER_ACTION_TYPE = "LOGOUT_USER";
function logoutUserAction(){
  return {
    type: LOGOUT_USER_ACTION_TYPE,
  }
}

const AUTHENTICATE_USER_ACTION_TYPE = "AUTHENTICATE_USER";
function authenticateUserAction(){
  return {
    type: AUTHENTICATE_USER_ACTION_TYPE,
  }
}
const reducer = (state, action) => {
  switch (action.type) {
    case AUTHENTICATE_USER_ACTION_TYPE:
      return {
        ...state,
        isAuthenticated: true,
      };
    case LOGOUT_USER_ACTION_TYPE:
      return {
        ...state,
        isAuthenticated: false,
      };
    default:
      return state;
  }
};

/**
 * A listener for the form submit of the login form.
 * @param {[AuthState, React.Dispatch<AuthAction>]} authContext
 * @param ev
 * @returns {Promise<void>}
 */
export async function handleLogin(authContext, ev){
  const [, dispatch] = authContext;
  const auth = new DrupalOAuth();
  const formData = new FormData(event.target);
  const token = await auth.loginUser(formData, 'password');
  if(token && token.token) {
    dispatch(authenticateUserAction());
  }
  else{
    //TODO: inform the user that they failed to log in.
    return false;
  }
}
/**
 * A listener for the form submit of the login form.
 * @param {[AuthState, React.Dispatch<AuthAction>]} authContext
 * @param formData
 * @returns {Promise<void>}
 */
export async function submitLogin(authContext, formData){
  const [, dispatch] = authContext;
  const auth = new DrupalOAuth();
  const token = await auth.loginUser(formData, 'authorization_code');
  if(token && token.token) {
    dispatch(authenticateUserAction());
  }
  else{
    //TODO: inform the user that they failed to log in.
    return false;
  }
}

export function handleLogout(authContext){
  const [, dispatch] = authContext;
  const auth = new DrupalOAuth();
  const loggedOut = auth.logoutUser();
  //updates the state which forces a re render which will force the user off the page
  if(loggedOut){
    dispatch(logoutUserAction());
  }
  return loggedOut;
}

/**
 *
 * This function uses the auth service to retrieve authenticated data. It checks if the user is still signed in after
 * the whole affair is over and updates the store if not.
 *
 * This should not be imported directly, as it expects to be in a logged in environment.
 * Let it be passed into your page component by wrapping it with the `UserContext`.
 *
 * @see signInToView
 * @see AuthContextProvider
 *
 * @param {!DrupalOAuth} auth The authentication service. This will be bound by UserContextProvider, don't pass it in page
 * components.
 * @param dispatch The dispatch function to the reducer. This will be bound by UserContextProvider, don't pass it in page
 * components.
 *
 * These are the parameters you will pass in your page components
 * @param {string} jsonapi_endpoint An endpoint to retrieve resources using the JSONAPI (https://jsonapi.org/). Includes
 * everything after the host except the leading slash (ex. `'articles?page[offset]=2'`)
 * @param {string} method An HTTP verb, mainly meant for `'GET'`,`'POST'`, `'PATCH'` and `'DELETE'`
 * @param {Object|null} body The body of the request, for `'POST'` and `'PATCH'`
 * @param headers
 *
 * @returns {Promise<object | Boolean>} A promise which will return a JSON object of content or false if it failed
 */
export async function fetchAuthenticatedContent(dispatch, jsonapi_endpoint, method='GET', body=null, headers=null){
  const auth = new DrupalOAuth();
  const content = await auth.drupalFetch(jsonapi_endpoint, method, body, headers);
  if(!content){
    dispatch(logoutUserAction());
  }
  return content;
}

/**
 * Wrap the context provider so that the consumer receives the functions from the auth service to login and fetch
 * authenticated content. These functions are bound to the store and will dispatch actions to change the
 * `isAuthenticated` state. Also initiates the process of determining if we are logged in on first page load.
 *
 * @param props
 * @returns {*} The
 * @constructor
 */
export const AuthContextProvider = props => {

  const auth = new DrupalOAuth();
  const [authState, dispatch] = React.useReducer(reducer, {...initialState, isAuthenticated: auth.isLoggedIn() });
  return (
    <AuthContext.Provider
      value={ [{
        ...authState,
      }, dispatch] }
    >
      {props.children}
    </AuthContext.Provider>
  );
};

