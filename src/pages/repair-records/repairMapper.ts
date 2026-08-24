import type { CreateRepairRecordDto, RepairRecordApi, UpdateRepairRecordDto } from '@/interfaces/all/repairRecord'
import type { IssueCategory, RepairPhoto, RepairRecord } from '@/pages/dashboard/types'

export type RepairFormData = {
  workOrderId: string
  machineId: string
  date: string
  issueCategory: IssueCategory
  issueDescription: string
  partsReplaced: Array<{ name: string; partNumber: string; cost: number }>
  laborCost: number
  technicianId: string
  photos?: RepairPhoto[]
}

function formatDate(value: string): string {
  return value.includes('T') ? value.split('T')[0] : value
}

export function apiRepairToUi(api: RepairRecordApi): RepairRecord {
  return {
    dbId: Number(api.id),
    id: api.repair_number,
    workOrderId: api.work_order_number,
    machineId: api.machine_number ?? '',
    date: formatDate(api.date),
    issueCategory: api.issue_category as IssueCategory,
    issueDescription: api.issue_description,
    partsReplaced: (api.parts_replaced ?? []).map((part) => ({
      name: part.name,
      partNumber: part.partNumber ?? '',
      cost: Number(part.cost ?? 0),
    })),
    laborCost: Number(api.labor_cost ?? 0),
    totalCost: Number(api.total_cost ?? 0),
    technicianId: api.technician_id,
    photos: (api.photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.url,
      type: photo.type as 'before' | 'after',
      caption: photo.caption,
    })),
  }
}

export function formToCreateRepairDto(form: RepairFormData): CreateRepairRecordDto {
  const partsCost = form.partsReplaced.reduce((sum, part) => sum + Number(part.cost || 0), 0)
  return {
    work_order_number: form.workOrderId,
    machine_number: form.machineId,
    date: form.date,
    issue_category: form.issueCategory,
    issue_description: form.issueDescription.trim(),
    parts_replaced: form.partsReplaced,
    labor_cost: form.laborCost,
    total_cost: partsCost + form.laborCost,
    technician_id: form.technicianId,
    photos: form.photos ?? [],
  }
}

export function formToUpdateRepairDto(form: RepairFormData): UpdateRepairRecordDto {
  return formToCreateRepairDto(form)
}
