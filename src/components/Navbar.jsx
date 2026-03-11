import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import '../styles/Navbar.css';
import { useLanguage } from '../context/LanguageContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, toggleLanguage } = useLanguage();

  const labels = {
    en: {
      brand: 'TN Smart Bus',
      search: 'Search',
      services: 'Services',
      bookings: 'My Bookings',
      admin: 'Admin',
      login: 'Login',
      switchText: 'தமிழ்',
      switchAria: 'Switch language to Tamil',
    },
    ta: {
      brand: 'டிஎன் ஸ்மார்ட் பஸ்',
      search: 'தேடல்',
      services: 'சேவைகள்',
      bookings: 'என் முன்பதிவுகள்',
      admin: 'நிர்வாகம்',
      login: 'உள்நுழைவு',
      switchText: 'English',
      switchAria: 'Switch language to English',
    },
  };

  const t = labels[language];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-brand">
            <Link to="/" className="brand-link">
              <div className="brand-icon">
                <Bus className="icon-white" />
              </div>
              <span className="brand-text">{t.brand}</span>
            </Link>
          </div>
          
          <div className="navbar-links desktop-only">
            <Link to="/" className="nav-link">{t.search}</Link>
            <Link to="/services" className="nav-link">{t.services}</Link>
            <Link to="/my-bookings" className="nav-link">{t.bookings}</Link>
            <Link to="/admin" className="nav-link">{t.admin}</Link>
            <button
              type="button"
              className="language-btn"
              onClick={toggleLanguage}
              aria-label={t.switchAria}
            >
              {t.switchText}
            </button>
            <Link to="/login" className="login-btn">
              {t.login}
            </Link>
          </div>

          <div className="mobile-toggle md-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="toggle-btn">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mobile-menu md-hidden"
          >
            <button
              type="button"
              className="language-btn mobile-language-btn"
              onClick={toggleLanguage}
              aria-label={t.switchAria}
            >
              {t.switchText}
            </button>
            <Link to="/" onClick={() => setIsOpen(false)} className="mobile-link">{t.search}</Link>
            <Link to="/services" onClick={() => setIsOpen(false)} className="mobile-link">{t.services}</Link>
            <Link to="/my-bookings" onClick={() => setIsOpen(false)} className="mobile-link">{t.bookings}</Link>
            <Link to="/admin" onClick={() => setIsOpen(false)} className="mobile-link">{t.admin}</Link>
            <Link to="/login" onClick={() => setIsOpen(false)} className="mobile-link">{t.login}</Link>
          </motion.div>
        )}
      </AnimatePresence>

    </nav>
  );
};
