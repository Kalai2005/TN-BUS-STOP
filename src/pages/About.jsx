import React from 'react';
import { motion } from 'motion/react';
import { Info, ShieldCheck, FileText } from 'lucide-react';
import '../styles/about.css';
import { useLanguage } from '../context/LanguageContext';

export const About = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        title: 'TN Smart Bus பற்றி',
        subtitle: 'டிஜிட்டல் புதுமை மூலம் தமிழ்நாட்டு பொது போக்குவரத்தை நவீனப்படுத்துகிறோம்.',
        aboutUs: 'எங்களைப் பற்றி',
        terms: 'சேவை விதிமுறைகள்',
        privacy: 'தனியுரிமை கொள்கை',
        footer: 'TN Smart Bus அமைப்பு. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      }
    : {
        title: 'About TN Smart Bus',
        subtitle: "Modernizing Tamil Nadu's public transportation through digital innovation.",
        aboutUs: 'About Us',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        footer: 'TN Smart Bus System. All rights reserved.',
      };

  return (
    <div className="about-page-container">
      <div className="about-max-width">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="about-hero"
        >
          <h1 className="about-main-title">
            {text.title}
          </h1>
          <p className="about-hero-text">
            {text.subtitle}
          </p>
        </motion.div>

        <div className="about-card-stack">
          
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="about-card"
          >
            <div className="about-card-header">
              <div className="about-icon-box icon-bg-about">
                <Info size={24} />
              </div>
              <h2 className="about-card-title">{text.aboutUs}</h2>
            </div>
            <div className="about-card-content">
              <p>
                TN Smart Bus is a visionary project aimed at transforming the public transportation landscape in Tamil Nadu. 
                Our platform bridges the gap between commuters and bus operators, providing a seamless, transparent, 
                and efficient travel experience for millions of passengers.
              </p>
              <p>
                By integrating real-time tracking, digital ticketing, and comprehensive route management, we empower 
                citizens to plan their journeys with confidence and ease. Our mission is to reduce wait times, 
                eliminate paper waste, and bring world-class smart city infrastructure to every corner of the state.
              </p>
            </div>
          </motion.section>

          
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="about-card"
          >
            <div className="about-card-header">
              <div className="about-icon-box icon-bg-terms">
                <FileText size={24} />
              </div>
              <h2 className="about-card-title">{text.terms}</h2>
            </div>
            <div className="about-card-content">
              <p>
                By using the TN Smart Bus platform, you agree to abide by our terms and conditions. These terms are 
                designed to ensure a safe and reliable service for all users.
              </p>
              <ul className="about-list">
                <li>Tickets purchased through the app are valid only for the specified route and time.</li>
                <li>Users are responsible for maintaining the confidentiality of their account credentials.</li>
                <li>Any misuse of the QR ticketing system may lead to account suspension.</li>
                <li>Real-time tracking data is provided for convenience and may have slight variations due to network conditions.</li>
              </ul>
            </div>
          </motion.section>

          
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="about-card"
          >
            <div className="about-card-header">
              <div className="about-icon-box icon-bg-privacy">
                <ShieldCheck size={24} />
              </div>
              <h2 className="about-card-title">{text.privacy}</h2>
            </div>
            <div className="about-card-content">
              <p>
                Your privacy is our top priority. We are committed to protecting the personal data you share with us.
              </p>
              <p>
                We collect minimal information necessary to provide our services, such as your contact details for 
                account management and location data for real-time tracking (only when the app is in use). 
                We do not sell your personal information to third parties.
              </p>
              <p>
                All payment transactions are processed through secure, encrypted gateways to ensure your financial 
                information remains protected at all times.
              </p>
            </div>
          </motion.section>
        </div>

        <footer className="about-page-footer">
          <p>&copy; {new Date().getFullYear()} {text.footer}</p>
        </footer>
      </div>
    </div>
  );
};
