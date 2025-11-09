import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ExternalLink, Trash2, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency, formatDate } from '../../services/mockDashboardAPI';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const CommissionPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState([]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/api/commission/history?limit=10`);
      setHistory(response.data.items || []);
    } catch (error) {
      console.error('Failed to load commission history:', error);
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Removed form handling functions since we now redirect to full calculator

  const handleDelete = async (id) => {
    if (!confirm('Delete this commission split?')) return;
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      await axios.delete(`${backendUrl}/api/commission/${id}`);
      setHistory(prev => prev.filter(item => item.id !== id));
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md z-50';
      toast.textContent = 'Commission split deleted.';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    }
  };

  // Tooltips removed since form is no longer on this page

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Commission Split Calculator
          </h1>
          <p className="text-gray-600 mt-1">
            See your true take-home at a glance.
          </p>
        </div>

        {/* Go to Full Calculator Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="py-12 text-center">
            <DollarSign className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to Calculate Commission Splits?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Use our comprehensive calculator to break down gross commissions, calculate brokerage splits, 
              handle referral fees, team splits, and various deductions to see your true take-home amount.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/tools/commission-split')}
              className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800 px-8 py-3"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Go to Full Calculator
            </Button>
          </CardContent>
        </Card>

        {/* Results section removed - calculations now done on full calculator page */}

        {/* Recent Splits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Splits</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tools/commission-split')}
              >
                See All Splits
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No splits yet. Use the full calculator to get started.
                </p>
                <Button onClick={() => navigate('/tools/commission-split')}>Go to Calculator</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Take-Home</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {history.map((split) => (
                        <tr key={split.id} className="border-t">
                          <td className="py-2 text-sm">{formatDate(split.date)}</td>
                          <td className="py-2 text-sm">{formatCurrency(split.gross * 100)}</td>
                          <td className="py-2 text-sm font-medium text-primary">
                            {formatCurrency(split.takeHome * 100)}
                          </td>
                          <td className="py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => navigate(`/tools/commission-split?calc=${split.id}`)}
                                className="text-primary hover:text-secondary text-sm"
                                title="Open split"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(split.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="Delete split"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {history.map((split) => (
                    <Card key={split.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{formatCurrency(split.gross * 100)}</div>
                          <div className="text-sm text-gray-500">{formatDate(split.date)}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-semibold text-primary">
                          {formatCurrency(split.takeHome * 100)} take-home
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tools/commission-split?calc=${split.id}`)}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(split.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommissionPanel;