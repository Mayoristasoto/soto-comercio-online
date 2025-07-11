
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShoppingCart, Star, CheckCircle, Phone, Mail } from 'lucide-react';

const Mayorista = () => {
  const alfajoresProducts = [
    {
      name: "El Barrigón",
      description: "El alfajor XXL que revolucionó el mercado",
      image: "/lovable-uploads/44620e54-a86a-4599-85e8-9d728d3cb25c.png",
      highlight: "🔥 VIRAL",
      demand: "Alta demanda"
    },
    {
      name: "Juana La Loca",
      description: "Cremoso y adictivo, el favorito de los jóvenes",
      image: "/lovable-uploads/3cdfe2a4-9aaa-4883-b75f-2ab55e82d3a9.png",
      highlight: "💥 TOP",
      demand: "Super vendido"
    },
    {
      name: "Gula",
      description: "Sabor intenso que no pasa desapercibido",
      image: "/lovable-uploads/4052ff3f-5ccf-4fd0-b3f6-2ba4500aefe5.png",
      highlight: "⭐ ÚNICO",
      demand: "Exclusivo"
    },
    {
      name: "Gulero",
      description: "El que todos buscan y pocos tienen",
      image: "/lovable-uploads/dc68c33d-d423-49d7-87c6-2909b92ede5f.png",
      highlight: "🚀 TREND",
      demand: "Más buscado"
    },
    {
      name: "Love 420",
      description: "Para el público joven y alternativo",
      image: "/lovable-uploads/dc68c33d-d423-49d7-87c6-2909b92ede5f.png",
      highlight: "🌿 CULT",
      demand: "Nicho premium"
    },
    {
      name: "Marley",
      description: "Clásico reggae, sabor auténtico",
      image: "/lovable-uploads/e94f7375-36f5-4bf1-ba5a-34607d773c17.png",
      highlight: "🎵 ICON",
      demand: "Fiel clientela"
    },
    {
      name: "Mufaso",
      description: "El sabor que marca la diferencia",
      image: "/lovable-uploads/8e587c09-5d79-45a4-8e63-9fdfeffe3c57.png",
      highlight: "💎 PREMIUM",
      demand: "Calidad superior"
    },
    {
      name: "Rasta",
      description: "Auténtico sabor jamaiquino",
      image: "/lovable-uploads/157b8b92-c95f-44fc-979c-eb601335d923.png",
      highlight: "🏴‍☠️ REBEL",
      demand: "Estilo único"
    }
  ];

  const handleWhatsAppContact = () => {
    const message = "Hola Andrés! Soy mayorista y me interesa conocer los precios de los alfajores bajoneros. ¿Podrías enviarme el catálogo?";
    const phoneNumber = "5492234266910";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20"></div>
        <div className="relative container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center max-w-5xl mx-auto">
            <Badge className="mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 text-black text-lg px-6 py-2 font-bold">
              🏪 MAYORISTAS ÚNICAMENTE
            </Badge>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
              SOMOS DISTRIBUIDORES OFICIALES
            </h1>
            
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-8 drop-shadow-lg">
              DE LOS ALFAJORES MÁS BUSCADOS DEL PAÍS
            </p>
            
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-cyan-400/30 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-4">
                🎯 CONSEGUÍ TODOS LOS ALFAJORES BAJONEROS EN UN SOLO LUGAR
              </h2>
              <p className="text-lg text-gray-300">
                Stock completo • Precios mayoristas • Entrega garantizada
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              LÍNEA COMPLETA BAJONERA
            </h2>
            <p className="text-xl text-cyan-400 font-semibold">
              Los 8 alfajores más virales del momento
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {alfajoresProducts.map((product, index) => (
              <Card key={index} className="bg-black/60 border-2 border-purple-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105 group">
                <CardContent className="p-6">
                  <div className="relative mb-4">
                    <img 
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-red-500 text-black font-bold">
                      {product.highlight}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-black text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {product.name}
                  </h3>
                  
                  <p className="text-gray-400 mb-3 text-sm">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-400" />
                    <span className="text-cyan-400 font-semibold text-sm">
                      {product.demand}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-3xl p-8 border-2 border-cyan-400/30 backdrop-blur-sm">
            <div className="text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
                SOMOS UNO DE LOS POCOS MAYORISTAS
              </h3>
              <p className="text-xl sm:text-2xl font-bold text-cyan-400 mb-2">
                CON STOCK COMPLETO DE TODA ESTA LÍNEA EXCLUSIVA
              </p>
              <p className="text-lg text-gray-300">
                No te quedes sin los productos que tus clientes más buscan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - Andrés Volki */}
      <section className="py-12 sm:py-20 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                HABLÁ DIRECTO CON NUESTRO EJECUTIVO
              </h2>
              <p className="text-xl text-cyan-400">
                Atención personalizada para mayoristas
              </p>
            </div>
            
            <Card className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 border-2 border-cyan-400/30 backdrop-blur-sm">
              <CardContent className="p-8 sm:p-12">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 p-1">
                      <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                        <div className="text-6xl">👨‍💼</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                      ANDRÉS VOLKI
                    </h3>
                    <p className="text-xl text-cyan-400 font-semibold mb-4">
                      Ejecutivo Comercial
                    </p>
                    
                    <div className="bg-black/40 rounded-lg p-4 mb-6">
                      <p className="text-lg text-gray-300 mb-2">
                        <strong className="text-white">¿Tenés dudas o querés precios mayoristas?</strong>
                      </p>
                      <p className="text-cyan-400 font-semibold">
                        Contactá directo con Andrés y te atiende al toque 🚀
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <Button 
                        onClick={handleWhatsAppContact}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <MessageCircle className="mr-2" size={24} />
                        HABLAR CON ANDRÉS
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black font-bold text-lg px-8 py-6 rounded-xl"
                      >
                        <Mail className="mr-2" size={20} />
                        PEDIR CATÁLOGO
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-purple-600/40 to-cyan-600/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            NO PIERDAS MÁS VENTAS
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Tus clientes buscan estos alfajores. Nosotros te los conseguimos. 
            Stock garantizado, precios mayoristas y entrega en Mar del Plata.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleWhatsAppContact}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300"
            >
              <ShoppingCart className="mr-3" size={24} />
              INGRESÁ TU CONSULTA
            </Button>
          </div>
          
          <p className="text-sm text-gray-400 mt-6">
            * Precios mayoristas disponibles solo para comercios registrados
          </p>
        </div>
      </section>
    </div>
  );
};

export default Mayorista;
