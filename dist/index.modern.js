import React from 'react';

var mozillaDocCookies = {
  getItem: function (sKey) {
    if (!sKey) {
      return null;
    }

    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
      return false;
    }

    var sExpires = "";

    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;

        case String:
          sExpires = "; expires=" + vEnd;
          break;

        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }

    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!this.hasItem(sKey)) {
      return false;
    }

    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    if (!sKey) {
      return false;
    }

    return new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=").test(document.cookie);
  },
  keys: function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);

    for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) {
      aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
    }

    return aKeys;
  }
};

function checkIfDuplicateModification(body) {
  return body.hasOwnProperty('errors') && body.errors.length === 1 && body.errors[0].status === "422" && body.errors[0].hasOwnProperty('detail') && body.errors[0].detail === "Entity is not valid: The content has either been modified by another user, or you have already submitted modifications. As a result, your changes cannot be saved.";
}

function getBaseUrl() {
  if (!process.env.REACT_APP_ENTITYSYNC_BASE_URL) {
    console.log(process.env);
    throw new Error("Missing base url for Entity Sync. Please set the REACT_APP_ENTITYSYNC_BASE_URL environment variable to the base url of your backend, like 'https://www.my-backend.com'");
  }

  return process.env.REACT_APP_ENTITYSYNC_BASE_URL.replace(/\/$/, "");
}

function getClientId() {
  if (!process.env.REACT_APP_ENTITYSYNC_CLIENT_ID) {
    throw new Error("Missing client ID for Entity Sync. Please set the REACT_APP_ENTITYSYNC_CLIENT_ID environment variable to the OAuth client_id of your app.");
  }

  return process.env.REACT_APP_ENTITYSYNC_CLIENT_ID;
}

function getPath(defaultEndpoint, endpointEnvVar) {
  let endpoint = defaultEndpoint;

  if (process.env[endpointEnvVar]) {
    endpoint = process.env[endpointEnvVar];
  }

  return endpoint.replace(/\/$/, "").replace(/^\//, "");
}

class DrupalOAuth {
  constructor() {
    this.token = typeof window !== `undefined` && mozillaDocCookies.hasItem('refresh_token') && mozillaDocCookies.hasItem('access_token') ? {
      refresh_token: mozillaDocCookies.getItem('refresh_token'),
      access_token: mozillaDocCookies.getItem('access_token')
    } : false;
    this.isLoggedIn = this.isLoggedIn.bind(this);
  }

  async verifyResponse(resp) {
    if (/2../.test(resp.status.toString())) {
      if (resp.status === 204) {
        return true;
      }

      return await resp.json();
    }

    return false;
  }

  async drupalFetch(jsonapiEndpoint, method = 'GET', body = null, headers = null) {
    if (body && !(body instanceof File)) {
      body = JSON.stringify(body);
    }

    const base = getBaseUrl();
    const jsonapiBase = getPath('jsonapi', 'REACT_APP_ENTITYSYNC_JSONAPI_BASE');
    const url = `${base}/${jsonapiBase}/${jsonapiEndpoint}`;
    const init = {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type': 'application/vnd.api+json'
      }
    };
    Object.assign(init.headers, headers);

    if (body) {
      init.body = body;
    }

    const resp = await fetch(url, init);
    const validResponse = await this.verifyResponse(resp);

    if (validResponse) {
      return validResponse;
    } else if (resp.status === 401 || resp.status === 403) {
      const newToken = await this.refresh();

      if (newToken) {
        init.headers = {
          'Authorization': `Bearer ${newToken.access_token}`,
          'Content-Type': 'application/vnd.api+json'
        };
        Object.assign(init.headers, headers);
        const secondResp = await fetch(url, init);

        const _validResponse = await this.verifyResponse(secondResp);

        if (_validResponse) {
          return _validResponse;
        }
      }
    } else if (resp.status === 422) {
      const _body = await resp.json();

      if (checkIfDuplicateModification(_body)) {
        return _body;
      }
    }

    return false;
  }

  async refresh() {
    let refreshToken = false;

    if (typeof window !== `undefined`) {
      refreshToken = mozillaDocCookies.getItem('refresh_token');
    }

    if (typeof refreshToken !== `undefined` && refreshToken) {
      return await this.authPost('refresh_token', refreshToken);
    }

    return false;
  }

  isLoggedIn() {
    return this.token ? true : false;
  }

  async authPost(grantType, authValue = null, form = null) {
    const base = getBaseUrl();
    const url = base + '/oauth/token';
    const formData = form ? form : new FormData();

    if (authValue) {
      formData.append(grantType, authValue);
    }

    formData.append('grant_type', grantType);
    formData.append('client_id', getClientId());
    const init = {
      method: 'POST',
      body: formData
    };
    let resp;

    try {
      resp = await fetch(url, init);
    } catch (e) {
      console.log(e);
    }

    if (resp && resp.status === 200) {
      this.token = await resp.json();

      if (typeof window !== `undefined`) {
        mozillaDocCookies.setItem('refresh_token', this.token.refresh_token, Infinity, '/');
        mozillaDocCookies.setItem('access_token', this.token.access_token, Infinity, '/');
      }

      return this.token;
    } else {
      this.removeTokens();
      return false;
    }
  }

  async loginUser(formData, grantType) {
    const initialLoginResponse = await this.authPost(grantType, null, formData);
    return {
      token: initialLoginResponse
    };
  }

  async logoutUser() {
    if (typeof window !== `undefined`) {
      this.removeTokens();
      localStorage.clear();
      this.token = false;
      return !mozillaDocCookies.hasItem('refresh_token');
    } else {
      return true;
    }
  }

  removeTokens() {
    if (typeof window !== `undefined`) {
      mozillaDocCookies.removeItem('refresh_token');
      mozillaDocCookies.removeItem('access_token');
    }
  }

}

const initialState = {};
const AuthContext = React.createContext(initialState);
const LOGOUT_USER_ACTION_TYPE = "LOGOUT_USER";

function logoutUserAction() {
  return {
    type: LOGOUT_USER_ACTION_TYPE
  };
}

const AUTHENTICATE_USER_ACTION_TYPE = "AUTHENTICATE_USER";

function authenticateUserAction() {
  return {
    type: AUTHENTICATE_USER_ACTION_TYPE
  };
}

const reducer = (state, action) => {
  switch (action.type) {
    case AUTHENTICATE_USER_ACTION_TYPE:
      return { ...state,
        isAuthenticated: true
      };

    case LOGOUT_USER_ACTION_TYPE:
      return { ...state,
        isAuthenticated: false
      };

    default:
      return state;
  }
};

async function handleLogin(authContext, ev) {
  const [, dispatch] = authContext;
  const auth = new DrupalOAuth();
  const formData = new FormData(event.target);
  const token = await auth.loginUser(formData, 'password');

  if (token && token.token) {
    dispatch(authenticateUserAction());
  } else {
    return false;
  }
}
async function submitLogin(authContext, formData) {
  const [, dispatch] = authContext;
  const auth = new DrupalOAuth();
  const token = await auth.loginUser(formData, 'authorization_code');

  if (token && token.token) {
    dispatch(authenticateUserAction());
  } else {
    return false;
  }
}
function handleLogout(authContext) {
  const [, dispatch] = authContext;
  const auth = new DrupalOAuth();
  const loggedOut = auth.logoutUser();

  if (loggedOut) {
    dispatch(logoutUserAction());
  }

  return loggedOut;
}
async function fetchAuthenticatedContent(dispatch, jsonapi_endpoint, method = 'GET', body = null, headers = null) {
  const auth = new DrupalOAuth();
  const content = await auth.drupalFetch(jsonapi_endpoint, method, body, headers);

  if (!content) {
    dispatch(logoutUserAction());
  }

  return content;
}
const AuthContextProvider = props => {
  const auth = new DrupalOAuth();
  const [authState, dispatch] = React.useReducer(reducer, { ...initialState,
    isAuthenticated: auth.isLoggedIn()
  });
  return /*#__PURE__*/React.createElement(AuthContext.Provider, {
    value: [{ ...authState
    }, dispatch]
  }, props.children);
};

const AuthContext$1 = AuthContext;
const AuthContextProvider$1 = AuthContextProvider;
const submitLogin$1 = submitLogin;
const handleLogin$1 = handleLogin;
const handleLogout$1 = handleLogout;
const fetchAuthenticatedContent$1 = fetchAuthenticatedContent;

export { AuthContext$1 as AuthContext, AuthContextProvider$1 as AuthContextProvider, fetchAuthenticatedContent$1 as fetchAuthenticatedContent, handleLogin$1 as handleLogin, handleLogout$1 as handleLogout, submitLogin$1 as submitLogin };
//# sourceMappingURL=index.modern.js.map
