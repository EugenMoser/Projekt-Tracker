export interface SyncOrderType {
  id: string
  name: string
  digit: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncCustomer {
  id: string
  customerNumber: string
  orderTypeId: string
  name: string
  street: string | null
  zip: string | null
  city: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncProject {
  id: string
  customerId: string
  title: string
  description: string | null
  color: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents: number | null
  fixedPriceCents: number | null
  status: 'active' | 'archived'
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTask {
  id: string
  description: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTag {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTimeEntry {
  id: string
  projectId: string
  taskId: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  rateSnapshotCents: number | null
  pricingModeSnapshot: 'hourly' | 'fixed'
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTimer {
  id: string
  projectId: string
  startedAt: string
  createdAt: string
  updatedAt: string
}

export interface SyncAppSettings {
  pinHash: string | null
  biometricEnabled: boolean
  lastExportPeriod: string | null
  updatedAt: string
}

export interface PushPayload {
  orderTypes: SyncOrderType[]
  customers: SyncCustomer[]
  projects: SyncProject[]
  tasks: SyncTask[]
  tags: SyncTag[]
  timeEntries: SyncTimeEntry[]
  taskTags: Array<{ taskId: string; tagId: string }>
  projectTasks: Array<{ projectId: string; taskId: string }>
  timers: SyncTimer[]
  appSettings: SyncAppSettings | null
}

export interface PullResponse {
  orderTypes: SyncOrderType[]
  customers: SyncCustomer[]
  projects: SyncProject[]
  tasks: SyncTask[]
  tags: SyncTag[]
  timeEntries: SyncTimeEntry[]
  taskTags: Array<{ taskId: string; tagId: string }>
  projectTasks: Array<{ projectId: string; taskId: string }>
  timers: SyncTimer[]
  appSettings: SyncAppSettings | null
  serverTime: string
}
