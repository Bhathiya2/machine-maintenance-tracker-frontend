import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building,
  Eye,
  FileCheck,
  FileText,
  Flag,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  User,
  Wrench,
  X,
  Printer,
} from 'lucide-react'
import { useDisclosure, useDebounce } from '@/hooks/base/commonHooks'
import { usePermissions } from '@/hooks/permission/usePermissions'
import { TablePaginationBar, useTablePagination } from '@/components/TablePagination'
import { PERMISSIONS } from '@/pages/dashboard/permissions'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ISSUE_CATEGORIES, SITES } from '@/pages/dashboard/constants'
import { Badge, Card, FormField, inputCls, selectCls } from '@/pages/dashboard/components/DashboardUI'
import { formatDate, fmtCurrency, warrantyStatus } from '@/pages/dashboard/utils/formatters'
import { machineStatusIcon, severityColor, statusColor, woStatusColor, woStatusIcon } from '@/pages/dashboard/utils/statusHelpers'
import { type MachineFormData } from './machineMapper'
import { MachineCertificatePrint } from './MachineCertificatePrint'
import type { FaultFormData } from '@/pages/fault-reports/faultMapper'
import type {
  AppUser,
  FaultReport,
  FaultSeverity,
  IssueCategory,
  Machine,
  MachineStatus,
  RepairRecord,
  WorkOrder,
} from '@/pages/dashboard/types'

const STATUSES: MachineStatus[] = ['Operational', 'Under Maintenance', 'Broken', 'Offline']

const EMPTY_FORM = (installedBy: string): MachineFormData => ({
  id: '',
  name: '',
  model: '',
  site: 'Plant A',
  factoryGroup: 'North America Manufacturing',
  factory: 'Detroit Assembly',
  installDate: '',
  installedBy,
  status: 'Operational',
})

interface MachineRegistryViewProps {
  machines: Machine[]
  loading: boolean
  saving: boolean
  onRefresh: () => Promise<void>
  onCreate: (form: MachineFormData) => Promise<Machine | null>
  onUpdate: (dbId: number, form: MachineFormData) => Promise<Machine | null>
  onDelete: (dbId: number) => Promise<boolean>
  workOrders: WorkOrder[]
  repairRecords: RepairRecord[]
  faultReports: FaultReport[]
  onCreateFaultReport: (form: FaultFormData) => Promise<FaultReport | null>
  focusId?: string
  onNavigate: (view: string, id?: string) => void
  currentUser: AppUser
}

export function MachineRegistryView({
  machines,
  loading,
  saving,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  workOrders,
  repairRecords,
  faultReports,
  onCreateFaultReport,
  focusId,
  onNavigate,
  currentUser,
}: MachineRegistryViewProps) {
  const formModal = useDisclosure(false)
  const viewModal = useDisclosure(false)
  const faultModal = useDisclosure(false)
  const deleteModal = useDisclosure(false)

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'certificate' | 'technical'>('general')
  const [form, setForm] = useState<MachineFormData>(() => EMPTY_FORM(currentUser.name))
  const [viewMachine, setViewMachine] = useState<Machine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null)
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'All'>('All')
  const [newFault, setNewFault] = useState({
    description: '',
    severity: 'Medium' as FaultSeverity,
    category: 'Mechanical' as IssueCategory,
  })

  const { can } = usePermissions()
  const canManage = can(PERMISSIONS.MACHINES_CREATE)
  const canReportFault = can(PERMISSIONS.FAULTS_REPORT)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)

  const filtered = useMemo(() => {
    const query = debouncedSearch.toLowerCase()
    return machines.filter((machine) => {
      const matchesStatus = statusFilter === 'All' || machine.status === statusFilter
      const matchesQuery =
        !query ||
        machine.id.toLowerCase().includes(query) ||
        machine.name.toLowerCase().includes(query) ||
        machine.model.toLowerCase().includes(query) ||
        machine.site.toLowerCase().includes(query) ||
        machine.factoryGroup.toLowerCase().includes(query) ||
        machine.factory.toLowerCase().includes(query) ||
        machine.status.toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [machines, debouncedSearch, statusFilter])

  const pagination = useTablePagination(filtered, {
    pageSize: 5,
    resetKey: `${debouncedSearch}|${statusFilter}`,
  })
  const { pageItems } = pagination

  useEffect(() => {
    if (!focusId) return
    const machine = machines.find((item) => item.id === focusId)
    if (machine) {
      setViewMachine(machine)
      viewModal.open()
    }
  }, [focusId, machines])

  const openCreate = () => {
    setFormMode('create')
    setActiveFormTab('general')
    setForm(EMPTY_FORM(currentUser.name))
    formModal.open()
  }

  const openEdit = (machine: Machine) => {
    setFormMode('edit')
    setActiveFormTab('general')
    setForm({
      id: machine.id,
      name: machine.name,
      model: machine.model,
      site: machine.site,
      factoryGroup: machine.factoryGroup,
      factory: machine.factory,
      installDate: machine.installDate,
      installedBy: machine.installedBy,
      status: machine.status,
      cert_reference: machine.cert_reference,
      cert_calibration: machine.cert_calibration,
      cert_warranty: machine.cert_warranty,
      cert_contract: machine.cert_contract,
      client_name: machine.client_name,
      client_contact_person: machine.client_contact_person,
      client_phone_number: machine.client_phone_number,
      client_system: machine.client_system,
      client_customer_code: machine.client_customer_code,
      client_job_title: machine.client_job_title,
      client_email: machine.client_email,
      client_expired_date: machine.client_expired_date,
      client_date_of_manufacture: machine.client_date_of_manufacture,
      tech_freq: machine.tech_freq,
      tech_voltage: machine.tech_voltage,
      tech_amp: machine.tech_amp,
      tech_total_mc_power: machine.tech_total_mc_power,
      tech_ups: machine.tech_ups,
      tech_chiller_cooling_system: machine.tech_chiller_cooling_system,
      tech_chiller_absorbed_power: machine.tech_chiller_absorbed_power,
      tech_smoke_extractor: machine.tech_smoke_extractor,
      tech_room_temp: machine.tech_room_temp,
      sign_completed: machine.sign_completed,
      sign_incompleted: machine.sign_incompleted,
      sign_signed_by: machine.sign_signed_by,
      sign_technician_signature: machine.sign_technician_signature,
      sign_date: machine.sign_date,
    })
    formModal.open()
  }

  const openView = (machine: Machine) => {
    setViewMachine(machine)
    viewModal.open()
  }

  const openDelete = (machine: Machine) => {
    setDeleteTarget(machine)
    deleteModal.open()
  }

  const openFault = (machine: Machine) => {
    setViewMachine(machine)
    setNewFault({ description: '', severity: 'Medium', category: 'Mechanical' })
    faultModal.open()
  }

  const saveMachine = async () => {
    if (!form.id.trim() || !form.name.trim() || !form.installDate || saving) return

    if (formMode === 'create') {
      const id = form.id.toUpperCase()
      if (machines.some((machine) => machine.id === id)) return
      const created = await onCreate({ ...form, id })
      if (created) {
        formModal.close()
        setViewMachine(created)
      }
      return
    }

    const existing = machines.find((machine) => machine.id === form.id)
    if (!existing?.dbId) return

    const updated = await onUpdate(existing.dbId, form)
    if (updated) {
      formModal.close()
      if (viewMachine?.id === updated.id) setViewMachine(updated)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.dbId || saving) return
    const deleted = await onDelete(deleteTarget.dbId)
    if (!deleted) return

    if (viewMachine?.id === deleteTarget.id) {
      viewModal.close()
      setViewMachine(null)
    }
    deleteModal.close()
    setDeleteTarget(null)
  }

  const reportFault = async () => {
    if (!viewMachine || !newFault.description.trim()) return
    const created = await onCreateFaultReport({
      machineId: viewMachine.id,
      description: newFault.description.trim(),
      severity: newFault.severity,
      category: newFault.category,
    })
    if (!created) return
    setNewFault({ description: '', severity: 'Medium', category: 'Mechanical' })
    faultModal.close()
  }

  const machineMeta = (machineId: string) => {
    const repairCount = repairRecords.filter((record) => record.machineId === machineId).length
    const openFaultCount = faultReports.filter(
      (fault) => fault.machineId === machineId && fault.status === 'Open'
    ).length
    return { repairCount, openFaultCount }
  }

  const activeView = viewMachine
    ? machines.find((machine) => machine.id === viewMachine.id) ?? viewMachine
    : null

  const viewOrders = activeView ? workOrders.filter((order) => order.machineId === activeView.id) : []
  const viewRepairs = activeView ? repairRecords.filter((record) => record.machineId === activeView.id) : []
  const viewFaults = activeView ? faultReports.filter((fault) => fault.machineId === activeView.id) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search ID, name, site, model…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className={`${selectCls} sm:w-44`}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as MachineStatus | 'All')}
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex shrink-0 gap-2">
          {canManage && (
            <Button onClick={openCreate} disabled={loading || saving}>
              <Plus size={16} />
              Add machine
            </Button>
          )}
          <Button variant="outline" onClick={() => onRefresh()} disabled={loading || saving}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading machines from server…
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="px-4">ID</TableHead>
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Model</TableHead>
              <TableHead className="px-4">Site</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Warranty</TableHead>
              <TableHead className="px-4 text-center">Faults</TableHead>
              <TableHead className="px-4 text-center">Repairs</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No machines found
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((machine) => {
                const warranty = warrantyStatus(machine.installDate, machine.cert_warranty)
                const { repairCount, openFaultCount } = machineMeta(machine.id)

                return (
                  <TableRow key={machine.id}>
                    <TableCell className="px-4 font-mono font-semibold text-primary">{machine.id}</TableCell>
                    <TableCell className="px-4 font-medium">{machine.name}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">{machine.model}</TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin size={12} />
                        {machine.site}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge className={statusColor(machine.status)}>
                        {machineStatusIcon(machine.status)}
                        {machine.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          warranty.active ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {warranty.active ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {warranty.label}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      {openFaultCount > 0 ? (
                        <Badge className="bg-red-100 text-red-700">
                          <Flag size={10} />
                          {openFaultCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      {repairCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Wrench size={12} />
                          {repairCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openView(machine)} aria-label="View">
                          <Eye size={15} />
                        </Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(machine)} aria-label="Edit">
                            <Pencil size={15} />
                          </Button>
                        )}
                        {canReportFault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-red-600 hover:text-red-700"
                            onClick={() => openFault(machine)}
                            aria-label="Report fault"
                          >
                            <Flag size={15} />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => openDelete(machine)}
                            aria-label="Delete"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        )}

        <TablePaginationBar
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageNumbers={pagination.pageNumbers}
          disabled={loading}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          label="machine(s)"
        />
      </Card>

      {formModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Wrench className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {formMode === 'create' ? 'Add New Machine' : 'Edit Machine'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Fill in the machine specifications and installation certificate details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={formModal.close}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border bg-muted/20 px-6 pt-2 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                  activeFormTab === 'general'
                    ? 'border-primary text-primary bg-card rounded-t-lg shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-lg'
                }`}
              >
                <Building className="size-4" />
                <span>1. General Details</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('certificate')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                  activeFormTab === 'certificate'
                    ? 'border-primary text-primary bg-card rounded-t-lg shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-lg'
                }`}
              >
                <FileText className="size-4" />
                <span>2. Certificate & Client</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('technical')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                  activeFormTab === 'technical'
                    ? 'border-primary text-primary bg-card rounded-t-lg shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-lg'
                }`}
              >
                <Sliders className="size-4" />
                <span>3. Specs & Signatures</span>
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Machine ID">
                      <input
                        className={`${inputCls} font-mono uppercase font-semibold`}
                        placeholder="MCH-0XXX"
                        value={form.id}
                        disabled={formMode === 'edit'}
                        onChange={(event) => setForm({ ...form, id: event.target.value })}
                      />
                    </FormField>
                    <FormField label="Status">
                      <select
                        className={selectCls}
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value as MachineStatus })}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Machine Name">
                      <input
                        className={inputCls}
                        placeholder="e.g. CNC Milling Unit #4"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                      />
                    </FormField>
                    <FormField label="Model">
                      <input
                        className={inputCls}
                        placeholder="e.g. Haas VF-2SS"
                        value={form.model}
                        onChange={(event) => setForm({ ...form, model: event.target.value })}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Site">
                      <select
                        className={selectCls}
                        value={form.site}
                        onChange={(event) => {
                          const siteVal = event.target.value
                          const sitePresets: Record<string, { group: string; factory: string }> = {
                            'Plant A': { group: 'North America Manufacturing', factory: 'Detroit Assembly' },
                            'Plant B': { group: 'North America Manufacturing', factory: 'Ohio Stamping Plant' },
                            'Plant C': { group: 'European Operations', factory: 'Stuttgart Precision' },
                            'Plant D': { group: 'Asia Pacific Mfg', factory: 'Yokohama Machining' },
                          }
                          const preset = sitePresets[siteVal]
                          setForm({
                            ...form,
                            site: siteVal,
                            ...(preset ? { factoryGroup: preset.group, factory: preset.factory } : {}),
                          })
                        }}
                      >
                        {SITES.map((site) => (
                          <option key={site} value={site}>
                            {site}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Install Date">
                      <input
                        type="date"
                        className={inputCls}
                        value={form.installDate}
                        onChange={(event) => setForm({ ...form, installDate: event.target.value })}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Factory Group">
                      <input
                        type="text"
                        className={`${inputCls} bg-background text-foreground cursor-text`}
                        placeholder="e.g. North America Manufacturing"
                        value={form.factoryGroup}
                        readOnly={false}
                        disabled={false}
                        onChange={(event) => setForm({ ...form, factoryGroup: event.target.value })}
                      />
                    </FormField>
                    <FormField label="Factory">
                      <input
                        type="text"
                        className={`${inputCls} bg-background text-foreground cursor-text`}
                        placeholder="e.g. Detroit Assembly"
                        value={form.factory}
                        readOnly={false}
                        disabled={false}
                        onChange={(event) => setForm({ ...form, factory: event.target.value })}
                      />
                    </FormField>
                  </div>

                  <FormField label="Installed By">
                    <input
                      type="text"
                      className={`${inputCls} bg-background text-foreground cursor-text`}
                      placeholder="Technician or Engineer Name"
                      value={form.installedBy}
                      readOnly={false}
                      disabled={false}
                      onChange={(event) => setForm({ ...form, installedBy: event.target.value })}
                    />
                  </FormField>
                </div>
              )}

              {activeFormTab === 'certificate' && (
                <div className="space-y-6">
                  {/* Header Info Section */}
                  <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <FileText className="size-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Certificate Header Details</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField label="Reference Number">
                        <input className={inputCls} placeholder="e.g. CERT-2026-001" value={form.cert_reference || ''} onChange={(e) => setForm({ ...form, cert_reference: e.target.value })} />
                      </FormField>
                      <FormField label="Calibration Info">
                        <input className={inputCls} placeholder="e.g. ISO 9001 Standard" value={form.cert_calibration || ''} onChange={(e) => setForm({ ...form, cert_calibration: e.target.value })} />
                      </FormField>
                      <FormField label="Warranty Period">
                        <select
                          className={selectCls}
                          value={form.cert_warranty || ''}
                          onChange={(e) => setForm({ ...form, cert_warranty: e.target.value })}
                        >
                          <option value="" disabled>Select warranty period</option>
                          {Array.from({ length: 10 }, (_, i) => `${i + 1} Year${i > 0 ? 's' : ''}`).map((period) => (
                            <option key={period} value={period}>
                              {period}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Contract Reference">
                        <input className={inputCls} placeholder="e.g. CNT-88421" value={form.cert_contract || ''} onChange={(e) => setForm({ ...form, cert_contract: e.target.value })} />
                      </FormField>
                    </div>
                  </div>

                  {/* Client Details Section */}
                  <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <User className="size-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Client & Customer Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField label="Client Company / Name">
                        <input className={inputCls} placeholder="Client Name" value={form.client_name || ''} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                      </FormField>
                      <FormField label="Contact Person">
                        <input className={inputCls} placeholder="Primary Contact" value={form.client_contact_person || ''} onChange={(e) => setForm({ ...form, client_contact_person: e.target.value })} />
                      </FormField>
                      <FormField label="Phone Number">
                        <input className={inputCls} placeholder="+1-555-..." value={form.client_phone_number || ''} onChange={(e) => setForm({ ...form, client_phone_number: e.target.value })} />
                      </FormField>
                      <FormField label="System">
                        <input className={inputCls} placeholder="System Type" value={form.client_system || ''} onChange={(e) => setForm({ ...form, client_system: e.target.value })} />
                      </FormField>
                      <FormField label="Customer Code">
                        <input className={inputCls} placeholder="CUST-000" value={form.client_customer_code || ''} onChange={(e) => setForm({ ...form, client_customer_code: e.target.value })} />
                      </FormField>
                      <FormField label="Job Title">
                        <input className={inputCls} placeholder="Plant Manager" value={form.client_job_title || ''} onChange={(e) => setForm({ ...form, client_job_title: e.target.value })} />
                      </FormField>
                      <FormField label="Email Address">
                        <input type="email" className={inputCls} placeholder="client@example.com" value={form.client_email || ''} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
                      </FormField>
                      <FormField label="Expired Date">
                        <input type="date" className={inputCls} value={form.client_expired_date || ''} onChange={(e) => setForm({ ...form, client_expired_date: e.target.value })} />
                      </FormField>
                      <FormField label="Date of Manufacture">
                        <input type="date" className={inputCls} value={form.client_date_of_manufacture || ''} onChange={(e) => setForm({ ...form, client_date_of_manufacture: e.target.value })} />
                      </FormField>
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'technical' && (
                <div className="space-y-6">
                  {/* Technical Parameters */}
                  <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Sliders className="size-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Technical & Electrical Specifications</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField label="Frequency (Hz)"><input className={inputCls} placeholder="50/60 Hz" value={form.tech_freq || ''} onChange={(e) => setForm({ ...form, tech_freq: e.target.value })} /></FormField>
                      <FormField label="Voltage (V)"><input className={inputCls} placeholder="400 V" value={form.tech_voltage || ''} onChange={(e) => setForm({ ...form, tech_voltage: e.target.value })} /></FormField>
                      <FormField label="Amperage (A)"><input className={inputCls} placeholder="32 A" value={form.tech_amp || ''} onChange={(e) => setForm({ ...form, tech_amp: e.target.value })} /></FormField>
                      <FormField label="Total MC Power"><input className={inputCls} placeholder="15 kW" value={form.tech_total_mc_power || ''} onChange={(e) => setForm({ ...form, tech_total_mc_power: e.target.value })} /></FormField>
                      <FormField label="UPS System"><input className={inputCls} placeholder="Online 10kVA" value={form.tech_ups || ''} onChange={(e) => setForm({ ...form, tech_ups: e.target.value })} /></FormField>
                      <FormField label="Chiller Cooling"><input className={inputCls} placeholder="Water Cooled" value={form.tech_chiller_cooling_system || ''} onChange={(e) => setForm({ ...form, tech_chiller_cooling_system: e.target.value })} /></FormField>
                      <FormField label="Chiller Absorbed Power"><input className={inputCls} placeholder="5.5 kW" value={form.tech_chiller_absorbed_power || ''} onChange={(e) => setForm({ ...form, tech_chiller_absorbed_power: e.target.value })} /></FormField>
                      <FormField label="Smoke Extractor"><input className={inputCls} placeholder="Active / Integrated" value={form.tech_smoke_extractor || ''} onChange={(e) => setForm({ ...form, tech_smoke_extractor: e.target.value })} /></FormField>
                      <FormField label="Room Temp (°C)"><input className={inputCls} placeholder="22°C" value={form.tech_room_temp || ''} onChange={(e) => setForm({ ...form, tech_room_temp: e.target.value })} /></FormField>
                    </div>
                  </div>

                  {/* Signatures & Verification */}
                  <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <FileCheck className="size-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Signatures & Signoff Status</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Signed By (Name)">
                        <input className={inputCls} placeholder="Client Representative Name" value={form.sign_signed_by || ''} onChange={(e) => setForm({ ...form, sign_signed_by: e.target.value })} />
                      </FormField>
                      <FormField label="Technician Signature (Name/Initials)">
                        <input className={inputCls} placeholder="Technician Name" value={form.sign_technician_signature || ''} onChange={(e) => setForm({ ...form, sign_technician_signature: e.target.value })} />
                      </FormField>
                      <FormField label="Signature Date">
                        <input type="date" className={inputCls} value={form.sign_date || ''} onChange={(e) => setForm({ ...form, sign_date: e.target.value })} />
                      </FormField>
                      
                      <div className="flex flex-col justify-center space-y-2 rounded-lg border border-border bg-card p-3">
                        <span className="text-xs font-medium text-muted-foreground mb-1">Installation Status:</span>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input type="checkbox" className="size-4 rounded accent-primary" checked={form.sign_completed || false} onChange={(e) => setForm({ ...form, sign_completed: e.target.checked })} />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Completed</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input type="checkbox" className="size-4 rounded accent-primary" checked={form.sign_incompleted || false} onChange={(e) => setForm({ ...form, sign_incompleted: e.target.checked })} />
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">Incompleted</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-2">
                {activeFormTab !== 'general' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveFormTab(activeFormTab === 'technical' ? 'certificate' : 'general')}
                  >
                    Previous Step
                  </Button>
                )}
                {activeFormTab !== 'technical' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveFormTab(activeFormTab === 'general' ? 'certificate' : 'technical')}
                  >
                    Next Step
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={formModal.close}>
                  Cancel
                </Button>
                <Button onClick={saveMachine} disabled={!form.id.trim() || !form.name.trim() || !form.installDate || saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {formMode === 'create' ? 'Create Machine' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewModal.isOpen && activeView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-border bg-card px-6 py-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-primary">{activeView.id}</span>
                  <Badge className={statusColor(activeView.status)}>
                    {machineStatusIcon(activeView.status)}
                    {activeView.status}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold">{activeView.name}</h2>
                <p className="text-sm text-muted-foreground">{activeView.model}</p>
              </div>
              <button type="button" onClick={viewModal.close} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Location</p>
                  <p className="mt-1 text-sm font-medium">{activeView.site}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeView.factoryGroup} → {activeView.factory}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Install date</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(activeView.installDate)}</p>
                  <p className="text-xs text-muted-foreground">By {activeView.installedBy}</p>
                </div>
              </div>

              {viewFaults.filter((fault) => fault.status === 'Open').length > 0 && (
                <Card className="overflow-hidden border-red-200">
                  <div className="border-b border-border bg-red-50 px-4 py-2 text-sm font-semibold text-red-800">
                    Open faults
                  </div>
                  <div className="divide-y divide-border">
                    {viewFaults
                      .filter((fault) => fault.status === 'Open')
                      .map((fault) => (
                        <button
                          key={fault.id}
                          type="button"
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30"
                          onClick={() => onNavigate('faults', fault.id)}
                        >
                          <Badge className={severityColor(fault.severity)}>{fault.severity}</Badge>
                          <p className="flex-1 text-sm">{fault.description}</p>
                        </button>
                      ))}
                  </div>
                </Card>
              )}

              {viewRepairs.length > 0 && (
                <Card className="p-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Repair summary</p>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-2xl font-bold text-primary">{viewRepairs.length}</p>
                      <p className="text-xs text-muted-foreground">Repairs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fmtCurrency(viewRepairs.reduce((sum, record) => sum + record.totalCost, 0))}</p>
                      <p className="text-xs text-muted-foreground">Total cost</p>
                    </div>
                    <div>
                      <Button variant="outline" size="sm" onClick={() => onNavigate('repairs', activeView.id)}>
                        View records
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {viewOrders.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="border-b border-border px-4 py-2 text-sm font-semibold">Work orders</div>
                  <div className="divide-y divide-border">
                    {viewOrders.map((order) => (
                      <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{order.title}</p>
                          <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                        </div>
                        <Badge className={woStatusColor(order.status)}>
                          {woStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer size={14} className="mr-2" />
                  Print Certificate
                </Button>
                {canManage && (
                  <Button variant="outline" onClick={() => { viewModal.close(); openEdit(activeView) }}>
                    <Pencil size={14} className="mr-2" />
                    Edit
                  </Button>
                )}
                {canReportFault && (
                  <Button variant="outline" className="text-red-600" onClick={() => { viewModal.close(); openFault(activeView) }}>
                    <Flag size={14} />
                    Report fault
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {faultModal.isOpen && viewMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-semibold">Report Fault</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  New fault report for {viewMachine.id} — {viewMachine.name}
                </p>
              </div>
              <button type="button" onClick={faultModal.close} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <FormField label="Description">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  value={newFault.description}
                  onChange={(event) => setNewFault({ ...newFault, description: event.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Severity">
                  <select
                    className={selectCls}
                    value={newFault.severity}
                    onChange={(event) => setNewFault({ ...newFault, severity: event.target.value as FaultSeverity })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </FormField>
                <FormField label="Category">
                  <select
                    className={selectCls}
                    value={newFault.category}
                    onChange={(event) => setNewFault({ ...newFault, category: event.target.value as IssueCategory })}
                  >
                    {ISSUE_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              {newFault.severity === 'Critical' && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Critical severity — stop using the machine if safe to do so.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={faultModal.close}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={reportFault} disabled={!newFault.description.trim()}>
                Submit fault
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">Delete machine</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-muted-foreground">
                Remove <span className="font-mono font-semibold text-foreground">{deleteTarget.id}</span> ({deleteTarget.name}) from the registry? This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={deleteModal.close}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeView && <MachineCertificatePrint machine={activeView} />}
    </div>
  )
}
