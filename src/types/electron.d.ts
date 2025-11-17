export interface ElectronPrinter {
  getPrinters(): Promise<{
    success: boolean
    printers?: Array<{
      name: string
      displayName: string
      description: string
      status: number
      isDefault: boolean
    }>
    error?: string
  }>
  print(options: { html: string; printerName?: string; silent?: boolean }): Promise<{
    success: boolean
    error?: string
  }>
  showDialog(): Promise<{
    success: boolean
    printer?: {
      name: string
      displayName: string
      description: string
    }
    error?: string
  }>
}

declare global {
  interface Window {
    electronPrinter?: ElectronPrinter
  }
}

