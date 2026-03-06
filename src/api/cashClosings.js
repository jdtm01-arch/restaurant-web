import api from './axios'

export const cashClosingsApi = {
  list: (params) => api.get('/cash-closings', { params }),
  show: (id) => api.get(`/cash-closings/${id}`),
  preview: (params) => api.get('/cash-closings/preview', { params }),
  create: (data) => api.post('/cash-closings', data),
}
