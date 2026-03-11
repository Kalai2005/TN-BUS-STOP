import React from 'react';
import '../styles/Register.css';
import { useLanguage } from '../context/LanguageContext';

export const Register = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        title: 'கணக்கை உருவாக்கவும்',
        fullName: 'முழு பெயர்',
        email: 'மின்னஞ்சல்',
        password: 'கடவுச்சொல்',
        register: 'பதிவு செய்யவும்',
      }
    : {
        title: 'Create Account',
        fullName: 'Full Name',
        email: 'Email',
        password: 'Password',
        register: 'Register',
      };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{text.title}</h2>
        <div className="auth-form">
          <div className="form-group">
            <label className="form-label">{text.fullName}</label>
            <input type="text" className="form-input" placeholder="John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">{text.email}</label>
            <input type="email" className="form-input" placeholder="email@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">{text.password}</label>
            <input type="password" className="form-input" placeholder="••••••••" />
          </div>
          <button className="auth-submit-btn">
            {text.register}
          </button>
        </div>
      </div>
    </div>
  );
};
