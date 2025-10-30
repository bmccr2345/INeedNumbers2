import React, { useState, useEffect } from 'react';
import { Bug, Copy, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const BugTracker = ({ context = 'General' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      collectDebugInfo();
    }
  }, [isOpen]);

  const collectDebugInfo = async () => {
    const info = {
      timestamp: new Date().toISOString(),
      context: context,
      
      // Environment
      environment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },

      // React Environment Variables
      envVars: {
        REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
        REACT_APP_ASSETS_URL: process.env.REACT_APP_ASSETS_URL,
        NODE_ENV: process.env.NODE_ENV,
      },

      // Current URL
      url: {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
      },

      // Cookies (SAFE - only show if they exist, not values)
      cookies: {
        hasCookies: document.cookie.length > 0,
        cookieCount: document.cookie.split(';').filter(c => c.trim()).length,
        cookieNames: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean),
        // Try to detect access_token cookie (HttpOnly so won't show value)
        hasAccessToken: document.cookie.includes('access_token'),
      },

      // LocalStorage (check for auth tokens)
      localStorage: {
        hasAccessToken: !!localStorage.getItem('access_token'),
        hasRefreshToken: !!localStorage.getItem('refresh_token'),
        hasUser: !!localStorage.getItem('user'),
        keys: Object.keys(localStorage),
      },

      // Recent Console Errors (if any were captured)
      consoleErrors: window.__debugErrors || [],

      // Network Status
      network: {
        effectiveType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink,
        rtt: navigator.connection?.rtt,
      },

      // Screen Info
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
      },

      // Viewport
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },

      // Performance
      performance: {
        memory: performance.memory ? {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
          jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB',
        } : 'Not available',
      }
    };

    // Try to fetch current auth status
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/auth/me`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      info.authCheck = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          'content-type': response.headers.get('content-type'),
          'set-cookie': response.headers.get('set-cookie') ? 'Present' : 'Not present',
        }
      };

      if (response.ok) {
        const data = await response.json();
        info.authCheck.authenticated = true;
        info.authCheck.userPlan = data.plan;
        info.authCheck.userEmail = data.email;
      } else {
        info.authCheck.authenticated = false;
        info.authCheck.error = await response.text();
      }
    } catch (error) {
      info.authCheck = {
        error: error.message,
        type: error.name,
      };
    }

    setDebugInfo(info);
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
          size="lg"
        >
          <Bug className="w-5 h-5 mr-2" />
          Debug Info
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Bug className="w-5 h-5 mr-2 text-red-600" />
              Debug Information - {context}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">
                📋 Copy this information and send it to support
              </h3>
              <p className="text-sm text-yellow-700">
                This debug info will help diagnose authentication and connection issues.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                className="flex-1"
                variant={copied ? "default" : "outline"}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Debug Info
                  </>
                )}
              </Button>
              <Button
                onClick={collectDebugInfo}
                variant="outline"
              >
                Refresh
              </Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

            {/* Quick Status Summary */}
            {debugInfo.authCheck && (
              <div className="space-y-2">
                <h3 className="font-semibold">Quick Status:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white border rounded p-2">
                    <strong>Auth Status:</strong> 
                    <span className={debugInfo.authCheck.authenticated ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.authCheck.authenticated ? ' ✓ Authenticated' : ' ✗ Not Authenticated'}
                    </span>
                  </div>
                  <div className="bg-white border rounded p-2">
                    <strong>Cookies Enabled:</strong> 
                    <span className={debugInfo.environment.cookiesEnabled ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.environment.cookiesEnabled ? ' ✓ Yes' : ' ✗ No'}
                    </span>
                  </div>
                  <div className="bg-white border rounded p-2">
                    <strong>Has Cookies:</strong> 
                    <span className={debugInfo.cookies.hasCookies ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.cookies.hasCookies ? ` ✓ Yes (${debugInfo.cookies.cookieCount})` : ' ✗ None'}
                    </span>
                  </div>
                  <div className="bg-white border rounded p-2">
                    <strong>Backend URL:</strong> 
                    <span className="text-blue-600 text-xs">
                      {debugInfo.envVars.REACT_APP_BACKEND_URL || 'NOT SET'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Capture console errors globally
if (typeof window !== 'undefined') {
  window.__debugErrors = [];
  const originalError = console.error;
  console.error = (...args) => {
    window.__debugErrors.push({
      timestamp: new Date().toISOString(),
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
    });
    // Keep only last 10 errors
    if (window.__debugErrors.length > 10) {
      window.__debugErrors.shift();
    }
    originalError.apply(console, args);
  };
}

export default BugTracker;
