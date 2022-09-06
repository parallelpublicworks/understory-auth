import docCookies from "mozilla-doc-cookies";

function checkIfDuplicateModification(body){
  return body.hasOwnProperty('errors') &&
    body.errors.length === 1 &&
    body.errors[0].status === "422" &&
    body.errors[0].hasOwnProperty('detail') &&
    body.errors[0].detail ===
    "Entity is not valid: The content has either been modified by another user, or you have already submitted modifications. As a result, your changes cannot be saved.";
}

function getPath(defaultEndpoint, endpointEnvVar){
  let endpoint = defaultEndpoint;
  if(process.env[endpointEnvVar]){
    endpoint = process.env[endpointEnvVar];
  }
  return endpoint.replace(/\/$/, "").replace(/^\//, ""); // strip beginning and end slash
}

export class DrupalOAuth{
  constructor(args){
    if(args.baseUrl){
      this.baseUrl = args.baseUrl;
    }
    if(args.clientId){
      this.clientId = args.clientId;
    }
    this.token = typeof window !== `undefined` && docCookies.hasItem('refresh_token') && docCookies.hasItem('access_token') ? {
      refresh_token: docCookies.getItem('refresh_token'),
      access_token: docCookies.getItem('access_token'),
    } : false;
    this.isLoggedIn = this.isLoggedIn.bind(this);

  }

  getBaseUrl(){
    if(!process.env.REACT_APP_ENTITYSYNC_BASE_URL && !this.baseUrl){
      throw new Error("Missing base url for Entity Sync. Please set the REACT_APP_ENTITYSYNC_BASE_URL environment variable or pass in `baseUrl` to the DrupalOAuth object as the base url of your backend, like 'https://www.my-backend.com'")
    }
    if(this.baseUrl){
      return this.baseUrl;
    }
    return process.env.REACT_APP_ENTITYSYNC_BASE_URL.replace(/\/$/, ""); // strip end slash
  }

  getClientId(){
    if(!process.env.REACT_APP_ENTITYSYNC_CLIENT_ID && !this.clientId){
      throw new Error("Missing client ID for Entity Sync. Please set the REACT_APP_ENTITYSYNC_CLIENT_ID environment variable or pass in `clientId` to the DrupalOAuth object as the OAuth client_id of your app.")
    }
    if(this.clientId){
      return this.clientId;
    }
    return process.env.REACT_APP_ENTITYSYNC_CLIENT_ID;
  }

  /**
   *
   * @param resp
   * @returns {Promise<object | boolean>} returns a truthy value if this is a valid response
   */
  async verifyResponse(resp){
    // check match for 2XX status for success
    if(/2../.test(resp.status.toString())){
      // Our access token works
      if(resp.status === 204){
        //No content returned, don't return any json
        return true;
      }
      return await resp.json();
    }
    return false;
  }

  /**
   * Fetch data from a Drupal back end. Expects to be called in a locally logged in context (i.e we have some kind of
   * token). It will try to use the refresh token if it fails via 401 the first time. If it still fails after
   * refreshing, it will return false, signifying that this user should no longer be logged in.
   *
   * @param {string} jsonapiEndpoint An endpoint to retrieve resources using the JSONAPI (https://jsonapi.org/). Includes
   * everything after the host except the leading slash (ex. `'articles?page[offset]=2'`)
   * @param {string} method An HTTP verb, mainly meant for `'GET'`, `'POST'`, `'PATCH'` and `'DELETE'`
   * @param {object|null} body The body of the request, for `'POST'` and `'PATCH'`
   * @param {object} headers
   * @param {object} extraParams Extra params: 'useDefaultJsonApiPath' set it to true to avoid using the default "jsonapi" path for the requests
   * 'returnResponse' set it to true if you want to return the response like is received from the API.
   *
   * @returns {Promise<object| Response | Boolean>} A promise which will return a JSON object of content, true if success with no
   * content, or false if it failed, if the extraPram 'returnResponse' is set to true it will return the Response object right from the request
   */
  async drupalFetch(jsonapiEndpoint, method='GET', body=null, headers=null, extraParams = {}){

    const { useDefaultJsonApiPath = true, returnResponse = false } = extraParams;

    if(body && !(body instanceof File)){
      body = JSON.stringify(body)
    }

    const base = this.getBaseUrl();
    const jsonapiBase = getPath('jsonapi', 'REACT_APP_ENTITYSYNC_JSONAPI_BASE');
    const url = useDefaultJsonApiPath ? `${base}/${jsonapiBase}/${jsonapiEndpoint}` : `${base}/${jsonapiEndpoint}`;
    const init = {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type':  'application/vnd.api+json'
      },
    };
    Object.assign(init.headers, headers);
    if(body){
      init.body = body
    }
    const resp = await fetch(url, init);

    if(returnResponse) {
      return resp;
    }

    const validResponse = await this.verifyResponse(resp);
    if(validResponse){
      return validResponse;
    }

    else if(resp.status === 403){
      // if we get a forbidden response, send a distinctive falsy response
      return null
    }
    
    else if(resp.status === 401){

      // if we get 401 unauthorized its probably because our access token is expired.
      // refresh and try again with a new token
      const newToken = await this.refresh();
      if(newToken) {
        // Our refresh token is still good, we've got a fresh token
        init.headers = {
          'Authorization': `Bearer ${newToken.access_token}`,
          'Content-Type':  'application/vnd.api+json'
        };
        Object.assign(init.headers, headers);
        const secondResp = await fetch(url, init);
        // check match for 2XX status for success
        const validResponse = await this.verifyResponse(secondResp);
        if(validResponse){
          return validResponse;
        }
        else{
          /*TODO: Try one more time? We expect to be logged in so either
           something external happened (and we should try again), the expiration on the token is too short,
           or we made a bad request.*/
        }
      }
    }
    else if(resp.status === 422){
      // if we get a duplicate modification error, just ignore it. our API interactions should be designed to avoid them,
      // and if any actually do happen, they should be truly duplicate, meaning that the failed one can be safely discarded
      const body = await resp.json();
      if(checkIfDuplicateModification(body)){
        return body;
      }

    }

    // If everything fails, return false
    return false;
  }

  /**
   * Uses the refresh token stored in the cookie to get a new oauth token.
   * @returns {Promise<object | Boolean>} A token object with `refresh_token` and `access_token`, or false if no
   * existing refresh token or login failed (meaning this user is not logged in)
   */
  async refresh(){
    let refreshToken = false;
    if (typeof window !== `undefined`) {
      refreshToken = docCookies.getItem('refresh_token');
    } 
    if(typeof refreshToken !== `undefined` && refreshToken){
      return await this.authPost('refresh_token', refreshToken);
    }

    return false
  }

  /**
   * Checks local state to see if we have a token. Run refresh
   * @returns {boolean}
   */
  isLoggedIn(){
    return this.token ? true : false;
  }

  /**
   * Authenticates against a Drupal oauth backend. Will set or unset cookie with refresh token on success or failure.
   *
   * @param grantType Either `'password'` or `'refresh_token'`
   * @param authValue The value of the refresh token, if using `refresh_token` grant type
   * @param FormData object, if you are using the password grant, you should turn your form element into a formData object then pass to authPost. This way you can manipulate the formObject outside of the authPost method.
   * @returns {Promise<object | Boolean>} A token object with `refresh_token` and `access_token`, or false if login
   * failed
   */
  async authPost(grantType, authValue=null, form=null){
    const base = this.getBaseUrl();
    const url = base + '/oauth/token';
    const formData = form ? form : new FormData();
    if(authValue){
      formData.append(grantType, authValue);
    }
    formData.append('grant_type', grantType);
    formData.append('client_id', this.getClientId());
    const init = {
      method: 'POST',
      body: formData,
    };
    let resp;
    try {
      resp = await fetch(url, init);
    } catch (e) {
      console.log(e);
    }
    if(resp && resp.status === 200){
      this.token = await resp.json();
      if (typeof window !== `undefined`) {
        // For inherit sessions to iframes, for handling authorization through Drupal OAuth
        docCookies.setItem('refresh_token', this.token.refresh_token, Infinity, '/; SameSite=None; Secure');
        docCookies.setItem('access_token', this.token.access_token, Infinity, '/; SameSite=None; Secure');
      }
      return this.token;
    }
    // else if(resp.status === 500){
    //   //service unavailable, trying again
    //   const secondResp = await fetch(url, init);
    //   if(secondResp.status === 200){
    //     this.token = await secondResp.json();
    //     docCookies.setItem('refresh_token', this.token.refresh_token);
    //     return this.token;
    //   }
    // }
    else{
      this.removeTokens();
      return false;
    }
  }

  /**
   *
   * @param formData
   * @param grantType
   * @returns {Promise<{token: Object|Boolean, uid: null}>}
   */
  async loginUser(formData, grantType){
    const initialLoginResponse = await this.authPost(grantType, null, formData);
    return { token: initialLoginResponse, };
  }

  async logoutUser(){
    if (typeof window !== `undefined`) {
      this.removeTokens();
      //removes all localstorage for page
      localStorage.clear();
      //removes current access tokens/response
      this.token = false;
      return !docCookies.hasItem('refresh_token');
    } else {
      return true;
    }
  }

  removeTokens(){
    if (typeof window !== `undefined`) {
      docCookies.removeItem('refresh_token', '/');
      docCookies.removeItem('access_token', '/');
    }
  }

}
