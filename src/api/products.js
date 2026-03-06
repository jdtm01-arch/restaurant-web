import api from './axios'

function toFormData(data) {
  const fd = new FormData()
  Object.entries(data).forEach(([k, v]) => {
    if (v !== null && v !== undefined) fd.append(k, v)
  })
  return fd
}

export const productsApi = {
  list: () => api.get('/products'),
  show: (id) => api.get(`/products/${id}`),
  create: (data) => {
    if (data.image instanceof File) {
      return api.post('/products', toFormData(data))
    }
    return api.post('/products', data)
  },
  update: (id, data) => {
    if (data.image instanceof File) {
      const fd = toFormData(data)
      fd.append('_method', 'PUT')
      return api.post(`/products/${id}`, fd)
    }
    return api.put(`/products/${id}`, data)
  },
  destroy: (id) => api.delete(`/products/${id}`),
  restore: (id) => api.put(`/products/${id}/restore`),
  toggleActive: (id) => api.patch(`/products/${id}/toggle-active`),
}
