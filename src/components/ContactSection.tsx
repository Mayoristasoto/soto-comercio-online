
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Instagram, MapPin, Clock } from 'lucide-react';

const ContactSection = () => {
  return (
    <section id="contacto" className="py-12 sm:py-20 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">Nuestros Locales</h2>
            <p className="text-lg sm:text-xl text-gray-600 px-2">
              Visitanos en nuestras sucursales
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <MapPin size={24} className="text-green-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-gray-800">Sucursal José Martí</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-gray-600 mb-4 text-base sm:text-lg px-2">
                  Fortunato de la Plaza 4798 – Mar del Plata
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm">Lunes a viernes: 7:30 a 18:00</span>
                  </div>
                  <div className="flex items-center justify-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm">Sábados: 7:30 a 16:00</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span className="text-sm font-medium">Domingos: Cerrado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <MapPin size={24} className="text-green-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-gray-800">Sucursal Juan B. Justo</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-gray-600 mb-4 text-base sm:text-lg px-2">
                  Juan B. Justo 6076 (Rotonda El Gaucho) – Mar del Plata
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm">Lunes a sábados: 8:00 a 18:00</span>
                  </div>
                  <div className="flex items-center justify-center text-red-600">
                    <span className="text-sm font-medium">Domingos: Cerrado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Síguenos en Redes Sociales</h3>
            <div className="flex justify-center space-x-4 sm:space-x-6">
              <a 
                href="https://www.facebook.com/Mayoristasoto" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 sm:p-4 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
                aria-label="Facebook"
              >
                <Facebook size={20} className="sm:w-6 sm:h-6" />
              </a>
              <a 
                href="https://www.instagram.com/Mayoristasoto/" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-3 sm:p-4 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
                aria-label="Instagram"
              >
                <Instagram size={20} className="sm:w-6 sm:h-6" />
              </a>
              <a 
                href="https://wa.me/5492234266910?text=Hola%20tengo%20un%20comercio%20quiero%20informaci%C3%B3n" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white p-3 sm:p-4 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
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
