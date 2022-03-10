import React, { useContext, useEffect} from 'react'

import { AuthContextProvider, fetchAuthenticatedContent, AuthContext, handleLogin, handleLogout } from 'understory-auth';
// import 'min-entitysync/dist/index.css'

const clientId = '5707da32-0c7c-42f1-9256-d4eeb9082c41';
const baseUrl = 'http://localhost:8080';

function Login(){
  const authContext = useContext(AuthContext);
  const [{isAuthenticated}, dispatch] = authContext;
  useEffect(() => {
    if(isAuthenticated){
      fetchAuthenticatedContent(dispatch, "/").then((isMe) => {
        const uid = isMe.meta.links.me.meta.id;
        fetchAuthenticatedContent(dispatch, 'user/user/' + uid + '?include=roles').then((res) => console.log(res));
      });
    }
  });
  if(!isAuthenticated) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        handleLogin(authContext, e);
      }}>
        <label for="username">Username</label>
        <input name="username" type="text"/>
        <label for="password">Password</label>
        <input name="password" type="password"/>
        <button type="submit">Login</button>
      </form>
    );
  }
  else{
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        handleLogout(authContext, e)
      }}>
        <div>You are logged in! Hooray!</div>
        <button type="submit">Logout</button>
      </form>
    );
  }
}

function App() {
  return (
    <AuthContextProvider clientId={clientId} baseUrl={baseUrl}>
      <Login/>
    </AuthContextProvider>
  );
}

export default App;
