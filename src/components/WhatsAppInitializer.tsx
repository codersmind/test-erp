import { useEffect } from 'react'
import { getIntegrationSettings, updateWhatsAppSettings } from '../utils/integrationSettings'
import { whatsappService } from '../services/whatsappService'

/**
 * Component that automatically initializes WhatsApp when the app starts
 * if it's enabled in settings. Runs once when the component mounts.
 */
export const WhatsAppInitializer = () => {
  useEffect(() => {
    let isMounted = true

    const initializeWhatsApp = async () => {
      try {
        // Load integration settings
        const settings = await getIntegrationSettings()
        
        // Only initialize if WhatsApp is enabled
        if (!settings.whatsapp.enabled) {
          return
        }

        console.log('Auto-initializing WhatsApp on app startup...')

        // Check if already connected
        const isConnected = await whatsappService.checkConnection()
        if (isConnected) {
          console.log('WhatsApp already connected on app startup')
          // Update stored status
          await updateWhatsAppSettings({ isConnected: true })
          return
        }

        // Set up event listeners for connection status updates
        const handleReady = async () => {
          if (isMounted) {
            console.log('WhatsApp connected on app startup')
            await updateWhatsAppSettings({ isConnected: true })
          }
        }

        const handleDisconnected = async () => {
          if (isMounted) {
            console.log('WhatsApp disconnected on app startup')
            await updateWhatsAppSettings({ isConnected: false })
          }
        }

        whatsappService.onReady(handleReady)
        whatsappService.onDisconnected(handleDisconnected)

        // Initialize WhatsApp (will restore session if it exists)
        await whatsappService.initialize(settings.whatsapp)

        // Wait for session restoration or QR code
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Check connection status
        const connected = await whatsappService.checkConnection()
        if (isMounted) {
          await updateWhatsAppSettings({ isConnected: connected })
        }
      } catch (error) {
        console.error('Error auto-initializing WhatsApp on app startup:', error)
        // Don't show error to user - it's a background operation
      }
    }

    // Initialize after a short delay to ensure app is fully loaded
    const timeoutId = setTimeout(() => {
      initializeWhatsApp()
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      isMounted = false
      // Cleanup event listeners
      whatsappService.onReady(() => {})
      whatsappService.onDisconnected(() => {})
    }
  }, []) // Run only once on mount

  // This component doesn't render anything
  return null
}

