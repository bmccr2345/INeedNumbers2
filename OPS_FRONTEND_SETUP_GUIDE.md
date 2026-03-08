# OPS FRONTEND SETUP GUIDE
# For Emergent AI: Follow these instructions exactly

## WHAT THIS APP IS
This is the Admin Command Center for I Need Numbers - a simple React dashboard that displays system metrics. It connects to the main backend at https://ineednumbers.com

## STEP 1: CLEAR DEFAULT FRONTEND
```bash
rm -rf /app/frontend/src/*
rm -rf /app/frontend/public/*
```

## STEP 2: CREATE THE FILES

### File: /app/frontend/.env
```
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuaW5lZWRudW1iZXJzLmNvbSQ
REACT_APP_BACKEND_URL=https://ineednumbers.com
```

### File: /app/frontend/package.json
```json
{
  "name": "ops-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@clerk/clerk-react": "^5.20.2",
    "lucide-react": "^0.468.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
```

### File: /app/frontend/public/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>Ops | I Need Numbers</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              gray: {
                950: '#0a0a0a',
                900: '#171717',
                800: '#262626'
              }
            }
          }
        }
      }
    </script>
  </head>
  <body class="dark">
    <div id="root"></div>
  </body>
</html>
```

### File: /app/frontend/src/index.js
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ClerkProvider publishableKey={CLERK_KEY}>
    <App />
  </ClerkProvider>
);
```

### File: /app/frontend/src/index.css
```css
body {
  margin: 0;
  background-color: #0a0a0a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### File: /app/frontend/src/App.js
```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <>
            <SignedIn><Dashboard /></SignedIn>
            <SignedOut>
              <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <SignIn />
              </div>
            </SignedOut>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### File: /app/frontend/src/pages/Dashboard.js
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 403) {
        setError('Access denied: Admin privileges required');
        return;
      }
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-red-500 rounded-lg p-8 text-center">
          <h2 className="text-xl text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading Command Center...</p>
      </div>
    );
  }

  const { user_metrics, subscription_metrics, ai_metrics, system_metrics } = metrics || {};

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-light mb-8">
        <span className="text-green-400">Command</span> Center
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card title="Total Users" value={user_metrics?.total_users || 0} />
        <Card title="Active Subs" value={subscription_metrics?.active_subscriptions || 0} />
        <Card title="MRR" value={`$${subscription_metrics?.mrr || 0}`} />
        <Card title="AI Cost (Month)" value={`$${ai_metrics?.ai_cost_month?.toFixed(2) || '0.00'}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card title="AI Tokens (Month)" value={ai_metrics?.ai_tokens_month?.toLocaleString() || 0} />
        <Card title="AI Requests" value={ai_metrics?.ai_requests_month || 0} />
        <Card title="Avg Tokens/Req" value={ai_metrics?.avg_tokens_per_request || 0} />
        <Card title="Active Users (30d)" value={user_metrics?.active_users_30d || 0} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-gray-400 text-sm mb-4">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="API Error Rate" value={`${system_metrics?.api_error_rate || 0}%`} />
          <Stat label="Rate Limit Hits" value={system_metrics?.rate_limit_hits_24h || 0} />
          <Stat label="Storage Used" value={`${system_metrics?.mongo_storage_percent || 0}%`} />
          <Stat label="API Requests (24h)" value={system_metrics?.total_api_requests_24h || 0} />
        </div>
      </div>

      <p className="text-center text-gray-600 text-xs mt-8">
        Last updated: {metrics?.aggregated_at ? new Date(metrics.aggregated_at).toLocaleString() : 'Never'}
      </p>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-xs uppercase">{title}</p>
      <p className="text-2xl font-light text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-800 rounded p-3">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}
```

## STEP 3: INSTALL AND BUILD
```bash
cd /app/frontend
yarn install
yarn build
```

## STEP 4: RESTART FRONTEND
```bash
sudo supervisorctl restart frontend
```

## EXPECTED RESULT
- Dark themed dashboard at root URL
- Clerk sign-in if not authenticated
- Shows metrics cards for Users, Subscriptions, MRR, AI usage
- Fetches data from https://ineednumbers.com/api/admin/metrics
