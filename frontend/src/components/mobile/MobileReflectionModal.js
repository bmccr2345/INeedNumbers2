import React, { useState } from 'react';
import { X, Save, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

/**
 * Mobile Reflection Modal Component
 * Quick popup for logging daily reflections
 */
const MobileReflectionModal = ({ isOpen, onClose }) => {
  const [reflection, setReflection] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!reflection.trim()) {
      alert('Please enter a reflection to log.');
      return;
    }

    try {
      setIsSaving(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      // Send the ReflectionLogEntry structure expected by the backend
      const response = await fetch(`${backendUrl}/api/reflection-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          reflection: reflection.trim(),
          mood: null
        })
      });

      if (response.ok) {
        // Reset form
        setReflection('');
        alert('Reflection logged successfully!');
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Reflection log error response:', errorData);
        throw new Error(errorData.detail || 'Failed to log reflection');
      }
    } catch (error) {
      console.error('Error logging reflection:', error);
      alert(`Error logging reflection: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-2xl shadow-xl animate-slide-up" style={{ marginBottom: '64px' }}>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Log a Reflection</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Reflection Input */}
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="reflection" className="text-sm font-medium text-gray-700">
                What did I do today that directly led to income?
              </Label>
              <Textarea
                id="reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Reflect on today's income-generating activities, insights, and lessons learned..."
                rows={6}
                className="mt-1 text-base"
              />
              <p className="text-xs text-gray-500 mt-2">
                Share your thoughts, wins, challenges, and what you learned today
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !reflection.trim()}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileReflectionModal;
