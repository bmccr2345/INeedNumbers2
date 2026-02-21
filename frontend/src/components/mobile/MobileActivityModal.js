import React, { useState } from 'react';
import { X, Save, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * Mobile Activity Modal Component
 * Quick popup for logging daily activities
 */
const MobileActivityModal = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState({
    conversations: '',
    appointments: '',
    offersWritten: '',
    listingsTaken: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const formatActivityName = (activity) => {
    return activity.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const handleActivityChange = (field, value) => {
    // Allow empty string or numbers only
    if (value === '' || /^\d+$/.test(value)) {
      setActivities(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Convert empty strings to 0 for submission
      const activityData = {
        conversations: activities.conversations === '' ? 0 : parseInt(activities.conversations),
        appointments: activities.appointments === '' ? 0 : parseInt(activities.appointments),
        offersWritten: activities.offersWritten === '' ? 0 : parseInt(activities.offersWritten),
        listingsTaken: activities.listingsTaken === '' ? 0 : parseInt(activities.listingsTaken)
      };

      // Send the full ActivityLogEntry structure expected by the backend
      const response = await fetch(`${backendUrl}/api/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          activities: activityData,
          hours: {},
          reflection: null
        })
      });

      if (response.ok) {
        // Reset form
        setActivities({
          conversations: '',
          appointments: '',
          offersWritten: '',
          listingsTaken: ''
        });
        alert('Activities logged successfully!');
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Activity log error response:', errorData);
        throw new Error(errorData.detail || 'Failed to log activities');
      }
    } catch (error) {
      console.error('Error logging activities:', error);
      alert(`Error logging activities: ${error.message || 'Please try again.'}`);
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
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Log Activity</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Activity Inputs */}
          <div className="space-y-4 mb-6">
            {Object.keys(activities).map(activity => (
              <div key={activity}>
                <Label htmlFor={activity} className="text-sm font-medium text-gray-700">
                  {formatActivityName(activity)}
                </Label>
                <Input
                  id={activity}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={activities[activity]}
                  onChange={(e) => handleActivityChange(activity, e.target.value)}
                  placeholder="0"
                  className="mt-1 text-lg"
                />
              </div>
            ))}
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
              disabled={isSaving}
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

export default MobileActivityModal;
