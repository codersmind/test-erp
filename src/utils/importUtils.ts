import * as XLSX from 'xlsx'
import type { Customer, CustomerType, Product } from '../db/schema'
import { createCustomer, createProduct } from '../db/localDataService'
import { nanoid } from 'nanoid'

export interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

// Map column names to standard field names (case-insensitive, flexible matching)
const normalizeColumnName = (name: string): string => {
  const normalized = name.trim().toLowerCase().replace(/[_\s]/g, '')
  
  // Customer mappings
  if (normalized.includes('name') || normalized.includes('customername') || normalized.includes('contactname')) return 'name'
  if (normalized.includes('email') || normalized.includes('emailid')) return 'email'
  if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('contact') || normalized.includes('phonenumber')) return 'phone'
  if (normalized.includes('address') || normalized.includes('location')) return 'address'
  if (normalized.includes('state')) return 'state'
  if (normalized.includes('gst') || normalized.includes('gstin') || normalized.includes('gstnumber')) return 'gst'
  if (normalized.includes('type') || normalized.includes('customertype')) return 'type'
  if (normalized.includes('balance') || normalized.includes('outstanding')) return 'balance'
  if (normalized.includes('notes') || normalized.includes('note') || normalized.includes('remarks')) return 'notes'
  
  // Product mappings
  if (normalized.includes('sku') || normalized.includes('productcode') || normalized.includes('itemcode')) return 'sku'
  if (normalized.includes('barcode') || normalized.includes('barcodenumber')) return 'barcode'
  if (normalized.includes('title') || normalized.includes('productname') || normalized.includes('name') || normalized.includes('itemname')) return 'title'
  if (normalized.includes('description') || normalized.includes('desc')) return 'description'
  if (normalized.includes('mrp') || normalized.includes('maximumretailprice') || normalized.includes('listprice')) return 'mrp'
  if (normalized.includes('saleprice') || normalized.includes('sellingprice') || normalized.includes('price') || normalized.includes('rate')) return 'salePrice'
  if (normalized.includes('cost') || normalized.includes('costprice') || normalized.includes('purchaseprice')) return 'cost'
  if (normalized.includes('discount') && !normalized.includes('type')) return 'defaultDiscount'
  if (normalized.includes('discounttype') || normalized.includes('discount_type')) return 'defaultDiscountType'
  if (normalized.includes('unit') || normalized.includes('unitid')) return 'unitId'
  if (normalized.includes('stock') || normalized.includes('quantity') || normalized.includes('qty') || normalized.includes('onhand')) return 'stockOnHand'
  if (normalized.includes('reorder') || normalized.includes('reorderlevel') || normalized.includes('minstock')) return 'reorderLevel'
  
  return normalized
}

// Parse Excel/CSV file
const parseFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Failed to read file'))
          return
        }
        
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Import customers from file
export const importCustomers = async (
  file: File,
  defaultType: CustomerType = 'customer',
  onProgress?: (current: number, total: number) => void,
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  let data: any[] = []

  try {
    data = await parseFile(file)
    
    if (!data || data.length === 0) {
      result.errors.push('File is empty or invalid')
      return result
    }

    // Normalize column names
    const normalizedData = data.map((row: any) => {
      const normalized: any = {}
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeColumnName(key)
        normalized[normalizedKey] = value
      }
      return normalized
    })

    for (let i = 0; i < normalizedData.length; i++) {
      const row = normalizedData[i]
      onProgress?.(i + 1, normalizedData.length)

      try {
        // Extract customer data
        const name = String(row.name || '').trim()
        if (!name) {
          result.failed++
          result.errors.push(`Row ${i + 2}: Name is required`)
          continue
        }

        const type = (row.type || defaultType).toString().toLowerCase().includes('supplier') ? 'supplier' : 'customer'
        const email = row.email ? String(row.email).trim() : undefined
        const phone = row.phone ? String(row.phone).trim() : undefined
        const address = row.address ? String(row.address).trim() : undefined
        const state = row.state ? String(row.state).trim() : undefined
        const gst = row.gst ? String(row.gst).trim() : undefined
        const balance = row.balance ? parseFloat(String(row.balance)) || 0 : 0
        const notes = row.notes ? String(row.notes).trim() : undefined

        await createCustomer({
          name,
          type,
          email,
          phone,
          address,
          state,
          gst,
          notes,
        })

        result.success++
      } catch (error) {
        result.failed++
        result.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Failed to import file')
    result.failed = data.length || 0
  }

  return result
}

// Import products from file
export const importProducts = async (
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  let data: any[] = []

  try {
    data = await parseFile(file)
    
    if (!data || data.length === 0) {
      result.errors.push('File is empty or invalid')
      return result
    }

    // Normalize column names
    const normalizedData = data.map((row: any) => {
      const normalized: any = {}
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeColumnName(key)
        normalized[normalizedKey] = value
      }
      return normalized
    })

    for (let i = 0; i < normalizedData.length; i++) {
      const row = normalizedData[i]
      onProgress?.(i + 1, normalizedData.length)

      try {
        // Extract product data
        const title = String(row.title || '').trim()
        if (!title) {
          result.failed++
          result.errors.push(`Row ${i + 2}: Title is required`)
          continue
        }

        const sku = row.sku ? String(row.sku).trim() : `SKU-${nanoid(8)}`
        const barcode = row.barcode ? String(row.barcode).trim() : undefined
        const description = row.description ? String(row.description).trim() : undefined
        const mrp = row.mrp ? parseFloat(String(row.mrp)) || 0 : 0
        const salePrice = row.saleprice ? parseFloat(String(row.saleprice)) : undefined
        const cost = row.cost ? parseFloat(String(row.cost)) || 0 : 0
        const defaultDiscount = row.defaultdiscount ? parseFloat(String(row.defaultdiscount)) || 0 : 0
        const defaultDiscountType = (row.defaultdiscounttype || 'amount').toString().toLowerCase().includes('percentage') ? 'percentage' : 'amount'
        const unitId = row.unitid ? String(row.unitid).trim() : undefined
        const stockOnHand = row.stockonhand ? parseFloat(String(row.stockonhand)) || 0 : 0
        const reorderLevel = row.reorderlevel ? parseFloat(String(row.reorderlevel)) : undefined

        await createProduct({
          sku,
          barcode,
          title,
          description,
          mrp,
          salePrice,
          cost,
          defaultDiscount,
          defaultDiscountType,
          unitId,
          reorderLevel,
        })

        result.success++
      } catch (error) {
        result.failed++
        result.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Failed to import file')
    result.failed = data.length || 0
  }

  return result
}

// Vyapar-specific import (handles common Vyapar export formats)
export const importFromVyapar = async (
  file: File,
  type: 'customer' | 'product',
  onProgress?: (current: number, total: number) => void,
): Promise<ImportResult> => {
  // Vyapar exports are typically Excel files with specific column names
  // We'll use the same import functions but with Vyapar-specific column mapping
  if (type === 'customer') {
    return importCustomers(file, 'customer', onProgress)
  } else {
    return importProducts(file, onProgress)
  }
}

