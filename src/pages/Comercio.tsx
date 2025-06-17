
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { ArrowLeft, Store, FileText, Cigarette, Tag, Facebook, Instagram, MapPin, Clock, CheckCircle, Star, TrendingUp, Users, ShoppingCart, Truck } from 'lucide-react';

const Comercio = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedList, setSelectedList] = useState<string | null>(null);

  const steps = [
    { id: 1, title: "Elegir lista", completed: false },
    { id: 2, title: "Ver productos", completed: false },
    { id: 3, title: "Realizar pedido", completed: false }
  ];

  const benefits = [
    { icon: <Truck size={16} />, text: "Envío gratis Mar del Plata" },
    { icon: <TrendingUp size={16} />, text: "Descuentos por volumen" },
    { icon: <Users size={16} />, text: "Atención personalizada" },
    { icon: <ShoppingCart size={16} />, text: "Precios mayoristas" }
  ];

  const testimonials = [
    { name: "Kiosco Central", text: "Los mejores precios de la zona", rating: 5, category: "Kiosco" },
    { name: "Almacén del Puerto", text: "Entrega siempre puntual", rating: 5, category: "Almacén" },
    { name: "Candy Bar Estrella", text: "Excelente variedad de productos", rating: 5, category: "Candy Bar" }
  ];

  const priceLists = [
    {
      title: "Lista Completa Salón",
      description: "Todos nuestros productos - Solo compras en el local",
      icon: <FileText size={32} className="text-green-600" />,
      badge: "Salón",
      badgeColor: "bg-green-500",
      pdfUrl: "https://drive.google.com/file/d/1DLeBquIPiqdM9EwRpTRC5LN9Cldf7ALy/view?usp=sharing",
      popular: true,
      isLocal: true
    },
    {
      title: "Lista Cigarrillos Salón",
      description: "Productos de cigarrillos y tabacalería - Solo en el local",
      icon: <Cigarette size={32} className="text-gray-600" />,
      badge: "Salón",
      badgeColor: "bg-gray-500",
      pdfUrl: "https://drive.google.com/file/d/1Wg_qk5GPpqorwZAna1xqlyzZdxINZU-c/view?usp=sharing",
      isLocal: true
    },
    {
      title: "Lista Comercio Distribución",
      description: "Para distribución - Envío gratis desde $20.000",
      icon: <Truck size={32} className="text-blue-600" />,
      badge: "Distribución",
      badgeColor: "bg-blue-500",
      pdfUrl: "https://drive.google.com/file/d/15J4hJ-1zyAV98vOim7zoa1QxxnEDKE5n/view?usp=sharing",
      hasDelivery: true
    },
    {
      title: "Lista de Ofertas",
      description: "Promociones especiales y descuentos exclusivos",
      icon: <Tag size={32} className="text-red-600" />,
      badge: "Ofertas",
      badgeColor: "bg-red-500",
      pdfUrl: "https://drive.google.com/file/d/1SaN_owL5V38t5syfRcGxLDVMxU4ElKZa/view?usp=sharing"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handlePdfClick = (url: string, title: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    // Simular progreso
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header mejorado con navegación */}
      <header className="pt-6 pb-4 sticky top-0 bg-white/90 backdrop-blur-sm z-50 border-b border-green-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-600 hover:text-green-600 transition-colors group">
              <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Volver al inicio</span>
              <span className="sm:hidden">Volver</span>
            </Link>
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
                alt="Mayorista Soto Logo" 
                className="h-10 sm:h-12 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg text-gray-800">Mayorista Soto</h1>
                <p className="text-xs text-gray-600">Para Comercios</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs sm:text-sm">
              <Store size={14} className="mr-1" />
              Comercio
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Progreso visible */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-green-100">
            <h2 className="text-center text-sm font-medium text-gray-600 mb-4">Tu proceso de compra</h2>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    index === currentStep 
                      ? 'bg-green-600 text-white scale-110 shadow-lg' 
                      : index < currentStep 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index < currentStep ? <CheckCircle size={16} /> : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 sm:w-24 h-1 mx-2 transition-all duration-300 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((step, index) => (
                <span key={step.id} className={`text-xs transition-all duration-300 ${
                  index === currentStep ? 'text-green-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Section personalizado */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Store size={16} className="mr-2" />
            Especial para Comerciantes
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-clip-text text-transparent leading-tight">
            Listas de Precios Mayoristas
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8">
            Accede a nuestros <span className="font-semibold text-green-600">precios especiales</span> para kioscos, almacenes, despensas y candy bars
          </p>
          
          {/* Beneficios destacados con interacción */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-3 border border-green-100 hover:shadow-md hover:scale-105 transition-all duration-200">
                <div className="text-green-500 flex-shrink-0">{benefit.icon}</div>
                <span className="text-sm font-medium text-gray-700">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Destacado especial */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 mb-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 rounded-full p-3">
                <Truck size={32} className="text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Envío GRATIS en Mar del Plata</h3>
            <p className="text-lg opacity-90">
              Lista Distribución: envío gratis desde <span className="font-bold">$20.000</span>
            </p>
          </div>
        </div>

        {/* Cards de listas con interactividad mejorada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-16">
          {priceLists.map((list, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 cursor-pointer group ${
                selectedList === list.title 
                  ? 'border-green-400 shadow-xl scale-105' 
                  : 'border-transparent hover:border-green-200 hover:-translate-y-1'
              }`}
              onMouseEnter={() => setSelectedList(list.title)}
              onMouseLeave={() => setSelectedList(null)}
            >
              {list.popular && (
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white z-10 shadow-lg">
                  Más usada
                </Badge>
              )}
              {list.hasDelivery && (
                <Badge className="absolute -top-2 -left-2 bg-blue-500 text-white z-10 shadow-lg">
                  Envío gratis
                </Badge>
              )}
              {list.isLocal && (
                <Badge className="absolute -top-2 -left-2 bg-orange-500 text-white z-10 shadow-lg">
                  Solo en local
                </Badge>
              )}
              <div className="absolute top-4 right-4">
                <Badge className={`${list.badgeColor} text-white text-xs sm:text-sm shadow-md`}>
                  {list.badge}
                </Badge>
              </div>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-green-50 transition-colors">
                  {list.icon}
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 pr-16 group-hover:text-green-600 transition-colors">
                  {list.title}
                </CardTitle>
                <CardDescription className="text-gray-600 text-base sm:text-lg">
                  {list.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {list.isLocal && (
                  <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center text-orange-700 text-sm">
                      <MapPin size={16} className="mr-2 flex-shrink-0" />
                      <span className="font-medium">Exclusiva para compras en nuestros locales</span>
                    </div>
                  </div>
                )}
                {list.hasDelivery && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center text-blue-700 text-sm">
                      <Truck size={16} className="mr-2 flex-shrink-0" />
                      <span className="font-medium">Envío gratis en Mar del Plata desde $20.000</span>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={() => handlePdfClick(list.pdfUrl, list.title)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white text-sm sm:text-base group-hover:shadow-lg transition-all duration-200"
                >
                  Ver Precios PDF
                  <FileText size={16} className="ml-2 group-hover:rotate-12 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testimonios motivacionales */}
        <section className="py-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl mb-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                Lo que dicen nuestros clientes comerciales
              </h2>
              <p className="text-gray-600">Más de 500 comercios confían en nosotros en Mar del Plata</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} size={14} className="text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                      {testimonial.category}
                    </Badge>
                  </div>
                  <p className="text-gray-700 mb-3 italic">"{testimonial.text}"</p>
                  <p className="font-medium text-green-600">{testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nuestros Locales con diseño moderno */}
        <section className="py-12 bg-white rounded-3xl shadow-sm border border-green-100 mb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">Visitanos en Nuestros Locales</h2>
                <p className="text-lg sm:text-xl text-gray-600">
                  Atención personalizada para comerciantes
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                      <MapPin size={24} className="text-green-600" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">Sucursal José Martí</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-3">
                    <p className="text-gray-600 text-base sm:text-lg font-medium">
                      Fortunato de la Plaza 4798 – Mar del Plata
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-gray-600">
                        <Clock size={16} className="mr-2 text-green-500" />
                        <span className="text-sm">Lunes a viernes: 7:30 a 18:00</span>
                      </div>
                      <div className="flex items-center justify-center text-gray-600">
                        <Clock size={16} className="mr-2 text-green-500" />
                        <span className="text-sm">Sábados: 7:30 a 16:00</span>
                      </div>
                      <div className="flex items-center justify-center text-red-600">
                        <span className="text-sm font-medium">Domingos: Cerrado</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                      <MapPin size={24} className="text-green-600" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">Sucursal Juan B. Justo</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-3">
                    <p className="text-gray-600 text-base sm:text-lg font-medium">
                      Juan B. Justo 6076 (Rotonda El Gaucho) – Mar del Plata
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-gray-600">
                        <Clock size={16} className="mr-2 text-green-500" />
                        <span className="text-sm">Lunes a sábados: 8:00 a 18:00</span>
                      </div>
                      <div className="flex items-center justify-center text-red-600">
                        <span className="text-sm font-medium">Domingos: Cerrado</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center mt-12">
                <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Seguinos y Contactanos</h3>
                <div className="flex justify-center space-x-6 mb-6">
                  <a 
                    href="https://www.facebook.com/Mayoristasoto" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                    aria-label="Facebook"
                  >
                    <Facebook size={24} />
                  </a>
                  <a 
                    href="https://www.instagram.com/Mayoristasoto/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                    aria-label="Instagram"
                  >
                    <Instagram size={24} />
                  </a>
                  <a 
                    href="https://wa.me/5492234266910?text=Hola%20soy%20comerciante%20quiero%20informaci%C3%B3n" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                    aria-label="WhatsApp"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.685"/>
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-600">
                  Consultas comerciales: <span className="font-medium text-green-600">contacto@mayoristasoto.com</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Información adicional moderna */}
        <div className="text-center mt-12 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">¿Tenés un comercio y necesitás ayuda?</h3>
            <p className="mb-4 opacity-90">
              Nuestro equipo está especializado en atender comerciantes. Te ayudamos a encontrar los mejores productos y precios.
            </p>
            <Button 
              className="bg-white text-green-600 hover:bg-gray-100 font-medium"
              onClick={() => window.open('https://wa.me/5492234266910?text=Hola%20soy%20comerciante%20quiero%20informaci%C3%B3n', '_blank')}
            >
              Contactar Ahora
            </Button>
          </div>
        </div>

        {/* Pie de página */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-2">
            <strong>Mayorista Soto</strong> - Tu socio comercial de confianza
          </p>
          <p className="text-sm text-gray-500">
            Especializados en distribución mayorista desde 1995
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Comercio;
