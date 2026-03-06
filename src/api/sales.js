import api from './axios'

export const salesApi = {
  list: (params) => api.get('/sales', { params }),
  summary: (params) => api.get('/sales/summary', { params }),
  show: (id) => api.get(`/sales/${id}`),
  receipt: (id) => api.get(`/sales/${id}/receipt`),
}
