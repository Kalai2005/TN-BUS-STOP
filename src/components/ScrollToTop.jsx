import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    
    const timeout = setTimeout(() => {
      if (!hash) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      } else {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 10);
    return () => clearTimeout(timeout);
  }, [pathname, hash, key]);

  return null;
};
