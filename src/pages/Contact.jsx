import React from 'react';
import '../styles/Contact.css';
import { useLanguage } from '../context/LanguageContext';

export const Contact = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? { title: 'எங்களை தொடர்புகொள்ள', email: 'மின்னஞ்சல்', phone: 'தொலைபேசி' }
    : { title: 'Contact Us', email: 'Email', phone: 'Phone' };

  return (
    <div className="content-page center">
      <h1 className="page-title">{text.title}</h1>
      <p className="contact-info">{text.email}: support@tnsmartbus.tn.gov.in</p>
      <p className="contact-info">{text.phone}: 1800-123-4567</p>
    </div>
  );
};
