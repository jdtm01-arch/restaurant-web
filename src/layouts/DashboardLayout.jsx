import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="dashboard">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="dashboard__body">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="dashboard__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
