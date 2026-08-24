import { useMemo, useState } from "react";
import { Camera, Package, Plus, X } from "lucide-react";
import { CATEGORY_COLORS, ISSUE_CATEGORIES } from "@/pages/dashboard/constants";
import { PERMISSIONS } from "@/pages/dashboard/permissions";
import { usePermissions } from "@/hooks/permission/usePermissions";
import { PhotoLightbox } from "@/pages/dashboard/components/PhotoLightbox";
import {
  TablePaginationBar,
  useTablePagination,
} from "@/components/TablePagination";
import {
  Card,
  FormField,
  inputCls,
  selectCls,
} from "@/pages/dashboard/components/DashboardUI";
import { formatDate, fmtCurrency } from "@/pages/dashboard/utils/formatters";
import type { RepairFormData } from "./repairMapper";
import type {
  AppUser,
  IssueCategory,
  Machine,
  RepairPhoto,
  RepairRecord,
  WorkOrder,
} from "@/pages/dashboard/types";

const EMPTY_CREATE = (): RepairFormData => ({
  workOrderId: "",
  machineId: "",
  date: new Date().toISOString().split("T")[0],
  issueCategory: "Mechanical",
  issueDescription: "",
  partsReplaced: [],
  laborCost: 0,
  technicianId: "",
});

export function RepairRecordsView({
  repairRecords,
  machines,
  users,
  workOrders,
  focusId,
  onCreate,
}: {
  repairRecords: RepairRecord[];
  machines: Machine[];
  users: AppUser[];
  workOrders: WorkOrder[];
  focusId?: string;
  onCreate: (form: RepairFormData) => Promise<RepairRecord | null>;
}) {
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.REPAIRS_CREATE);
  const [filterMachine, setFilterMachine] = useState<string>(focusId ?? "All");
  const [selectedRecord, setSelectedRecord] = useState<RepairRecord | null>(
    null,
  );
  const [lightbox, setLightbox] = useState<{
    photos: RepairPhoto[];
    startIndex: number;
  } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RepairFormData>(EMPTY_CREATE);
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partCost, setPartCost] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoType, setPhotoType] = useState<"before" | "after">("before");

  const getMachineName = (id: string) =>
    machines.find((m) => m.id === id)?.name ?? id;
  const getUserName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const records =
      filterMachine === "All"
        ? repairRecords
        : repairRecords.filter((r) => r.machineId === filterMachine);
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [repairRecords, filterMachine]);

  const pagination = useTablePagination(filtered, {
    pageSize: 5,
    resetKey: filterMachine,
  });
  const { pageItems } = pagination;
  const totalCost = filtered.reduce((s, r) => s + r.totalCost, 0);
  const totalParts = filtered.reduce(
    (s, r) => s + r.partsReplaced.reduce((ps, p) => ps + p.cost, 0),
    0,
  );

  const technicians = users.filter((u) => u.role === "Technician");

  const openCreate = () => {
    setForm(EMPTY_CREATE());
    setPartName("");
    setPartNumber("");
    setPartCost("");
    setPhotoCaption("");
    setPhotoType("before");
    setShowCreate(true);
  };

  const onSelectWorkOrder = (workOrderId: string) => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    setForm((prev) => ({
      ...prev,
      workOrderId,
      machineId: wo?.machineId ?? "",
      technicianId: wo?.assignedTo || prev.technicianId,
      issueDescription: prev.issueDescription || wo?.description || "",
    }));
  };

  const addPart = () => {
    if (!partName.trim()) return;
    const cost = parseFloat(partCost) || 0;
    setForm((prev) => ({
      ...prev,
      partsReplaced: [
        ...prev.partsReplaced,
        { name: partName.trim(), partNumber: partNumber.trim(), cost },
      ],
    }));
    setPartName("");
    setPartNumber("");
    setPartCost("");
  };

  const submitCreate = async () => {
    if (
      !form.workOrderId ||
      !form.machineId ||
      !form.technicianId ||
      !form.issueDescription.trim() ||
      saving
    )
      return;
    setSaving(true);
    try {
      const created = await onCreate({
        ...form,
        laborCost: Number(form.laborCost) || 0,
        issueDescription: form.issueDescription.trim(),
      });
      if (!created) return;
      setShowCreate(false);
      setSelectedRecord(created);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilterMachine("All")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${filterMachine === "All" ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}
          >
            All Machines
          </button>
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterMachine(m.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${filterMachine === m.id ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {m.id}
            </button>
          ))}
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={13} />
            New Repair
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Records
          </p>
          <p className="text-2xl font-bold text-primary mt-0.5">
            {filtered.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Total Cost
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {fmtCurrency(totalCost)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Parts Cost
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {fmtCurrency(totalParts)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Labor Cost
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {fmtCurrency(totalCost - totalParts)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2">
          {pageItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No repair records found
            </p>
          )}
          {pageItems.map((r) => {
            const isSelected = selectedRecord?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRecord(r)}
                className={`w-full text-left rounded-lg border p-4 transition-all ${isSelected ? "border-primary bg-primary text-white shadow-md" : "border-border bg-card hover:border-primary/40"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-xs font-bold ${isSelected ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    {r.id}
                  </span>
                  <span
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {r.issueCategory}
                  </span>
                </div>
                <p
                  className={`text-sm font-semibold ${isSelected ? "text-white" : "text-foreground"}`}
                >
                  {r.machineId} — {getMachineName(r.machineId)}
                </p>
                <p
                  className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? "text-white/70" : "text-muted-foreground"}`}
                >
                  {r.issueDescription}
                </p>
                <div
                  className={`flex items-center justify-between mt-2 text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}
                >
                  <span>{formatDate(r.date)}</span>
                  <span
                    className={`font-mono font-semibold ${isSelected ? "text-white" : "text-foreground"}`}
                  >
                    {fmtCurrency(r.totalCost)}
                  </span>
                </div>
              </button>
            );
          })}
          <Card className="overflow-hidden">
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
              label="record(s)"
            />
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedRecord ? (
            <Card className="flex flex-col items-center justify-center h-64 text-center">
              <Camera size={36} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a repair record to view details and photos
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">
                        {selectedRecord.id}
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium"
                        style={{
                          background:
                            CATEGORY_COLORS[selectedRecord.issueCategory] +
                            "20",
                          color: CATEGORY_COLORS[selectedRecord.issueCategory],
                        }}
                      >
                        {selectedRecord.issueCategory}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-primary font-mono">
                      {selectedRecord.machineId}
                    </h2>
                    <p className="text-sm text-foreground">
                      {getMachineName(selectedRecord.machineId)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Total Cost
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {fmtCurrency(selectedRecord.totalCost)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Issue Description
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedRecord.issueDescription}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Date
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {formatDate(selectedRecord.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Technician
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {getUserName(selectedRecord.technicianId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Work Order
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5 font-mono">
                      {selectedRecord.workOrderId}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <Package size={15} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Parts Replaced
                  </h3>
                </div>
                {selectedRecord.partsReplaced.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground italic">
                    No parts replaced (labor/software only)
                  </p>
                ) : (
                  <div>
                    <div className="divide-y divide-border">
                      {selectedRecord.partsReplaced.map((p, i) => (
                        <div
                          key={i}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {p.name}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {p.partNumber}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-foreground shrink-0">
                            {fmtCurrency(p.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-3 border-t border-border flex justify-between text-sm bg-muted/30">
                      <div>
                        <span className="text-muted-foreground">Parts: </span>
                        <span className="font-mono font-semibold">
                          {fmtCurrency(
                            selectedRecord.partsReplaced.reduce(
                              (s, p) => s + p.cost,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Labor: </span>
                        <span className="font-mono font-semibold">
                          {fmtCurrency(selectedRecord.laborCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
              <Card className="overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Camera size={15} className="text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">
                      Photo Gallery
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({selectedRecord.photos.length})
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold cursor-pointer transition-colors">
                    <Plus size={13} />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedRecord) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const url = evt.target?.result as string;
                          if (!url) return;
                          const newPhoto: RepairPhoto = {
                            id: `ph-${Date.now()}`,
                            url,
                            type: "after",
                            caption: file.name,
                          };
                          const updatedPhotos = [...selectedRecord.photos, newPhoto];
                          setSelectedRecord({ ...selectedRecord, photos: updatedPhotos });
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {selectedRecord.photos.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground italic">
                    No photos attached
                  </p>
                ) : (
                  <div className="p-4">
                    {selectedRecord.photos.filter((p) => p.type === "before")
                      .length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                          Before / Damage
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedRecord.photos
                            .filter((p) => p.type === "before")
                            .map((photo) => {
                              const globalIdx =
                                selectedRecord.photos.indexOf(photo);
                              return (
                                <button
                                  key={photo.id}
                                  onClick={() =>
                                    setLightbox({
                                      photos: selectedRecord.photos,
                                      startIndex: globalIdx,
                                    })
                                  }
                                  className="relative aspect-video rounded-lg overflow-hidden bg-gray-200 group"
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.caption}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                                    <p className="text-xs text-white bg-black/60 px-2 py-1 w-full truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                      {photo.caption}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    {selectedRecord.photos.filter((p) => p.type === "after")
                      .length > 0 && (
                      <div>
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                          After / Repaired
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedRecord.photos
                            .filter((p) => p.type === "after")
                            .map((photo) => {
                              const globalIdx =
                                selectedRecord.photos.indexOf(photo);
                              return (
                                <button
                                  key={photo.id}
                                  onClick={() =>
                                    setLightbox({
                                      photos: selectedRecord.photos,
                                      startIndex: globalIdx,
                                    })
                                  }
                                  className="relative aspect-video rounded-lg overflow-hidden bg-gray-200 group"
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.caption}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                                    <p className="text-xs text-white bg-black/60 px-2 py-1 w-full truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                      {photo.caption}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <div>
                <h2 className="font-semibold text-foreground">
                  New Repair Record
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Link to a work order
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormField label="Work Order">
                <select
                  className={selectCls}
                  value={form.workOrderId}
                  onChange={(e) => onSelectWorkOrder(e.target.value)}
                >
                  <option value="">Select work order…</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.id} — {wo.machineId} — {wo.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Machine">
                <input
                  className={inputCls + " font-mono bg-muted/30"}
                  value={form.machineId}
                  readOnly
                  placeholder="Auto from work order"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date">
                  <input
                    type="date"
                    className={inputCls}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </FormField>
                <FormField label="Category">
                  <select
                    className={selectCls}
                    value={form.issueCategory}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        issueCategory: e.target.value as IssueCategory,
                      })
                    }
                  >
                    {ISSUE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Description">
                <textarea
                  className={inputCls + " min-h-[80px]"}
                  value={form.issueDescription}
                  onChange={(e) =>
                    setForm({ ...form, issueDescription: e.target.value })
                  }
                  placeholder="Describe the repair…"
                />
              </FormField>
              <FormField label="Technician">
                <select
                  className={selectCls}
                  value={form.technicianId}
                  onChange={(e) =>
                    setForm({ ...form, technicianId: e.target.value })
                  }
                >
                  <option value="">Select technician…</option>
                  {technicians.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.site}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Labor Cost (৳)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls + " font-mono"}
                  value={form.laborCost || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      laborCost: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </FormField>
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Parts (optional)
                </p>
                {form.partsReplaced.length > 0 && (
                  <div className="space-y-1">
                    {form.partsReplaced.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm px-3 py-2 rounded border border-border bg-muted/20"
                      >
                        <span>
                          {p.name} {p.partNumber ? `(${p.partNumber})` : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {fmtCurrency(p.cost)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                partsReplaced: form.partsReplaced.filter(
                                  (_, idx) => idx !== i,
                                ),
                              })
                            }
                            className="text-muted-foreground hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className={inputCls + " text-xs"}
                    placeholder="Part name"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                  />
                  <input
                    className={inputCls + " text-xs font-mono"}
                    placeholder="Part #"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls + " text-xs font-mono"}
                      placeholder="Cost"
                      value={partCost}
                      onChange={(e) => setPartCost(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={addPart}
                      className="px-2 rounded border border-border text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Photo Attachments (optional)
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {(form.photos ?? []).length} photo(s) attached
                  </span>
                </div>

                {(form.photos ?? []).length > 0 && (
                  <div className="grid grid-cols-2 gap-2 my-2">
                    {(form.photos ?? []).map((photo) => (
                      <div key={photo.id} className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/40 group">
                        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 p-2 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, photos: (form.photos ?? []).filter((p) => p.id !== photo.id) })}
                            className="self-end p-1 rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            <X size={12} />
                          </button>
                          <span className="text-[10px] font-semibold text-white truncate bg-black/60 px-1.5 py-0.5 rounded">
                            {photo.type.toUpperCase()}: {photo.caption}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 items-center">
                  <select
                    className={selectCls + " text-xs"}
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value as "before" | "after")}
                  >
                    <option value="before">Before / Damage</option>
                    <option value="after">After / Repaired</option>
                  </select>
                  <input
                    className={inputCls + " text-xs"}
                    placeholder="Photo caption…"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                  <label className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer transition-colors">
                    <Camera size={14} className="text-primary" />
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const url = evt.target?.result as string;
                          if (!url) return;
                          const newPhoto: RepairPhoto = {
                            id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            url,
                            type: photoType,
                            caption: photoCaption.trim() || file.name,
                          };
                          setForm((prev) => ({
                            ...prev,
                            photos: [...(prev.photos ?? []), newPhoto],
                          }));
                          setPhotoCaption("");
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submitCreate}
                disabled={
                  !form.workOrderId ||
                  !form.machineId ||
                  !form.technicianId ||
                  !form.issueDescription.trim() ||
                  saving
                }
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Create Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
