import { Outlet, useLocation } from 'react-router'
import { DashboardProvider, useDashboardContext } from '../context/DashboardContext'
import { viewFromPath } from '../constants'
import { useDashboardHeader, useDashboardSidebar } from '@/hooks/dashboard'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'

function DashboardLayoutInner() {
  const location = useLocation()
  const view = viewFromPath(location.pathname)
  const { currentUser, unreadCount, openFaultCount, machines, workOrders, faultReports, users, repairRecords, notifications } =
    useDashboardContext()
  const sidebar = useDashboardSidebar()
  const header = useDashboardHeader(view, { machines, workOrders, faultReports, users, repairRecords, notifications })

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        currentUser={currentUser}
        unreadCount={unreadCount}
        openFaultCount={openFaultCount}
        sidebar={sidebar}
      />

      {sidebar.mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={sidebar.closeMobileNav}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          view={view}
          currentUser={currentUser}
          unreadCount={unreadCount}
          openFaultCount={openFaultCount}
          header={header}
          onOpenNav={sidebar.openMobileNav}
        />
        <main className="flex-1 overflow-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardLayoutInner />
    </DashboardProvider>
  )
}
