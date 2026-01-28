import { Progress } from "@/components/ui/progress"
import { validatePassword, getStrengthColor, getStrengthText } from "@/lib/passwordValidation"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password)

  if (!password) return null

  return (
    <div className="space-y-3">
      {/* Barra de fortaleza */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Fortaleza de contraseña
          </span>
          <span 
            className="text-xs font-semibold"
            style={{ color: getStrengthColor(validation.strength) }}
          >
            {getStrengthText(validation.strength)} ({validation.score}%)
          </span>
        </div>
        <div className="relative">
          <Progress 
            value={validation.score} 
            className="h-2"
          />
          <div 
            className="absolute inset-0 h-2 rounded-full transition-all"
            style={{ 
              width: `${validation.score}%`,
              backgroundColor: getStrengthColor(validation.strength),
              opacity: 0.9
            }}
          />
        </div>
      </div>

      {/* Requisitos detallados */}
      {showRequirements && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Requisitos de seguridad:
          </p>
          <ul className="space-y-1.5 text-xs">
            <RequirementItem 
              met={validation.requirements.minLength}
              text="Mínimo 8 caracteres"
            />
            <RequirementItem 
              met={validation.requirements.hasUpperCase}
              text="Al menos una letra mayúscula (A-Z)"
            />
            <RequirementItem 
              met={validation.requirements.hasLowerCase}
              text="Al menos una letra minúscula (a-z)"
            />
            <RequirementItem 
              met={validation.requirements.hasNumber}
              text="Al menos un número (0-9)"
            />
            <RequirementItem 
              met={validation.requirements.noCommonPatterns}
              text="No usar contraseñas comunes"
              isWarning={!validation.requirements.noCommonPatterns}
            />
          </ul>
        </div>
      )}

      {/* Errores */}
      {validation.errors.length > 0 && (
        <div className="rounded-lg bg-destructive/10 p-3 space-y-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-destructive">
              <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Advertencias */}
      {validation.warnings.length > 0 && (
        <div className="rounded-lg bg-orange-500/10 p-3 space-y-1">
          {validation.warnings.map((warning, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface RequirementItemProps {
  met: boolean
  text: string
  isWarning?: boolean
}

function RequirementItem({ met, text, isWarning = false }: RequirementItemProps) {
  return (
    <li className="flex items-start gap-2">
      {met ? (
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
      ) : isWarning ? (
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-orange-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/50" />
      )}
      <span className={met ? "text-green-600 font-medium" : "text-muted-foreground"}>
        {text}
      </span>
    </li>
  )
}
