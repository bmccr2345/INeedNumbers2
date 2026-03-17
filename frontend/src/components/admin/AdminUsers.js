import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Crown,
  Mail,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  Plus,
  Download,
  RefreshCw,
  Key
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import axios from 'axios';
import AdminResetUserPasswordModal from './AdminResetUserPasswordModal';
import API_BASE_URL from '../../config/api';

const AdminUsers = ({ globalSearch = '' }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const backendUrl = API_BASE_URL;

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, filterPlan, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (filterPlan !== 'all') {
        params.append('plan_filter', filterPlan);
      }
      if (filterStatus !== 'all') {
        params.append('status_filter', filterStatus);
      }
      
      const response = await axios.get(`${backendUrl}/api/admin/users?${params}`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        setUsers(response.data.users || []);
        setTotalUsers(response.data.total || 0);
        setTotalPages(response.data.pages || 0);
      }
      
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users. Please try again.');
      
      // Fallback to mock data if API fails
      const mockUsers = [
        {
          id: 'user-1',
          email: 'john.doe@example.com',
          full_name: 'John Doe',
          plan: 'PRO',
          status: 'active',
          role: 'user',
          created_at: new Date('2024-01-15').toISOString(),
          last_login: new Date('2024-01-25').toISOString(),
          deals_count: 15,
          stripe_customer_id: 'cus_123456'
        },
        {
          id: 'user-2',
          email: 'sarah.smith@example.com',
          full_name: 'Sarah Smith',
          plan: 'STARTER',
          status: 'active',
          role: 'user',
          created_at: new Date('2024-01-20').toISOString(),
          last_login: new Date('2024-01-24').toISOString(),
          deals_count: 8,
          stripe_customer_id: 'cus_789012'
        }
      ];
      setUsers(mockUsers);
      setTotalUsers(mockUsers.length);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyRevenue = (user) => {
    if (user.status !== 'active') return 0;
    if (user.plan === 'STARTER') return 19;
    if (user.plan === 'PRO') return 49;
    return 0;
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'PRO': return 'bg-emerald-100 text-emerald-800';
      case 'STARTER': return 'bg-blue-100 text-blue-800';
      case 'FREE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleUserAction = async (action, userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    setSelectedUser(user);
    setError('');
    
    switch (action) {
      case 'edit':
        setShowEditUserModal(true);
        break;
      case 'reset-password':
        setShowResetPasswordModal(true);
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
      case 'suspend':
        await changeUserStatus(userId, 'suspended');
        break;
      case 'activate':
        await changeUserStatus(userId, 'active');
        break;
      default:
        break;
    }
  };

  const changeUserStatus = async (userId, newStatus) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.patch(
        `${backendUrl}/api/admin/users/${userId}/status?status=${newStatus}`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        // Reload users to reflect changes
        await loadUsers();
      }
    } catch (error) {
      console.error('Error changing user status:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError(`Failed to ${newStatus === 'suspended' ? 'suspend' : 'activate'} user.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updateData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.put(
        `${backendUrl}/api/admin/users/${userId}`,
        updateData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        // Reload users to reflect changes
        await loadUsers();
        setShowEditUserModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to update user.');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.delete(
        `${backendUrl}/api/admin/users/${userId}`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        // Reload users to reflect changes
        await loadUsers();
        setShowDeleteConfirm(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to delete user.');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = () => {
    // Export users to CSV
    const csvContent = [
      ['ID', 'Email', 'Name', 'Plan', 'Status', 'Created', 'Last Login', 'Deals', 'Revenue'].join(','),
      ...users.map(user => [
        user.id,
        user.email,
        user.full_name || user.name || '',
        user.plan,
        user.status,
        formatDate(user.created_at),
        formatDate(user.last_login),
        user.deals_count,
        `$${getMonthlyRevenue(user)}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
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
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts and subscriptions</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={exportUsers} variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={loadUsers} variant="outline" className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <Button 
            className="flex items-center space-x-2 bg-primary text-white hover:bg-secondary"
            onClick={() => {
              setShowAddUserModal(true);
              setError('');
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <UserCheck className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-900">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pro Users</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {users.filter(u => u.plan === 'PRO').length}
                </p>
              </div>
              <Crown className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-900">
                  ${users.reduce((sum, u) => sum + getMonthlyRevenue(u), 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search users by email, name, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Plan Filter */}
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Plans</option>
              <option value="FREE">Free</option>
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="created_at">Created Date</option>
              <option value="last_login">Last Login</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="deals_count">Deals Count</option>
            </select>

            {/* Sort Order */}
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({totalUsers})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 bg-red-50 border-b">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">User</th>
                  <th className="text-left p-4 font-medium text-gray-900">Plan</th>
                  <th className="text-left p-4 font-medium text-gray-900">Status</th>
                  <th className="text-left p-4 font-medium text-gray-900">Created</th>
                  <th className="text-left p-4 font-medium text-gray-900">Last Login</th>
                  <th className="text-left p-4 font-medium text-gray-900">Deals</th>
                  <th className="text-left p-4 font-medium text-gray-900">Revenue</th>
                  <th className="text-right p-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.full_name || user.name || 'No Name'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">ID: {user.id}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.plan)}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-900">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="p-4 text-sm text-gray-900">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="p-4 text-sm text-gray-900">
                      {user.deals_count}
                    </td>
                    <td className="p-4 text-sm text-gray-900">
                      ${getMonthlyRevenue(user)}/mo
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction('edit', user.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction('reset-password', user.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        {user.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAction('suspend', user.id)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Suspend User"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAction('activate', user.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Activate User"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction('delete', user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No users found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New User</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const userData = {
                email: formData.get('email'),
                full_name: formData.get('full_name'),
                plan: formData.get('plan'),
                password: formData.get('password')
              };
              
              try {
                setLoading(true);
                setError('');
                
                const response = await axios.post(`${backendUrl}/api/admin/users`, userData, {
                  withCredentials: true,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                
                if (response.status === 200) {
                  // Success - reload users and close modal
                  await loadUsers();
                  setShowAddUserModal(false);
                  
                  // Reset form
                  e.target.reset();
                } else {
                  setError('Failed to create user. Please try again.');
                }
              } catch (error) {
                console.error('Error creating user:', error);
                if (error.response?.data?.detail) {
                  setError(error.response.data.detail);
                } else if (error.response?.status === 401) {
                  setError('Not authorized to create users.');
                } else if (error.response?.status === 400) {
                  setError('User with this email already exists.');
                } else {
                  setError('Failed to create user. Please check your inputs and try again.');
                }
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <Input name="full_name" required placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input name="email" type="email" required placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select name="plan" className="w-full p-2 border border-gray-300 rounded-md" required>
                    <option value="">Select Plan</option>
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Temporary Password</label>
                  <Input name="password" type="password" required placeholder="Temporary password" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-white" disabled={loading}>
                  {loading ? 'Creating...' : 'Add User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit User</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const updateData = {
                full_name: formData.get('full_name'),
                plan: formData.get('plan'),
                status: formData.get('status'),
                role: formData.get('role')
              };
              
              // Remove empty values
              Object.keys(updateData).forEach(key => {
                if (updateData[key] === '' || updateData[key] === selectedUser[key]) {
                  delete updateData[key];
                }
              });
              
              if (Object.keys(updateData).length === 0) {
                setError('No changes detected.');
                return;
              }
              
              await updateUser(selectedUser.id, updateData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email (Read-only)</label>
                  <Input value={selectedUser.email} disabled className="bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <Input name="full_name" defaultValue={selectedUser.full_name || selectedUser.name || ''} placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select name="plan" defaultValue={selectedUser.plan} className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select name="status" defaultValue={selectedUser.status} className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select name="role" defaultValue={selectedUser.role} className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="master_admin">Master Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowEditUserModal(false);
                    setSelectedUser(null);
                    setError('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-white" disabled={loading}>
                  {loading ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete User</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium">{selectedUser.full_name || selectedUser.name || 'No Name'}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                <p className="text-xs text-gray-500">ID: {selectedUser.id}</p>
              </div>
              <p className="text-sm text-red-600 mt-2">
                This will permanently delete the user and all their associated data including deals, expenses, and settings.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => deleteUser(selectedUser.id)}
                className="bg-red-600 text-white hover:bg-red-700" 
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <AdminResetUserPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}
      
    </div>
  );
};

export default AdminUsers;