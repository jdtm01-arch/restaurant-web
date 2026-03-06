import api from './axios'

export const financialAccountsApi = {
  list: (params) => api.get('/financial-accounts', { params }),
  show: (id) => api.get(`/financial-accounts/${id}`),
  create: (data) => api.post('/financial-accounts', data),
  update: (id, data) => api.put(`/financial-accounts/${id}`, data),
  destroy: (id) => api.delete(`/financial-accounts/${id}`),
  balances: () => api.get('/financial-accounts/balances'),
}
