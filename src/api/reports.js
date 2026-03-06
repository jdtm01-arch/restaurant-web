import api from './axios'

export const reportsApi = {
  salesByCategory: (params) => api.get('/reports/sales-by-category', { params }),
  salesByHour: (params) => api.get('/reports/sales-by-hour', { params }),
  cancellationsDiscounts: (params) => api.get('/reports/cancellations-discounts', { params }),
  salesByWaiter: (params) => api.get('/reports/sales-by-waiter', { params }),
  foodCost: (params) => api.get('/reports/food-cost', { params }),
  waste: (params) => api.get('/reports/waste', { params }),
  accountsPayable: () => api.get('/reports/accounts-payable'),
  dailyCashFlow: (params) => api.get('/reports/daily-cash-flow', { params }),
  topProducts: (params) => api.get('/reports/top-products', { params }),
  dailySummary: (params) => api.get('/reports/daily-summary', { params }),
}
