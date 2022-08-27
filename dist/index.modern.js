import React from 'react';
import docCookies from 'mozilla-doc-cookies';

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

// A type of promise-like that resolves synchronously and supports only one observer

const _iteratorSymbol = /*#__PURE__*/ typeof Symbol !== "undefined" ? (Symbol.iterator || (Symbol.iterator = Symbol("Symbol.iterator"))) : "@@iterator";

const _asyncIteratorSymbol = /*#__PURE__*/ typeof Symbol !== "undefined" ? (Symbol.asyncIterator || (Symbol.asyncIterator = Symbol("Symbol.asyncIterator"))) : "@@asyncIterator";

// Asynchronously call a function and send errors to recovery continuation
function _catch(body, recover) {
	try {
		var result = body();
	} catch(e) {
		return recover(e);
	}
	if (result && result.then) {
		return result.then(void 0, recover);
	}
	return result;
}

function checkIfDuplicateModification(body) {
  return body.hasOwnProperty('errors') && body.errors.length === 1 && body.errors[0].status === "422" && body.errors[0].hasOwnProperty('detail') && body.errors[0].detail === "Entity is not valid: The content has either been modified by another user, or you have already submitted modifications. As a result, your changes cannot be saved.";
}

function getPath(defaultEndpoint, endpointEnvVar) {
  var endpoint = defaultEndpoint;

  if (process.env[endpointEnvVar]) {
    endpoint = process.env[endpointEnvVar];
  }

  return endpoint.replace(/\/$/, "").replace(/^\//, "");
}

var DrupalOAuth = /*#__PURE__*/function () {
  function DrupalOAuth(args) {
    if (args.baseUrl) {
      this.baseUrl = args.baseUrl;
    }

    if (args.clientId) {
      this.clientId = args.clientId;
    }

    this.token = typeof window !== "undefined" && docCookies.hasItem('refresh_token') && docCookies.hasItem('access_token') ? {
      refresh_token: docCookies.getItem('refresh_token'),
      access_token: docCookies.getItem('access_token')
    } : false;
    this.isLoggedIn = this.isLoggedIn.bind(this);
  }

  var _proto = DrupalOAuth.prototype;

  _proto.getBaseUrl = function getBaseUrl() {
    if (!process.env.REACT_APP_ENTITYSYNC_BASE_URL && !this.baseUrl) {
      throw new Error("Missing base url for Entity Sync. Please set the REACT_APP_ENTITYSYNC_BASE_URL environment variable or pass in `baseUrl` to the DrupalOAuth object as the base url of your backend, like 'https://www.my-backend.com'");
    }

    if (this.baseUrl) {
      return this.baseUrl;
    }

    return process.env.REACT_APP_ENTITYSYNC_BASE_URL.replace(/\/$/, "");
  };

  _proto.getClientId = function getClientId() {
    if (!process.env.REACT_APP_ENTITYSYNC_CLIENT_ID && !this.clientId) {
      throw new Error("Missing client ID for Entity Sync. Please set the REACT_APP_ENTITYSYNC_CLIENT_ID environment variable or pass in `clientId` to the DrupalOAuth object as the OAuth client_id of your app.");
    }

    if (this.clientId) {
      return this.clientId;
    }

    return process.env.REACT_APP_ENTITYSYNC_CLIENT_ID;
  };

  _proto.verifyResponse = function verifyResponse(resp) {
    try {
      var _exit2 = false;

      var _temp2 = function () {
        if (/2../.test(resp.status.toString())) {
          if (resp.status === 204) {
            _exit2 = true;
            return true;
          }

          _exit2 = true;
          return Promise.resolve(resp.json());
        }
      }();

      return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function (_result) {
        return _exit2 ? _result : false;
      }) : _exit2 ? _temp2 : false);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.drupalFetch = function drupalFetch(jsonapiEndpoint, method, body, headers) {
    if (method === void 0) {
      method = 'GET';
    }

    if (body === void 0) {
      body = null;
    }

    if (headers === void 0) {
      headers = null;
    }

    try {
      var _this2 = this;

      if (body && !(body instanceof File)) {
        body = JSON.stringify(body);
      }

      var base = _this2.getBaseUrl();

      var jsonapiBase = getPath('jsonapi', 'REACT_APP_ENTITYSYNC_JSONAPI_BASE');
      var url = base + "/" + jsonapiBase + "/" + jsonapiEndpoint;
      var init = {
        method: method,
        headers: {
          'Authorization': "Bearer " + _this2.token.access_token,
          'Content-Type': 'application/vnd.api+json'
        }
      };
      Object.assign(init.headers, headers);

      if (body) {
        init.body = body;
      }

      return Promise.resolve(fetch(url, init)).then(function (resp) {
        return Promise.resolve(_this2.verifyResponse(resp)).then(function (validResponse) {
          var _exit3 = false;

          var _temp3 = function () {
            if (validResponse) {
              _exit3 = true;
              return validResponse;
            } else return function () {
              if (resp.status === 403) {
                _exit3 = true;
                return null;
              } else return function () {
                if (resp.status === 401) {
                  return Promise.resolve(_this2.refresh()).then(function (newToken) {
                    return function () {
                      if (newToken) {
                        init.headers = {
                          'Authorization': "Bearer " + newToken.access_token,
                          'Content-Type': 'application/vnd.api+json'
                        };
                        Object.assign(init.headers, headers);
                        return Promise.resolve(fetch(url, init)).then(function (secondResp) {
                          return Promise.resolve(_this2.verifyResponse(secondResp)).then(function (validResponse) {
                            if (validResponse) {
                              _exit3 = true;
                              return validResponse;
                            }
                          });
                        });
                      }
                    }();
                  });
                } else return function () {
                  if (resp.status === 422) {
                    return Promise.resolve(resp.json()).then(function (body) {
                      if (checkIfDuplicateModification(body)) {
                        _exit3 = true;
                        return body;
                      }
                    });
                  }
                }();
              }();
            }();
          }();

          return _temp3 && _temp3.then ? _temp3.then(function (_result6) {
            return _exit3 ? _result6 : false;
          }) : _exit3 ? _temp3 : false;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.refresh = function refresh() {
    try {
      var _exit5 = false;

      var _this4 = this;

      var refreshToken = false;

      if (typeof window !== "undefined") {
        refreshToken = docCookies.getItem('refresh_token');
      }

      var _temp5 = function () {
        if (typeof refreshToken !== "undefined" && refreshToken) {
          _exit5 = true;
          return Promise.resolve(_this4.authPost('refresh_token', refreshToken));
        }
      }();

      return Promise.resolve(_temp5 && _temp5.then ? _temp5.then(function (_result7) {
        return _exit5 ? _result7 : false;
      }) : _exit5 ? _temp5 : false);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.isLoggedIn = function isLoggedIn() {
    return this.token ? true : false;
  };

  _proto.authPost = function authPost(grantType, authValue, form) {
    if (authValue === void 0) {
      authValue = null;
    }

    if (form === void 0) {
      form = null;
    }

    try {
      var _this6 = this;

      var _temp8 = function _temp8() {
        if (resp && resp.status === 200) {
          return Promise.resolve(resp.json()).then(function (_resp$json2) {
            _this6.token = _resp$json2;

            if (typeof window !== "undefined") {
              docCookies.setItem('refresh_token', _this6.token.refresh_token, Infinity, '/; SameSite=None; Secure');
              docCookies.setItem('access_token', _this6.token.access_token, Infinity, '/; SameSite=None; Secure');
            }

            return _this6.token;
          });
        } else {
          _this6.removeTokens();

          return false;
        }
      };

      var base = _this6.getBaseUrl();

      var url = base + '/oauth/token';
      var formData = form ? form : new FormData();

      if (authValue) {
        formData.append(grantType, authValue);
      }

      formData.append('grant_type', grantType);
      formData.append('client_id', _this6.getClientId());
      var init = {
        method: 'POST',
        body: formData
      };
      var resp;

      var _temp9 = _catch(function () {
        return Promise.resolve(fetch(url, init)).then(function (_fetch) {
          resp = _fetch;
        });
      }, function (e) {
        console.log(e);
      });

      return Promise.resolve(_temp9 && _temp9.then ? _temp9.then(_temp8) : _temp8(_temp9));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.loginUser = function loginUser(formData, grantType) {
    try {
      var _this8 = this;

      return Promise.resolve(_this8.authPost(grantType, null, formData)).then(function (initialLoginResponse) {
        return {
          token: initialLoginResponse
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.logoutUser = function logoutUser() {
    try {
      var _this10 = this;

      if (typeof window !== "undefined") {
        _this10.removeTokens();

        localStorage.clear();
        _this10.token = false;
        return Promise.resolve(!docCookies.hasItem('refresh_token'));
      } else {
        return Promise.resolve(true);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.removeTokens = function removeTokens() {
    if (typeof window !== "undefined") {
      docCookies.removeItem('refresh_token', '/');
      docCookies.removeItem('access_token', '/');
    }
  };

  return DrupalOAuth;
}();

var fetchAuthenticatedContent = function fetchAuthenticatedContent(authContext, jsonapi_endpoint, method, body, headers) {
  if (method === void 0) {
    method = 'GET';
  }

  if (body === void 0) {
    body = null;
  }

  if (headers === void 0) {
    headers = null;
  }

  try {
    var state, dispatch;

    if (Array.isArray(authContext)) {
      state = authContext[0];
      dispatch = authContext[1];
    } else {
      state = {};
      dispatch = authContext;
    }

    var auth = new DrupalOAuth(state);
    return Promise.resolve(auth.drupalFetch(jsonapi_endpoint, method, body, headers)).then(function (content) {
      if (content === false) {
        dispatch(logoutUserAction());
      } else if (content === null) {
        console.warn('fobidden request was made');
      }

      return content;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var submitLogin = function submitLogin(authContext, formData) {
  try {
    var state = authContext[0],
        dispatch = authContext[1];
    var auth = new DrupalOAuth(state);
    return Promise.resolve(auth.loginUser(formData, 'authorization_code')).then(function (token) {
      if (token && token.token) {
        dispatch(authenticateUserAction());
      } else {
        return false;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var handleLogin = function handleLogin(authContext, ev) {
  try {
    var state = authContext[0],
        dispatch = authContext[1];
    var auth = new DrupalOAuth(state);
    var formData = new FormData(event.target);
    return Promise.resolve(auth.loginUser(formData, 'password')).then(function (token) {
      if (token && token.token) {
        dispatch(authenticateUserAction());
      } else {
        return false;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var initialState = {};
var AuthContext = React.createContext(initialState);
var LOGOUT_USER_ACTION_TYPE = "LOGOUT_USER";

function logoutUserAction() {
  return {
    type: LOGOUT_USER_ACTION_TYPE
  };
}

var AUTHENTICATE_USER_ACTION_TYPE = "AUTHENTICATE_USER";

function authenticateUserAction() {
  return {
    type: AUTHENTICATE_USER_ACTION_TYPE
  };
}

var reducer = function reducer(state, action) {
  switch (action.type) {
    case AUTHENTICATE_USER_ACTION_TYPE:
      return _extends({}, state, {
        isAuthenticated: true
      });

    case LOGOUT_USER_ACTION_TYPE:
      return _extends({}, state, {
        isAuthenticated: false
      });

    default:
      return state;
  }
};

function handleLogout(authContext) {
  var state = authContext[0],
      dispatch = authContext[1];
  var auth = new DrupalOAuth(state);
  var loggedOut = auth.logoutUser();

  if (loggedOut) {
    dispatch(logoutUserAction());
  }

  return loggedOut;
}
var AuthContextProvider = function AuthContextProvider(props) {
  var auth = new DrupalOAuth(props);

  var state = _extends({}, initialState, {
    isAuthenticated: auth.isLoggedIn()
  });

  if (props.clientId) {
    state.clientId = props.clientId;
  }

  if (props.baseUrl) {
    state.baseUrl = props.baseUrl;
  }

  var _React$useReducer = React.useReducer(reducer, state),
      authState = _React$useReducer[0],
      dispatch = _React$useReducer[1];

  return /*#__PURE__*/React.createElement(AuthContext.Provider, {
    value: [_extends({}, authState), dispatch]
  }, props.children);
};

var AuthContext$1 = AuthContext;
var AuthContextProvider$1 = AuthContextProvider;
var submitLogin$1 = submitLogin;
var handleLogin$1 = handleLogin;
var handleLogout$1 = handleLogout;
var fetchAuthenticatedContent$1 = fetchAuthenticatedContent;

export { AuthContext$1 as AuthContext, AuthContextProvider$1 as AuthContextProvider, fetchAuthenticatedContent$1 as fetchAuthenticatedContent, handleLogin$1 as handleLogin, handleLogout$1 as handleLogout, submitLogin$1 as submitLogin };
//# sourceMappingURL=index.modern.js.map
