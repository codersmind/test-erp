import { db } from '../db/database'
import type {
  Customer,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesOrder,
  SalesOrderItem,
  SyncRecord,
} from '../db/schema'
import { nowIso } from '../db/utils'
import { loadSecureToken, saveSecureToken } from '../security/secureStorage'

export interface SyncSnapshot {
  exportedAt: string
  customers: Customer[]
  products: Product[]
  salesOrders: SalesOrder[]
  salesOrderItems: SalesOrderItem[]
  purchaseOrders: PurchaseOrder[]
  purchaseOrderItems: PurchaseOrderItem[]
  syncQueue: SyncRecord[]
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
const SYNC_FILE_NAME = 'bookstore-erp-sync.json'
const FOLDER_STORAGE_KEY = 'driveFolderId'

const getDesiredFolderName = () => import.meta.env.VITE_DRIVE_APP_FOLDER_NAME ?? 'BookStoreERP'

type DriveFileResult = { id: string; modifiedTime: string }

const driveFetch = async (token: string, input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const details = await res.text()
    throw new Error(`Drive API error: ${res.status} ${res.statusText} - ${details}`)
  }
  return res
}

const findExistingFolder = async (token: string, folderName: string): Promise<string | null> => {
  const query = new URLSearchParams({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: '1',
  })

  const res = await driveFetch(token, `${DRIVE_API_BASE}/files?${query.toString()}`)
  const data = (await res.json()) as { files: Array<{ id: string }> }
  return data.files.at(0)?.id ?? null
}

const createFolder = async (token: string, folderName: string): Promise<string> => {
  const res = await driveFetch(token, `${DRIVE_API_BASE}/files`, {
    method: 'POST',
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  const data = (await res.json()) as { id: string }
  return data.id
}

const ensureFolder = async (token: string): Promise<string> => {
  const cached = await loadSecureToken(FOLDER_STORAGE_KEY)
  if (cached) {
    return cached
  }

  const folderName = getDesiredFolderName()
  const existing = await findExistingFolder(token, folderName)
  const folderId = existing ?? (await createFolder(token, folderName))
  await saveSecureToken(FOLDER_STORAGE_KEY, folderId)
  return folderId
}

const getSyncFile = async (token: string, folderId: string): Promise<DriveFileResult | null> => {
  const query = new URLSearchParams({
    q: `'${folderId}' in parents and name='${SYNC_FILE_NAME}' and trashed = false`,
    fields: 'files(id, modifiedTime)',
    pageSize: '1',
  })
  const res = await driveFetch(token, `${DRIVE_API_BASE}/files?${query.toString()}`)
  const data = (await res.json()) as { files: DriveFileResult[] }
  return data.files.at(0) ?? null
}

const createSyncFile = async (token: string, folderId: string, snapshot: SyncSnapshot): Promise<DriveFileResult> => {
  const metadata = {
    name: SYNC_FILE_NAME,
    mimeType: 'application/json',
    parents: [folderId],
  }

  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(snapshot, null, 2) +
    closeDelimiter

  const res = await driveFetch(token, `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  const data = (await res.json()) as DriveFileResult
  return data
}

const updateSyncFile = async (token: string, fileId: string, snapshot: SyncSnapshot): Promise<DriveFileResult> => {
  const res = await driveFetch(token, `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot, null, 2),
  })
  const data = (await res.json()) as DriveFileResult
  return data
}

export const buildLocalSnapshot = async (): Promise<SyncSnapshot> => {
  const [customers, products, salesOrders, salesOrderItems, purchaseOrders, purchaseOrderItems, syncQueue] =
    await Promise.all([
      db.customers.toArray(),
      db.products.toArray(),
      db.salesOrders.toArray(),
      db.salesOrderItems.toArray(),
      db.purchaseOrders.toArray(),
      db.purchaseOrderItems.toArray(),
      db.syncQueue.toArray(),
    ])

  return {
    exportedAt: nowIso(),
    customers,
    products,
    salesOrders,
    salesOrderItems,
    purchaseOrders,
    purchaseOrderItems,
    syncQueue,
  }
}

export const downloadSnapshotFromDrive = async (token: string): Promise<SyncSnapshot | null> => {
  const folderId = await ensureFolder(token)
  const syncFile = await getSyncFile(token, folderId)
  if (!syncFile) return null

  const res = await driveFetch(token, `${DRIVE_API_BASE}/files/${syncFile.id}?alt=media`, {
    headers: { Accept: 'application/json' },
  })

  return (await res.json()) as SyncSnapshot
}

export const uploadSnapshotToDrive = async (token: string, snapshot: SyncSnapshot) => {
  const folderId = await ensureFolder(token)
  const existingFile = await getSyncFile(token, folderId)

  if (existingFile) {
    return updateSyncFile(token, existingFile.id, snapshot)
  }

  return createSyncFile(token, folderId, snapshot)
}

