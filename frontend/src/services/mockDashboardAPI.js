// API services for dashboard - Returns empty data for new users
// Real API integration for saved calculations

import axios from 'axios';

const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

// Helper to get auth headers
const getAuthConfig = () => ({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Empty data generators (new users see no data)
const generateEmptyMortgageHistory = () => [];

const generateEmptyCommissionHistory = () => [];

const generateEmptyNetHistory = () => [];

const generateEmptyInvestorPDFs = () => [];

const generateMockInvestorPDFs = () => [
  {
    id: 'inv_1',
    property: '123 Main St, Unit A',
    lastUpdated: '2025-01-15T10:30:00Z',
    status: 'Ready',
    size: '2.1MB'
  },
  {
    id: 'inv_2',
    property: '456 Oak Ave',
    lastUpdated: '2025-01-12T14:20:00Z', 
    status: 'Draft',
    size: '1.7MB'
  },
  {
    id: 'inv_3',
    property: '789 Pine Blvd, Suite 5',
    lastUpdated: '2025-01-08T09:15:00Z',
    status: 'Ready', 
    size: '2.4MB'
  },
  {
    id: 'inv_4',
    property: '321 Elm Drive',
    lastUpdated: '2025-01-05T16:45:00Z',
    status: 'Ready',
    size: '1.9MB'
  }
];

const generateMockPnLData = () => ({
  kpis: {
    month: { income: 1200000, expenses: 320000, net: 880000 }, // cents
    ytd: { income: 9600000, expenses: 2200000, net: 7400000 }
  },
  charts: {
    monthlyBar: [
      { month: '2024-02', income: 800000, expenses: 180000 },
      { month: '2024-03', income: 950000, expenses: 220000 },
      { month: '2024-04', income: 1100000, expenses: 190000 },
      { month: '2024-05', income: 1050000, expenses: 210000 },
      { month: '2024-06', income: 1200000, expenses: 250000 },
      { month: '2024-07', income: 900000, expenses: 180000 },
      { month: '2024-08', income: 1300000, expenses: 280000 },
      { month: '2024-09', income: 1150000, expenses: 200000 },
      { month: '2024-10', income: 1000000, expenses: 220000 },
      { month: '2024-11', income: 850000, expenses: 160000 },
      { month: '2024-12', income: 1100000, expenses: 180000 },
      { month: '2025-01', income: 1200000, expenses: 320000 }
    ],
    expensePie: [
      { category: 'Marketing & Advertising', amount: 120000 },
      { category: 'Brokerage Fees', amount: 80000 },
      { category: 'Travel & Auto', amount: 60000 },
      { category: 'MLS/Association Dues', amount: 35000 },
      { category: 'Office Supplies & Software', amount: 25000 }
    ]
  },
  summary: [
    { category: 'Commission Income', income: 1200000, expenses: 0, net: 1200000, percent: 100 },
    { category: 'Marketing & Advertising', income: 0, expenses: 120000, net: -120000, percent: 37.5 },
    { category: 'Brokerage Fees', income: 0, expenses: 80000, net: -80000, percent: 25 },
    { category: 'Travel & Auto', income: 0, expenses: 60000, net: -60000, percent: 18.8 },
    { category: 'MLS/Association Dues', income: 0, expenses: 35000, net: -35000, percent: 10.9 },
    { category: 'Office Supplies & Software', income: 0, expenses: 25000, net: -25000, percent: 7.8 }
  ]
});

const generateMockPnLTransactions = () => [
  {
    id: 'pnl_1',
    date: '2025-01-15',
    type: 'income',
    amount: 1200000,
    category: 'Commission Income',
    note: 'Closing on 123 Main St',
    recurring: false
  },
  {
    id: 'pnl_2', 
    date: '2025-01-10',
    type: 'expense',
    amount: 50000,
    category: 'Marketing & Advertising',
    note: 'Facebook ads campaign',
    recurring: true
  },
  {
    id: 'pnl_3',
    date: '2025-01-08',
    type: 'expense', 
    amount: 30000,
    category: 'Travel & Auto',
    note: 'Client showings gas',
    recurring: false
  }
];

// Mock API implementations
export const mockDashboardAPI = {
  // Mortgage endpoints
  mortgage: {
    calc: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
      const { loanAmount, rate, termYears, income, taxesInsurance } = data;
      
      const monthlyRate = rate / 100 / 12;
      const numPayments = termYears * 12;
      const payment = Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1));
      
      let dti = null;
      if (income && taxesInsurance) {
        const totalMonthlyPayment = payment + taxesInsurance;
        const monthlyIncome = income / 12;
        dti = Math.round((totalMonthlyPayment / monthlyIncome) * 100 * 10) / 10;
      }
      
      return { payment, dti };
    },
    
    history: async ({ limit = 50, cursor = null } = {}) => {
      // No mortgage history API exists - return empty for new users
      return { items: [], nextCursor: null };
    },
    
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return { success: true };
    }
  },

  // Commission endpoints  
  commission: {
    calc: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const { gross, brokeragePct, referralPct = 0, teamPct = 0, feesFlat = 0, feesPct = 0 } = data;
      
      const brokerage = Math.round(gross * brokeragePct / 100);
      const referral = Math.round(gross * referralPct / 100);
      const team = Math.round(gross * teamPct / 100);
      const fees = feesFlat + Math.round(gross * feesPct / 100);
      
      const takeHome = gross - brokerage - referral - team - fees;
      
      return {
        takeHome,
        breakdown: { brokerage, referral, team, fees }
      };
    },
    
    history: async ({ limit = 50, cursor = null } = {}) => {
      // Call real API for commission history
      try {
        const response = await axios.get(`${backendUrl}/api/commission/history`, getAuthConfig());
        return { items: response.data || [], nextCursor: null };
      } catch (error) {
        console.error('Failed to load commission history:', error);
        return { items: [], nextCursor: null };
      }
    },
    
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return { success: true };
    }
  },

  // Seller Net endpoints
  net: {
    estimate: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const { price, fees, closingCosts, payoff } = data;
      const net = price - fees - closingCosts - payoff;
      return { net };
    },
    
    history: async ({ limit = 50, cursor = null } = {}) => {
      // No seller net history API exists - return empty for new users
      return { items: [], nextCursor: null };
    },
    
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return { success: true };
    }
  },

  // Investor PDF endpoints (Pro only)
  investor: {
    list: async ({ status = '', from = '', to = '', limit = 50, cursor = null } = {}) => {
      // No investor list API exists - return empty for new users
      return { items: [], nextCursor: null };
    },
    
    create: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: `inv_${Date.now()}` };
    },
    
    update: async (id, data) => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return { success: true };
    },
    
    duplicate: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { newId: `inv_${Date.now()}_copy` };
    },
    
    download: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Return mock blob URL
      return { url: '#mock-pdf-download' };
    },
    
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true };
    },
    
    bulkDownload: async (ids) => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return { url: '#mock-bulk-download.zip' };
    },
    
    bulkDelete: async (ids) => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return { deletedIds: ids };
    }
  },

  // P&L endpoints (Pro only)
  pnl: {
    summary: async ({ month = null, ytd = true } = {}) => {
      // Call real P&L API
      try {
        const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const response = await axios.get(`${backendUrl}/api/pnl/summary?month=${currentMonth}&ytd=${ytd}`, getAuthConfig());
        
        // Transform to expected format
        const data = response.data || {};
        return {
          kpis: {
            month: { 
              income: (data.monthly_income || 0) * 100, 
              expenses: (data.monthly_expenses || 0) * 100, 
              net: (data.monthly_net || 0) * 100 
            },
            ytd: { 
              income: (data.ytd_income || 0) * 100, 
              expenses: (data.ytd_expenses || 0) * 100, 
              net: (data.ytd_net || 0) * 100 
            }
          },
          charts: { monthlyBar: [], expensePie: [] },
          summary: []
        };
      } catch (error) {
        console.error('Failed to load P&L summary:', error);
        return {
          kpis: {
            month: { income: 0, expenses: 0, net: 0 },
            ytd: { income: 0, expenses: 0, net: 0 }
          },
          charts: { monthlyBar: [], expensePie: [] },
          summary: []
        };
      }
    },
    
    transactions: async ({ month = '2025-01', category = '' } = {}) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      let items = generateMockPnLTransactions();
      
      if (category) {
        items = items.filter(item => item.category === category);
      }
      
      return { items };
    },
    
    createTransaction: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { id: `pnl_${Date.now()}` };
    },
    
    updateTransaction: async (id, data) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    
    deleteTransaction: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true };
    },
    
    export: async ({ format, month = null }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { url: `#mock-pnl-export.${format}` };
    },
    
    getCategories: async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return {
        income: ['Commission Income', 'Referral Fees', 'Other Income'],
        expenses: [
          'Brokerage Fees', 
          'Marketing & Advertising', 
          'MLS/Association Dues', 
          'Transaction Fees', 
          'Office Supplies & Software', 
          'Travel & Auto', 
          'Education & Training', 
          'Insurance', 
          'Miscellaneous'
        ]
      };
    }
  }
};

// Utility functions
export const formatCurrency = (cents) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100);
};

export const formatCurrencyDetailed = (cents) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', 
    currency: 'USD'
  }).format(cents / 100);
};

export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  });
};

export const formatDateTime = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};