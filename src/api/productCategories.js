import api from './axios'

export const productCategoriesApi = {
  list: () => api.get('/product-categories'),
  create: (data) => api.post('/product-categories', data),
  update: (id, data) => api.put(`/product-categories/${id}`, data),
  destroy: (id) => api.delete(`/product-categories/${id}`),
}
