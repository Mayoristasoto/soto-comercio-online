import { useState, useEffect } from 'react';

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'phone', 'tablet'];
      const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
      const hasTouch = 'ontouchstart' in window;
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice || (hasTouch && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};