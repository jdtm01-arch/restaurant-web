import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

// Admin pages
import Users from './pages/admin/Users'
import ProductCategories from './pages/admin/ProductCategories'
import Products from './pages/admin/Products'
import Tables from './pages/admin/Tables'
import Suppliers from './pages/admin/Suppliers'
import ExpenseCategories from './pages/admin/ExpenseCategories'
import PaymentMethods from './pages/admin/PaymentMethods'
import Expenses from './pages/admin/Expenses'
import Reports from './pages/admin/Reports'
import WasteLogs from './pages/admin/WasteLogs'
import AuditLogs from './pages/admin/AuditLogs'

// Operations pages
import CashRegisters from './pages/operations/CashRegisters'
import Orders from './pages/operations/Orders'
import Sales from './pages/operations/Sales'
import CashClosings from './pages/operations/CashClosings'

// Kitchen
import KitchenDisplay from './pages/kitchen/KitchenDisplay'

// Finance
import FinancialAccounts from './pages/finance/FinancialAccounts'
import AccountTransfers from './pages/finance/AccountTransfers'
import FinancialDashboard from './pages/finance/FinancialDashboard'
import FinancialInitialization from './pages/finance/FinancialInitialization'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/ui/Spinner'

const adminRoles = ['admin_general', 'admin_restaurante']
const operationRoles = ['admin_general', 'admin_restaurante', 'caja']
const orderRoles = ['admin_general', 'admin_restaurante', 'caja', 'mozo']
const kitchenRoles = ['admin_general', 'admin_restaurante', 'cocina']
const wasteRoles = ['admin_general', 'admin_restaurante', 'cocina']

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — Dashboard layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Operations */}
        <Route path="/cash-registers" element={
          <ProtectedRoute roles={operationRoles}><CashRegisters /></ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute roles={orderRoles}><Orders /></ProtectedRoute>
        } />
        <Route path="/sales" element={
          <ProtectedRoute roles={operationRoles}><Sales /></ProtectedRoute>
        } />
        <Route path="/cash-closings" element={
          <ProtectedRoute roles={operationRoles}><CashClosings /></ProtectedRoute>
        } />

        {/* Admin config routes */}
        <Route path="/admin/users" element={
          <ProtectedRoute roles={adminRoles}><Users /></ProtectedRoute>
        } />
        <Route path="/admin/product-categories" element={
          <ProtectedRoute roles={adminRoles}><ProductCategories /></ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute roles={adminRoles}><Products /></ProtectedRoute>
        } />
        <Route path="/admin/tables" element={
          <ProtectedRoute roles={adminRoles}><Tables /></ProtectedRoute>
        } />
        <Route path="/admin/suppliers" element={
          <ProtectedRoute roles={adminRoles}><Suppliers /></ProtectedRoute>
        } />
        <Route path="/admin/expense-categories" element={
          <ProtectedRoute roles={adminRoles}><ExpenseCategories /></ProtectedRoute>
        } />
        <Route path="/admin/payment-methods" element={
          <ProtectedRoute roles={adminRoles}><PaymentMethods /></ProtectedRoute>
        } />
        <Route path="/admin/expenses" element={
          <ProtectedRoute roles={adminRoles}><Expenses /></ProtectedRoute>
        } />
        <Route path="/admin/waste-logs" element={
          <ProtectedRoute roles={wasteRoles}><WasteLogs /></ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute roles={adminRoles}><Reports /></ProtectedRoute>
        } />
        <Route path="/admin/audit-logs" element={
          <ProtectedRoute roles={adminRoles}><AuditLogs /></ProtectedRoute>
        } />

        {/* Kitchen */}
        <Route path="/kitchen" element={
          <ProtectedRoute roles={kitchenRoles}><KitchenDisplay /></ProtectedRoute>
        } />

        {/* Finance */}
        <Route path="/finance/accounts" element={
          <ProtectedRoute roles={adminRoles}><FinancialAccounts /></ProtectedRoute>
        } />
        <Route path="/finance/transfers" element={
          <ProtectedRoute roles={adminRoles}><AccountTransfers /></ProtectedRoute>
        } />
        <Route path="/finance/dashboard" element={
          <ProtectedRoute roles={adminRoles}><FinancialDashboard /></ProtectedRoute>
        } />
        <Route path="/finance/initialization" element={
          <ProtectedRoute roles={adminRoles}><FinancialInitialization /></ProtectedRoute>
        } />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
