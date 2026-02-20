import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/**
 * Mobile Add Deal Modal Component
 * Quick popup for adding P&L deals
 */
const MobileAddDealModal = ({ isOpen, onClose, onSuccess }) => {
  const [leadSources, setLeadSources] = useState([]);
  const [formData, setFormData] = useState({
    house_address: '',
    amount_sold_for: '',
    commission_percent: '6',
    split_percent: '50',
    team_brokerage_split_percent: '0',
    lead_source: '',
    contract_signed: new Date().toISOString().slice(0, 10),
    due_diligence_start: new Date().toISOString().slice(0, 10),
    due_diligence_over: new Date().toISOString().slice(0, 10),
    closing_date: new Date().toISOString().slice(0, 10)
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeadSources();
    }
  }, [isOpen]);

  const fetchLeadSources = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/pnl/lead-sources`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setLeadSources(data);
      }
    } catch (error) {
      console.error('Error fetching lead sources:', error);
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
    if (!formData.house_address || !formData.amount_sold_for || !formData.lead_source || 
        !formData.contract_signed || !formData.due_diligence_start || !formData.due_diligence_over) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const currentMonth = new Date().toISOString().slice(0, 7);

      const response = await fetch(`${backendUrl}/api/pnl/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          month: currentMonth,
          amount_sold_for: parseFloat(formData.amount_sold_for),
          commission_percent: parseFloat(formData.commission_percent),
          split_percent: parseFloat(formData.split_percent),
          team_brokerage_split_percent: parseFloat(formData.team_brokerage_split_percent)
        })
      });

      if (response.ok) {
        // Reset form
        setFormData({
          house_address: '',
          amount_sold_for: '',
          commission_percent: '6',
          split_percent: '50',
          team_brokerage_split_percent: '0',
          lead_source: '',
          contract_signed: new Date().toISOString().slice(0, 10),
          due_diligence_start: new Date().toISOString().slice(0, 10),
          due_diligence_over: new Date().toISOString().slice(0, 10),
          closing_date: new Date().toISOString().slice(0, 10)
        });
        alert('Deal added successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add deal');
      }
    } catch (error) {
      console.error('Error adding deal:', error);
      alert(`Error adding deal: ${error.message}`);
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
              <DollarSign className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Add Deal</h2>
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
              <Label htmlFor="house_address" className="text-sm font-medium text-gray-700">
                Property Address *
              </Label>
              <Input
                id="house_address"
                value={formData.house_address}
                onChange={(e) => handleChange('house_address', e.target.value)}
                placeholder="123 Main St"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="amount_sold_for" className="text-sm font-medium text-gray-700">
                Sale Price *
              </Label>
              <Input
                id="amount_sold_for"
                type="number"
                inputMode="decimal"
                value={formData.amount_sold_for}
                onChange={(e) => handleChange('amount_sold_for', e.target.value)}
                placeholder="500000"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="commission_percent" className="text-sm font-medium text-gray-700">
                  Commission %
                </Label>
                <Input
                  id="commission_percent"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={formData.commission_percent}
                  onChange={(e) => handleChange('commission_percent', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="split_percent" className="text-sm font-medium text-gray-700">
                  Your Split %
                </Label>
                <Input
                  id="split_percent"
                  type="number"
                  step="1"
                  inputMode="decimal"
                  value={formData.split_percent}
                  onChange={(e) => handleChange('split_percent', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="team_brokerage_split_percent" className="text-sm font-medium text-gray-700">
                Team/Brokerage Split %
              </Label>
              <Input
                id="team_brokerage_split_percent"
                type="number"
                step="1"
                inputMode="decimal"
                value={formData.team_brokerage_split_percent}
                onChange={(e) => handleChange('team_brokerage_split_percent', e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lead_source" className="text-sm font-medium text-gray-700">
                Lead Source *
              </Label>
              <Select 
                value={formData.lead_source} 
                onValueChange={(value) => handleChange('lead_source', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contract_signed" className="text-sm font-medium text-gray-700">
                Contract Signed *
              </Label>
              <Input
                id="contract_signed"
                type="date"
                value={formData.contract_signed}
                onChange={(e) => handleChange('contract_signed', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="due_diligence_start" className="text-sm font-medium text-gray-700">
                Due Diligence Start *
              </Label>
              <Input
                id="due_diligence_start"
                type="date"
                value={formData.due_diligence_start}
                onChange={(e) => handleChange('due_diligence_start', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="due_diligence_over" className="text-sm font-medium text-gray-700">
                Due Diligence Over *
              </Label>
              <Input
                id="due_diligence_over"
                type="date"
                value={formData.due_diligence_over}
                onChange={(e) => handleChange('due_diligence_over', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="closing_date" className="text-sm font-medium text-gray-700">
                Closing Date
              </Label>
              <Input
                id="closing_date"
                type="date"
                value={formData.closing_date}
                onChange={(e) => handleChange('closing_date', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Sticky at bottom */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
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
              {isSaving ? 'Saving...' : 'Save Deal'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileAddDealModal;
