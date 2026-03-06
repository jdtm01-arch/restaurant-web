import api from './axios'

export const financialMovementsApi = {
  list: (params) => api.get('/financial-movements', { params }),
}
