import React, { useState, useEffect } from 'react';
import { X, Save, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

/**
 * Mobile Add Expense Modal Component
 * Quick popup for adding P&L expenses
 */
const MobileAddExpenseModal = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10)
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/pnl/categories`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        // Fallback categories
        setCategories(['Marketing', 'Technology', 'Office', 'Travel', 'Education', 'Insurance', 'Dues & Subscriptions', 'Other']);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback categories
      setCategories(['Marketing', 'Technology', 'Office', 'Travel', 'Education', 'Insurance', 'Dues & Subscriptions', 'Other']);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.description || !formData.amount || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const currentMonth = new Date().toISOString().slice(0, 7);

      const response = await fetch(`${backendUrl}/api/pnl/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          month: currentMonth,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        // Reset form
        setFormData({
          description: '',
          amount: '',
          category: '',
          date: new Date().toISOString().slice(0, 10)
        });
        alert('Expense added successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert(`Error adding expense: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl animate-slide-up flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Add Expense</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                Category *
              </Label>
              {/* Using native select for better mobile compatibility */}
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="mt-1 w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What was this expense for?"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Sticky at bottom */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-white">
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
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Expense'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileAddExpenseModal;
