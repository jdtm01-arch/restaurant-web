import api from './axios'

export const cashRegistersApi = {
  list: (params) => api.get('/cash-registers', { params }),
  current: () => api.get('/cash-registers/current'),
  show: (id) => api.get(`/cash-registers/${id}`),
  open: (data) => api.post('/cash-registers', data),
  close: (id, data) => api.post(`/cash-registers/${id}/close`, data),
  xReport: (id) => api.get(`/cash-registers/${id}/x-report`),
}
