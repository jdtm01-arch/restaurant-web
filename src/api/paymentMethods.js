import api from './axios'

export const paymentMethodsApi = {
  list: () => api.get('/payment-methods'),
  show: (id) => api.get(`/payment-methods/${id}`),
  create: (data) => api.post('/payment-methods', data),
  update: (id, data) => api.put(`/payment-methods/${id}`, data),
  destroy: (id) => api.delete(`/payment-methods/${id}`),
}
