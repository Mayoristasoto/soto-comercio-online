import { useState, useEffect } from 'react'

export interface AccessibilitySettings {
  highContrast: boolean
  fontSize: 'normal' | 'large' | 'xlarge'
  reducedMotion: boolean
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'normal',
  reducedMotion: false
}

const STORAGE_KEY = 'accessibility-settings'

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS
  })

  useEffect(() => {
    // Aplicar configuraciones al DOM
    const root = document.documentElement
    
    // Alto contraste
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Tamaño de fuente
    root.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge')
    root.classList.add(`font-size-${settings.fontSize}`)

    // Movimiento reducido
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSettings = (partial: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...partial }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  return {
    settings,
    updateSettings,
    resetSettings
  }
}
