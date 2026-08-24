import axios from 'axios'
import { usePermissions } from '@/hooks/permission/usePermissions'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  CheckCheck,
  ChevronDown,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react'
import { permissionRepository, roleRepository } from '@/repositories'
import { PERMISSIONS } from '@/pages/dashboard/permissions'
import { TablePaginationBar, useTablePagination } from '@/components/TablePagination'
import { Badge, Card, FormField, inputCls } from '@/pages/dashboard/components/DashboardUI'
import { Button } from '@/components/ui/button'
import type { PermissionItem, RoleItem } from '@/interfaces/all/role'

const EMPTY_FORM = { name: '', description: '', permission_ids: [] as number[] }

export function RoleManagementView() {
  const { can } = usePermissions()
  const canCreate = can(PERMISSIONS.ROLES_CREATE)
  const canUpdate = can(PERMISSIONS.ROLES_UPDATE)
  const canDelete = can(PERMISSIONS.ROLES_DELETE)

  const [roles, setRoles] = useState<RoleItem[]>([])
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<RoleItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [openGroups, setOpenGroups] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [roleData, permissionData] = await Promise.all([
        roleRepository.getAll(),
        permissionRepository.getAll(),
      ])
      setRoles(roleData)
      setPermissions(permissionData)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
          ?? (error.response?.status === 403
            ? 'You do not have permission to view roles. Log out and sign in again.'
            : error.response?.status === 401
              ? 'Session expired. Please sign in again.'
              : 'Cannot reach roles API. Start backend with serve.bat and run setup.bat.')
        : 'Failed to load roles and permissions'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionItem[]>>((acc, permission) => {
      const group = permission.group
      if (!acc[group]) acc[group] = []
      acc[group].push(permission)
      return acc
    }, {})
  }, [permissions])

  const pagination = useTablePagination(roles, { pageSize: 5 })
  const { pageItems } = pagination

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(EMPTY_FORM)
    setOpenGroups([])
    setModalOpen(true)
  }

  const openEdit = (role: RoleItem) => {
    setMode('edit')
    setSelected(role)
    setForm({
      name: role.name,
      description: role.description ?? '',
      permission_ids: role.permissions.map((p) => Number(p.id)),
    })
    setOpenGroups([])
    setModalOpen(true)
  }

  const togglePermission = (permissionId: number) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }))
  }

  const toggleGroup = (group: string) => {
    setOpenGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group],
    )
  }

  const toggleGroupPermissions = (items: PermissionItem[]) => {
    const itemIds = items.map(item => Number(item.id))
    const allSelected = itemIds.every(id => form.permission_ids.includes(id))
    setForm(prev => ({
      ...prev,
      permission_ids: allSelected
        ? prev.permission_ids.filter(id => !itemIds.includes(id))
        : [...new Set([...prev.permission_ids, ...itemIds])],
    }))
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (mode === 'create') {
        await roleRepository.create({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permission_ids: form.permission_ids,
        })
        toast.success('Role created')
      } else if (selected) {
        await roleRepository.update(Number(selected.id), {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permission_ids: form.permission_ids,
        })
        toast.success('Role updated')
      }
      setModalOpen(false)
      await load()
    } catch {
      toast.error(mode === 'create' ? 'Failed to create role' : 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (role: RoleItem) => {
    if (role.is_system) return
    setSaving(true)
    try {
      await roleRepository.delete(Number(role.id))
      toast.success('Role deleted')
      await load()
    } catch {
      toast.error('Failed to delete role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">Create roles and assign permissions to control access.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New role
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading roles…</div>
        ) : (
          <>
            <div className="divide-y">
              {pageItems.map((role) => (
                <div key={role.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      <span className="font-semibold">{role.name}</span>
                      {role.is_super_admin && <Badge className="bg-red-600 text-white">Super Admin</Badge>}
                    </div>
                    {role.description && !role.description.toLowerCase().endsWith('system role') && (
                      <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                    )}
                    <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                      {role.permissions.length} permission(s) · {role.users_count ?? 0} user(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canUpdate && !role.is_super_admin && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(role)}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    )}
                    {canDelete && !role.is_system && (
                      <Button variant="destructive" size="sm" onClick={() => remove(role)} disabled={saving}>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
              label="role(s)"
            />
          </>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="font-semibold">{mode === 'create' ? 'Create role' : 'Edit role permissions'}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <FormField label="Role name">
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={mode === 'edit' && selected?.is_system}
                />
              </FormField>
              <FormField label="Description">
                <input
                  className={inputCls}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
              <div>
                <p className="mb-3 text-sm font-medium">Permissions</p>
                <div className="space-y-2">
                  {Object.entries(groupedPermissions).map(([group, items]) => {
                    const allSelected = items.every(item => form.permission_ids.includes(Number(item.id)))
                    const someSelected = items.some(item => form.permission_ids.includes(Number(item.id)))
                    const selectedCount = items.filter(item =>
                      form.permission_ids.includes(Number(item.id)),
                    ).length
                    const isOpen = openGroups.includes(group)

                    return (
                      <div
                        key={group}
                        className="overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-sm"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 p-3 text-left"
                          onClick={() => toggleGroup(group)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {group}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {selectedCount} of {items.length} selected
                            </p>
                          </div>
                          <ChevronDown
                            className={`shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            size={17}
                          />
                        </button>

                        {isOpen && (
                          <div className="border-t p-3">
                            <button
                              type="button"
                              onClick={() => toggleGroupPermissions(items)}
                              aria-pressed={allSelected}
                              className={`group mb-3 flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition-all duration-200 ${
                                allSelected
                                  ? 'border-primary/40 bg-primary/10 shadow-sm'
                                  : someSelected
                                    ? 'border-primary/25 bg-primary/5'
                                    : 'border-dashed bg-muted/30 hover:border-primary/30 hover:bg-primary/5'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span
                                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    allSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-background text-primary shadow-sm ring-1 ring-border'
                                  }`}
                                >
                                  {allSelected ? (
                                    <CheckCheck className="size-5" />
                                  ) : (
                                    <Check className="size-5" />
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold">
                                    {allSelected ? 'All permissions selected' : 'Select all permissions'}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {allSelected
                                      ? `All ${items.length} permissions in this group are active`
                                      : `Enable all ${items.length} permissions in this group at once`}
                                  </span>
                                </span>
                              </span>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                                  allSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background text-muted-foreground ring-1 ring-border group-hover:text-primary'
                                }`}
                              >
                                {allSelected ? 'Clear all' : `${selectedCount}/${items.length}`}
                              </span>
                            </button>

                            <div className="grid gap-1 sm:grid-cols-2">
                              {items.map((permission) => (
                                <label
                                  key={permission.id}
                                  className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted/50"
                                >
                                  <input
                                    type="checkbox"
                                    className="size-4 rounded border-muted-foreground/40 accent-primary"
                                    checked={form.permission_ids.includes(Number(permission.id))}
                                    onChange={() => togglePermission(Number(permission.id))}
                                  />
                                  <span>{permission.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.name.trim()}>
                {mode === 'create' ? 'Create role' : 'Save permissions'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}