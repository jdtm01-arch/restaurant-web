import api from './axios'

export const tablesApi = {
  list: () => api.get('/tables'),
  show: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  destroy: (id) => api.delete(`/tables/${id}`),
  restore: (id) => api.put(`/tables/${id}/restore`),
  updatePositions: (positions) => api.post('/tables/positions', { positions }),
}
