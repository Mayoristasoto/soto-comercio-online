import { useState, useEffect } from 'react';
import { Smartphone, Check, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar el evento de instalación
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-2xl mx-auto space-y-6 py-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Instalar SOTO RRHH</h1>
          <p className="text-muted-foreground text-lg">
            Accede rápidamente desde tu pantalla de inicio
          </p>
        </div>

        {/* Estado de instalación */}
        {isInstalled ? (
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>¡App instalada!</CardTitle>
                  <CardDescription>Ya puedes acceder desde tu pantalla de inicio</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardHeader>
              <CardTitle>Instalar aplicación</CardTitle>
              <CardDescription>
                Instala SOTO RRHH en tu dispositivo para acceso rápido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstall} size="lg" className="w-full">
                <Download className="w-5 h-5 mr-2" />
                Instalar ahora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Instrucciones de instalación</CardTitle>
              <CardDescription>Sigue estos pasos para instalar la app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Android Chrome */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Android (Chrome/Edge)
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">1.</span>
                    <span>Toca el menú <strong>⋮</strong> en la esquina superior derecha</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">2.</span>
                    <span>Selecciona <strong>"Agregar a pantalla de inicio"</strong> o <strong>"Instalar app"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">3.</span>
                    <span>Confirma tocando <strong>"Agregar"</strong></span>
                  </li>
                </ol>
              </div>

              {/* iPhone Safari */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  iPhone/iPad (Safari)
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">1.</span>
                    <span>Toca el botón <Share2 className="w-4 h-4 inline" /> <strong>Compartir</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">2.</span>
                    <span>Desplázate y toca <strong>"Agregar a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">3.</span>
                    <span>Toca <strong>"Agregar"</strong> en la esquina superior derecha</span>
                  </li>
                </ol>
              </div>

              {/* Desktop */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Escritorio (Chrome/Edge)
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">1.</span>
                    <span>Busca el ícono <Download className="w-4 h-4 inline" /> en la barra de direcciones</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-primary">2.</span>
                    <span>Haz clic en <strong>"Instalar"</strong></span>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Beneficios */}
        <Card>
          <CardHeader>
            <CardTitle>Beneficios de instalar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong>Acceso instantáneo</strong>
                  <p className="text-sm text-muted-foreground">Abre la app desde tu pantalla de inicio</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong>Funciona offline</strong>
                  <p className="text-sm text-muted-foreground">Consulta información sin conexión a internet</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong>Experiencia nativa</strong>
                  <p className="text-sm text-muted-foreground">Pantalla completa sin la barra del navegador</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong>Actualizaciones automáticas</strong>
                  <p className="text-sm text-muted-foreground">Siempre tendrás la última versión</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
