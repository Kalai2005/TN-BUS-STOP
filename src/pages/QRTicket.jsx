import React from 'react';
import '../styles/QRTicket.css';
import { useLanguage } from '../context/LanguageContext';

export const QRTicket = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        title: 'உங்கள் QR டிக்கெட்',
        subtitle: 'பஸ் நுழைவாயிலில் இந்த குறியீட்டை ஸ்கேன் செய்யவும்.',
      }
    : {
        title: 'Your QR Ticket',
        subtitle: 'Scan this code at the bus entrance.',
      };

  return (
    <div className="content-page">
      <h2 className="page-title">{text.title}</h2>
      <p className="page-text">{text.subtitle}</p>
    </div>
  );
};
