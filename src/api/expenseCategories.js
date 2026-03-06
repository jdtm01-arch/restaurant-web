import api from './axios'

export const expenseCategoriesApi = {
  list: () => api.get('/expense-categories'),
  show: (id) => api.get(`/expense-categories/${id}`),
  create: (data) => api.post('/expense-categories', data),
  update: (id, data) => api.put(`/expense-categories/${id}`, data),
  destroy: (id) => api.delete(`/expense-categories/${id}`),
}
