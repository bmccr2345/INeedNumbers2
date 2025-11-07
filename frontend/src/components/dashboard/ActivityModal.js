import React, { useState } from 'react';
import { X, Save, Activity } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

const ActivityModal = ({ isOpen, onClose, onActivitySaved }) => {
  const { getToken, isLoaded } = useAuth();
  const [currentEntry, setCurrentEntry] = useState({
    activities: {},
    hours: {},
    reflection: ''
  });
  const [isLogging, setIsLogging] = useState(false);

  const activityCategories = [
    'Conversations',
    'Appointments',
    'Listings',
    'Showings',
    'Offers',
    'Contracts'
  ];

  const handleActivityChange = (category, value) => {
    const numValue = parseInt(value) || 0;
    setCurrentEntry(prev => ({
      ...prev,
      activities: {
        ...prev.activities,
        [category]: numValue
      }
    }));
  };

  const handleSubmit = async () => {
    // Filter out zero values from activities
    const nonZeroActivities = Object.entries(currentEntry.activities)
      .filter(([_, value]) => value > 0)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(nonZeroActivities).length === 0) {
      alert('Please enter at least one activity with a value greater than 0.');
      return;
    }

    // Filter out zero values from hours
    const nonZeroHours = Object.entries(currentEntry.hours)
      .filter(([_, value]) => value > 0)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    try {
      setIsLogging(true);
      console.log('[ActivityModal] Submitting:', {
        activities: nonZeroActivities,
        hours: nonZeroHours,
        reflection: currentEntry.reflection
      });

      // Wait for Clerk to be loaded
      if (!isLoaded) {
        throw new Error('Authentication is still loading. Please wait a moment and try again.');
      }

      // Get fresh Clerk token with retry logic
      let token = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!token && attempts < maxAttempts) {
        try {
          token = await getToken();
          if (!token) {
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`[ActivityModal] Token fetch attempt ${attempts} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            }
          }
        } catch (tokenError) {
          console.error('[ActivityModal] Token fetch error:', tokenError);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!token) {
        throw new Error('Unable to get authentication token. Please try logging out and back in.');
      }

      console.log('[ActivityModal] Token obtained, sending request...');

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/activity-log`,
        {
          activities: nonZeroActivities,
          hours: nonZeroHours,
          reflection: currentEntry.reflection || null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true,
          timeout: 10000 // 10 second timeout
        }
      );

      console.log('[ActivityModal] Success!');
      // Reset form
      setCurrentEntry({
        activities: {},
        hours: {},
        reflection: ''
      });
      onClose();
      if (onActivitySaved) {
        onActivitySaved();
      }
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      successDiv.textContent = '✅ Activities logged successfully!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    } catch (error) {
      console.error('[ActivityModal] Error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      console.error('[ActivityModal] Server error:', error.response?.status, error.response?.data);
      alert(`Error logging activity: ${errorMessage}`);
    } finally {
      setIsLogging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Log Daily Activities</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Activities */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Activities Completed</Label>
            <div className="grid grid-cols-2 gap-4">
              {activityCategories.map(category => (
                <div key={category}>
                  <Label htmlFor={category} className="text-sm mb-1">{category}</Label>
                  <Input
                    id={category}
                    type="number"
                    min="0"
                    value={currentEntry.activities[category] || ''}
                    onChange={(e) => handleActivityChange(category, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <Label htmlFor="reflection" className="text-base font-semibold mb-2 block">
              Daily Reflection (Optional)
            </Label>
            <Textarea
              id="reflection"
              value={currentEntry.reflection}
              onChange={(e) => setCurrentEntry(prev => ({ ...prev, reflection: e.target.value }))}
              placeholder="What went well today? What could be improved?"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isLogging}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLogging}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLogging ? 'Logging...' : 'Log Activities'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;