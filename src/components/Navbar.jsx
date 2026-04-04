import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import '../styles/Navbar.css';
import { useLanguage } from '../context/LanguageContext';
import { authService } from '../services/authService';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(() => authService.getStoredUser());
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = () => {
      setUser(authService.getStoredUser());
    };

    window.addEventListener('storage', syncUser);
    window.addEventListener('auth:changed', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('auth:changed', syncUser);
    };
  }, []);

  const isAuthenticated = authService.isLoggedIn();
  const profileInitial = useMemo(() => {
    const name = String(user?.name || '').trim();
    if (!name) {
      return 'U';
    }

    return name.charAt(0).toUpperCase();
  }, [user]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      window.dispatchEvent(new Event('auth:changed'));
      setIsOpen(false);
      navigate('/login');
    }
  };

  const labels = {
    en: {
      brand: 'TN Smart Bus',
      search: 'Search',
      services: 'Services',
      bookings: 'My Bookings',
      conductor: 'Conductor',
      admin: 'Admin',
      login: 'Login',
      logout: 'Logout',
      profile: 'Profile',
      switchText: 'தமிழ்',
      switchAria: 'Switch language to Tamil',
    },
    ta: {
      brand: 'டிஎன் ஸ்மார்ட் பஸ்',
      search: 'தேடல்',
      services: 'சேவைகள்',
      bookings: 'என் முன்பதிவுகள்',
      conductor: 'கண்டக்டர்',
      admin: 'நிர்வாகம்',
      login: 'உள்நுழைவு',
      logout: 'வெளியேறு',
      profile: 'சுயவிவரம்',
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
            <Link to="/conductor" className="nav-link">{t.conductor}</Link>
            <Link to="/admin" className="nav-link">{t.admin}</Link>
            <button
              type="button"
              className="language-btn"
              onClick={toggleLanguage}
              aria-label={t.switchAria}
            >
              {t.switchText}
            </button>
            {isAuthenticated ? (
              <div className="nav-profile-wrap">
                <div className="nav-profile-chip" title={t.profile}>
                  <span className="nav-profile-avatar">{profileInitial}</span>
                  <div className="nav-profile-meta">
                    <span className="nav-profile-name">{user?.name || 'User'}</span>
                    <span className="nav-profile-email">{user?.email || ''}</span>
                  </div>
                </div>
                <Link to="/my-bookings" className="nav-link nav-my-bookings-link">{t.bookings}</Link>
                <button type="button" className="logout-btn" onClick={handleLogout}>{t.logout}</button>
              </div>
            ) : (
              <Link to="/login" className="login-btn">
                {t.login}
              </Link>
            )}
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
            <Link to="/conductor" onClick={() => setIsOpen(false)} className="mobile-link">{t.conductor}</Link>
            <Link to="/admin" onClick={() => setIsOpen(false)} className="mobile-link">{t.admin}</Link>
            {isAuthenticated ? (
              <>
                <Link to="/my-bookings" onClick={() => setIsOpen(false)} className="mobile-link">{t.bookings}</Link>
                <div className="mobile-profile-chip">
                  <span className="nav-profile-avatar">{profileInitial}</span>
                  <div className="nav-profile-meta">
                    <span className="nav-profile-name">{user?.name || 'User'}</span>
                    <span className="nav-profile-email">{user?.email || ''}</span>
                  </div>
                </div>
                <button type="button" onClick={handleLogout} className="mobile-link mobile-logout-link">{t.logout}</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="mobile-link">{t.login}</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </nav>
  );
};
