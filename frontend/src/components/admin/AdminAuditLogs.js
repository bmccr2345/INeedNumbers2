import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  CreditCard,
  Settings,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import API_BASE_URL from '../../config/api';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [dateRange, setDateRange] = useState('24h');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterType, filterSeverity, dateRange]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      const backendUrl = API_BASE_URL;
      
      // Build query parameters
      const params = new URLSearchParams({
        page: '1',
        limit: '100'
      });
      
      if (filterType !== 'all') {
        params.append('action_filter', filterType);
      }
      
      const response = await fetch(`${backendUrl}/api/admin/audit-logs?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await response.json();
      const auditLogs = data.logs || [];
      
      // Transform backend logs to frontend format
      const transformedLogs = auditLogs.map((log, idx) => ({
        id: log._id || `log-${idx}`,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        type: log.action || 'unknown',
        severity: getSeverityFromAction(log.action),
        user_email: log.user_email || 'System',
        action: formatAction(log.action),
        details: log.details || JSON.stringify(log.metadata || {}),
        ip_address: log.ip_address || 'N/A',
        user_agent: log.user_agent || 'N/A',
        metadata: log.metadata || {}
      }));
      
      setLogs(transformedLogs);
      
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };
  
  const getSeverityFromAction = (action) => {
    if (!action) return 'info';
    const actionLower = action.toLowerCase();
    if (actionLower.includes('delete') || actionLower.includes('error')) return 'error';
    if (actionLower.includes('fail') || actionLower.includes('warning')) return 'warning';
    if (actionLower.includes('create') || actionLower.includes('update')) return 'success';
    return 'info';
  };
  
  const formatAction = (action) => {
    if (!action) return 'Unknown Action';
    // Convert UPPERCASE_WITH_UNDERSCORE to Title Case
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    // Severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === filterSeverity);
    }

    // Date range filter
    const now = new Date();
    let cutoffTime;
    switch (dateRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = null;
    }

    if (cutoffTime) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= cutoffTime);
    }

    setFilteredLogs(filtered);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'text-green-700 bg-green-100';
      case 'warning': return 'text-yellow-700 bg-yellow-100';
      case 'error': return 'text-red-700 bg-red-100';
      case 'info': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'info': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'admin_login': return <Shield className="w-4 h-4" />;
      case 'user_signup': return <User className="w-4 h-4" />;
      case 'payment_failed': 
      case 'subscription_change': return <CreditCard className="w-4 h-4" />;
      case 'security_alert': return <AlertTriangle className="w-4 h-4" />;
      case 'user_action': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Severity', 'User', 'Action', 'Details', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.type,
        log.severity,
        log.user_email,
        log.action,
        `"${log.details}"`,
        log.ip_address
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Monitor system activity and security events</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={exportLogs} variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={loadAuditLogs} variant="outline" className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Security Alerts</p>
                <p className="text-2xl font-bold text-red-900">
                  {filteredLogs.filter(l => l.severity === 'error').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin Actions</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredLogs.filter(l => l.type === 'admin_login').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">User Signups</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredLogs.filter(l => l.type === 'user_signup').length}
                </p>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search logs by user, action, or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="admin_login">Admin Login</option>
              <option value="user_signup">User Signup</option>
              <option value="payment_failed">Payment Failed</option>
              <option value="security_alert">Security Alert</option>
              <option value="user_action">User Action</option>
              <option value="subscription_change">Subscription Change</option>
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Severity</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length} events)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border-b border-gray-100 p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(log.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {log.action}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1 capitalize">{log.severity}</span>
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {log.details}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>User: {log.user_email}</span>
                        <span>IP: {log.ip_address}</span>
                        <span>Time: {formatDate(log.timestamp)}</span>
                      </div>
                      
                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <span key={key}>
                                <span className="font-medium text-gray-700">{key}:</span>{' '}
                                <span className="text-gray-600">{String(value)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex-shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No audit logs found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuditLogs;