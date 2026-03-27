import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { X, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import API_BASE_URL from '../../config/api';

/**
 * Mobile Add Expense Modal Component
 * Full-featured popup for adding P&L expenses with recurring option
 * Matches the desktop Finances screen form exactly
 */
const MobileAddExpenseModal = ({ isOpen, onClose, onSuccess }) => {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    recurring: false,
    budget: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset form when modal opens
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: '',
        amount: '',
        recurring: false,
        budget: '',
        description: ''
      });
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const backendUrl = API_BASE_URL;
      const token = await getToken();
      
      const response = await fetch(`${backendUrl}/api/pnl/categories`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
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

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.category || !formData.amount) {
      alert('Please fill in all required fields (Date, Category, Amount)');
      return;
    }

    try {
      setIsSaving(true);
      const backendUrl = API_BASE_URL;

      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      // Build expense data matching the desktop format exactly
      const expenseData = {
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        budget: parseFloat(formData.budget) || 0,
        description: formData.description || '',
        recurring: formData.recurring
      };

      console.log('[MobileAddExpenseModal] Saving expense:', expenseData);

      const response = await fetch(`${backendUrl}/api/pnl/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(expenseData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[MobileAddExpenseModal] Expense saved successfully:', result);
        
        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: '',
          amount: '',
          recurring: false,
          budget: '',
          description: ''
        });
        
        alert('Expense added successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const error = await response.json();
        console.error('[MobileAddExpenseModal] Save failed:', error);
        throw new Error(error.detail || 'Failed to add expense');
      }
    } catch (error) {
      console.error('[MobileAddExpenseModal] Error adding expense:', error);
      alert(`Error adding expense: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-5 space-y-4">
            {/* Date */}
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="mt-1 text-center text-base"
                required
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                Category *
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="mt-1 w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base bg-white"
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

            {/* Amount */}
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
                placeholder="100.00"
                className="mt-1 text-base"
                required
              />
            </div>

            {/* Recurring Expense Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring}
                onChange={(e) => handleChange('recurring', e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <Label htmlFor="recurring" className="font-medium text-blue-900 text-base cursor-pointer">
                  ✨ Make this expense recurring
                </Label>
                <p className="text-sm text-blue-700 mt-1">
                  This expense will automatically appear every month through December {new Date().getFullYear()}. 
                  You'll need to re-check this for expenses starting January 1st of next year.
                </p>
              </div>
            </div>

            {/* Budget (Optional) */}
            <div>
              <Label htmlFor="budget" className="text-sm font-medium text-gray-700">
                Budget (Optional)
              </Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={formData.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                placeholder="0"
                className="mt-1 text-base"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description (Optional)
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description..."
                className="mt-1 text-base"
              />
            </div>

            {/* Extra spacer for iOS safe area */}
            <div className="h-4" aria-hidden="true" />
          </div>

          {/* Action Buttons - Sticky at bottom */}
          <div className="flex-shrink-0 p-5 pt-4 border-t border-gray-100 bg-white sticky bottom-0">
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 text-base"
              >
                {isSaving ? 'Saving...' : 'Add Expense'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 py-3 text-base"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default MobileAddExpenseModal;
