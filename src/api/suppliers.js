import api from './axios'

export const suppliersApi = {
  list: () => api.get('/suppliers'),
  show: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  destroy: (id) => api.delete(`/suppliers/${id}`),
}
