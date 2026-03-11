import React from 'react';
import '../styles/SearchBus.css';
import { useLanguage } from '../context/LanguageContext';

export const SearchBus = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        title: 'மேம்பட்ட தேடல்',
        subtitle: 'குறிப்பிட்ட பாதைகள் மற்றும் அட்டவணைகளை தேடுங்கள்.',
      }
    : {
        title: 'Advanced Search',
        subtitle: 'Search for specific routes and schedules.',
      };

  return (
    <div className="content-page">
      <h2 className="page-title">{text.title}</h2>
      <p className="page-text">{text.subtitle}</p>
    </div>
  );
};
