import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';

const ClerkDebugPage = () => {
  const { user, isLoaded } = useUser();
  const [backendResponse, setBackendResponse] = useState(null);
  const [error, setError] = useState(null);
  const [assignmentStatus, setAssignmentStatus] = useState('idle');
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const testAssignPlan = async (plan) => {
    if (!user) {
      alert('No user logged in!');
      return;
    }

    setAssignmentStatus('loading');
    setError(null);

    try {
      console.log('[DEBUG] Calling assign-plan with:', { clerk_user_id: user.id, plan });
      
      const response = await axios.post(
        `${backendUrl}/api/clerk/assign-plan`,
        {
          clerk_user_id: user.id,
          plan: plan
        },
        {
          withCredentials: true,
          timeout: 10000
        }
      );

      console.log('[DEBUG] Response:', response.data);
      setBackendResponse(response.data);
      setAssignmentStatus('success');
      
      // Wait a moment then reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('[DEBUG] Error:', err);
      setError(err.response?.data?.detail || err.message);
      setAssignmentStatus('error');
    }
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Please sign in first!</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Clerk Plan Assignment Debugger</h1>
        
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current User Info</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>Clerk User ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</div>
            <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
            <div className="pt-4">
              <strong>Public Metadata:</strong>
              <pre className="bg-gray-100 p-3 rounded mt-2 overflow-auto">
                {JSON.stringify(user.publicMetadata, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Plan Assignment Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Plan Assignment</h2>
          <div className="flex gap-4">
            <button
              onClick={() => testAssignPlan('free')}
              disabled={assignmentStatus === 'loading'}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              Assign FREE Plan
            </button>
            <button
              onClick={() => testAssignPlan('starter')}
              disabled={assignmentStatus === 'loading'}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Assign STARTER Plan
            </button>
            <button
              onClick={() => testAssignPlan('pro')}
              disabled={assignmentStatus === 'loading'}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              Assign PRO Plan
            </button>
          </div>
        </div>

        {/* Status */}
        {assignmentStatus === 'loading' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Assigning plan...</span>
            </div>
          </div>
        )}

        {assignmentStatus === 'success' && backendResponse && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-green-800 font-semibold mb-2">✅ Success!</div>
            <pre className="bg-white p-3 rounded text-sm overflow-auto">
              {JSON.stringify(backendResponse, null, 2)}
            </pre>
            <div className="mt-3 text-sm text-green-700">
              Page will reload in 2 seconds to show updated metadata...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 font-semibold mb-2">❌ Error</div>
            <pre className="bg-white p-3 rounded text-sm overflow-auto">
              {error}
            </pre>
          </div>
        )}

        {/* Backend URL */}
        <div className="bg-gray-100 rounded-lg p-4 text-sm">
          <strong>Backend URL:</strong> {backendUrl}
        </div>
      </div>
    </div>
  );
};

export default ClerkDebugPage;
