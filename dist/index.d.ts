/// <reference types="react" />
import * as AuthContextLib from "./auth-context";
export declare const AuthContext: import("react").Context<[AuthContextLib.AuthState, import("react").Dispatch<AuthContextLib.AuthAction>]>;
export declare const AuthContextProvider: import("react").FunctionComponent<{}>;
export declare const submitLogin: typeof AuthContextLib.submitLogin;
export declare const handleLogin: typeof AuthContextLib.handleLogin;
export declare const handleLogout: typeof AuthContextLib.handleLogout;
export declare const fetchAuthenticatedContent: typeof AuthContextLib.fetchAuthenticatedContent;
