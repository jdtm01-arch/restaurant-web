import api from './axios'

export const accountTransfersApi = {
  list: (params) => api.get('/account-transfers', { params }),
  create: (data) => api.post('/account-transfers', data),
  update: (id, data) => api.put(`/account-transfers/${id}`, data),
  destroy: (id) => api.delete(`/account-transfers/${id}`),
}
