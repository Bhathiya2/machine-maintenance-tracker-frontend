import { useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  useClickOutside,
  useDisclosure,
  useDocumentTitle,
  useDocumentVisibility,
  useHotkeys,
  useOnlineStatus,
  useSearch,
} from '@/hooks/base/commonHooks'
import { VIEW_LABELS, VIEW_ROUTES } from '@/pages/dashboard/constants'
import type { AppUser, FaultReport, Machine, Notification, RepairRecord, ViewName, WorkOrder } from '@/pages/dashboard/types'

export interface DashboardSearchItem extends Record<string, unknown> {
  id: string
  label: string
  subtitle: string
  path: string
  type:
    | 'Page'
    | 'Machine'
    | 'Work Order'
    | 'Fault'
    | 'Repair Record'
    | 'Analytics'
    | 'Finance'
    | 'Notification'
    | 'User'
    | 'Role'
}

interface DashboardHeaderData {
  machines: Machine[]
  workOrders: WorkOrder[]
  faultReports: FaultReport[]
  users: AppUser[]
  repairRecords?: RepairRecord[]
  notifications?: Notification[]
}

export function useDashboardHeader(view: ViewName, data: DashboardHeaderData) {
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const searchPanel = useDisclosure(false)

  const searchPanelRef = useClickOutside<HTMLDivElement>(() => {
    searchPanel.close()
  })

  const isOnline = useOnlineStatus()
  const visibility = useDocumentVisibility()
  const isAway = visibility === 'hidden'

  useDocumentTitle(`${VIEW_LABELS[view]} · MachineTrack`)

  const searchItems = useMemo<DashboardSearchItem[]>(() => {
    // 1. Module Page Navigation Shortcuts
    const pageItems: DashboardSearchItem[] = [
      {
        id: 'page-dashboard',
        label: 'Dashboard Overview',
        subtitle: 'Fleet overview, active work orders & daily maintenance summary',
        path: VIEW_ROUTES.dashboard,
        type: 'Page',
      },
      {
        id: 'page-machines',
        label: 'Machines Registry',
        subtitle: 'Registry, machine status, factory, model and machine details',
        path: VIEW_ROUTES.machines,
        type: 'Page',
      },
      {
        id: 'page-workorders',
        label: 'Work Orders',
        subtitle: 'Assign, track, update status, cost entries and close work orders',
        path: VIEW_ROUTES.workorders,
        type: 'Page',
      },
      {
        id: 'page-faults',
        label: 'Fault Reports',
        subtitle: 'Report machine problems, track severity and convert to work orders',
        path: VIEW_ROUTES.faults,
        type: 'Page',
      },
      {
        id: 'page-repairs',
        label: 'Repair Records',
        subtitle: 'Historical repair logs, parts replaced, and photo gallery',
        path: VIEW_ROUTES.repairs,
        type: 'Page',
      },
      {
        id: 'page-analytics',
        label: 'Analytics & Metrics',
        subtitle: 'Cost trends, MTBF, MTTR, machine performance and downtime metrics',
        path: VIEW_ROUTES.analytics,
        type: 'Page',
      },
      {
        id: 'page-finance',
        label: 'Finance & Expenses',
        subtitle: 'Work order expenses, labor & spare part budget tracking',
        path: VIEW_ROUTES.finance,
        type: 'Page',
      },
      {
        id: 'page-notifications',
        label: 'Notifications & Alerts',
        subtitle: 'System notifications, work order assignments, and alerts',
        path: VIEW_ROUTES.notifications,
        type: 'Page',
      },
      {
        id: 'page-users',
        label: 'User Management',
        subtitle: 'Manage team members, roles, phone numbers, and site access',
        path: VIEW_ROUTES.users,
        type: 'Page',
      },
      {
        id: 'page-roles',
        label: 'Role & Permissions',
        subtitle: 'Create system roles and configure permission access policies',
        path: VIEW_ROUTES.roles,
        type: 'Page',
      },
    ]

    // 2. Machines
    const machineItems: DashboardSearchItem[] = (data.machines || []).map((machine) => ({
      id: machine.id,
      label: `${machine.id} — ${machine.name}`,
      subtitle: `${machine.site} · ${machine.factoryGroup || 'Factory Group'} · ${machine.status}`,
      path: `${VIEW_ROUTES.machines}?focus=${encodeURIComponent(machine.id)}`,
      type: 'Machine',
    }))

    // 3. Work Orders
    const workOrderItems: DashboardSearchItem[] = (data.workOrders || []).map((order) => ({
      id: order.id,
      label: `${order.id} — ${order.title}`,
      subtitle: `Machine: ${order.machineId} · Status: ${order.status} · Priority: ${order.priority} · Tech: ${order.assignedTo}`,
      path: `${VIEW_ROUTES.workorders}?focus=${encodeURIComponent(order.id)}`,
      type: 'Work Order',
    }))

    // 4. Fault Reports
    const faultItems: DashboardSearchItem[] = (data.faultReports || []).map((fault) => ({
      id: fault.id,
      label: `${fault.id} — ${fault.description.slice(0, 64)}`,
      subtitle: `Machine: ${fault.machineId} · Severity: ${fault.severity} · Category: ${fault.category} · Status: ${fault.status}`,
      path: `${VIEW_ROUTES.faults}?focus=${encodeURIComponent(fault.id)}`,
      type: 'Fault',
    }))

    // 5. Repair Records
    const repairItems: DashboardSearchItem[] = (data.repairRecords || []).map((repair) => ({
      id: repair.id,
      label: `${repair.id} — ${repair.issueDescription.slice(0, 64)}`,
      subtitle: `WO: ${repair.workOrderId} · Machine: ${repair.machineId} · Category: ${repair.issueCategory} · Cost: ৳${repair.totalCost}`,
      path: `${VIEW_ROUTES.repairs}?focus=${encodeURIComponent(repair.id)}`,
      type: 'Repair Record',
    }))

    // 6. Analytics Metrics
    const analyticsItems: DashboardSearchItem[] = [
      {
        id: 'analytics-cost-trends',
        label: 'Cost Trends & Expenditure',
        subtitle: 'Analyze monthly maintenance expenditure over time',
        path: VIEW_ROUTES.analytics,
        type: 'Analytics',
      },
      {
        id: 'analytics-mtbf-mttr',
        label: 'MTBF & MTTR Metrics',
        subtitle: 'Mean time between failures & repair performance analytics',
        path: VIEW_ROUTES.analytics,
        type: 'Analytics',
      },
      {
        id: 'analytics-downtime',
        label: 'Downtime & Status Breakdown',
        subtitle: 'Operational vs downtime statistics per site & factory',
        path: VIEW_ROUTES.analytics,
        type: 'Analytics',
      },
    ]

    // 7. Finance Costs & Entries
    const financeItems: DashboardSearchItem[] = []
    ;(data.workOrders || []).forEach((order) => {
      ;(order.costEntries || []).forEach((entry) => {
        financeItems.push({
          id: `fin-${entry.id || Math.random()}`,
          label: `Expense: ${entry.category} (${entry.details || order.title})`,
          subtitle: `Amount: ৳${entry.amount} · Date: ${entry.date} · WO: ${order.id}`,
          path: VIEW_ROUTES.finance,
          type: 'Finance',
        })
      })
    })

    // 8. Notifications
    const notificationItems: DashboardSearchItem[] = (data.notifications || []).map((notif) => ({
      id: notif.id,
      label: `Alert: ${notif.message}`,
      subtitle: `${notif.createdAt ? notif.createdAt.split('T')[0] : ''} · ${notif.read ? 'Read' : 'Unread alert'}`,
      path: VIEW_ROUTES.notifications,
      type: 'Notification',
    }))

    // 9. User Management
    const userItems: DashboardSearchItem[] = (data.users || []).map((user) => ({
      id: user.id,
      label: `${user.name} (${user.id})`,
      subtitle: `Role: ${user.role} · Site: ${user.site} ${user.phone ? '· ' + user.phone : ''}`,
      path: `${VIEW_ROUTES.users}?focus=${encodeURIComponent(user.id)}`,
      type: 'User',
    }))

    // 10. Role & Permissions
    const roleItems: DashboardSearchItem[] = [
      {
        id: 'role-superadmin',
        label: 'Role: Super Admin',
        subtitle: 'Full unmitigated access to all system modules and settings',
        path: VIEW_ROUTES.roles,
        type: 'Role',
      },
      {
        id: 'role-manager',
        label: 'Role: Manager',
        subtitle: 'Create & update machines, work orders, fault reports, users & analytics',
        path: VIEW_ROUTES.roles,
        type: 'Role',
      },
      {
        id: 'role-technician',
        label: 'Role: Technician',
        subtitle: 'View assigned work orders, check-in/out sessions, add repair logs & notes',
        path: VIEW_ROUTES.roles,
        type: 'Role',
      },
      {
        id: 'role-owner',
        label: 'Role: Owner',
        subtitle: 'High-level dashboard overview, machine status and cost analytics access',
        path: VIEW_ROUTES.roles,
        type: 'Role',
      },
      {
        id: 'role-worker',
        label: 'Role: Worker',
        subtitle: 'Report machine faults and view public machine statuses',
        path: VIEW_ROUTES.roles,
        type: 'Role',
      },
      {
        id: 'role-finance',
        label: 'Role: Finance',
        subtitle: 'Financial entries, work order cost entries, labor & parts budget tracking',
        path: VIEW_ROUTES.roles,
        type: 'Role',
      },
    ]

    return [
      ...pageItems,
      ...machineItems,
      ...workOrderItems,
      ...faultItems,
      ...repairItems,
      ...analyticsItems,
      ...financeItems,
      ...notificationItems,
      ...userItems,
      ...roleItems,
    ]
  }, [
    data.machines,
    data.workOrders,
    data.faultReports,
    data.users,
    data.repairRecords,
    data.notifications,
  ])

  const { query, setQuery, results, isSearching } = useSearch(searchItems, {
    keys: ['id', 'label', 'subtitle', 'type'],
    debounceMs: 200,
  })

  const openSearch = useCallback(() => {
    searchRef.current?.focus()
    searchPanel.open()
  }, [searchPanel])

  const closeSearch = useCallback(() => {
    searchPanel.close()
    setQuery('')
    searchRef.current?.blur()
  }, [searchPanel, setQuery])

  const hotkeys = useMemo(
    () => ({
      'ctrl+k': () => openSearch(),
      escape: () => {
        if (searchPanel.isOpen || query) closeSearch()
      },
    }),
    [closeSearch, openSearch, query, searchPanel.isOpen]
  )

  useHotkeys(hotkeys)

  const selectSearchResult = useCallback(
    (item: DashboardSearchItem) => {
      navigate(item.path)
      setQuery('')
      searchPanel.close()
    },
    [navigate, searchPanel, setQuery]
  )

  return {
    isOnline,
    isAway,
    searchRef,
    searchPanelRef,
    searchPanelOpen: searchPanel.isOpen,
    openSearch,
    closeSearch,
    searchQuery: query,
    setSearchQuery: setQuery,
    searchResults: results.slice(0, 12),
    isSearching,
    selectSearchResult,
    showSearchResults: query.length > 0,
  }
}

export type DashboardHeaderState = ReturnType<typeof useDashboardHeader>
