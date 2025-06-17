
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { User, Store, Truck, ChevronRight, CheckCircle, Star, ArrowDown } from 'lucide-react';

const Index = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const steps = [
    { id: 1, title: "Elegí tu perfil", completed: false },
    { id: 2, title: "Ver productos", completed: false },
    { id: 3, title: "Realizar pedido", completed: false }
  ];

  const benefits = [
    "Precios mayoristas exclusivos",
    "Envío gratis en Mar del Plata",
    "Productos de calidad garantizada",
    "Atención personalizada"
  ];

  const testimonials = [
    { name: "Kiosco Central", text: "Excelente calidad y precios", rating: 5 },
    { name: "Distribuidora Norte", text: "Envíos siempre puntuales", rating: 5 },
    { name: "Almacén del Barrio", text: "Variedad increíble", rating: 5 }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header mejorado */}
      <header className="pt-6 pb-4 sticky top-0 bg-white/80 backdrop-blur-sm z-50 border-b border-purple-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
                alt="Mayorista Soto Logo" 
                className="h-12 sm:h-16 w-auto"
              />
              <div>
                <h1 className="font-bold text-lg sm:text-xl text-gray-800">Mayorista Soto</h1>
                <p className="text-sm text-gray-600">Tu distribuidora de confianza</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Envío gratis MDQ
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section con progreso visible */}
      <section className="py-8 sm:py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 to-pink-100/50"></div>
        <div className="container mx-auto px-4 relative">
          
          {/* Progreso visible */}
          <div className="max-w-2xl mx-auto mb-8">
            <h2 className="text-center text-sm font-medium text-gray-600 mb-4">Tu proceso de compra</h2>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    index === currentStep 
                      ? 'bg-purple-600 text-white scale-110' 
                      : index < currentStep 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index < currentStep ? <CheckCircle size={16} /> : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 sm:w-20 h-1 mx-2 transition-all duration-300 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((step, index) => (
                <span key={step.id} className={`text-xs transition-all duration-300 ${
                  index === currentStep ? 'text-purple-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          {/* Título principal con jerarquía visual */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star size={16} className="mr-2" />
              Más de 1000 clientes satisfechos
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent leading-tight">
              ¿Qué tipo de cliente sos?
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed mb-8">
              Elegí tu perfil y descubrí <span className="font-semibold text-purple-600">precios exclusivos</span> 
              <br className="hidden sm:block" />
              diseñados especialmente para vos
            </p>
            
            {/* Beneficios destacados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-100">
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center text-purple-600 mb-4">
              <ArrowDown size={20} className="animate-bounce" />
              <span className="ml-2 text-sm font-medium">Comenzá eligiendo tu perfil</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cards de selección con interactividad mejorada */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Particular */}
            <Card 
              className={`cursor-pointer transition-all duration-300 border-2 hover:border-blue-300 hover:shadow-xl hover:-translate-y-2 group ${
                selectedCard === 'particular' ? 'border-blue-400 shadow-lg scale-105' : 'hover:border-blue-200'
              }`}
              onMouseEnter={() => setSelectedCard('particular')}
              onMouseLeave={() => setSelectedCard(null)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <User size={32} className="text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                  Particular
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Comprás para tu casa o consumo personal
                </CardDescription>
                <Badge variant="outline" className="w-fit mx-auto mt-2 border-blue-200 text-blue-700">
                  Precios minoristas
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    Compra mínima: Sin restricciones
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    Ideal para: Consumo familiar
                  </div>
                </div>
                <Link to="/particular">
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white group-hover:bg-blue-600"
                    size="lg"
                  >
                    Ver productos
                    <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Comercio */}
            <Card 
              className={`cursor-pointer transition-all duration-300 border-2 hover:border-green-300 hover:shadow-xl hover:-translate-y-2 group relative ${
                selectedCard === 'comercio' ? 'border-green-400 shadow-lg scale-105' : 'hover:border-green-200'
              }`}
              onMouseEnter={() => setSelectedCard('comercio')}
              onMouseLeave={() => setSelectedCard(null)}
            >
              <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                Más popular
              </Badge>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Store size={32} className="text-green-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                  Comercio
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Kiosco, almacén, despensa o candy bar
                </CardDescription>
                <Badge variant="outline" className="w-fit mx-auto mt-2 border-green-200 text-green-700">
                  Precios mayoristas
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    Envío gratis Mar del Plata
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    Descuentos por volumen
                  </div>
                </div>
                <Link to="/comercio">
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600 text-white group-hover:bg-green-600"
                    size="lg"
                  >
                    Ver productos
                    <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Distribuidor */}
            <Card 
              className={`cursor-pointer transition-all duration-300 border-2 hover:border-orange-300 hover:shadow-xl hover:-translate-y-2 group ${
                selectedCard === 'distribuidor' ? 'border-orange-400 shadow-lg scale-105' : 'hover:border-orange-200'
              }`}
              onMouseEnter={() => setSelectedCard('distribuidor')}
              onMouseLeave={() => setSelectedCard(null)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Truck size={32} className="text-orange-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                  Distribuidor
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Revendedor o distribuidora mayorista
                </CardDescription>
                <Badge variant="outline" className="w-fit mx-auto mt-2 border-orange-200 text-orange-700">
                  Precios especiales
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    Volúmenes grandes
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    Términos preferenciales
                  </div>
                </div>
                <Link to="/reventa">
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white group-hover:bg-orange-600"
                    size="lg"
                  >
                    Ver productos
                    <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials para motivación */}
      <section className="py-12 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-gray-600">Más de 1000 comercios confían en nosotros</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-3">"{testimonial.text}"</p>
                <p className="font-medium text-purple-600">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer mejorado */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <img 
                src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
                alt="Mayorista Soto Logo" 
                className="h-10 w-auto"
              />
              <div>
                <p className="font-semibold text-gray-800">Mayorista Soto</p>
                <p className="text-sm text-gray-600">Tu distribuidora de confianza</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-600 mb-1">
                Para consultas: contacto@mayoristasoto.com
              </p>
              <p className="text-xs text-gray-500">
                Atención personalizada para cada tipo de cliente
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
