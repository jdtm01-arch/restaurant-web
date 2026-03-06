import api from './axios'

export const dashboardApi = {
  summary: () => api.get('/dashboard'),
  waiter: () => api.get('/dashboard/waiter'),
}
