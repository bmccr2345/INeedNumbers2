import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  Zap, 
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  Shield,
  Server
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// =============================================================================
// KPI Card Component
// =============================================================================
const KPICard = ({ title, value, subtitle, icon: Icon, trend, alert, pulse }) => (
  <div 
    className={`relative bg-gray-900/80 border border-gray-800 rounded-lg p-5 
                hover:border-green-500/30 transition-all duration-300
                ${pulse ? 'animate-pulse-slow' : ''}
                ${alert ? 'border-red-500/50 shadow-red-500/20 shadow-lg' : ''}`}
    data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    {/* Subtle glow effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-lg pointer-events-none" />
    
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-2xl font-light ${alert ? 'text-red-400' : 'text-white'}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center mt-2 text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}% vs last period
          </div>
        )}
      </div>
      <div className={`p-2 rounded-lg ${alert ? 'bg-red-500/20' : 'bg-green-500/10'}`}>
        <Icon className={`w-5 h-5 ${alert ? 'text-red-400' : 'text-green-400'}`} />
      </div>
    </div>
  </div>
);

// =============================================================================
// Alert Card Component
// =============================================================================
const AlertCard = ({ alert }) => {
  const severityColors = {
    critical: 'border-red-500/50 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-400'
  };
  
  return (
    <div 
      className={`border rounded-lg p-4 ${severityColors[alert.severity] || severityColors.info}`}
      data-testid={`alert-${alert.type}`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <p className="font-medium text-sm">{alert.type.toUpperCase()}</p>
          <p className="text-xs opacity-80 mt-1">{alert.message}</p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Top Users Table
// =============================================================================
const TopUsersTable = ({ users }) => (
  <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-5">
    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Top AI Users (This Month)</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs uppercase">
            <th className="text-left pb-3">User</th>
            <th className="text-right pb-3">Tokens</th>
            <th className="text-right pb-3">Cost</th>
            <th className="text-right pb-3">Requests</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {users && users.length > 0 ? (
            users.map((user, i) => (
              <tr key={i} className="border-t border-gray-800">
                <td className="py-2 font-mono text-xs">{user.user_id}</td>
                <td className="py-2 text-right">{user.total_tokens?.toLocaleString()}</td>
                <td className="py-2 text-right text-green-400">${user.total_cost?.toFixed(4)}</td>
                <td className="py-2 text-right">{user.request_count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-500">No data yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// =============================================================================
// System Health Bar
// =============================================================================
const HealthBar = ({ label, value, max, unit }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const isDanger = percentage > 70;
  
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={isDanger ? 'text-red-400' : 'text-gray-300'}>
          {value}{unit} / {max}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${isDanger ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// =============================================================================
// Access Denied Component
// =============================================================================
const AccessDenied = ({ message }) => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
    <div className="bg-gray-900 border border-red-500/50 rounded-lg p-8 max-w-md text-center">
      <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-light text-white mb-2">Access Denied</h2>
      <p className="text-gray-400 text-sm">{message}</p>
      <p className="text-gray-500 text-xs mt-4">
        Contact your administrator if you believe this is an error.
      </p>
    </div>
  </div>
);

// =============================================================================
// Main Admin Command Center Component
// =============================================================================
export default function AdminCommandCenter() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Access denied: Admin privileges required');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
  };

  const triggerAggregation = async () => {
    try {
      setRefreshing(true);
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/admin/aggregate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh metrics after aggregation
        setTimeout(fetchMetrics, 1000);
      }
    } catch (err) {
      console.error('Aggregation error:', err);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchMetrics();
      
      // Auto-refresh every 5 minutes
      const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isLoaded, isSignedIn, fetchMetrics]);

  // Not signed in - should not reach here due to App.js routing
  if (isLoaded && !isSignedIn) {
    return <AccessDenied message="Please sign in to access the dashboard." />;
  }

  // Error state (including 403 from backend)
  if (error) {
    return <AccessDenied message={error} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Server className="w-12 h-12 text-green-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  const { user_metrics, subscription_metrics, ai_metrics, system_metrics, alerts } = metrics || {};

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" data-testid="admin-command-center">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-wide">
            <span className="text-green-400">Command</span> Center
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            System observability dashboard • Read-only
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            data-testid="refresh-button"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={triggerAggregation}
            disabled={refreshing}
            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors disabled:opacity-50"
            data-testid="aggregate-button"
          >
            Run Aggregation
          </button>
        </div>
      </div>

      {/* Pending state */}
      {metrics?.status === 'pending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <p className="text-yellow-400 text-sm">{metrics.message}</p>
        </div>
      )}

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard 
          title="Total Users" 
          value={user_metrics?.total_users?.toLocaleString() || '0'}
          subtitle={`+${user_metrics?.new_users_24h || 0} in 24h`}
          icon={Users}
          pulse
        />
        <KPICard 
          title="Active Subscriptions" 
          value={subscription_metrics?.active_subscriptions?.toLocaleString() || '0'}
          subtitle={`${subscription_metrics?.churn_this_month || 0} churned this month`}
          icon={CreditCard}
        />
        <KPICard 
          title="MRR" 
          value={`$${subscription_metrics?.mrr?.toLocaleString() || '0'}`}
          icon={DollarSign}
        />
        <KPICard 
          title="AI Cost (Month)" 
          value={`$${ai_metrics?.ai_cost_month?.toFixed(2) || '0.00'}`}
          subtitle={`$${ai_metrics?.ai_cost_today?.toFixed(4) || '0'} today`}
          icon={Zap}
          alert={ai_metrics?.ai_cost_month > 10}
        />
      </div>

      {/* Second Row: AI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard 
          title="AI Tokens (Month)" 
          value={ai_metrics?.ai_tokens_month?.toLocaleString() || '0'}
          subtitle={`${ai_metrics?.ai_tokens_today?.toLocaleString() || 0} today`}
          icon={Activity}
        />
        <KPICard 
          title="AI Requests (Month)" 
          value={ai_metrics?.ai_requests_month?.toLocaleString() || '0'}
          subtitle={`${ai_metrics?.ai_requests_today || 0} today`}
          icon={Server}
        />
        <KPICard 
          title="Avg Tokens/Request" 
          value={ai_metrics?.avg_tokens_per_request?.toLocaleString() || '0'}
          icon={TrendingUp}
        />
        <KPICard 
          title="Active Users (30d)" 
          value={user_metrics?.active_users_30d?.toLocaleString() || '0'}
          icon={Users}
        />
      </div>

      {/* Third Row: System Health & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* System Health */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">System Health</h3>
          
          <HealthBar 
            label="MongoDB Storage" 
            value={system_metrics?.mongo_storage_percent || 0}
            max={100}
            unit="%"
          />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">API Error Rate (24h)</p>
              <p className={`text-lg font-light ${(system_metrics?.api_error_rate || 0) > 2 ? 'text-red-400' : 'text-green-400'}`}>
                {system_metrics?.api_error_rate?.toFixed(2) || '0'}%
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Rate Limit Hits (24h)</p>
              <p className="text-lg font-light text-white">
                {system_metrics?.rate_limit_hits_24h || 0}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Failed Payments</p>
              <p className={`text-lg font-light ${(subscription_metrics?.failed_payments_count || 0) > 5 ? 'text-red-400' : 'text-white'}`}>
                {subscription_metrics?.failed_payments_count || 0}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">API Requests (24h)</p>
              <p className="text-lg font-light text-white">
                {system_metrics?.total_api_requests_24h?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <TopUsersTable users={ai_metrics?.top_5_ai_users} />
      </div>

      {/* Fourth Row: Alerts Panel */}
      {alerts && alerts.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-5 mb-6">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-600 text-xs mt-8">
        <p>Metrics aggregated every 30 minutes • Last aggregation: {metrics?.aggregated_at ? new Date(metrics.aggregated_at).toLocaleString() : 'Never'}</p>
      </div>
    </div>
  );
}
