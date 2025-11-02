import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export const Auth0ProviderWithNavigate = ({ children }) => {
  const navigate = useNavigate();

  const domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
  const redirectUri = process.env.REACT_APP_AUTH0_REDIRECT_URI || window.location.origin;

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  if (!domain || !clientId) {
    console.error('Auth0 configuration is missing');
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Authentication Configuration Error</h2>
        <p>Auth0 is not properly configured. Please check your environment variables.</p>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: "openid profile email"
      }}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};
