import React, { useState } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const ReflectionModal = ({ isOpen, onClose, onReflectionSaved }) => {
  const [reflection, setReflection] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleSubmit = async () => {
    if (!reflection.trim()) {
      alert('Please enter a reflection before saving.');
      return;
    }

    try {
      setIsLogging(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reflection-log`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflection: reflection.trim()
        })
      });

      if (response.ok) {
        setReflection('');
        onClose();
        if (onReflectionSaved) {
          onReflectionSaved();
        }
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        successDiv.textContent = '✅ Reflection saved successfully!';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          successDiv.remove();
        }, 3000);
      } else {
        throw new Error('Failed to save reflection');
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      alert('Error saving reflection. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleClose = () => {
    setReflection('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Log a Reflection</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Reflection
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Share your thoughts, insights, and lessons learned from today
            </p>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="How did today go? What went well? What could be improved? Any insights or lessons learned?"
              rows={6}
              className="w-full resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={isLogging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLogging || !reflection.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLogging ? 'Saving...' : 'Save Reflection'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReflectionModal;