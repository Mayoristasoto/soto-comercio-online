import { HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ContextualHelpProps {
  content: string
  title?: string
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function ContextualHelp({ 
  content, 
  title, 
  className,
  side = 'right' 
}: ContextualHelpProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 rounded-full hover:bg-accent",
              className
            )}
            aria-label="Ayuda contextual"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface HelpBannerProps {
  title: string
  description: string
  videoUrl?: string
  onDismiss?: () => void
}

export function HelpBanner({ title, description, videoUrl, onDismiss }: HelpBannerProps) {
  return (
    <div className="bg-accent/50 border border-border rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="bg-primary/10 rounded-full p-2">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            {videoUrl && (
              <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                  Ver tutorial en video →
                </a>
              </Button>
            )}
          </div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
