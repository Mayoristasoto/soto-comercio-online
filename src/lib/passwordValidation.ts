// Biblioteca de validación de contraseñas seguras

export interface PasswordValidation {
  isValid: boolean
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  score: number // 0-100
  errors: string[]
  warnings: string[]
  requirements: {
    minLength: boolean
    hasUpperCase: boolean
    hasLowerCase: boolean
    hasNumber: boolean
    hasSpecialChar: boolean
    noCommonPatterns: boolean
    noSequentialChars: boolean
  }
}

// Lista de contraseñas comunes (top 100 más usadas)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'admin', 'welcome', 'login', 'password123',
  'solo', 'starwars', 'charlie', 'aa123456', 'princess', 'qwertyuiop',
  '1234', '12345', '123456789', '1234567890', 'pass', 'pass123'
]

// Patrones secuenciales comunes
const SEQUENTIAL_PATTERNS = [
  'abcd', 'bcde', 'cdef', '1234', '2345', '3456', '4567', '5678', '6789',
  'qwer', 'wert', 'erty', 'asdf', 'sdfg', 'zxcv', 'xcvb'
]

/**
 * Valida la fortaleza de una contraseña según criterios de seguridad
 * @param password - Contraseña a validar
 * @returns Objeto con información detallada de validación
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  // Requisitos básicos
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommonPatterns: !isCommonPassword(password),
    noSequentialChars: true // Ya no validamos secuencias
  }

  // Validar longitud mínima (requisito obligatorio)
  if (!requirements.minLength) {
    errors.push('La contraseña debe tener al menos 8 caracteres')
  } else {
    score += 25
    if (password.length >= 12) score += 10 // Bonus por longitud extra
    if (password.length >= 16) score += 15 // Bonus adicional
  }

  // Validar mayúsculas (requisito obligatorio)
  if (!requirements.hasUpperCase) {
    errors.push('Debe contener al menos una letra mayúscula (A-Z)')
  } else {
    score += 15
  }

  // Validar minúsculas (requisito obligatorio)
  if (!requirements.hasLowerCase) {
    errors.push('Debe contener al menos una letra minúscula (a-z)')
  } else {
    score += 15
  }

  // Validar números (requisito obligatorio)
  if (!requirements.hasNumber) {
    errors.push('Debe contener al menos un número (0-9)')
  } else {
    score += 15
  }

  // Validar caracteres especiales (opcional pero recomendado)
  if (!requirements.hasSpecialChar) {
    warnings.push('Considera usar caracteres especiales para mayor seguridad (!@#$%^&*)')
    score = Math.max(0, score - 5)
  } else {
    score += 20
  }

  // Verificar contraseñas comunes (advertencia fuerte)
  if (!requirements.noCommonPatterns) {
    errors.push('Esta contraseña es muy común y fácil de adivinar')
    score = Math.max(0, score - 30)
  }

  // Ya no validamos caracteres secuenciales

  // Bonificaciones adicionales por complejidad
  const uniqueChars = new Set(password).size
  if (uniqueChars >= 10) {
    score += 10 // Bonus por variedad de caracteres
  }

  // Penalización por repeticiones
  if (hasRepeatedChars(password)) {
    warnings.push('Evita repetir caracteres consecutivos')
    score = Math.max(0, score - 5)
  }

  // Calcular fortaleza
  const isValid = errors.length === 0
  let strength: PasswordValidation['strength']
  
  if (score >= 85) strength = 'very-strong'
  else if (score >= 70) strength = 'strong'
  else if (score >= 50) strength = 'medium'
  else strength = 'weak'

  return {
    isValid,
    strength,
    score: Math.min(100, Math.max(0, score)),
    errors,
    warnings,
    requirements
  }
}

/**
 * Verifica si la contraseña está en la lista de contraseñas comunes
 */
function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase()
  return COMMON_PASSWORDS.some(common => 
    lower === common || 
    lower.includes(common) ||
    common.includes(lower)
  )
}

/**
 * Verifica si la contraseña contiene caracteres secuenciales
 */
function hasSequentialChars(password: string): boolean {
  const lower = password.toLowerCase()
  return SEQUENTIAL_PATTERNS.some(pattern => lower.includes(pattern))
}

/**
 * Verifica si la contraseña tiene caracteres repetidos consecutivamente
 */
function hasRepeatedChars(password: string): boolean {
  return /(.)\1{2,}/.test(password) // 3 o más caracteres iguales consecutivos
}

/**
 * Genera una sugerencia de contraseña segura
 */
export function generateSecurePasswordSuggestion(): string {
  const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowerCase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|'
  
  let password = ''
  
  // Asegurar que tenga al menos uno de cada tipo
  password += upperCase[Math.floor(Math.random() * upperCase.length)]
  password += lowerCase[Math.floor(Math.random() * lowerCase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Rellenar hasta 16 caracteres
  const allChars = upperCase + lowerCase + numbers + special
  for (let i = password.length; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Mezclar
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Obtiene el color para el indicador de fortaleza
 */
export function getStrengthColor(strength: PasswordValidation['strength']): string {
  switch (strength) {
    case 'very-strong': return 'hsl(var(--chart-2))' // Verde
    case 'strong': return 'hsl(var(--chart-3))' // Verde claro
    case 'medium': return 'hsl(var(--chart-4))' // Amarillo
    case 'weak': return 'hsl(var(--destructive))' // Rojo
  }
}

/**
 * Obtiene el texto descriptivo de fortaleza
 */
export function getStrengthText(strength: PasswordValidation['strength']): string {
  switch (strength) {
    case 'very-strong': return 'Muy Fuerte'
    case 'strong': return 'Fuerte'
    case 'medium': return 'Media'
    case 'weak': return 'Débil'
  }
}
