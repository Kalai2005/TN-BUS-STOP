import React from 'react';
import '../styles/RouteTracking.css';
import { useLanguage } from '../context/LanguageContext';

export const RouteTracking = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        title: 'நேரடி பாதை கண்காணிப்பு',
        subtitle: 'வரைபடத்தில் உங்கள் பஸ்ஸை நேரடியாக கண்காணிக்கவும்.',
      }
    : {
        title: 'Live Route Tracking',
        subtitle: 'Track your bus in real-time on the map.',
      };

  return (
    <div className="content-page">
      <h2 className="page-title">{text.title}</h2>
      <p className="page-text">{text.subtitle}</p>
    </div>
  );
};
