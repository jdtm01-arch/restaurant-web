import api from './axios'

export const expensesApi = {
  list: (params) => api.get('/expenses', { params }),
  show: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  destroy: (id) => api.delete(`/expenses/${id}`),
  storePayment: (expenseId, data) => api.post(`/expenses/${expenseId}/payments`, data),
  listAttachments: (expenseId) => api.get(`/expenses/${expenseId}/attachments`),
  storeAttachment: (expenseId, formData) =>
    api.post(`/expenses/${expenseId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  destroyAttachment: (expenseId, attachmentId) =>
    api.delete(`/expenses/${expenseId}/attachments/${attachmentId}`),
}
