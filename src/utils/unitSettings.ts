import { get, set } from 'idb-keyval'

export interface Unit {
  id: string
  name: string // Display name (e.g., "Piece", "Dozen")
  symbol: string // Short form (e.g., "pcs", "dz")
  isBase: boolean // Base unit (cannot be deleted, used for conversions)
  conversionFactor: number // Conversion factor to base unit (e.g., 12 for dozen if base is piece)
}

export interface UnitSettings {
  units: Record<string, Unit> // Map of unit ID to Unit
  defaultUnitId: string // Default unit ID for new products
}

const UNIT_SETTINGS_KEY = 'erp_unit_settings'

// Default units
const DEFAULT_UNITS: Record<string, Unit> = {
  piece: {
    id: 'piece',
    name: 'Piece',
    symbol: 'pcs',
    isBase: true,
    conversionFactor: 1,
  },
  dozen: {
    id: 'dozen',
    name: 'Dozen',
    symbol: 'dz',
    isBase: false,
    conversionFactor: 12, // 1 dozen = 12 pieces
  },
  gross: {
    id: 'gross',
    name: 'Gross',
    symbol: 'gr',
    isBase: false,
    conversionFactor: 144, // 1 gross = 144 pieces
  },
}

const DEFAULT_UNIT_SETTINGS: UnitSettings = {
  units: DEFAULT_UNITS,
  defaultUnitId: 'piece',
}

export const getUnitSettings = async (): Promise<UnitSettings> => {
  const settings = await get<UnitSettings>(UNIT_SETTINGS_KEY)
  if (!settings) {
    return DEFAULT_UNIT_SETTINGS
  }
  // Merge with defaults to ensure all default units exist
  return {
    units: { ...DEFAULT_UNITS, ...settings.units },
    defaultUnitId: settings.defaultUnitId || DEFAULT_UNIT_SETTINGS.defaultUnitId,
  }
}

export const setUnitSettings = async (settings: UnitSettings): Promise<void> => {
  await set(UNIT_SETTINGS_KEY, settings)
}

export const getAllUnits = async (): Promise<Unit[]> => {
  const settings = await getUnitSettings()
  return Object.values(settings.units).sort((a, b) => {
    // Base units first, then alphabetically
    if (a.isBase && !b.isBase) return -1
    if (!a.isBase && b.isBase) return 1
    return a.name.localeCompare(b.name)
  })
}

export const getUnit = async (unitId: string): Promise<Unit | null> => {
  const settings = await getUnitSettings()
  return settings.units[unitId] || null
}

export const addUnit = async (unit: Omit<Unit, 'id'>): Promise<Unit> => {
  const settings = await getUnitSettings()
  const id = unit.symbol.toLowerCase().replace(/\s+/g, '_')
  
  // Check if unit already exists
  if (settings.units[id]) {
    throw new Error(`Unit with symbol "${unit.symbol}" already exists`)
  }

  const newUnit: Unit = {
    ...unit,
    id,
  }

  settings.units[id] = newUnit
  await setUnitSettings(settings)
  return newUnit
}

export const updateUnit = async (unitId: string, updates: Partial<Omit<Unit, 'id' | 'isBase'>>): Promise<void> => {
  const settings = await getUnitSettings()
  const unit = settings.units[unitId]
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`)
  }

  if (unit.isBase) {
    // Base units can only update name and symbol, not conversion factor
    if (updates.conversionFactor !== undefined && updates.conversionFactor !== 1) {
      throw new Error('Base units must have conversion factor of 1')
    }
  }

  settings.units[unitId] = {
    ...unit,
    ...updates,
    id: unitId,
    isBase: unit.isBase, // Cannot change isBase
  }

  await setUnitSettings(settings)
}

export const deleteUnit = async (unitId: string): Promise<void> => {
  const settings = await getUnitSettings()
  const unit = settings.units[unitId]
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`)
  }

  if (unit.isBase) {
    throw new Error('Cannot delete base units')
  }

  delete settings.units[unitId]
  await setUnitSettings(settings)
}

export const setDefaultUnit = async (unitId: string): Promise<void> => {
  const settings = await getUnitSettings()
  if (!settings.units[unitId]) {
    throw new Error(`Unit ${unitId} not found`)
  }
  settings.defaultUnitId = unitId
  await setUnitSettings(settings)
}

// Convert quantity from one unit to another
export const convertQuantity = async (
  quantity: number,
  fromUnitId: string,
  toUnitId: string,
): Promise<number> => {
  const settings = await getUnitSettings()
  const fromUnit = settings.units[fromUnitId]
  const toUnit = settings.units[toUnitId]

  if (!fromUnit || !toUnit) {
    throw new Error('Invalid unit IDs')
  }

  // Convert to base unit first, then to target unit
  const baseQuantity = quantity * fromUnit.conversionFactor
  return baseQuantity / toUnit.conversionFactor
}

// Get conversion factor between two units
export const getConversionFactor = async (fromUnitId: string, toUnitId: string): Promise<number> => {
  const settings = await getUnitSettings()
  const fromUnit = settings.units[fromUnitId]
  const toUnit = settings.units[toUnitId]

  if (!fromUnit || !toUnit) {
    throw new Error('Invalid unit IDs')
  }

  return fromUnit.conversionFactor / toUnit.conversionFactor
}

