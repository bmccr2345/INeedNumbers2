import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ExternalLink, Trash2, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency, formatDate } from '../../services/mockDashboardAPI';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

const SellerNetPanel = () => {
  const navigate = useNavigate();
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState([]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const backendUrl = API_BASE_URL;
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${backendUrl}/api/seller-net/history?limit=10`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        withCredentials: true
      });
      setHistory(response.data.items || []);
    } catch (error) {
      console.error('Failed to load net sheet history:', error);
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this net sheet estimate?')) return;
    
    try {
      const backendUrl = API_BASE_URL;
      const token = localStorage.getItem('auth_token');
      await axios.delete(`${backendUrl}/api/seller-net/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        withCredentials: true
      });
      setHistory(prev => prev.filter(item => item.id !== id));
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md z-50';
      toast.textContent = 'Net sheet estimate deleted.';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Seller Net Sheet Estimator
          </h1>
          <p className="text-gray-600 mt-1">
            Give sellers instant clarity on net proceeds.
          </p>
        </div>

        {/* Go to Full Estimator Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="py-12 text-center">
            <Calculator className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to Calculate Seller Net Proceeds?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Use our comprehensive net sheet calculator to accurately estimate seller proceeds including 
              sale price, agent commissions, closing costs, mortgage payoff, and all other deductions.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/tools/net-sheet')}
              className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800 px-8 py-3"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Go to Full Estimator
            </Button>
          </CardContent>
        </Card>

        {/* Results Card removed - calculations now done in full estimator */}

        {/* Recent Estimates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Estimates</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tools/net-sheet')}
              >
                See All Estimates
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
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No estimates yet. Use the full estimator to get started.
                </p>
                <Button onClick={() => navigate('/tools/net-sheet')}>Go to Estimator</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Sale Price</th>
                        <th className="pb-2">Net</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {history.map((estimate) => (
                        <tr key={estimate.id} className="border-t">
                          <td className="py-2 text-sm">{formatDate(estimate.date)}</td>
                          <td className="py-2 text-sm">{formatCurrency(estimate.price * 100)}</td>
                          <td className="py-2 text-sm font-medium text-primary">
                            {formatCurrency(estimate.net * 100)}
                          </td>
                          <td className="py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => navigate(`/tools/net-sheet?calc=${estimate.id}`)}
                                className="text-primary hover:text-secondary text-sm"
                                title="Open estimate"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(estimate.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="Delete estimate"
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
                  {history.map((estimate) => (
                    <Card key={estimate.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{formatCurrency(estimate.price * 100)}</div>
                          <div className="text-sm text-gray-500">{formatDate(estimate.date)}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-semibold text-primary">
                          {formatCurrency(estimate.net * 100)} net
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tools/net-sheet?calc=${estimate.id}`)}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(estimate.id)}
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

export default SellerNetPanel;