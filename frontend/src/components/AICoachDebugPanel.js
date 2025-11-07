import React, { useState } from 'react';
import { Bug, Play, Copy, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const AICoachDebugPanel = () => {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [debugLog, setDebugLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const addLog = (step, status, message, data = null) => {
    const timestamp = new Date().toISOString();
    setDebugLog(prev => [...prev, { timestamp, step, status, message, data }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDebugLog([]);
    setTestResults(null);
    
    const results = {
      clerkLoaded: false,
      signedIn: false,
      tokenObtained: false,
      tokenLength: 0,
      apiCallSuccess: false,
      totalTime: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      // STEP 1: Check Clerk Loading
      addLog('Clerk Status', 'info', 'Checking Clerk SDK loading state...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isLoaded) {
        addLog('Clerk Status', 'error', 'Clerk SDK is NOT loaded', { isLoaded, isSignedIn });
        results.errors.push('Clerk SDK not loaded');
      } else {
        addLog('Clerk Status', 'success', 'Clerk SDK is loaded', { isLoaded, isSignedIn, userId });
        results.clerkLoaded = true;
      }

      // STEP 2: Check Sign-in Status
      addLog('Auth Status', 'info', 'Checking sign-in status...');
      if (!isSignedIn) {
        addLog('Auth Status', 'error', 'User is NOT signed in', { isSignedIn });
        results.errors.push('User not signed in');
        setTestResults(results);
        setIsRunning(false);
        return;
      } else {
        addLog('Auth Status', 'success', 'User is signed in', { userId });
        results.signedIn = true;
      }

      // STEP 3: Get Token (with retry)
      addLog('Token Fetch', 'info', 'Attempting to get Clerk token (max 3 attempts)...');
      let token = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!token && attempts < maxAttempts) {
        attempts++;
        addLog('Token Fetch', 'info', `Attempt ${attempts}/${maxAttempts}...`);
        
        try {
          const attemptStart = Date.now();
          token = await getToken();
          const attemptTime = Date.now() - attemptStart;
          
          if (token) {
            const tokenPreview = `${token.substring(0, 20)}...${token.substring(token.length - 20)}`;
            addLog('Token Fetch', 'success', `Token obtained in ${attemptTime}ms`, {
              tokenLength: token.length,
              tokenPreview,
              attempt: attempts
            });
            results.tokenObtained = true;
            results.tokenLength = token.length;
          } else {
            addLog('Token Fetch', 'warning', `Attempt ${attempts}: getToken() returned null`);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (err) {
          addLog('Token Fetch', 'error', `Attempt ${attempts} failed: ${err.message}`, { error: err.toString() });
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!token) {
        addLog('Token Fetch', 'error', 'Failed to obtain token after all attempts');
        results.errors.push('Token fetch failed after 3 attempts');
        setTestResults(results);
        setIsRunning(false);
        return;
      }

      // STEP 4: Test API Call
      addLog('API Call', 'info', 'Making test API call to AI Coach endpoint...');
      const apiStartTime = Date.now();
      
      const requestConfig = {
        method: 'POST',
        url: `${process.env.REACT_APP_BACKEND_URL}/api/ai-coach-v2/generate`,
        headers: {
          'Authorization': `Bearer ${token.substring(0, 50)}...`,
          'Content-Type': 'application/json'
        },
        data: {
          context: 'debug_test',
          stream: false
        }
      };

      addLog('API Call', 'info', 'Request details', {
        url: requestConfig.url,
        method: requestConfig.method,
        headers: { ...requestConfig.headers, Authorization: 'Bearer [REDACTED]' },
        body: requestConfig.data
      });

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/ai-coach-v2/generate`,
          { context: 'debug_test', stream: false },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            withCredentials: true,
            timeout: 30000
          }
        );

        const apiTime = Date.now() - apiStartTime;
        addLog('API Call', 'success', `API call succeeded in ${apiTime}ms`, {
          status: response.status,
          statusText: response.statusText,
          responseData: response.data
        });
        results.apiCallSuccess = true;
      } catch (apiError) {
        const apiTime = Date.now() - apiStartTime;
        
        if (apiError.response) {
          addLog('API Call', 'error', `API returned ${apiError.response.status} in ${apiTime}ms`, {
            status: apiError.response.status,
            statusText: apiError.response.statusText,
            responseData: apiError.response.data,
            headers: apiError.response.headers
          });
          results.errors.push(`API error: ${apiError.response.status} - ${apiError.response.data?.detail || 'Unknown error'}`);
        } else if (apiError.code === 'ECONNABORTED') {
          addLog('API Call', 'error', 'API call timed out', { timeout: '30000ms' });
          results.errors.push('API timeout after 30 seconds');
        } else {
          addLog('API Call', 'error', `Network error: ${apiError.message}`, { error: apiError.toString() });
          results.errors.push(`Network error: ${apiError.message}`);
        }
      }

    } catch (error) {
      addLog('Fatal Error', 'error', `Unexpected error: ${error.message}`, { error: error.toString() });
      results.errors.push(`Fatal error: ${error.message}`);
    } finally {
      results.totalTime = Date.now() - startTime;
      setTestResults(results);
      setIsRunning(false);
      addLog('Complete', 'info', `Diagnostics completed in ${results.totalTime}ms`, results);
    }
  };

  const copyToClipboard = () => {
    const text = JSON.stringify({
      testResults,
      debugLog,
      environment: {
        backendUrl: process.env.REACT_APP_BACKEND_URL,
        nodeEnv: process.env.NODE_ENV,
        userAgent: navigator.userAgent
      }
    }, null, 2);
    
    navigator.clipboard.writeText(text);
    alert('Debug data copied to clipboard!');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <Card className="border-2 border-orange-300 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg">AI Coach Debug Tool</CardTitle>
          </div>
          <div className="flex gap-2">
            {debugLog.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="h-8"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Debug Data
              </Button>
            )}
            <Button
              size="sm"
              onClick={runDiagnostics}
              disabled={isRunning}
              className="h-8 bg-orange-600 hover:bg-orange-700"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Test Results Summary */}
        {testResults && (
          <div className="mb-4 p-4 bg-white rounded-lg border">
            <h4 className="font-semibold mb-2">Test Results Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {testResults.clerkLoaded ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span>Clerk Loaded: {testResults.clerkLoaded ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.signedIn ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span>Signed In: {testResults.signedIn ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.tokenObtained ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span>Token: {testResults.tokenObtained ? `${testResults.tokenLength} chars` : 'FAILED'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.apiCallSuccess ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span>API Call: {testResults.apiCallSuccess ? 'SUCCESS' : 'FAILED'}</span>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className="font-semibold">Total Time:</span> {testResults.totalTime}ms
            </div>
            {testResults.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="font-semibold text-sm text-red-800 mb-1">Errors Found:</div>
                {testResults.errors.map((error, idx) => (
                  <div key={idx} className="text-sm text-red-700">• {error}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Debug Log */}
        {debugLog.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-sm mb-2">Detailed Log:</h4>
            {debugLog.map((log, idx) => (
              <div key={idx} className="bg-white p-3 rounded border text-sm">
                <div className="flex items-start gap-2">
                  {getStatusIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{log.step}</span>
                      <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-gray-700">{log.message}</div>
                    {log.data && (
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {debugLog.length === 0 && !isRunning && (
          <div className="text-center py-8 text-gray-500">
            <Bug className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Click "Run Diagnostics" to test AI Coach functionality</p>
            <p className="text-sm mt-1">This will help identify exactly what's failing</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICoachDebugPanel;