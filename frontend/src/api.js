/**
 * CMRS API Client
 * Centralized service for communicating with the Django REST Framework backend.
 */

const API_BASE = '/api';

export const tokenStorage = {
  get: () => localStorage.getItem('cmrs_token'),
  set: (token) => localStorage.setItem('cmrs_token', token),
  remove: () => localStorage.removeItem('cmrs_token'),
  getUser: () => {
    try {
      const u = localStorage.getItem('cmrs_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('cmrs_user', JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem('cmrs_token');
    localStorage.removeItem('cmrs_user');
  }
};

async function request(endpoint, options = {}) {
  const token = tokenStorage.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    tokenStorage.clear();
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.detail || (typeof data === 'object' ? JSON.stringify(data) : 'Request failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: async (username, password) => {
    const data = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    tokenStorage.set(data.access);
    tokenStorage.setUser(data.user);
    return data;
  },
  getProfile: () => request('/auth/profile/'),
  getBranches: () => request('/auth/branches/'),
  createBranch: (data) =>
    request('/auth/branches/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getUsers: (role = '') => request(`/auth/users/${role ? `?role=${role}` : ''}`),
  createUser: (userData) =>
    request('/auth/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Loans & Customers
  getCustomers: () => request('/loans/customers/'),
  createCustomer: (customerData) =>
    request('/loans/customers/', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),
  getLoans: () => request('/loans/'),
  createLoan: (loanData) =>
    request('/loans/', {
      method: 'POST',
      body: JSON.stringify(loanData),
    }),
  getLoanSchedule: (loanId) => request(`/loans/${loanId}/schedule/`),

  // Agent Actions
  recordPayment: (scheduleId, amount, notes = '') =>
    request('/collections/collect/', {
      method: 'POST',
      body: JSON.stringify({ schedule_id: scheduleId, amount, notes }),
    }),
  getAgentDailyCollections: () => request('/collections/my-collections/'),
  submitToBranch: () =>
    request('/collections/submit-to-branch/', {
      method: 'POST',
    }),

  // Branch Manager Actions
  getSubmissions: (status = '') =>
    request(`/collections/submissions/${status ? `?status=${status}` : ''}`),
  verifySubmission: (id, actualAmount, action, managerNotes = '') =>
    request(`/collections/submissions/${id}/verify/`, {
      method: 'POST',
      body: JSON.stringify({
        actual_amount: actualAmount,
        action,
        manager_notes: managerNotes,
      }),
    }),
  getBankDeposits: (query = '') => request(`/reconciliation/deposits/${query}`),
  createBankDeposit: (depositData) =>
    request('/reconciliation/deposits/', {
      method: 'POST',
      body: JSON.stringify(depositData),
    }),
  settleDeposit: (id) =>
    request(`/reconciliation/deposits/${id}/settle/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // Dashboard & History
  getDashboardSummary: (params = '') => request(`/dashboard/summary/${params}`),
  getAgentSummaries: () => request('/dashboard/agents/'),
  getCollectionHistory: (params = '') => request(`/collections/history/${params}`),
};
