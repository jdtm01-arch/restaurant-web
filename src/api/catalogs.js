import api from './axios'

export const catalogsApi = {
  roles: () => api.get('/catalogs/roles'),
  paymentMethods: () => api.get('/catalogs/payment-methods'),
  expenseStatuses: () => api.get('/catalogs/expense-statuses'),
}
