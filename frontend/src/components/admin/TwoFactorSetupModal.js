import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, Smartphone, Key, Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { safeLocalStorage } from '../../utils/safeStorage';
import API_BASE_URL from '../../config/api';

const TwoFactorSetupModal = ({ isOpen, onClose, isRequired = false }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify, 3: Success
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && step === 1) {
      generateTwoFactorSecret();
    }
  }, [isOpen, step]);

  const generateTwoFactorSecret = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate 2FA secret');
      }

      const data = await response.json();
      setSecretKey(data.secret);
      setQrCode(data.qr_code);
      
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      setError('Failed to generate 2FA secret. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecretKey = async () => {
    try {
      await navigator.clipboard.writeText(secretKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy secret key');
    }
  };

  const verifyTwoFactor = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          code: verificationCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed');
      }

      // Store backup codes
      if (data.backup_codes) {
        setBackupCodes(data.backup_codes);
      }

      // Move to success step
      setStep(3);
      
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    // Mark that admin 2FA has been setup
    safeLocalStorage.setItem('admin_2fa_setup', 'true');
    
    if (isRequired) {
      // If 2FA was required, refresh the page to update auth context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      onClose();
      resetModal();
    }
  };

  const resetModal = () => {
    setStep(1);
    setQrCode('');
    setSecretKey('');
    setVerificationCode('');
    setBackupCodes([]);
    setError('');
    setCopied(false);
  };

  const handleClose = () => {
    if (!isRequired && !isLoading) {
      onClose();
      resetModal();
    }
  };

  const downloadBackupCodes = () => {
    const content = [
      'I Need Numbers - 2FA Backup Codes',
      '=====================================',
      '',
      'Save these backup codes in a secure location.',
      'Each code can only be used once.',
      '',
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
      '',
      `Generated: ${new Date().toLocaleString()}`
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `2fa-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>
              {isRequired ? 'Required: Setup 2FA' : 'Two-Factor Authentication'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Setup */}
        {step === 1 && (
          <div className="space-y-4">
            {isRequired && (
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="w-4 h-4" />
                <AlertDescription className="text-blue-800">
                  Two-factor authentication is required for admin accounts to enhance security.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Step 1: Scan QR Code</h3>
                <p className="text-sm text-gray-600">
                  Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                </p>
              </div>

              {isLoading ? (
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                  {qrCode ? (
                    <img src={qrCode} alt="2FA QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-500 text-sm">QR Code</div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Or manually enter this secret key:
                </p>
                <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded border">
                  <code className="flex-1 text-sm font-mono text-gray-900 break-all">
                    {secretKey}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copySecretKey}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              {!isRequired && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={isLoading || !secretKey}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verify */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Smartphone className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="font-medium text-gray-900">Step 2: Verify Setup</h3>
              <p className="text-sm text-gray-600">
                Enter the 6-digit code from your authenticator app:
              </p>
            </div>

            <form onSubmit={verifyTwoFactor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  maxLength="6"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="text-center text-2xl tracking-widest"
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={verificationCode.length !== 6 || isLoading}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <div>
                <h3 className="font-medium text-gray-900 mb-2">2FA Enabled Successfully!</h3>
                <p className="text-sm text-gray-600">
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <Key className="w-4 h-4" />
              <AlertDescription className="text-yellow-800">
                <strong>Important:</strong> Save these backup codes in a secure location. 
                You can use them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Backup Codes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadBackupCodes}
                  className="text-xs"
                >
                  Download
                </Button>
              </div>
              <div className="bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="text-gray-700">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleComplete}
              className="w-full bg-green-600 text-white hover:bg-green-700"
            >
              Complete Setup
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetupModal;