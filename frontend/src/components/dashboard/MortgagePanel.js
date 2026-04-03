import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ExternalLink, Trash2, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { mockDashboardAPI, formatCurrency, formatDate } from '../../services/mockDashboardAPI';

const MortgagePanel = () => {
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
      const response = await mockDashboardAPI.mortgage.history({ limit: 3 });
      setHistory(response.items);
    } catch (error) {
      console.error('Failed to load mortgage history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Removed calculation functions since we now only direct to full calculator

  const handleDelete = async (id) => {
    if (!confirm('Delete this calculation?')) return;
    
    try {
      await mockDashboardAPI.mortgage.delete(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md z-50';
      toast.textContent = 'Calculation deleted.';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    }
  };

  // Removed tooltips since calculation form is no longer needed

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Mortgage & Affordability Calculator
          </h1>
          <p className="text-gray-600 mt-1">
            Show clients what they can afford in seconds.
          </p>
        </div>

        {/* Go to Full Calculator Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="py-12 text-center">
            <Calculator className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to Calculate Mortgage & Affordability?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Use our comprehensive calculator to help your clients determine what they can afford, 
              compare loan options, and understand their monthly payments with detailed breakdowns.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/tools/affordability')}
              className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800 px-8 py-3"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Go to Full Calculator
            </Button>
          </CardContent>
        </Card>

        {/* Results section removed since calculations are done in full calculator */}

        {/* Recent Calculations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Calculations</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tools/affordability')}
              >
                See All Calculations
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
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No calculations yet. Use the full calculator to get started.
                </p>
                <Button onClick={() => navigate('/tools/affordability')}>Go to Calculator</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Loan</th>
                        <th className="pb-2">Payment</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {history.map((calc) => (
                        <tr key={calc.id} className="border-t">
                          <td className="py-2 text-sm">{formatDate(calc.date)}</td>
                          <td className="py-2 text-sm">{formatCurrency(calc.loanAmount * 100)}</td>
                          <td className="py-2 text-sm font-medium">{formatCurrency(calc.payment * 100)}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              calc.saved 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {calc.saved ? 'Saved' : 'Not Saved'}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => navigate(`/tools/affordability?calc=${calc.id}`)}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                                title="Edit calculation"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(calc.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="Delete calculation"
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
                  {history.map((calc) => (
                    <Card key={calc.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{formatCurrency(calc.loanAmount * 100)}</div>
                          <div className="text-sm text-gray-500">{formatDate(calc.date)}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          calc.saved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {calc.saved ? 'Saved' : 'Not Saved'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-semibold text-primary">
                          {formatCurrency(calc.payment * 100)}/mo
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tools/affordability?calc=${calc.id}`)}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(calc.id)}
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

export default MortgagePanel;