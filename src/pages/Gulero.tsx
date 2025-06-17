import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Truck, Package, Gift, Star, MessageCircle, Phone, User, Heart, Zap, Target } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import PersonalizedMessage from '@/components/PersonalizedMessage';
import InteractiveFeatures from '@/components/InteractiveFeatures';

const Gulero = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<'all' | 'white' | 'chocolate'>('all');
  const [scrollProgress, setScrollProgress] = useState(0);

  const steps = ['Descubrir', 'Conocer', 'Elegir', 'Comprar'];

  const products = [
    {
      name: "Barrigón Mega 100g",
      variants: "Blanco",
      description: "El alfajor XXL viral que todos buscan",
      image: "/lovable-uploads/44620e54-a86a-4599-85e8-9d728d3cb25c.png"
    },
    {
      name: "Gula 72g",
      variants: "Blanco y Chocolate",
      description: "Equilibrio dulce perfecto",
      image: "/lovable-uploads/4052ff3f-5ccf-4fd0-b3f6-2ba4500aefe5.png"
    },
    {
      name: "Juana La Loca Salchichón 92g",
      variants: "Blanco y Chocolate",
      description: "Formato salame dulce único",
      image: "/lovable-uploads/157b8b92-c95f-44fc-979c-eb601335d923.png"
    },
    {
      name: "Juana La Loca Merengue",
      variants: "Una variedad",
      description: "Con merengue suave y cremoso",
      image: "/lovable-uploads/3cdfe2a4-9aaa-4883-b75f-2ab55e82d3a9.png"
    },
    {
      name: "Love 420 67g",
      variants: "Blanco y Negro",
      description: "Sabor moderno y envoltorio llamativo",
      image: "/lovable-uploads/dc68c33d-d423-49d7-87c6-2909b92ede5f.png"
    },
    {
      name: "Marley 75g",
      variants: "Blanco y Negro",
      description: "Alfajor crocante y potente",
      image: "/lovable-uploads/4733c895-6dc4-49b0-ad37-f1a68dcb4e76.png"
    },
    {
      name: "Mufaso 65g",
      variants: "Blanco y Negro",
      description: "Sabor fuerte y dulce de leche intenso",
      image: "/lovable-uploads/e94f7375-36f5-4bf1-ba5a-34607d773c17.png"
    },
    {
      name: "Rasta 70g",
      variants: "Blanco y Negro",
      description: "Clásico dulce cremoso con estilo",
      image: "/lovable-uploads/8e587c09-5d79-45a4-8e63-9fdfeffe3c57.png"
    },
    {
      name: "Gulero",
      variants: "Chocolate Negro y Blanco",
      description: "Chocolate negro por fuera y blanco por dentro",
      image: "/lovable-uploads/dc68c33d-d423-49d7-87c6-2909b92ede5f.png"
    }
  ];

  const testimonials = [
    "Se vende solo, lo piden todos",
    "El Barrigón es una bomba",
    "Juana la Loca es el más original"
  ];

  const faqs = [
    {
      question: "¿Hacen envíos a todo el país?",
      answer: "Sí, enviamos a todo el país. Los costos varían según la ubicación. ¡Comprando 4 combos el envío es GRATIS!"
    },
    {
      question: "¿Hay descuentos para revendedores?",
      answer: "Sí, ofrecemos precios especiales para kioscos y revendedores por cantidad."
    },
    {
      question: "¿Qué formas de pago aceptan?",
      answer: "Aceptamos transferencia bancaria, efectivo y tarjetas de crédito/débito."
    },
    {
      question: "¿Cuánto tiempo dura el producto?",
      answer: "Los alfajores tienen una vida útil de 6 meses desde la fecha de elaboración."
    }
  ];

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
      
      // Update current step based on scroll position
      if (progress < 25) setCurrentStep(1);
      else if (progress < 50) setCurrentStep(2);
      else if (progress < 75) setCurrentStep(3);
      else setCurrentStep(4);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-yellow-400 to-red-400 relative">
      {/* Scroll Progress Indicator */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-green-500 to-red-500 z-50 transition-all duration-300"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Header with enhanced UX */}
      <header className="bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white py-4 sticky top-0 z-40 shadow-lg backdrop-blur-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-2">
            <img 
              src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
              alt="Mayorista Soto Logo" 
              className="h-8 sm:h-10 w-auto filter brightness-0 invert"
            />
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Badge className="bg-white/20 text-white">
              Paso {currentStep}/4: {steps[currentStep - 1]}
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white border-none animate-pulse"
              onClick={() => window.open('https://wa.me/5492234266910?text=Hola%20quiero%20informaci%C3%B3n%20del%20Combo%20GULERO', '_blank')}
            >
              <MessageCircle size={16} className="mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with better hierarchy */}
      <section className="py-8 sm:py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-yellow-500/20 to-red-500/20"></div>
        <div className="container mx-auto px-4 text-center relative">
          
          {/* Progress Bar */}
          <ProgressBar currentStep={currentStep} totalSteps={4} steps={steps} />
          
          {/* Personalized Message */}
          <PersonalizedMessage />

          <Badge className="mb-6 bg-gradient-to-r from-green-600 to-red-600 text-white text-lg px-6 py-2 shadow-lg animate-bounce">
            🔥 COMBO BAJONERO 🔥
          </Badge>
          
          <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
            {/* Left side - Main content */}
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-800 via-yellow-600 to-red-800 bg-clip-text text-transparent leading-tight drop-shadow-lg">
                Combo GULERO
              </h1>
              
              <div className="space-y-4">
                <p className="text-xl sm:text-2xl font-bold text-green-900 drop-shadow-md">
                  ¡15 alfajores virales en una sola caja!
                </p>
                
                <div className="bg-gradient-to-r from-yellow-400 to-red-400 text-green-900 rounded-full px-6 py-3 inline-block shadow-lg border-2 border-green-600">
                  <span className="text-2xl sm:text-3xl font-bold">💰 $25.000</span>
                </div>
                
                <div className="bg-gradient-to-r from-green-600 to-red-600 text-white rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <Truck size={20} />
                    <p className="font-bold">🚚 COMPRANDO 4 COMBOS = ENVÍO GRATIS</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Generated person image placeholder */}
            <div className="relative">
              <div className="bg-gradient-to-br from-green-200 to-yellow-200 rounded-3xl p-8 shadow-xl border-4 border-green-400 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 text-center">
                  <div className="w-48 h-48 mx-auto mb-4 bg-gradient-to-br from-green-100 to-yellow-100 rounded-full flex items-center justify-center border-4 border-green-300 shadow-lg">
                    <User size={64} className="text-green-600" />
                    <div className="absolute top-4 right-4">
                      <Heart size={24} className="text-red-500 animate-pulse" />
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white mb-2">María, Kiosquera</Badge>
                  <p className="text-green-800 font-semibold italic">
                    "Con el Combo GULERO mis ventas se duplicaron. ¡Los clientes los piden por nombre!"
                  </p>
                  <div className="flex justify-center mt-2">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={16} className="text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced product showcase */}
          <div className="bg-gradient-to-r from-green-200/80 to-yellow-200/80 rounded-3xl p-8 mb-8 mx-auto max-w-6xl border-4 border-green-400 shadow-xl backdrop-blur-sm">
            <div className="bg-white/90 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-green-800 mb-6">Los alfajores más buscados del momento</h3>
              
              {/* Variant selector */}
              <div className="flex justify-center mb-6 space-x-2">
                <Button
                  variant={selectedVariant === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedVariant('all')}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Todos
                </Button>
                <Button
                  variant={selectedVariant === 'white' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedVariant('white')}
                >
                  Chocolate Blanco
                </Button>
                <Button
                  variant={selectedVariant === 'chocolate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedVariant('chocolate')}
                >
                  Chocolate
                </Button>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
                {products.map((product, index) => (
                  <div key={index} className="flex flex-col items-center group">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-3 border-green-400 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-green-700 mt-2 text-center leading-tight">
                      {product.name.split(' ')[0]}
                    </p>
                    <Badge className="text-xs mt-1 bg-yellow-200 text-yellow-800">
                      {product.variants.includes('Blanco') ? '🤍' : product.variants.includes('Negro') ? '🤎' : '🍫'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced CTAs with motivation */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Zap className="text-yellow-500" />
              <span className="text-lg font-bold text-green-800">¡Solo quedan pocas unidades!</span>
              <Zap className="text-yellow-500" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white px-8 py-4 text-xl font-bold rounded-full shadow-lg transform hover:scale-105 transition-all border-2 border-yellow-400 animate-pulse"
                onClick={() => window.open('https://wa.me/5492234266910?text=Quiero%20mi%20Combo%20GULERO%20-%20%C2%A1Cotizaci%C3%B3n!', '_blank')}
              >
                🍃 Quiero mi Combo Bajonero
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-green-600 text-green-700 hover:bg-green-50 px-8 py-4 text-xl font-bold rounded-full shadow-lg bg-white/90"
                onClick={() => window.open('https://wa.me/5492234266910?text=Consulta%20sobre%20Combo%20GULERO', '_blank')}
              >
                <MessageCircle size={20} className="mr-2" />
                Consultar por WhatsApp
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-green-700">
              <div className="flex items-center">
                <CheckCircle size={16} className="mr-1" />
                <span>Entrega garantizada</span>
              </div>
              <div className="flex items-center">
                <Target size={16} className="mr-1" />
                <span>Precio fijo</span>
              </div>
              <div className="flex items-center">
                <Heart size={16} className="mr-1" />
                <span>100% satisfacción</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Features Section */}
      <section className="py-16 bg-gradient-to-r from-purple-100 to-pink-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-purple-800 drop-shadow-md">
            🎯 Herramientas Interactivas
          </h2>
          <InteractiveFeatures products={products} />
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-yellow-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-green-200 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <CheckCircle size={32} className="text-green-700" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-green-800">15 alfajores guleros</h3>
              <p className="text-green-700">Los alfajores más virales del mercado</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-200 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Truck size={32} className="text-yellow-700" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-yellow-800">Envíos nacionales</h3>
              <p className="text-yellow-700">4 combos = envío gratis</p>
            </div>
            <div className="text-center">
              <div className="bg-red-200 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Package size={32} className="text-red-700" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-red-800">Para revendedores</h3>
              <p className="text-red-700">Ideal para kioscos y comercios</p>
            </div>
            <div className="text-center">
              <div className="bg-green-200 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Gift size={32} className="text-green-700" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-green-800">Surtido completo</h3>
              <p className="text-green-700">Todos los sabores incluidos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos incluidos */}
      <section className="py-16 bg-gradient-to-br from-yellow-100 to-red-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-green-800 drop-shadow-md">
            ¿Qué incluye el Combo GULERO?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-2 border-green-200 bg-white/90 backdrop-blur-sm overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">{product.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit bg-yellow-200 text-yellow-800">{product.variants}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-green-700">{product.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-yellow-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-green-800">
            Lo que dicen nuestros clientes
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-r from-green-300 to-yellow-300 p-4 rounded-2xl border-2 border-green-400 shadow-lg transform rotate-1 hover:rotate-0 transition-transform">
                <div className="flex items-center mb-2">
                  <Star size={16} className="text-green-700 mr-1" />
                  <Star size={16} className="text-green-700 mr-1" />
                  <Star size={16} className="text-green-700 mr-1" />
                  <Star size={16} className="text-green-700 mr-1" />
                  <Star size={16} className="text-green-700" />
                </div>
                <p className="font-bold text-green-900 text-lg">"{testimonial}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 drop-shadow-lg">
            ¡No te quedes sin tu Combo GULERO!
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto drop-shadow-md">
            Los alfajores más virales del momento, todos juntos en una sola compra. Mix completo con todos los sabores. 15 alfajores por solo $25.000. Perfecto para tu negocio o para satisfacer el bajón perfecto 🌿
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-green-700 hover:bg-green-50 px-8 py-4 text-xl font-bold rounded-full shadow-lg border-2 border-green-300"
              onClick={() => window.open('https://wa.me/5492234266910?text=Quiero%20mi%20Combo%20GULERO%20-%20%C2%A1Cotizaci%C3%B3n!', '_blank')}
            >
              🛒 Quiero mi Combo
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-green-700 px-8 py-4 text-xl font-bold rounded-full shadow-lg bg-white/10 backdrop-blur-sm"
              onClick={() => window.open('https://wa.me/5492234266910?text=Consulta%20sobre%20Combo%20GULERO', '_blank')}
            >
              <Phone size={20} className="mr-2" />
              Consultar Ahora
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-green-800">
            Preguntas Frecuentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-white/90 backdrop-blur-sm border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-800">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-800 to-red-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 w-fit mx-auto mb-4">
            <img 
              src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
              alt="Mayorista Soto Logo" 
              className="h-12 w-auto filter brightness-0 invert"
            />
          </div>
          <p className="text-green-200 font-semibold">
            <strong>Mayorista Soto</strong>
          </p>
          <p className="text-sm text-green-300 mt-2">
            Tu distribuidora de confianza para los alfajores más virales
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Gulero;
