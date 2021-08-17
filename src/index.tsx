import * as AuthContextLib from "./auth-context";

export const AuthContext = AuthContextLib.AuthContext;
export const AuthContextProvider = AuthContextLib.AuthContextProvider;
export const submitLogin = AuthContextLib.submitLogin;
export const handleLogin = AuthContextLib.handleLogin;
export const handleLogout = AuthContextLib.handleLogout;
export const fetchAuthenticatedContent = AuthContextLib.fetchAuthenticatedContent;
