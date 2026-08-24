import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trash2,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import type { WorkOrderFilters } from "@/interfaces/all/workOrder";
import { useDebounce, useDisclosure } from "@/hooks/base/commonHooks";
import { usePermissions } from "@/hooks/permission/usePermissions";
import {
  TablePaginationBar,
  useTablePagination,
} from "@/components/TablePagination";
import { PERMISSIONS } from "@/pages/dashboard/permissions";
import { WO_FLOW } from "@/pages/dashboard/constants";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
  Card,
  FormField,
  inputCls,
  selectCls,
} from "@/pages/dashboard/components/DashboardUI";
import { formatDate, warrantyStatus } from "@/pages/dashboard/utils/formatters";
import {
  priorityColor,
  woStatusColor,
  woStatusIcon,
} from "@/pages/dashboard/utils/statusHelpers";
import type { WorkOrderFormData } from "./workOrderMapper";
import {
  canTransitionTo,
  getNextWorkOrderActionStatus,
  isWoFinal,
  woActionLabel,
  woFlowIndex,
  woFlowLabel,
} from "./workOrderFlow";
import type {
  AppUser,
  FaultReport,
  Machine,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderCheckInSession,
} from "@/pages/dashboard/types";

const STATUSES: Array<WorkOrderStatus | "All"> = [
  "All",
  "New",
  "Inprogress",
  "Close",
  "Verified",
  "Finished",
];

const EMPTY_FORM: WorkOrderFormData = {
  machineId: "",
  title: "",
  description: "",
  assignedTo: "",
  priority: "Medium",
  status: "New",
  notes: "",
};

function activityActionLabel(action: string) {
  return action.replaceAll("_", " ").toUpperCase();
}

function activityFieldLabel(field: string) {
  const labels: Record<string, string> = {
    machine: "Machine",
    title: "Title",
    description: "Description",
    assigned_to: "Assigned To",
    status: "Status",
    priority: "Priority",
    notes: "Notes",
    fault_report_id: "Fault Ref",
    cost_entries: "Cost Entries",
    checked_in_at: "Checked In",
    checked_out_at: "Checked Out",
  };

  return labels[field] ?? field.replaceAll("_", " ");
}

function formatActivityValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  loading: boolean;
  saving: boolean;
  onRefresh: (filters?: WorkOrderFilters) => Promise<void>;
  onCreate: (
    form: WorkOrderFormData,
    createdBy: string,
  ) => Promise<WorkOrder | null>;
  onUpdate: (
    dbId: number,
    form: WorkOrderFormData,
  ) => Promise<WorkOrder | null>;
  onUpdateStatus: (
    dbId: number,
    status: WorkOrderStatus,
  ) => Promise<WorkOrder | null>;
  onUpdateNotes: (dbId: number, notes: string) => Promise<WorkOrder | null>;
  onAddTechnicianNotes: (
    dbId: number,
    notes: string,
  ) => Promise<WorkOrder | null>;
  onDelete: (dbId: number) => Promise<boolean>;
  onCheckIn: (dbId: number) => Promise<WorkOrder | null>;
  onCheckOut: (dbId: number) => Promise<WorkOrder | null>;
  onLoadCheckInSessions: (
    workOrderId: number,
  ) => Promise<WorkOrderCheckInSession[]>;
  machines: Machine[];
  users: AppUser[];
  currentUser: AppUser;
  focusId?: string;
  faultReports: FaultReport[];
  onRefreshNotifications?: () => Promise<void>;
}

export function WorkOrdersView({
  workOrders,
  loading,
  saving,
  onRefresh,
  onCreate,
  onUpdate,
  onUpdateStatus,
  onUpdateNotes,
  onAddTechnicianNotes,
  onDelete,
  onCheckIn,
  onCheckOut,
  onLoadCheckInSessions,
  machines,
  users,
  currentUser,
  focusId,
  onRefreshNotifications,
}: WorkOrdersViewProps) {
  const formModal = useDisclosure(false);
  const viewModal = useDisclosure(false);
  const deleteModal = useDisclosure(false);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<WorkOrderFormData>(EMPTY_FORM);
  const [viewOrder, setViewOrder] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [technicianNotesDraft, setTechnicianNotesDraft] = useState("");
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [checkInSessions, setCheckInSessions] = useState<
    WorkOrderCheckInSession[]
  >([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "All">(
    "All",
  );
  const [technicianFilter, setTechnicianFilter] = useState(
    currentUser.role === "Technician" ? currentUser.id : "All",
  );
  const [machineFilter, setMachineFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebounce(search, 250);
  const { can, canUpdateWorkOrderStatus, canUpdateWorkOrderNotes } =
    usePermissions();
  const technicians = users.filter((user) => user.role === "Technician");
  const canManage = can(PERMISSIONS.WORKORDERS_CREATE);

  const filters = useMemo<WorkOrderFilters>(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== "All" ? statusFilter : undefined,
      assigned_to: technicianFilter !== "All" ? technicianFilter : undefined,
      machine_number: machineFilter !== "All" ? machineFilter : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    }),
    [
      debouncedSearch,
      statusFilter,
      technicianFilter,
      machineFilter,
      dateFrom,
      dateTo,
    ],
  );

  useEffect(() => {
    onRefresh(filters);
  }, [filters, onRefresh]);

  useEffect(() => {
    if (!focusId) return;
    const order = workOrders.find((item) => item.id === focusId);
    if (order) {
      setViewOrder(order);
      setTechnicianNotesDraft("");
      setShowActivityLog(false);
      viewModal.open();
    }
  }, [focusId, workOrders]);

  useEffect(() => {
    if (!viewModal.isOpen) {
      setShowActivityLog(false);
    }
  }, [viewModal.isOpen]);

  const sortedOrders = useMemo(() => {
    const rank = (status: WorkOrderStatus) =>
      status === "Verified" || status === "Finished" ? 1 : 0;
    return [...workOrders].sort((a, b) => {
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [workOrders]);

  const pagination = useTablePagination(sortedOrders, {
    pageSize: 5,
    resetKey: filters,
  });
  const { pageItems } = pagination;

  const getUserName = (id: string) =>
    users.find((user) => user.id === id)?.name ?? id;

  const openCreate = () => {
    setFormMode("create");
    setForm(EMPTY_FORM);
    formModal.open();
  };

  const openEdit = (order: WorkOrder) => {
    setEditingOrderId(order.id);
    setFormMode("edit");
    setForm({
      machineId: order.machineId,
      title: order.title,
      description: order.description,
      assignedTo: order.assignedTo,
      priority: order.priority,
      status: order.status,
      notes: order.notes,
      faultReportId: order.faultReportId,
    });
    formModal.open();
  };

  const saveForm = async () => {
    if (!form.machineId || !form.title.trim() || !form.assignedTo || saving)
      return;

    if (formMode === "create") {
      const created = await onCreate(form, currentUser.id);
      if (created) {
        await onRefreshNotifications?.();
        formModal.close();
      }
      return;
    }

    const order = workOrders.find((item) => item.id === editingOrderId);
    if (!order?.dbId) return;
    const updated = await onUpdate(order.dbId, form);
    if (updated) {
      formModal.close();
      if (viewOrder?.id === updated.id) setViewOrder(updated);
    }
  };

  const openView = async (order: WorkOrder) => {
    setViewOrder(order);
    setTechnicianNotesDraft("");
    viewModal.open();
    if (order.dbId && currentUser.role === "Super Admin") {
      const sessions = await onLoadCheckInSessions(order.dbId);
      setCheckInSessions(sessions);
    } else {
      setCheckInSessions([]);
    }
  };

  const jumpStatus = async (order: WorkOrder, status: WorkOrderStatus) => {
    if (!order.dbId || !canTransitionTo(order.status, status)) return;
    const updated = await onUpdateStatus(order.dbId, status);
    if (updated) {
      setViewOrder(updated);
      await onRefreshNotifications?.();
    }
  };

  const checkIn = async (order: WorkOrder) => {
    if (!order.dbId) return;
    const updated = await onCheckIn(order.dbId);
    if (updated) {
      setViewOrder(updated);
      setForm((prev) => ({ ...prev }));
    }
  };

  const checkOut = async (order: WorkOrder) => {
    if (!order.dbId) return;
    const updated = await onCheckOut(order.dbId);
    if (updated) {
      setViewOrder(updated);
      setForm((prev) => ({ ...prev }));
    }
  };

  const saveTechnicianNotes = async () => {
    if (!viewOrder?.dbId) return;
    const updated = await onAddTechnicianNotes(
      viewOrder.dbId,
      technicianNotesDraft,
    );
    if (updated) {
      setViewOrder(updated);
      setTechnicianNotesDraft(""); // Clear the input field
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.dbId || saving) return;
    const deleted = await onDelete(deleteTarget.dbId);
    if (!deleted) return;
    if (viewOrder?.id === deleteTarget.id) {
      viewModal.close();
      setViewOrder(null);
    }
    deleteModal.close();
    setDeleteTarget(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTechnicianFilter("All");
    setMachineFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  const activeView = viewOrder
    ? (workOrders.find((order) => order.id === viewOrder.id) ?? viewOrder)
    : null;
  const nextStatus = activeView
    ? getNextWorkOrderActionStatus(activeView.status, currentUser.role)
    : null;
  const canAdvance =
    activeView && nextStatus
      ? canUpdateWorkOrderStatus(activeView, nextStatus)
      : false;
  const canReopen =
    activeView && activeView.status === "Close"
      ? canUpdateWorkOrderStatus(activeView, "New")
      : false;
  const isCheckedIn =
    activeView && activeView.active_technician_id === currentUser.id;
  const canEditTechnicianNotes = activeView
    ? canUpdateWorkOrderNotes(activeView)
    : false;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            className={selectCls}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as WorkOrderStatus | "All")
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All statuses" : status}
              </option>
            ))}
          </select>
          <select
            className={`${selectCls} min-w-[150px]`}
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
          >
            <option value="All">All technicians</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
          >
            <option value="All">All machines</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.id} — {machine.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/30">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 uppercase tracking-wider">From:</span>
            <input
              type="date"
              className="w-full bg-transparent text-xs text-foreground outline-none cursor-pointer"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/30">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 uppercase tracking-wider">To:</span>
            <input
              type="date"
              className="w-full bg-transparent text-xs text-foreground outline-none cursor-pointer"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefresh(filters)}
            disabled={loading || saving}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreate} disabled={loading || saving}>
              <Plus size={14} /> New work order
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && pageItems.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading work orders…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-4">Work order</TableHead>
                <TableHead className="px-4">Title</TableHead>
                <TableHead className="px-4">Machine</TableHead>
                <TableHead className="px-4">Technician</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Warranty</TableHead>
                <TableHead className="px-4">Priority</TableHead>
                <TableHead className="px-4">Created</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No work orders found
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((order) => (
                  <TableRow
                    key={order.id}
                    className={loading ? "opacity-60" : undefined}
                  >
                    <TableCell className="px-4 font-mono font-semibold text-primary">
                      {order.id}
                    </TableCell>
                    <TableCell className="px-4 max-w-[200px] truncate font-medium">
                      {order.title}
                    </TableCell>
                    <TableCell className="px-4 font-mono text-sm">
                      {order.machineId}
                    </TableCell>
                    <TableCell className="px-4 text-sm">
                      {getUserName(order.assignedTo)}
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge className={woStatusColor(order.status)}>
                        {woStatusIcon(order.status)}
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4">
                      {(() => {
                        const machine = machines.find(
                          (m) => m.id === order.machineId,
                        );
                        if (!machine || !machine.installDate)
                          return (
                            <span className="text-muted-foreground">—</span>
                          );
                        const warranty = warrantyStatus(
                          machine.installDate,
                          machine.cert_warranty,
                        );
                        return (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${warranty.active ? "text-emerald-700" : "text-red-700"}`}
                          >
                            {warranty.active ? (
                              <ShieldCheck size={12} />
                            ) : (
                              <ShieldAlert size={12} />
                            )}
                            {warranty.active ? "Active" : "Expired"}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge className={priorityColor(order.priority)}>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openView(order)}
                        >
                          <Eye size={15} />
                        </Button>
                        {canManage && (
                          <>
                            {!isWoFinal(order.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => openEdit(order)}
                              >
                                <Pencil size={15} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              onClick={() => {
                                setDeleteTarget(order);
                                deleteModal.open();
                              }}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
          label="work order(s)"
        />
      </Card>

      {formModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold">
                {formMode === "create"
                  ? "Create work order"
                  : "Edit work order"}
              </h2>
              <button type="button" onClick={formModal.close}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <FormField label="Machine">
                <select
                  className={selectCls}
                  value={form.machineId}
                  onChange={(e) =>
                    setForm({ ...form, machineId: e.target.value })
                  }
                >
                  <option value="">Select machine…</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.id} — {machine.name} ({machine.site})
                    </option>
                  ))}
                </select>
              </FormField>

              {(() => {
                if (!form.machineId) return null;
                const machine = machines.find((m) => m.id === form.machineId);
                if (!machine) return null;
                const warranty = machine.installDate
                  ? warrantyStatus(machine.installDate, machine.cert_warranty)
                  : null;

                return (
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>
                        <strong>Model:</strong> {machine.model}
                      </div>
                      <div>
                        <strong>Site:</strong> {machine.site}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span className="font-medium">{machine.status}</span>
                      </div>
                      {warranty && (
                        <div
                          className={`font-medium ${warranty.active ? "text-emerald-700" : "text-red-700"}`}
                        >
                          <strong>Warranty:</strong>{" "}
                          {warranty.active ? "Active" : "Expired"}
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            ({warranty.label})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <FormField label="Title">
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </FormField>
              <FormField label="Description">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Assign technician">
                  <select
                    className={selectCls}
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                  >
                    <option value="">Select technician…</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.site})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Priority">
                  <select
                    className={selectCls}
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target
                          .value as WorkOrderFormData["priority"],
                      })
                    }
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </FormField>
              </div>
              {formMode === "edit" && (
                <FormField label="Status">
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as WorkOrderStatus,
                      })
                    }
                  >
                    {STATUSES.filter((s) => s !== "All").map((status) => {
                      if (
                        (status === "Verified" || status === "Finished") &&
                        currentUser.role !== "Super Admin" &&
                        form.status !== status
                      ) {
                        return null;
                      }
                      return (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      );
                    })}
                  </select>
                </FormField>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={formModal.close}>
                Cancel
              </Button>
              <Button
                onClick={saveForm}
                disabled={
                  !form.machineId ||
                  !form.title.trim() ||
                  !form.assignedTo ||
                  saving
                }
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {formMode === "create" ? "Create & assign" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewModal.isOpen && activeView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b bg-card px-6 py-4">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-primary">
                    {activeView.id}
                  </span>
                  <Badge className={woStatusColor(activeView.status)}>
                    {woStatusIcon(activeView.status)}
                    {activeView.status}
                  </Badge>
                  <Badge className={priorityColor(activeView.priority)}>
                    {activeView.priority}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold">{activeView.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {activeView.machineId} · {getUserName(activeView.assignedTo)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-primary/20 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                  onClick={() => setShowActivityLog((current) => !current)}
                >
                  <History size={14} />
                  {showActivityLog ? "Hide Activity Log" : "Activity Log"}
                </Button>
                <button type="button" onClick={viewModal.close}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed">
                {activeView.description}
              </p>
              {(() => {
                const machine = machines.find(
                  (m) => m.id === activeView.machineId,
                );
                if (!machine || !machine.installDate) return null;
                const warranty = warrantyStatus(
                  machine.installDate,
                  machine.cert_warranty,
                );
                return (
                  <div
                    className={`rounded-lg border p-3 ${warranty.active ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
                  >
                    <div
                      className={`flex items-center gap-2 text-sm font-semibold ${warranty.active ? "text-emerald-800" : "text-red-800"}`}
                    >
                      {warranty.active ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <ShieldAlert size={16} />
                      )}
                      Machine Warranty
                    </div>
                    <p
                      className={`mt-1 text-sm ${warranty.active ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {warranty.active
                        ? `Warranty is active and expires on ${formatDate(warranty.expires)}. (${warranty.label})`
                        : `Warranty expired on ${formatDate(warranty.expires)}.`}
                    </p>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <p className="font-medium">
                    {formatDate(activeView.createdAt)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">Updated</span>
                  <p className="font-medium">
                    {formatDate(activeView.updatedAt)}
                  </p>
                </div>
              </div>
              <FormField label="Technician notes">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={technicianNotesDraft}
                  onChange={(e) => setTechnicianNotesDraft(e.target.value)}
                  readOnly={!canEditTechnicianNotes}
                  placeholder={
                    canEditTechnicianNotes
                      ? "Add a new note..."
                      : "No notes have been added."
                  }
                />
                {canEditTechnicianNotes && (
                  <Button
                    className="mt-2"
                    size="sm"
                    onClick={saveTechnicianNotes}
                    disabled={!technicianNotesDraft.trim() || saving}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Save Note
                  </Button>
                )}
              </FormField>

              {activeView.technician_notes.length > 0 && (
                <div className="space-y-3 rounded-lg border p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes History
                  </h3>
                  <ul className="space-y-3">
                    {activeView.technician_notes.map((note) => (
                      <li key={note.id} className="text-sm">
                        <p className="whitespace-pre-wrap">{note.note}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          by{" "}
                          <strong>{note.user?.name ?? "Unknown User"}</strong>{" "}
                          on {note.created_at}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showActivityLog &&
                activeView.activities &&
                activeView.activities.length > 0 &&
                (() => {
                  const visibleActivities = activeView.activities.filter(
                    (activity) =>
                      !["checked_in", "checked_out"].includes(activity.action),
                  );

                  if (visibleActivities.length === 0) return null;

                  return (
                    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <History size={16} />
                          </span>
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Work Order Activity Log
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Recent edit trail and operational events
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary font-mono text-[11px]">
                          {visibleActivities.length}{" "}
                          {visibleActivities.length === 1 ? "entry" : "entries"}
                        </Badge>
                      </div>
                      <ul className="space-y-3">
                        {visibleActivities.map((activity) => (
                          <li
                            key={activity.id}
                            className="rounded-xl border border-border/60 bg-muted/15 p-4 text-sm shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/20"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground">
                                  {activity.summary}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  by{" "}
                                  <strong className="text-foreground/80">
                                    {activity.user?.name ?? activity.user_id}
                                  </strong>{" "}
                                  on {activity.created_at}
                                </p>
                              </div>
                              <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-primary">
                                {activityActionLabel(activity.action)}
                              </span>
                            </div>

                            {activity.changes &&
                              Object.keys(activity.changes).length > 0 && (
                                <div className="mt-3 rounded-lg border border-border/70 bg-card p-3">
                                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Changed fields
                                  </p>
                                  <div className="space-y-2">
                                    {Object.entries(activity.changes).map(
                                      ([field, value]) => {
                                        if (
                                          value &&
                                          typeof value === "object" &&
                                          !Array.isArray(value) &&
                                          ("from" in value || "to" in value)
                                        ) {
                                          const nextValue = value as {
                                            from?: unknown;
                                            to?: unknown;
                                          };
                                          return (
                                            <div
                                              key={field}
                                              className="flex flex-col gap-1 rounded-md bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                              <span className="text-xs font-medium text-foreground">
                                                {activityFieldLabel(field)}
                                              </span>
                                              <span className="text-[11px] text-muted-foreground">
                                                <span className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
                                                  {formatActivityValue(
                                                    nextValue.from,
                                                  )}
                                                </span>
                                                <span className="px-2 text-muted-foreground">
                                                  →
                                                </span>
                                                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">
                                                  {formatActivityValue(
                                                    nextValue.to,
                                                  )}
                                                </span>
                                              </span>
                                            </div>
                                          );
                                        }

                                        if (
                                          field === "cost_entries" &&
                                          value &&
                                          typeof value === "object" &&
                                          !Array.isArray(value)
                                        ) {
                                          const stats = value as {
                                            from_count?: unknown;
                                            to_count?: unknown;
                                            to_total?: unknown;
                                          };
                                          return (
                                            <div
                                              key={field}
                                              className="flex flex-col gap-1 rounded-md bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                              <span className="text-xs font-medium text-foreground">
                                                {activityFieldLabel(field)}
                                              </span>
                                              <span className="text-[11px] text-muted-foreground">
                                                {formatActivityValue(
                                                  stats.from_count,
                                                )}{" "}
                                                entries →{" "}
                                                {formatActivityValue(
                                                  stats.to_count,
                                                )}{" "}
                                                entries, total{" "}
                                                {formatActivityValue(
                                                  stats.to_total,
                                                )}
                                              </span>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={field}
                                            className="flex flex-col gap-1 rounded-md bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                          >
                                            <span className="text-xs font-medium text-foreground">
                                              {activityFieldLabel(field)}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                              {formatActivityValue(value)}
                                            </span>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

              {currentUser.role === "Super Admin" &&
                checkInSessions.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    {/* Header with Title, Session Count and Total Logged Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-primary" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                          Check-in Sessions Log
                        </span>
                        <Badge className="font-mono text-[11px]">
                          {checkInSessions.length}{" "}
                          {checkInSessions.length === 1
                            ? "session"
                            : "sessions"}
                        </Badge>
                      </div>

                      {/* Calculate Total Accumulated Duration & Active Status */}
                      {(() => {
                        let totalMs = 0;
                        let activeCount = 0;
                        checkInSessions.forEach((s) => {
                          const inTime = new Date(s.checked_in_at).getTime();
                          const outTime = s.checked_out_at
                            ? new Date(s.checked_out_at).getTime()
                            : Date.now();
                          if (!s.checked_out_at) activeCount++;
                          if (!isNaN(inTime)) {
                            totalMs += Math.max(0, outTime - inTime);
                          }
                        });
                        const totalSecs = Math.floor(totalMs / 1000);
                        const hrs = Math.floor(totalSecs / 3600);
                        const mins = Math.floor((totalSecs % 3600) / 60);
                        const secs = totalSecs % 60;
                        const totalStr =
                          hrs > 0
                            ? `${hrs}h ${mins}m`
                            : mins > 0
                              ? `${mins}m ${secs}s`
                              : `${secs}s`;

                        return (
                          <div className="flex items-center gap-2">
                            {activeCount > 0 && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 animate-pulse flex items-center gap-1.5 text-[11px] font-medium">
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                Active Session
                              </Badge>
                            )}
                            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs font-medium">
                              <Timer size={13} className="text-primary" />
                              <span className="text-muted-foreground">
                                Total Logged:
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {totalStr}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Professional Table Container */}
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="py-2.5 text-xs font-semibold">
                              Technician
                            </TableHead>
                            <TableHead className="py-2.5 text-xs font-semibold">
                              Check In
                            </TableHead>
                            <TableHead className="py-2.5 text-xs font-semibold">
                              Check Out
                            </TableHead>
                            <TableHead className="py-2.5 text-xs font-semibold text-right">
                              Duration
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checkInSessions.map((session, idx) => {
                            const checkInTime = new Date(session.checked_in_at);
                            const checkOutTime = session.checked_out_at
                              ? new Date(session.checked_out_at)
                              : null;
                            const techName =
                              session.technician?.name ?? session.technician_id;

                            // Generate initials for avatar
                            const initials = techName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);

                            let durationLabel = "Calculating...";
                            if (!isNaN(checkInTime.getTime())) {
                              const now = checkOutTime
                                ? checkOutTime.getTime()
                                : Date.now();
                              const durationMs = Math.max(
                                0,
                                now - checkInTime.getTime(),
                              );

                              const totalSeconds = Math.floor(
                                durationMs / 1000,
                              );
                              const hours = Math.floor(totalSeconds / 3600);
                              const minutes = Math.floor(
                                (totalSeconds % 3600) / 60,
                              );
                              const seconds = totalSeconds % 60;

                              if (hours > 0) {
                                durationLabel = `${hours}h ${minutes}m`;
                              } else if (minutes > 0) {
                                durationLabel = `${minutes}m ${seconds}s`;
                              } else {
                                durationLabel = `${seconds}s`;
                              }
                            }

                            const formatSessionDate = (d: Date) => {
                              return d.toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                              });
                            };

                            return (
                              <TableRow
                                key={session.id ?? idx}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                {/* Technician Avatar & Name */}
                                <TableCell className="py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white shadow-sm">
                                      {initials}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold leading-none">
                                        {techName}
                                      </p>
                                      <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                                        ID: {session.technician_id}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Check In Time */}
                                <TableCell className="py-2.5 text-xs">
                                  <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                                    <LogIn
                                      size={13}
                                      className="text-emerald-600 shrink-0"
                                    />
                                    <span className="text-foreground">
                                      {formatSessionDate(checkInTime)}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Check Out Time */}
                                <TableCell className="py-2.5 text-xs">
                                  {checkOutTime ? (
                                    <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                                      <LogOut
                                        size={13}
                                        className="text-amber-600 shrink-0"
                                      />
                                      <span className="text-foreground">
                                        {formatSessionDate(checkOutTime)}
                                      </span>
                                    </div>
                                  ) : (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-sans text-[11px] font-medium flex items-center gap-1 w-fit">
                                      <span className="size-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                      Still Working
                                    </Badge>
                                  )}
                                </TableCell>

                                {/* Duration */}
                                <TableCell className="py-2.5 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md ${
                                      !checkOutTime
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : "bg-muted text-foreground"
                                    }`}
                                  >
                                    <Timer size={12} className="opacity-70" />
                                    {durationLabel}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

              <div className="space-y-3 border-t pt-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Status flow
                </p>
                {activeView.status === "Close" ? (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    <XCircle size={15} />
                    This work order has been closed.
                  </div>
                ) : (
                  <div className="flex items-start overflow-x-auto pb-1">
                    {WO_FLOW.map((step, index) => {
                      const currentIdx = woFlowIndex(activeView.status);
                      const done = index <= currentIdx;
                      const active = index === currentIdx;
                      return (
                        <div key={step} className="flex shrink-0 items-center">
                          <div className="flex w-14 flex-col items-center">
                            <div
                              className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                                done
                                  ? "bg-primary text-white"
                                  : "border border-border bg-muted text-muted-foreground"
                              } ${active ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}
                            >
                              {index < currentIdx ? (
                                <CheckCircle2 size={13} />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span
                              className={`mt-1 text-center text-[10px] font-mono leading-tight ${
                                done
                                  ? "font-semibold text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {woFlowLabel(step)}
                            </span>
                          </div>
                          {index < WO_FLOW.length - 1 && (
                            <div
                              className={`mb-3 h-0.5 w-4 shrink-0 ${index < currentIdx ? "bg-primary" : "bg-border"}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!isWoFinal(activeView.status) && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Next action
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* Check In / Check Out for active technician */}
                    {activeView.status === "Inprogress" &&
                      (isCheckedIn ? (
                        <Button
                          className="w-full sm:w-auto"
                          disabled={saving}
                          onClick={() => checkOut(activeView)}
                        >
                          <LogOut size={15} /> Check Out
                        </Button>
                      ) : (
                        <Button
                          className="w-full sm:w-auto"
                          disabled={saving}
                          onClick={() => checkIn(activeView)}
                        >
                          <LogIn size={15} /> Check In
                        </Button>
                      ))}

                    {/* Start Work (if status is New) */}
                    {activeView.status === "New" && (
                      <Button
                        className="w-full sm:w-auto"
                        disabled={saving}
                        onClick={() => jumpStatus(activeView, "Inprogress")}
                      >
                        <Wrench size={15} /> Start Work
                      </Button>
                    )}

                    {/* Close Work (if status is Inprogress) */}
                    {activeView.status === "Inprogress" && (
                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        disabled={saving}
                        onClick={() => jumpStatus(activeView, "Close")}
                      >
                        <XCircle size={15} /> Close Work
                      </Button>
                    )}

                    {/* Verified Button (if status is Inprogress or Close, and user is Super Admin) */}
                    {(activeView.status === "Inprogress" ||
                      activeView.status === "Close") &&
                      currentUser.role === "Super Admin" && (
                        <Button
                          className="w-full sm:w-auto"
                          disabled={saving}
                          onClick={() => jumpStatus(activeView, "Verified")}
                        >
                          <ShieldCheck size={15} /> Verified
                        </Button>
                      )}

                    {/* Finished Button (if status is Verified, and user is Super Admin) */}
                    {activeView.status === "Verified" &&
                      currentUser.role === "Super Admin" && (
                        <Button
                          className="w-full sm:w-auto"
                          disabled={saving}
                          onClick={() => jumpStatus(activeView, "Finished")}
                        >
                          <CheckCircle2 size={15} /> Finished
                        </Button>
                      )}
                  </div>

                  {/* Message for non-Super Admin when status is Close or Verified */}
                  {(activeView.status === "Close" ||
                    activeView.status === "Verified") &&
                    currentUser.role !== "Super Admin" && (
                      <p className="text-sm text-muted-foreground">
                        Only Super Admin can mark work orders as Verified or
                        Finished.
                      </p>
                    )}
                </div>
              )}

              {canReopen && (
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => jumpStatus(activeView, "New")}
                  >
                    <ArrowRight size={15} />
                    Re-Open work order
                  </Button>
                </div>
              )}

              {isWoFinal(activeView.status) && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
                  <ShieldCheck size={15} />
                  This work order is {activeView.status.toLowerCase()}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl">
            <div className="border-b px-6 py-4 font-semibold">
              Delete work order
            </div>
            <p className="px-6 py-5 text-sm text-muted-foreground">
              Remove {deleteTarget.id} — {deleteTarget.title}?
            </p>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={deleteModal.close}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={saving}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
