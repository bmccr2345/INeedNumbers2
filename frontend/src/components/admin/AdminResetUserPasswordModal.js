import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, Key, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

const AdminResetUserPasswordModal = ({ isOpen, onClose, user }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const backendUrl = API_BASE_URL;

  // Password strength requirements
  const passwordRequirements = [
    { id: 'length', text: 'At least 8 characters', met: newPassword.length >= 8 },
    { id: 'uppercase', text: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', text: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { id: 'number', text: 'One number', met: /\d/.test(newPassword) }
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('Password does not meet security requirements');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/users/${user.id}/reset-password`,
        { new_password: newPassword },
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error resetting password:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      resetForm();
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Password Reset Successfully
            </h3>
            <p className="text-gray-600">
              Password for <strong>{user?.email}</strong> has been reset successfully.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Please share the new password with the user securely.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-600" />
            <span>Reset User Password</span>
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Resetting password for: <strong>{user?.email}</strong>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password Requirements */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req) => (
                  <div key={req.id} className={`flex items-center text-xs ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                    {req.met ? (
                      <CheckCircle2 className="w-3 h-3 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-2" />
                    )}
                    {req.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {confirmPassword && (
              <div className={`flex items-center text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? (
                  <CheckCircle2 className="w-3 h-3 mr-2" />
                ) : (
                  <XCircle className="w-3 h-3 mr-2" />
                )}
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </div>
            )}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="w-4 h-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isPasswordValid || !passwordsMatch || isLoading}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Resetting...</span>
                </div>
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminResetUserPasswordModal;
