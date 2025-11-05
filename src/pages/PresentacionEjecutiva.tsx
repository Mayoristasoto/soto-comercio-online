import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Calendar, TrendingUp, Users, Shield, Clock, Award, CheckCircle, ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { generatePresentacionEjecutivaPDF } from '@/utils/presentacionEjecutivaPDF';
import { toast } from 'sonner';

const PresentacionEjecutiva = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const slides = [
    // Slide 1: Portada
    {
      id: 'portada',
      content: (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-white via-purple-50 to-orange-50">
          <div className="text-center space-y-8 max-w-4xl px-8">
            <img 
              src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
              alt="SOTO Mayorista" 
              className="h-32 mx-auto object-contain"
            />
            <h1 className="text-6xl font-bold" style={{ color: '#4b0d6d' }}>
              Sistema de Gestión de RRHH
            </h1>
            <p className="text-3xl" style={{ color: '#95198d' }}>
              Transforme la gestión de su talento humano
            </p>
            <div className="pt-8">
              <p className="text-xl text-muted-foreground">
                Solución integral para empresas modernas
              </p>
            </div>
          </div>
        </div>
      ),
    },
    
    // Slide 2: Problemática Actual
    {
      id: 'problematica',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-5xl w-full space-y-8">
            <h2 className="text-5xl font-bold text-center mb-12" style={{ color: '#4b0d6d' }}>
              Desafíos Actuales en RRHH
            </h2>
            <div className="grid grid-cols-2 gap-8">
              <Card className="p-8 bg-white/80 backdrop-blur border-2" style={{ borderColor: '#e04403' }}>
                <div className="flex items-start space-x-4">
                  <Clock className="w-12 h-12 flex-shrink-0" style={{ color: '#e04403' }} />
                  <div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#4b0d6d' }}>
                      Procesos Manuales
                    </h3>
                    <p className="text-lg text-muted-foreground">
                      70% del tiempo se pierde en tareas administrativas repetitivas
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-8 bg-white/80 backdrop-blur border-2" style={{ borderColor: '#e04403' }}>
                <div className="flex items-start space-x-4">
                  <Shield className="w-12 h-12 flex-shrink-0" style={{ color: '#e04403' }} />
                  <div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#4b0d6d' }}>
                      Falta de Control
                    </h3>
                    <p className="text-lg text-muted-foreground">
                      Errores en fichajes y dificultad para verificar asistencia
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-8 bg-white/80 backdrop-blur border-2" style={{ borderColor: '#e04403' }}>
                <div className="flex items-start space-x-4">
                  <Users className="w-12 h-12 flex-shrink-0" style={{ color: '#e04403' }} />
                  <div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#4b0d6d' }}>
                      Bajo Engagement
                    </h3>
                    <p className="text-lg text-muted-foreground">
                      Falta de reconocimiento y motivación del equipo
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-8 bg-white/80 backdrop-blur border-2" style={{ borderColor: '#e04403' }}>
                <div className="flex items-start space-x-4">
                  <TrendingUp className="w-12 h-12 flex-shrink-0" style={{ color: '#e04403' }} />
                  <div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#4b0d6d' }}>
                      Sin Métricas
                    </h3>
                    <p className="text-lg text-muted-foreground">
                      Imposible medir productividad y tomar decisiones basadas en datos
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    
    // Slide 3: Solución
    {
      id: 'solucion',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="max-w-5xl w-full space-y-8">
            <h2 className="text-5xl font-bold text-center mb-12" style={{ color: '#4b0d6d' }}>
              Solución SOTO: Sistema Integral de RRHH
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <Card className="p-6 text-center hover:scale-105 transition-transform bg-white border-2" style={{ borderColor: '#95198d' }}>
                <div className="rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#4b0d6d' }}>
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                  Gestión Completa
                </h3>
                <p className="text-muted-foreground">
                  Nómina, documentos, evaluaciones y más en una sola plataforma
                </p>
              </Card>
              
              <Card className="p-6 text-center hover:scale-105 transition-transform bg-white border-2" style={{ borderColor: '#95198d' }}>
                <div className="rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#95198d' }}>
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                  Máxima Seguridad
                </h3>
                <p className="text-muted-foreground">
                  Reconocimiento facial y control biométrico avanzado
                </p>
              </Card>
              
              <Card className="p-6 text-center hover:scale-105 transition-transform bg-white border-2" style={{ borderColor: '#95198d' }}>
                <div className="rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#e04403' }}>
                  <Clock className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                  Automatización
                </h3>
                <p className="text-muted-foreground">
                  Elimina tareas manuales y ahorra hasta 70% del tiempo
                </p>
              </Card>
              
              <Card className="p-6 text-center hover:scale-105 transition-transform bg-white border-2" style={{ borderColor: '#95198d' }}>
                <div className="rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#4b0d6d' }}>
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                  Reconocimiento
                </h3>
                <p className="text-muted-foreground">
                  Sistema de gamificación que aumenta engagement 40%
                </p>
              </Card>
              
              <Card className="p-6 text-center hover:scale-105 transition-transform bg-white border-2" style={{ borderColor: '#95198d' }}>
                <div className="rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#95198d' }}>
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                  Analytics
                </h3>
                <p className="text-muted-foreground">
                  Dashboards en tiempo real para decisiones inteligentes
                </p>
              </Card>
              
              <Card className="p-6 text-center hover:scale-105 transition-transform bg-white border-2" style={{ borderColor: '#95198d' }}>
                <div className="rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#e04403' }}>
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                  Planificación
                </h3>
                <p className="text-muted-foreground">
                  Gestión de vacaciones, horarios y turnos inteligente
                </p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    
    // Slide 4: ROI y Beneficios
    {
      id: 'roi',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12" style={{ background: 'linear-gradient(135deg, #4b0d6d 0%, #95198d 50%, #e04403 100%)' }}>
          <div className="max-w-5xl w-full space-y-8">
            <h2 className="text-5xl font-bold text-center mb-12 text-white">
              ROI y Beneficios Cuantificables
            </h2>
            <div className="grid grid-cols-2 gap-8">
              <Card className="p-8 bg-white/95 backdrop-blur">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4" style={{ color: '#4b0d6d' }}>
                    6-8
                  </div>
                  <p className="text-2xl font-semibold mb-2" style={{ color: '#95198d' }}>
                    Meses de ROI
                  </p>
                  <p className="text-muted-foreground">
                    Recuperación de inversión garantizada
                  </p>
                </div>
              </Card>
              
              <Card className="p-8 bg-white/95 backdrop-blur">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4" style={{ color: '#4b0d6d' }}>
                    70%
                  </div>
                  <p className="text-2xl font-semibold mb-2" style={{ color: '#95198d' }}>
                    Ahorro de Tiempo
                  </p>
                  <p className="text-muted-foreground">
                    En tareas administrativas
                  </p>
                </div>
              </Card>
              
              <Card className="p-8 bg-white/95 backdrop-blur">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4" style={{ color: '#4b0d6d' }}>
                    85%
                  </div>
                  <p className="text-2xl font-semibold mb-2" style={{ color: '#95198d' }}>
                    Precisión
                  </p>
                  <p className="text-muted-foreground">
                    En control de asistencia
                  </p>
                </div>
              </Card>
              
              <Card className="p-8 bg-white/95 backdrop-blur">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4" style={{ color: '#4b0d6d' }}>
                    40%
                  </div>
                  <p className="text-2xl font-semibold mb-2" style={{ color: '#95198d' }}>
                    Más Engagement
                  </p>
                  <p className="text-muted-foreground">
                    Del equipo de trabajo
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    
    // Slide 5: Módulos Principales
    {
      id: 'modulos',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-gradient-to-br from-white via-purple-50 to-orange-50">
          <div className="max-w-6xl w-full space-y-8">
            <h2 className="text-5xl font-bold text-center mb-12" style={{ color: '#4b0d6d' }}>
              Módulos Principales del Sistema
            </h2>
            <div className="space-y-6">
              <Card className="p-6 bg-white border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#4b0d6d' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                      Control de Asistencia con Reconocimiento Facial
                    </h3>
                    <p className="text-lg text-muted-foreground mb-3">
                      Sistema biométrico avanzado que elimina suplantaciones y errores
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        85% precisión
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Sin contacto físico
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Reportes automáticos
                      </span>
                    </div>
                  </div>
                  <Shield className="w-16 h-16 ml-4" style={{ color: '#95198d' }} />
                </div>
              </Card>
              
              <Card className="p-6 bg-white border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#95198d' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                      Gestión de Nómina y Documentos
                    </h3>
                    <p className="text-lg text-muted-foreground mb-3">
                      Centraliza información, contratos, firmas digitales y trámites
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Firma electrónica
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Archivo digital
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Alertas automáticas
                      </span>
                    </div>
                  </div>
                  <Users className="w-16 h-16 ml-4" style={{ color: '#95198d' }} />
                </div>
              </Card>
              
              <Card className="p-6 bg-white border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#e04403' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                      Sistema de Reconocimiento y Gamificación
                    </h3>
                    <p className="text-lg text-muted-foreground mb-3">
                      Aumenta motivación con desafíos, insignias y premios canjeables
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        +40% engagement
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Rankings en vivo
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        Premios reales
                      </span>
                    </div>
                  </div>
                  <Award className="w-16 h-16 ml-4" style={{ color: '#e04403' }} />
                </div>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    
    // Slide 6: Métricas de Impacto
    {
      id: 'metricas',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-gradient-to-br from-purple-900 to-orange-900">
          <div className="max-w-5xl w-full space-y-10">
            <h2 className="text-5xl font-bold text-center mb-12 text-white">
              Impacto Medible en su Organización
            </h2>
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-semibold text-white">Reducción Tiempo Administrativo</span>
                  <span className="text-2xl font-bold text-white">70%</span>
                </div>
                <Progress value={70} className="h-4" />
              </div>
              
              <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-semibold text-white">Precisión en Control Horario</span>
                  <span className="text-2xl font-bold text-white">85%</span>
                </div>
                <Progress value={85} className="h-4" />
              </div>
              
              <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-semibold text-white">Aumento de Engagement</span>
                  <span className="text-2xl font-bold text-white">40%</span>
                </div>
                <Progress value={40} className="h-4" />
              </div>
              
              <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-semibold text-white">Reducción de Errores</span>
                  <span className="text-2xl font-bold text-white">90%</span>
                </div>
                <Progress value={90} className="h-4" />
              </div>
              
              <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-semibold text-white">Satisfacción del Personal</span>
                  <span className="text-2xl font-bold text-white">95%</span>
                </div>
                <Progress value={95} className="h-4" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    
    // Slide 7: Próximos Pasos
    {
      id: 'proximos-pasos',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-gradient-to-br from-white via-purple-50 to-pink-50">
          <div className="max-w-4xl w-full space-y-10 text-center">
            <h2 className="text-5xl font-bold mb-8" style={{ color: '#4b0d6d' }}>
              Comience su Transformación Digital
            </h2>
            
            <div className="space-y-6">
              <Card className="p-8 bg-white border-2 hover:shadow-xl transition-shadow" style={{ borderColor: '#95198d' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: '#4b0d6d' }}>
                      1
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                        Demo Personalizada
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        Conozca el sistema adaptado a sus necesidades
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8" style={{ color: '#95198d' }} />
                </div>
              </Card>
              
              <Card className="p-8 bg-white border-2 hover:shadow-xl transition-shadow" style={{ borderColor: '#95198d' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: '#95198d' }}>
                      2
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                        Prueba Piloto
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        Implemente en un área específica sin riesgos
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8" style={{ color: '#95198d' }} />
                </div>
              </Card>
              
              <Card className="p-8 bg-white border-2 hover:shadow-xl transition-shadow" style={{ borderColor: '#95198d' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: '#e04403' }}>
                      3
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bold mb-2" style={{ color: '#4b0d6d' }}>
                        Implementación Total
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        Despliegue completo con capacitación incluida
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8" style={{ color: '#e04403' }} />
                </div>
              </Card>
            </div>
            
            <div className="pt-8">
              <Button 
                size="lg" 
                className="text-xl px-12 py-6 h-auto text-white hover:scale-105 transition-transform"
                style={{ backgroundColor: '#4b0d6d' }}
              >
                Solicitar Demo Ahora
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nextSlide = useCallback(() => {
    setDirection('next');
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection('prev');
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleGeneratePDF = async () => {
    try {
      toast.loading('Generando PDF de la presentación...');
      await generatePresentacionEjecutivaPDF();
      toast.success('PDF generado y descargado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
          }
          break;
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [nextSlide, prevSlide, toggleFullscreen, isFullscreen]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Slide Content */}
      <div className="relative w-full h-full">
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            direction === 'next' 
              ? 'animate-[slideInRight_0.7s_ease-out]' 
              : 'animate-[slideInLeft_0.7s_ease-out]'
          }`}
          key={currentSlide}
        >
          {slides[currentSlide].content}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 px-8">
        <Button
          variant="outline"
          size="icon"
          onClick={prevSlide}
          className="bg-white/90 backdrop-blur hover:bg-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? 'next' : 'prev');
                setCurrentSlide(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8' 
                  : 'w-2'
              }`}
              style={{ 
                backgroundColor: index === currentSlide ? '#4b0d6d' : '#d1d5db' 
              }}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={nextSlide}
          className="bg-white/90 backdrop-blur hover:bg-white"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          className="ml-4 bg-white/90 backdrop-blur hover:bg-white"
        >
          {isFullscreen ? (
            <Minimize className="w-6 h-6" />
          ) : (
            <Maximize className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleGeneratePDF}
          className="ml-2 bg-white/90 backdrop-blur hover:bg-white"
          title="Descargar como PDF"
        >
          <Download className="w-6 h-6" />
        </Button>
      </div>

      {/* Slide Counter */}
      <div className="absolute top-8 right-8 bg-white/90 backdrop-blur px-4 py-2 rounded-lg">
        <span className="font-semibold" style={{ color: '#4b0d6d' }}>
          {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* Help Text */}
      <div className="absolute top-8 left-8 bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-sm text-muted-foreground">
        Usa ← → o Espacio para navegar | F para pantalla completa
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PresentacionEjecutiva;
