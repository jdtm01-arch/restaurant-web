import api from './axios'

export const wasteLogsApi = {
  list: (params) => api.get('/waste-logs', { params }),
  show: (id) => api.get(`/waste-logs/${id}`),
  create: (data) => api.post('/waste-logs', data),
  update: (id, data) => api.put(`/waste-logs/${id}`, data),
  destroy: (id) => api.delete(`/waste-logs/${id}`),
}
