import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/Register.css';
import { useLanguage } from '../context/LanguageContext';

export const Register = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const text = language === 'ta'
    ? {
        title: 'கணக்கை உருவாக்கவும்',
        fullName: 'முழு பெயர்',
        email: 'மின்னஞ்சல்',
        password: 'கடவுச்சொல்',
        nameRequired: 'முழு பெயரை உள்ளிடவும்.',
        emailRequired: 'செல்லுபடியாகும் மின்னஞ்சலை உள்ளிடவும்.',
        passwordMin: 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.',
        registerFailed: 'பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
        signingUp: 'பதிவு செய்கிறது...',
        register: 'பதிவு செய்யவும்',
        alreadyUser: 'ஏற்கனவே கணக்கு உள்ளதா?',
        login: 'உள்நுழைக',
      }
    : {
        title: 'Create Account',
        fullName: 'Full Name',
        email: 'Email',
        password: 'Password',
        nameRequired: 'Please enter your full name.',
        emailRequired: 'Please enter a valid email address.',
        passwordMin: 'Password should be at least 6 characters.',
        registerFailed: 'Unable to register now. Please try again.',
        signingUp: 'Creating account...',
        register: 'Register',
        alreadyUser: 'Already have an account?',
        login: 'Login',
      };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError(text.nameRequired);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(text.emailRequired);
      return;
    }

    if (password.trim().length < 6) {
      setError(text.passwordMin);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authService.register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      setError(text.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{text.title}</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <p className="auth-error">{error}</p>}
          <div className="form-group">
            <label className="form-label">{text.fullName}</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{text.email}</label>
            <input
              type="email"
              className="form-input"
              placeholder="email@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{text.password}</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button className="auth-submit-btn" disabled={loading}>
            {loading ? text.signingUp : text.register}
          </button>
        </form>

        <p className="auth-footer">
          {text.alreadyUser} <Link to="/login" className="auth-link">{text.login}</Link>
        </p>
      </div>
    </div>
  );
};
