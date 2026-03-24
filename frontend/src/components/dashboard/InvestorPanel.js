import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Download, Edit, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { mockDashboardAPI, formatDate } from '../../services/mockDashboardAPI';
import { isNativeApp, downloadFile } from '../../utils/platform';
import API_BASE_URL from '../../config/api';

const InvestorPanel = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [investors, setInvestors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    try {
      setIsLoading(true);
      const response = await mockDashboardAPI.investor.list();
      // Transform backend data to expected format
      const transformedItems = (response.items || []).map(deal => ({
        id: deal.id,
        property: deal.title || deal.inputs?.addressLine || 'Untitled Deal',
        lastUpdated: deal.created_at,
        status: 'Ready',
        inputs: deal.inputs,
        results: deal.results
      }));
      setInvestors(transformedItems);
    } catch (error) {
      console.error('Failed to load investor deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this investor deal?')) return;
    
    try {
      await mockDashboardAPI.investor.delete(id);
      setInvestors(prev => prev.filter(item => item.id !== id));
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md z-50';
      toast.textContent = 'Investor deal deleted.';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const handleDownloadPDF = async (investor) => {
    try {
      setDownloadingId(investor.id);
      
      // Get auth token
      const token = localStorage.getItem('auth_token');
      
      // Call the PDF generation endpoint with the stored deal data
      const response = await fetch(`${API_BASE_URL}/api/reports/investor/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          property: {
            addressLine: investor.inputs?.addressLine || investor.property,
            purchasePrice: investor.inputs?.purchasePrice || 0,
            monthlyRent: investor.inputs?.monthlyRent || 0,
            downPaymentPercent: investor.inputs?.downPaymentPercent || 20,
            interestRate: investor.inputs?.interestRate || 7,
            loanTermYears: investor.inputs?.loanTermYears || 30,
            vacancyRate: investor.inputs?.vacancyRate || 5,
            propertyType: investor.inputs?.propertyType || 'Single Family'
          },
          expenses: {
            propertyTaxesMonthly: investor.inputs?.propertyTaxesMonthly || 0,
            insuranceMonthly: investor.inputs?.insuranceMonthly || 0,
            hoaMonthly: investor.inputs?.hoaMonthly || 0,
            propertyManagementMonthly: investor.inputs?.propertyManagementMonthly || 0,
            maintenanceReserveMonthly: investor.inputs?.maintenanceReserveMonthly || 0,
            utilitiesMonthly: investor.inputs?.utilitiesMonthly || 0,
            otherExpensesMonthly: investor.inputs?.otherExpensesMonthly || 0
          },
          metrics: investor.results || {}
        })
      });
      
      if (!response.ok) {
        throw new Error('PDF generation failed');
      }
      
      // Download the PDF using platform-aware method
      const blob = await response.blob();
      const filename = `investor-analysis-${investor.property.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      
      await downloadFile(blob, filename);
      
      // Show appropriate success message
      if (isNativeApp()) {
        toast.success('PDF ready! Choose where to save it.');
      } else {
        toast.success('PDF downloaded successfully!');
      }
      
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error('PDF download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEdit = (investor) => {
    // Navigate to calculator with deal data pre-loaded
    navigate('/calculator', { 
      state: { 
        editDeal: investor 
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Delete ${selectedItems.length} selected deals?`)) return;
    
    try {
      await mockDashboardAPI.investor.bulkDelete(selectedItems);
      setInvestors(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md z-50';
      toast.textContent = `${selectedItems.length} deals deleted.`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Bulk delete failed. Please try again.');
    }
  };

  const filteredInvestors = investors.filter(investor => {
    const matchesSearch = investor.property.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Investor Analysis
            </h1>
            <p className="text-gray-600 mt-1">
              Create polished investor analysis instantly.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Your saved investor deals appear here. Download, edit, or delete.
            </p>
          </div>
          
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <Button
              onClick={() => navigate('/calculator')}
              className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Full Investor Tool
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search properties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={loadInvestors}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : filteredInvestors.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-500 mb-4">
                  No investor analysis saved yet — create your first analysis in minutes.
                </p>
                <Button 
                  onClick={() => navigate('/calculator')}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-emerald-700 hover:to-emerald-800"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to Full Investor Tool
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Actions */}
                {selectedItems.length > 0 && (
                  <div className="flex items-center space-x-4 p-3 bg-gray-100 rounded-md">
                    <span className="text-sm text-gray-600">
                      {selectedItems.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>Delete Selected</span>
                    </Button>
                  </div>
                )}

                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500">
                        <th className="pb-2">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(filteredInvestors.map(item => item.id));
                              } else {
                                setSelectedItems([]);
                              }
                            }}
                            checked={selectedItems.length === filteredInvestors.length && filteredInvestors.length > 0}
                          />
                        </th>
                        <th className="pb-2">Property</th>
                        <th className="pb-2">Last Updated</th>
                        <th className="pb-2">Created</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvestors.map((investor) => (
                        <tr key={investor.id} className="border-t hover:bg-gray-50">
                          <td className="py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(investor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(prev => [...prev, investor.id]);
                                } else {
                                  setSelectedItems(prev => prev.filter(id => id !== investor.id));
                                }
                              }}
                            />
                          </td>
                          <td className="py-3 text-sm font-medium">{investor.property}</td>
                          <td className="py-3 text-sm text-gray-500">{formatDate(investor.lastUpdated)}</td>
                          <td className="py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDownloadPDF(investor)}
                                disabled={downloadingId === investor.id}
                                className="text-primary hover:text-secondary text-sm disabled:opacity-50"
                                title="Download PDF"
                              >
                                {downloadingId === investor.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEdit(investor)}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(investor.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                                title="Delete"
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
                  {filteredInvestors.map((investor) => (
                    <Card key={investor.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium">{investor.property}</h3>
                          <p className="text-sm text-gray-500">{formatDate(investor.lastUpdated)}</p>
                        </div>
                      </div>
                      <div className="flex justify-end items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleDownloadPDF(investor)}
                          disabled={downloadingId === investor.id}
                        >
                          {downloadingId === investor.id ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(investor)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(investor.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </Button>
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

export default InvestorPanel;