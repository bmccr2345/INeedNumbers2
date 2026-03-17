import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';

/**
 * Active Deals Card Component
 * Shows deals that haven't closed yet with due diligence countdown
 */
const ActiveDealsCard = ({ onDealClick }) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchActiveDeals();
  }, []);

  const fetchActiveDeals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/pnl/active-deals`, {
        withCredentials: true
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
    // If no due diligence dates, return null
    if (!ddStart || !ddOver || ddStart === "" || ddOver === "") {
      return {
        status: 'no-dates',
        days: null,
        text: 'No DD dates'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(ddStart);
    startDate.setHours(0, 0, 0, 0);
    
    const overDate = new Date(ddOver);
    overDate.setHours(0, 0, 0, 0);

    // If DD hasn't started yet
    if (today < startDate) {
      const daysUntilStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      return {
        status: 'upcoming',
        days: daysUntilStart,
        text: `Starts in ${daysUntilStart} ${daysUntilStart === 1 ? 'day' : 'days'}`
      };
    }

    // If DD is over
    if (today > overDate) {
      return {
        status: 'ended',
        days: 0,
        text: '0 days'
      };
    }

    // DD is active - count remaining days including today
    const daysRemaining = Math.ceil((overDate - today) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      status: 'active',
      days: daysRemaining,
      text: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDDStatusColor = (status, days) => {
    if (status === 'no-dates') return 'text-gray-600 bg-gray-100';
    if (status === 'ended') return 'text-red-600 bg-red-50';
    if (status === 'upcoming') return 'text-blue-600 bg-blue-50';
    if (days <= 3) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Active Deals</span>
          </div>
          <span className="text-sm font-normal text-gray-500">
            {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals.map((deal) => {
            const ddInfo = calculateDDDaysRemaining(deal.due_diligence_start, deal.due_diligence_over);
            
            return (
              <div
                key={deal.id}
                onClick={() => onDealClick?.(deal)}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">
                      {deal.house_address}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>Closing Date: {formatDate(deal.closing_date)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-600">Due Diligence:</span>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${getDDStatusColor(ddInfo.status, ddInfo.days)}`}>
                      {ddInfo.text}
                    </div>
                  </div>
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
  );
};

export default ActiveDealsCard;
