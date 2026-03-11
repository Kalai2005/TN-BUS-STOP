import React from 'react';
import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';
import '../styles/Footer.css';
import { useLanguage } from '../context/LanguageContext';

export const Footer = () => {
  const { language } = useLanguage();

  const text = language === 'ta'
    ? {
        brand: 'டிஎன் ஸ்மார்ட் பஸ்',
        description: 'நேரடி கண்காணிப்பு, டிஜிட்டல் டிக்கெட் மற்றும் திறமையான அட்டவணையுடன் தமிழ்நாட்டின் போக்குவரத்து சூழலை நவீனப்படுத்துகிறோம்.',
        services: 'சேவைகள்',
        setc: 'SETC இடநகர்',
        tnstc: 'TNSTC பிராந்திய',
        private: 'தனியார் ஆபரேட்டர்கள்',
        rural: 'கிராமப்புற இணைப்பு',
        about: 'எங்களைப் பற்றி',
        aboutUs: 'எங்களைப் பற்றி',
        helpCenter: 'உதவி மையம்',
        copyright: 'தமிழ்நாடு போக்குவரத்து துறை. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      }
    : {
        brand: 'TN Smart Bus',
        description: "Modernizing Tamil Nadu's transportation ecosystem with real-time tracking, digital ticketing, and efficient scheduling.",
        services: 'Services',
        setc: 'SETC Intercity',
        tnstc: 'TNSTC Regional',
        private: 'Private Operators',
        rural: 'Rural Connectivity',
        about: 'About',
        aboutUs: 'About Us',
        helpCenter: 'Help Center',
        copyright: 'Tamil Nadu Transport Department. All rights reserved.',
      };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand-section">
            <div className="footer-brand">
              <Bus className="icon-emerald" />
              <span className="footer-brand-text">{text.brand}</span>
            </div>
            <p className="footer-description">{text.description}</p>
          </div>
          <div>
            <h4 className="footer-heading"><Link to="/services">{text.services}</Link></h4>
            <ul className="footer-list">
              <li><Link to="/services#setc">{text.setc}</Link></li>
              <li><Link to="/services#tnstc">{text.tnstc}</Link></li>
              <li><Link to="/services#private">{text.private}</Link></li>
              <li><Link to="/services#rural">{text.rural}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">{text.about}</h4>
            <ul className="footer-list">
              <li><Link to="/about">{text.aboutUs}</Link></li>
              <li><Link to="/support">{text.helpCenter}</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} {text.copyright}
        </div>
      </div>
    </footer>
  );
};
