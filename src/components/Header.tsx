
import React from 'react';
import { Menu } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
              alt="Mayorista Soto Logo" 
              className="h-8 sm:h-12 w-auto"
            />
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#precios" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Listas de Precios
            </a>
            <a href="#envio" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Envíos
            </a>
            <a href="#contacto" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Locales
            </a>
          </nav>
          <div className="flex items-center space-x-2">
            <button className="md:hidden p-2">
              <Menu size={24} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
