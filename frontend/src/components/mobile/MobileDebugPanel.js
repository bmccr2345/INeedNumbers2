import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

/**
 * Mobile Debug Panel - Shows authentication and API connection status
 * Helps diagnose production issues
 */
const MobileDebugPanel = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = API_BASE_URL;

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results = {};

    // Test 1: Check backend URL
    results.backendUrl = backendUrl;
    results.currentUrl = window.location.href;
    results.origin = window.location.origin;

    // Test 2: Check cookies
    results.cookies = document.cookie || 'No cookies found';
    results.hasAccessToken = document.cookie.includes('access_token');

    // Test 3: Test authentication endpoint
    try {
      const authTest = await axios.get(`${backendUrl}/api/users/me`, {
        withCredentials: true,
        timeout: 5000
      });
      results.authTest = { success: true, status: authTest.status, data: authTest.data };
    } catch (error) {
      results.authTest = { 
        success: false, 
        status: error.response?.status,
        message: error.message,
        detail: error.response?.data?.detail
      };
    }

    // Test 4: Test P&L endpoint
    try {
      const pnlTest = await axios.get(`${backendUrl}/api/pnl/summary?month=2025-10`, {
        withCredentials: true,
        timeout: 5000
      });
      results.pnlTest = { success: true, status: pnlTest.status };
    } catch (error) {
      results.pnlTest = { 
        success: false, 
        status: error.response?.status,
        message: error.message 
      };
    }

    // Test 5: Check local storage
    results.localStorage = {
      accessToken: localStorage.getItem('access_token') ? 'Present' : 'Missing',
      user: localStorage.getItem('user') ? 'Present' : 'Missing'
    };

    // Test 6: User agent
    results.userAgent = navigator.userAgent;
    results.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    setTestResults(results);
    setIsLoading(false);
  };

  useEffect(() => {
    setDebugInfo({
      backendUrl,
      user: user ? { id: user.id, email: user.email, plan: user.plan } : null,
      timestamp: new Date().toISOString()
    });
  }, [user, backendUrl]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[100] bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-75 overflow-auto">
      <div className="min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold">Mobile Debug Panel</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Run Diagnostics Button */}
          <button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="w-full mb-4 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Running Tests...' : 'Run Diagnostics'}</span>
          </button>

          {/* Basic Info */}
          <div className="space-y-3 text-xs font-mono">
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-bold mb-2 text-sm">Configuration:</div>
              <div><span className="text-gray-600">Backend URL:</span> {debugInfo.backendUrl}</div>
              <div><span className="text-gray-600">User:</span> {debugInfo.user?.email || 'Not logged in'}</div>
              <div><span className="text-gray-600">Plan:</span> {debugInfo.user?.plan || 'N/A'}</div>
            </div>

            {/* Test Results */}
            {Object.keys(testResults).length > 0 && (
              <>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-bold mb-2 text-sm">Environment:</div>
                  <div><span className="text-gray-600">Current URL:</span> {testResults.currentUrl}</div>
                  <div><span className="text-gray-600">Origin:</span> {testResults.origin}</div>
                  <div><span className="text-gray-600">Backend URL:</span> {testResults.backendUrl}</div>
                  <div><span className="text-gray-600">Is Mobile:</span> {testResults.isMobile ? 'Yes' : 'No'}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-bold mb-2 text-sm">Authentication Status:</div>
                  <div className={testResults.authTest?.success ? 'text-green-600' : 'text-red-600'}>
                    Auth Test: {testResults.authTest?.success ? '✓ PASSED' : '✗ FAILED'}
                  </div>
                  {!testResults.authTest?.success && (
                    <>
                      <div className="text-red-600">Status: {testResults.authTest?.status}</div>
                      <div className="text-red-600">Message: {testResults.authTest?.message}</div>
                      <div className="text-red-600 break-words">Detail: {JSON.stringify(testResults.authTest?.detail)}</div>
                    </>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-bold mb-2 text-sm">P&L API Status:</div>
                  <div className={testResults.pnlTest?.success ? 'text-green-600' : 'text-red-600'}>
                    P&L Test: {testResults.pnlTest?.success ? '✓ PASSED' : '✗ FAILED'}
                  </div>
                  {!testResults.pnlTest?.success && (
                    <>
                      <div className="text-red-600">Status: {testResults.pnlTest?.status}</div>
                      <div className="text-red-600">Message: {testResults.pnlTest?.message}</div>
                    </>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-bold mb-2 text-sm">Cookies & Storage:</div>
                  <div><span className="text-gray-600">Has Access Token:</span> {testResults.hasAccessToken ? 'Yes ✓' : 'No ✗'}</div>
                  <div className="break-all"><span className="text-gray-600">Cookies:</span> {testResults.cookies}</div>
                  <div><span className="text-gray-600">LocalStorage Token:</span> {testResults.localStorage?.accessToken}</div>
                  <div><span className="text-gray-600">LocalStorage User:</span> {testResults.localStorage?.user}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-bold mb-2 text-sm">User Agent:</div>
                  <div className="break-words">{testResults.userAgent}</div>
                </div>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="font-bold mb-1">How to use:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Run Diagnostics" to test all API connections</li>
              <li>Look for ✗ FAILED messages</li>
              <li>Take a screenshot of this panel</li>
              <li>Share with support to diagnose the issue</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDebugPanel;
