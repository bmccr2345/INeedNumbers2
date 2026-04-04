import React, { useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, TrendingUp, AlertCircle, Trash2, Edit3, X } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { toast } from 'sonner';

/**
 * Active Deals Card Component
 * Shows deals that haven't closed yet with due diligence countdown
 * Now matches P&L Tracker table style with edit functionality
 */
const ActiveDealsCard = ({ onDealClick }) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadSources, setLeadSources] = useState([]);
  const [showEditDeal, setShowEditDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const { getToken } = useClerkAuth();
  const backendUrl = API_BASE_URL;

  useEffect(() => {
    fetchActiveDeals();
    fetchLeadSources();
  }, []);

  const fetchLeadSources = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${backendUrl}/api/pnl/lead-sources`, {
        withCredentials: true,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setLeadSources(response.data || []);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
      setLeadSources(['Sphere of Influence', 'Referral', 'Open House', 'Online Lead', 'Sign Call', 'Past Client', 'Other']);
    }
  };

  const fetchActiveDeals = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get(`${backendUrl}/api/pnl/active-deals`, {
        withCredentials: true,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      // Sort by closing date (soonest first)
      const sortedDeals = (response.data || []).sort((a, b) => 
        new Date(a.closing_date) - new Date(b.closing_date)
      );
      
      setDeals(sortedDeals);
    } catch (error) {
      console.error('Error fetching active deals:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDDDaysRemaining = (ddStart, ddOver) => {
    if (!ddStart || !ddOver || ddStart === "" || ddOver === "") {
      return { status: 'no-dates', days: null, text: 'No DD dates' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(ddStart);
    startDate.setHours(0, 0, 0, 0);
    
    const overDate = new Date(ddOver);
    overDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
      const daysUntilStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      return { status: 'upcoming', days: daysUntilStart, text: `Starts in ${daysUntilStart} ${daysUntilStart === 1 ? 'day' : 'days'}` };
    }

    if (today > overDate) {
      return { status: 'ended', days: 0, text: '0 days' };
    }

    const daysRemaining = Math.ceil((overDate - today) / (1000 * 60 * 60 * 24)) + 1;
    return { status: 'active', days: daysRemaining, text: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left` };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getDDStatusColor = (status, days) => {
    if (status === 'no-dates') return 'bg-gray-100 text-gray-600';
    if (status === 'ended') return 'bg-red-50 text-red-600';
    if (status === 'upcoming') return 'bg-blue-50 text-blue-600';
    if (days <= 3) return 'bg-orange-50 text-orange-600';
    return 'bg-green-50 text-green-600';
  };

  const handleEditDeal = (deal) => {
    setEditingDeal({
      id: deal.id,
      house_address: deal.house_address || '',
      amount_sold_for: deal.amount_sold_for?.toString() || '',
      commission_percent: deal.commission_percent?.toString() || '3',
      split_percent: deal.split_percent?.toString() || '100',
      team_brokerage_split_percent: deal.team_brokerage_split_percent?.toString() || '0',
      lead_source: deal.lead_source || '',
      contract_signed: deal.contract_signed || '',
      due_diligence_start: deal.due_diligence_start || '',
      due_diligence_over: deal.due_diligence_over || '',
      closing_date: deal.closing_date || ''
    });
    setShowEditDeal(true);
  };

  const handleUpdateDeal = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Authentication required. Please sign in again.');
        return;
      }

      const updateData = {
        house_address: editingDeal.house_address,
        amount_sold_for: parseFloat(editingDeal.amount_sold_for.replace(/,/g, '')) || 0,
        commission_percent: parseFloat(editingDeal.commission_percent) || 3,
        split_percent: parseFloat(editingDeal.split_percent) || 100,
        team_brokerage_split_percent: parseFloat(editingDeal.team_brokerage_split_percent) || 0,
        lead_source: editingDeal.lead_source,
        contract_signed: editingDeal.contract_signed,
        due_diligence_start: editingDeal.due_diligence_start,
        due_diligence_over: editingDeal.due_diligence_over,
        closing_date: editingDeal.closing_date
      };

      await axios.patch(`${backendUrl}/api/pnl/deals/${editingDeal.id}`, updateData, {
        withCredentials: true,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Deal updated successfully');
      setEditingDeal(null);
      setShowEditDeal(false);
      fetchActiveDeals();
    } catch (error) {
      console.error('Failed to update deal:', error);
      toast.error('Failed to update deal. Please try again.');
    }
  };

  const handleDeleteDeal = async (dealId, address) => {
    if (!window.confirm(`Are you sure you want to delete the deal for ${address}?`)) return;
    
    try {
      const token = await getToken();
      await axios.delete(`${backendUrl}/api/pnl/deals/${dealId}`, {
        withCredentials: true,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      toast.success('Deal deleted successfully');
      fetchActiveDeals();
    } catch (error) {
      console.error('Failed to delete deal:', error);
      toast.error('Failed to delete deal');
    }
  };

  // Format number with commas for display
  const formatAmountWithCommas = (value) => {
    if (!value) return '';
    const numericValue = value.toString().replace(/[^0-9]/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Handle amount change with formatting
  const handleAmountChange = (e) => {
    const formattedValue = formatAmountWithCommas(e.target.value);
    setEditingDeal({ ...editingDeal, amount_sold_for: formattedValue });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Active Deals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (deals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Active Deals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No active deals. Add a new deal to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Active Deals</span>
              <Badge variant="secondary">{deals.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2">Property Address</th>
                  <th className="pb-2">Contract Signed</th>
                  <th className="pb-2">DD Start</th>
                  <th className="pb-2">DD Over</th>
                  <th className="pb-2">DD Status</th>
                  <th className="pb-2">Closing Date</th>
                  <th className="pb-2">Final Income</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const ddInfo = calculateDDDaysRemaining(deal.due_diligence_start, deal.due_diligence_over);
                  return (
                    <tr 
                      key={deal.id} 
                      className="border-b hover:bg-blue-50 transition-colors"
                    >
                      <td className="py-3 text-sm font-medium">{deal.house_address}</td>
                      <td className="py-3 text-sm">{formatDate(deal.contract_signed)}</td>
                      <td className="py-3 text-sm">{formatDate(deal.due_diligence_start)}</td>
                      <td className="py-3 text-sm">{formatDate(deal.due_diligence_over)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md ${getDDStatusColor(ddInfo.status, ddInfo.days)}`}>
                          {ddInfo.text}
                        </span>
                      </td>
                      <td className="py-3 text-sm">{formatDate(deal.closing_date)}</td>
                      <td className="py-3 text-sm font-bold text-green-600">
                        {formatCurrency(deal.final_income)}
                      </td>
                      <td className="py-3">
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDeal(deal)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDeal(deal.id, deal.house_address)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {deals.map((deal) => {
              const ddInfo = calculateDDDaysRemaining(deal.due_diligence_start, deal.due_diligence_over);
              
              return (
                <div
                  key={deal.id}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <h4 className="font-semibold text-gray-900 truncate text-sm">
                        {deal.house_address}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>Closing: {formatDate(deal.closing_date)}</span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDeal(deal)}
                        className="text-blue-600 hover:text-blue-700 p-1 h-7 w-7"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDeal(deal.id, deal.house_address)}
                        className="text-red-600 hover:text-red-700 p-1 h-7 w-7"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">DD:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${getDDStatusColor(ddInfo.status, ddInfo.days)}`}>
                        {ddInfo.text}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(deal.final_income)}
                    </span>
                  </div>

                  {ddInfo.status === 'active' && ddInfo.days <= 3 && (
                    <div className="flex items-center space-x-1 text-xs text-orange-700 mt-2">
                      <AlertCircle className="w-3 h-3" />
                      <span>Due diligence ending soon!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Deal Modal */}
      <Dialog open={showEditDeal} onOpenChange={setShowEditDeal}>
        <DialogContent className="sm:max-w-lg bg-white border-gray-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateDeal} className="space-y-4">
            <div>
              <Label htmlFor="edit-address">Property Address *</Label>
              <Input
                id="edit-address"
                value={editingDeal?.house_address || ''}
                onChange={(e) => setEditingDeal({ ...editingDeal, house_address: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount Sold For *</Label>
                <Input
                  id="edit-amount"
                  type="text"
                  placeholder="500,000"
                  value={editingDeal?.amount_sold_for || ''}
                  onChange={handleAmountChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-commission">Commission %</Label>
                <Select 
                  value={editingDeal?.commission_percent || '3'} 
                  onValueChange={(value) => setEditingDeal({ ...editingDeal, commission_percent: value })}
                >
                  <SelectTrigger id="edit-commission">
                    <SelectValue placeholder="Select %" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map(pct => (
                      <SelectItem key={pct} value={pct.toString()}>{pct}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-split">Agent's Share %</Label>
                <Input
                  id="edit-split"
                  type="number"
                  min="0"
                  max="100"
                  value={editingDeal?.split_percent || '100'}
                  onChange={(e) => setEditingDeal({ ...editingDeal, split_percent: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-team-split">Team/Brokerage Split %</Label>
                <Input
                  id="edit-team-split"
                  type="number"
                  min="0"
                  max="100"
                  value={editingDeal?.team_brokerage_split_percent || '0'}
                  onChange={(e) => setEditingDeal({ ...editingDeal, team_brokerage_split_percent: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-lead-source">Lead Source *</Label>
              <Select 
                value={editingDeal?.lead_source || ''} 
                onValueChange={(value) => setEditingDeal({ ...editingDeal, lead_source: value })}
              >
                <SelectTrigger id="edit-lead-source">
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-contract-signed">Contract Signed</Label>
                <Input
                  id="edit-contract-signed"
                  type="date"
                  value={editingDeal?.contract_signed || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal, contract_signed: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-closing-date">Closing Date *</Label>
                <Input
                  id="edit-closing-date"
                  type="date"
                  value={editingDeal?.closing_date || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal, closing_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-dd-start">Due Diligence Start</Label>
                <Input
                  id="edit-dd-start"
                  type="date"
                  value={editingDeal?.due_diligence_start || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal, due_diligence_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-dd-over">Due Diligence Over</Label>
                <Input
                  id="edit-dd-over"
                  type="date"
                  value={editingDeal?.due_diligence_over || ''}
                  onChange={(e) => setEditingDeal({ ...editingDeal, due_diligence_over: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDeal(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveDealsCard;
