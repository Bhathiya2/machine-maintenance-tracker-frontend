import { AlertTriangle, ArrowRight, BarChart2, ChevronRight, Cpu, Flag } from 'lucide-react'
import { Badge, Card } from '@/pages/dashboard/components/DashboardUI'
import { fmtCurrency, formatDate, warrantyStatus } from '@/pages/dashboard/utils/formatters'
import { machineStatusIcon, priorityColor, severityColor, statusColor, woStatusColor, woStatusIcon } from '@/pages/dashboard/utils/statusHelpers'
import type { FaultReport, Machine, RepairRecord, WorkOrder } from '@/pages/dashboard/types'

export function DashboardView({
  machines, workOrders, repairRecords, faultReports, onNavigate,
}: {
  machines: Machine[]; workOrders: WorkOrder[];
  repairRecords: RepairRecord[]; faultReports: FaultReport[];
  onNavigate: (view: string, id?: string) => void;
}) {
  const stats = {
    total: machines.length,
    operational: machines.filter((m) => m.status === "Operational").length,
  };
  const totalRepairCost = repairRecords.reduce((s, r) => s + r.totalCost, 0);
  const openFaults = faultReports.filter((f) => f.status === "Open");
  const openOrders = workOrders.filter((w) => w.status !== "Verified & Closed" && w.status !== "Cancelled");
  const recentOrders = [...workOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Total Machines</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">Across all sites</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Operational</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.operational}</p>
          <div className="w-full h-1 bg-gray-100 rounded-full mt-2">
            <div className="h-1 bg-green-500 rounded-full" style={{ width: `${(stats.operational / stats.total) * 100}%` }} />
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Open Faults</p>
            <p className={`text-3xl font-bold mt-1 ${openFaults.length > 0 ? "text-red-600" : "text-green-600"}`}>{openFaults.length}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onNavigate("faults")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/90 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-all hover:bg-red-600 hover:text-white hover:shadow dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white cursor-pointer group"
            >
              <Flag size={13} className="shrink-0" />
              <span>View fault reports</span>
              <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Total Repair Cost YTD</p>
            <p className="text-3xl font-bold text-foreground mt-1">{fmtCurrency(totalRepairCost)}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onNavigate("analytics")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-all hover:bg-primary hover:text-primary-foreground hover:shadow cursor-pointer group"
            >
              <BarChart2 size={13} className="shrink-0" />
              <span>View analytics</span>
              <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </Card>
      </div>

      {openFaults.length > 0 && (
        <Card className="border-l-4 border-l-red-500 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2">
            <Flag size={16} className="text-red-500" />
            <h2 className="font-semibold text-foreground">Open Fault Reports</h2>
            <span className="ml-auto text-xs font-mono text-muted-foreground">Awaiting manager action</span>
          </div>
          <div className="divide-y divide-border">
            {openFaults.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 cursor-pointer" onClick={() => onNavigate("faults", f.id)}>
                <Badge className={severityColor(f.severity)}>{f.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{f.machineId}</span>
                  <span className="text-sm text-foreground">{f.description.slice(0, 70)}…</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(f.createdAt)}</span>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Work Orders</h2>
            <button onClick={() => onNavigate("workorders")} className="text-xs font-mono text-foreground hover:text-foreground transition-colors">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((wo) => (
              <div key={wo.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onNavigate("workorders", wo.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{wo.id}</span>
                    <Badge className={woStatusColor(wo.status)}>{woStatusIcon(wo.status)}{wo.status}</Badge>
                    <Badge className={priorityColor(wo.priority)}>{wo.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">{wo.title}</p>
                  <p className="text-xs text-muted-foreground">{wo.machineId}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-foreground">Fleet at a Glance</h2></div>
          <div className="divide-y divide-border">
            {machines.map((m) => {
              const w = warrantyStatus(m.installDate);
              const openFaultCount = faultReports.filter((f) => f.machineId === m.id && f.status === "Open").length;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onNavigate("machines", m.id)}>
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0"><Cpu size={16} className="text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-primary">{m.id}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.site}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusColor(m.status)}>{machineStatusIcon(m.status)}{m.status}</Badge>
                    {openFaultCount > 0 && <Badge className="bg-red-100 text-red-700"><Flag size={10} />{openFaultCount}</Badge>}
                    {!w.active && <Badge className="bg-red-50 text-red-600">Warranty Expired</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {openOrders.filter((w) => w.status === "Work Completed").length > 0 && (
        <Card className="border-l-4 border-l-accent overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-foreground" />
            <h2 className="font-semibold text-foreground">Pending Verification</h2>
            <span className="ml-auto text-xs font-mono text-muted-foreground">Action required by Owner</span>
          </div>
          <div className="divide-y divide-border">
            {openOrders.filter((w) => w.status === "Work Completed").map((wo) => (
              <div key={wo.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 cursor-pointer" onClick={() => onNavigate("workorders", wo.id)}>
                <span className="font-mono text-sm font-semibold text-foreground">{wo.id}</span>
                <span className="text-sm text-foreground">{wo.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">{wo.machineId}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

