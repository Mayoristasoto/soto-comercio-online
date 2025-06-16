
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Truck, Package, Gift, Star, MessageCircle, Phone } from 'lucide-react';

const Gulero = () => {
  const products = [
    {
      name: "Barrigón Mega 100g",
      variants: "Blanco y Negro",
      description: "El alfajor XXL viral que todos buscan"
    },
    {
      name: "Gula 72g",
      variants: "Blanco y Chocolate",
      description: "Equilibrio dulce perfecto"
    },
    {
      name: "Juana La Loca Salchichón 92g",
      variants: "Blanco y Chocolate",
      description: "Formato salame dulce único"
    },
    {
      name: "Love 420 67g",
      variants: "Blanco y Negro",
      description: "Sabor moderno y envoltorio llamativo"
    },
    {
      name: "Marley 75g + Tribajón 100g",
      variants: "Blanco y Negro",
      description: "Alfajor crocante y potente"
    },
    {
      name: "Mufaso 65g",
      variants: "Blanco y Negro",
      description: "Sabor fuerte y dulce de leche intenso"
    },
    {
      name: "Rasta 70g",
      variants: "Blanco y Negro",
      description: "Clásico dulce cremoso con estilo"
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
      answer: "Sí, enviamos a todo el país. Los costos varían según la ubicación."
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <img 
            src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
            alt="Mayorista Soto Logo" 
            className="h-8 sm:h-10 w-auto"
          />
          <div className="flex items-center space-x-4">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => window.open('https://wa.me/5492234266910?text=Hola%20quiero%20informaci%C3%B3n%20del%20Combo%20GULERO', '_blank')}
            >
              <MessageCircle size={16} className="mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-lg px-6 py-2">
            🔥 VIRAL 🔥
          </Badge>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent leading-tight">
            Combo GULERO
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
            ¡Todos los alfajores virales en una sola caja!
          </p>
          <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Llevate los alfajores que la están rompiendo: <span className="font-bold text-orange-600">Barrigón, Gula, Juana La Loca, Love 420, Marley, Mufaso y Rasta</span>. Blanco y negro. Todo junto.
          </p>
          
          {/* Imagen destacada placeholder */}
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl p-8 mb-8 mx-auto max-w-2xl border-4 border-orange-200">
            <div className="bg-white rounded-2xl p-8 text-center">
              <Package size={80} className="mx-auto mb-4 text-orange-500" />
              <p className="text-gray-600 text-lg">Imagen del Combo GULERO</p>
              <p className="text-sm text-gray-500">Collage de todos los alfajores incluidos</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-4 text-xl font-bold rounded-full shadow-lg transform hover:scale-105 transition-all"
              onClick={() => window.open('https://wa.me/5492234266910?text=Quiero%20mi%20Combo%20GULERO%20-%20%C2%A1Cotizaci%C3%B3n!', '_blank')}
            >
              🎁 Quiero mi Combo
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 px-8 py-4 text-xl font-bold rounded-full"
              onClick={() => window.open('https://wa.me/5492234266910?text=Consulta%20sobre%20Combo%20GULERO', '_blank')}
            >
              <MessageCircle size={20} className="mr-2" />
              Consultar por WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Todos los guleros</h3>
              <p className="text-gray-600">Los alfajores más virales del mercado</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Truck size={32} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Envíos nacionales</h3>
              <p className="text-gray-600">Llegamos a todo el país</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package size={32} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Para revendedores</h3>
              <p className="text-gray-600">Ideal para kioscos y comercios</p>
            </div>
            <div className="text-center">
              <div className="bg-pink-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Gift size={32} className="text-pink-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Surtido completo</h3>
              <p className="text-gray-600">Blanco y negro incluidos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos incluidos */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-800">
            ¿Qué incluye el Combo GULERO?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-2 border-orange-100">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-600">{product.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit">{product.variants}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{product.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-800">
            Lo que dicen nuestros clientes
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-r from-yellow-200 to-yellow-300 p-4 rounded-2xl border-2 border-yellow-400 shadow-lg transform rotate-1 hover:rotate-0 transition-transform">
                <div className="flex items-center mb-2">
                  <Star size={16} className="text-yellow-600 mr-1" />
                  <Star size={16} className="text-yellow-600 mr-1" />
                  <Star size={16} className="text-yellow-600 mr-1" />
                  <Star size={16} className="text-yellow-600 mr-1" />
                  <Star size={16} className="text-yellow-600" />
                </div>
                <p className="font-bold text-gray-800 text-lg">"{testimonial}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-red-500 to-pink-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            ¡No te quedes sin tu Combo GULERO!
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Los alfajores más virales del momento, todos juntos en una sola compra. Perfecto para tu negocio o para regalar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-xl font-bold rounded-full"
              onClick={() => window.open('https://wa.me/5492234266910?text=Quiero%20mi%20Combo%20GULERO%20-%20%C2%A1Cotizaci%C3%B3n!', '_blank')}
            >
              🛒 Quiero mi Combo
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-8 py-4 text-xl font-bold rounded-full"
              onClick={() => window.open('https://wa.me/5492234266910?text=Consulta%20sobre%20Combo%20GULERO', '_blank')}
            >
              <Phone size={20} className="mr-2" />
              Consultar Ahora
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-800">
            Preguntas Frecuentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg text-orange-600">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <img 
            src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
            alt="Mayorista Soto Logo" 
            className="h-12 w-auto mx-auto mb-4 filter brightness-0 invert"
          />
          <p className="text-gray-400">
            <strong>Mayorista Soto</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Tu distribuidora de confianza para los alfajores más virales
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Gulero;
