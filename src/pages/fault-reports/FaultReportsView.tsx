import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Download, Flag, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { CATEGORY_COLORS, ISSUE_CATEGORIES } from '@/pages/dashboard/constants'
import { PERMISSIONS } from '@/pages/dashboard/permissions'
import { usePermissions } from '@/hooks/permission/usePermissions'
import { TablePaginationBar, useTablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge, Card, FormField, inputCls, selectCls } from '@/pages/dashboard/components/DashboardUI'
import { formatDate, warrantyStatus } from '@/pages/dashboard/utils/formatters'
import { severityColor } from '@/pages/dashboard/utils/statusHelpers'
import { downloadFaultReportsExcel } from './exportFaultReports'
import type { FaultFormData } from './faultMapper'
import type { AppUser, FaultReport, FaultSeverity, IssueCategory, Machine, WorkOrder } from '@/pages/dashboard/types'

const EMPTY_FAULT_FORM: FaultFormData = {
  machineId: '',
  description: '',
  severity: 'Medium',
  category: 'Mechanical',
}

export function FaultReportsView({
  faultReports,
  machines,
  users,
  onNavigate,
  focusId,
  onDismiss,
  onConvert,
  onCreate,
}: {
  faultReports: FaultReport[]
  machines: Machine[]
  users: AppUser[]
  onNavigate: (view: string, id?: string) => void
  focusId?: string
  onDismiss: (dbId: number) => Promise<boolean>
  onConvert: (
    fault: FaultReport,
    assign: { technicianId: string; priority: 'Low' | 'Medium' | 'High' }
  ) => Promise<WorkOrder | null>
  onCreate: (form: FaultFormData) => Promise<FaultReport | null>
}) {
  const { can } = usePermissions()
  const canReport = can(PERMISSIONS.FAULTS_REPORT)
  const canConvert = can(PERMISSIONS.FAULTS_CONVERT)
  const canDismiss = can(PERMISSIONS.FAULTS_DISMISS)
  const [filter, setFilter] = useState<string>('All')
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null)
  const [showAssign, setShowAssign] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [form, setForm] = useState<FaultFormData>(EMPTY_FAULT_FORM)
  const [assignData, setAssignData] = useState({
    technicianId: '',
    priority: 'High' as 'Low' | 'Medium' | 'High',
  })

  const selected = faultReports.find((f) => f.id === selectedId) ?? null
  const getMachine = (id: string) => machines.find((m) => m.id === id)
  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? id

  const filtered = useMemo(() => {
    const base = filter === 'All' ? faultReports : faultReports.filter((f) => f.status === filter)
    return [...base].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [faultReports, filter])

  const pagination = useTablePagination(filtered, {
    pageSize: 5,
    resetKey: filter,
  })
  const { pageItems } = pagination

  const dismiss = async (f: FaultReport) => {
    if (!f.dbId) return
    await onDismiss(f.dbId)
  }

  const submitReport = async () => {
    if (!form.machineId || !form.description.trim() || saving) return
    setSaving(true)
    try {
      const created = await onCreate({
        ...form,
        description: form.description.trim(),
      })
      if (!created) return
      setShowReport(false)
      setForm(EMPTY_FAULT_FORM)
      setSelectedId(created.id)
    } finally {
      setSaving(false)
    }
  }

  const createWOFromFault = async () => {
    if (!selected || !assignData.technicianId || converting) return
    setConverting(true)
    try {
      const order = await onConvert(selected, {
        technicianId: assignData.technicianId,
        priority: assignData.priority,
      })
      if (!order) return
      setShowAssign(false)
      setAssignData({ technicianId: '', priority: 'High' })
      onNavigate('workorders', order.id)
    } finally {
      setConverting(false)
    }
  }

  const stats = {
    open: faultReports.filter((f) => f.status === 'Open').length,
    critical: faultReports.filter((f) => f.status === 'Open' && f.severity === 'Critical').length,
    high: faultReports.filter((f) => f.status === 'Open' && f.severity === 'High').length,
    converted: faultReports.filter((f) => f.status === 'Converted').length,
  }

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error('No fault reports to export')
      return
    }
    downloadFaultReportsExcel(filtered, machines, users)
    toast.success(`Exported ${filtered.length} fault report(s)`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fault Reports</h2>
          <p className="text-sm text-muted-foreground">
            Reports of machine faults — submit a report, track it, or convert it to a work order.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="size-4" />
            Download Excel
          </Button>
          {canReport && (
            <Button
              onClick={() => {
                setForm(EMPTY_FAULT_FORM)
                setShowReport(true)
              }}
            >
              <Plus className="size-4" />
              Report Fault
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Open reports</p>
          <p className={`mt-0.5 text-2xl font-bold ${stats.open > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.open}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Critical</p>
          <p className={`mt-0.5 text-2xl font-bold ${stats.critical > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>{stats.critical}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">High Priority</p>
          <p className={`mt-0.5 text-2xl font-bold ${stats.high > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{stats.high}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Converted to WO</p>
          <p className="mt-0.5 text-2xl font-bold text-green-600">{stats.converted}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1">
        {['All', 'Open', 'Converted', 'Dismissed'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1.5 font-mono text-xs transition-colors ${filter === s ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:border-primary/40'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-3">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-3 py-2 text-xs font-semibold">Report & Machine</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold text-center">Priority</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        No fault reports found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((f) => {
                      const isSelected = selectedId === f.id
                      return (
                        <TableRow
                          key={f.id}
                          onClick={() => setSelectedId(f.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
                        >
                          <TableCell className="px-3 py-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-xs font-bold text-foreground">{f.id}</span>
                              <span className="font-mono text-xs text-primary font-semibold">{f.machineId}</span>
                            </div>
                            <p className="line-clamp-1 text-xs text-foreground/90">{f.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDate(f.createdAt)} · {getUserName(f.reportedBy)}
                            </p>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-middle text-center">
                            <Badge className={severityColor(f.severity)}>{f.severity}</Badge>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-middle text-right">
                            <Badge
                              className={
                                f.status === 'Open'
                                  ? 'bg-red-100 text-red-700'
                                  : f.status === 'Converted'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                              }
                            >
                              {f.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              pageNumbers={pagination.pageNumbers}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              label="fault report(s)"
            />
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <Card className="flex h-64 flex-col items-center justify-center text-center">
              <Flag size={36} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a fault report to view details</p>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{selected.id}</span>
                    <Badge className={severityColor(selected.severity)}>{selected.severity}</Badge>
                    <Badge
                      className={
                        selected.status === 'Open'
                          ? 'bg-red-100 text-red-700'
                          : selected.status === 'Converted'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {selected.status}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold">{selected.machineId}</h3>
                  <p className="text-sm text-muted-foreground">{getMachine(selected.machineId)?.name ?? 'Unknown machine'}</p>
                </div>
                {(() => {
                  const machine = getMachine(selected.machineId)
                  const w = machine ? warrantyStatus(machine.installDate) : null
                  return w ? (
                    <span className={`inline-flex items-center gap-1 text-xs ${w.active ? 'text-green-600' : 'text-red-600'}`}>
                      {w.active ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                      Warranty {w.label}
                    </span>
                  ) : null
                })()}
              </div>
              <p className="text-sm leading-relaxed">{selected.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium" style={{ color: CATEGORY_COLORS[selected.category] }}>{selected.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported by</p>
                  <p className="font-medium">{getUserName(selected.reportedBy)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported on</p>
                  <p className="font-medium">{formatDate(selected.createdAt)}</p>
                </div>
                {selected.convertedToWO && (
                  <div>
                    <p className="text-xs text-muted-foreground">Work order</p>
                    <button
                      type="button"
                      className="font-mono font-medium text-primary hover:underline"
                      onClick={() => onNavigate('workorders', selected.convertedToWO)}
                    >
                      {selected.convertedToWO}
                    </button>
                  </div>
                )}
              </div>
              {selected.status === 'Open' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                  {canConvert && (
                    <Button onClick={() => setShowAssign(true)}>
                      <ArrowRight size={15} />
                      Create Work Order from Fault
                    </Button>
                  )}
                  {canDismiss && (
                    <Button variant="outline" onClick={() => dismiss(selected)}>
                      Dismiss report
                    </Button>
                  )}
                </div>
              )}
              {selected.status === 'Converted' && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle2 size={15} />
                  Converted to work order {selected.convertedToWO}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="font-semibold">Report Fault</h2>
                <p className="text-xs text-muted-foreground">Submit a report for a machine fault</p>
              </div>
              <button type="button" onClick={() => setShowReport(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <FormField label="Machine">
                <select
                  className={selectCls}
                  value={form.machineId}
                  onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                >
                  <option value="">Select machine…</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.id} — {machine.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Fault description">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  placeholder="What is wrong with the machine?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Severity">
                  <select
                    className={selectCls}
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as FaultSeverity })}
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
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as IssueCategory })}
                  >
                    {ISSUE_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={submitReport}
                disabled={!form.machineId || !form.description.trim() || saving}
              >
                Submit fault report
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAssign && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold">Create Work Order from Fault</h2>
              <button type="button" onClick={() => setShowAssign(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-xs font-mono text-muted-foreground">Fault description (pre-filled)</p>
              <p className="rounded-lg border bg-muted/30 p-3 text-sm">{selected.description}</p>
              <FormField label="Assign technician">
                <select
                  className={selectCls}
                  value={assignData.technicianId}
                  onChange={(e) => setAssignData({ ...assignData, technicianId: e.target.value })}
                >
                  <option value="">Select technician…</option>
                  {users.filter((u) => u.role === 'Technician').map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Priority">
                <select
                  className={selectCls}
                  value={assignData.priority}
                  onChange={(e) => setAssignData({ ...assignData, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </FormField>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button onClick={createWOFromFault} disabled={!assignData.technicianId || converting}>
                Create work order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
