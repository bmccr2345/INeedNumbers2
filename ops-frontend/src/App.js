import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import AdminCommandCenter from './pages/AdminCommandCenter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main dashboard route */}
        <Route 
          path="/" 
          element={
            <>
              <SignedIn>
                <AdminCommandCenter />
              </SignedIn>
              <SignedOut>
                <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                  <SignIn 
                    appearance={{
                      elements: {
                        rootBox: 'mx-auto',
                        card: 'bg-gray-900 border border-gray-800'
                      }
                    }}
                  />
                </div>
              </SignedOut>
            </>
          } 
        />
        
        {/* Redirect any other routes to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
