
import React from 'react';
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PriceListsSection from "@/components/PriceListsSection";
import ShippingSection from "@/components/ShippingSection";
import ContactSection from "@/components/ContactSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <PriceListsSection />
      <ShippingSection />
      <ContactSection />
    </div>
  );
};

export default Index;
