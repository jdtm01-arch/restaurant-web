import api from './axios'

export const financialInitializationApi = {
  status: () => api.get('/financial/status'),
  initialize: (data) => api.post('/financial/initialize', data),
}
