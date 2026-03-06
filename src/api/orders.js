import api from './axios'

export const ordersApi = {
  list: (params) => api.get('/orders', { params }),
  show: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  addItem: (orderId, data) => api.post(`/orders/${orderId}/items`, data),
  removeItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
  updateItemQuantity: (orderId, itemId, data) =>
    api.patch(`/orders/${orderId}/items/${itemId}/quantity`, data),
  applyDiscount: (orderId, data) => api.post(`/orders/${orderId}/discount`, data),
  close: (orderId) => api.post(`/orders/${orderId}/close`),
  reopen: (orderId) => api.post(`/orders/${orderId}/reopen`),
  cancel: (orderId, data) => api.post(`/orders/${orderId}/cancel`, data),
  pay: (orderId, data) => api.post(`/orders/${orderId}/pay`, data),
  kitchenTicket: (orderId) => api.get(`/orders/${orderId}/kitchen-ticket`),
  bill: (orderId) => api.get(`/orders/${orderId}/bill`),
  changeTable: (orderId, data) => api.patch(`/orders/${orderId}/change-table`, data),
}
