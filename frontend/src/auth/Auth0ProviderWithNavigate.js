import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export const Auth0ProviderWithNavigate = ({ children }) => {
  const navigate = useNavigate();

  const domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
  const redirectUri = process.env.REACT_APP_AUTH0_REDIRECT_URI || window.location.origin;

  // Debug logging
  console.log('[Auth0Provider] Configuration:', {
    domain: domain ? 'SET' : 'MISSING',
    clientId: clientId ? 'SET' : 'MISSING',
    audience: audience ? 'SET' : 'MISSING',
    redirectUri
  });

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  if (!domain || !clientId) {
    console.error('[Auth0Provider] Missing configuration:', { domain, clientId });
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '100px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Authentication Configuration Error</h2>
        <p style={{ color: '#374151', marginBottom: '24px' }}>
          Auth0 is not properly configured. Please check your environment variables.
        </p>
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: '4px',
          padding: '16px',
          textAlign: 'left',
          fontSize: '14px',
          fontFamily: 'monospace'
        }}>
          <p style={{ margin: '4px 0' }}>
            <strong>REACT_APP_AUTH0_DOMAIN:</strong> {domain || '❌ Not set'}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>REACT_APP_AUTH0_CLIENT_ID:</strong> {clientId || '❌ Not set'}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>REACT_APP_AUTH0_AUDIENCE:</strong> {audience || '❌ Not set'}
          </p>
        </div>
        <p style={{ marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          Environment variables should be defined in the <code>.env</code> file.
        </p>
      </div>
    );
  }

  console.log('[Auth0Provider] Initializing with domain:', domain);

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
