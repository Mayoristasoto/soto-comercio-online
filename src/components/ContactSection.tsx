
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Instagram } from 'lucide-react';

const ContactSection = () => {
  return (
    <section id="contacto" className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">Nuestros Locales</h2>
            <p className="text-xl text-gray-600">
              Visita nuestros locales para compras con Lista Salón
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-800">Local José Martí</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4 text-lg">
                  Fortunato de la Plaza 4798
                </p>
                <p className="text-purple-600 font-semibold">
                  Mar del Plata
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-800">Local Juan B. Justo</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4 text-lg">
                  Juan B. Justo Rotonda El Gaucho
                </p>
                <p className="text-purple-600 font-semibold">
                  Mar del Plata
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Síguenos en Redes Sociales</h3>
            <div className="flex justify-center space-x-6">
              <a 
                href="#" 
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
                aria-label="Facebook"
              >
                <Facebook size={24} />
              </a>
              <a 
                href="#" 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
              <a 
                href="#" 
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
                aria-label="WhatsApp"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.685"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
