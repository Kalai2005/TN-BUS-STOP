import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Bus, Map, Shield, Users, Clock, Globe, Zap, Award } from 'lucide-react';
import '../styles/services.css';
import { useLanguage } from '../context/LanguageContext';

const ServiceCard = ({ id, icon: Icon, title, description, features, color, localCtaText }) => (
  <motion.div 
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    whileHover={{ 
      y: -8,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    viewport={{ once: true }}
    className="service-card"
  >
    <div className={`service-icon-wrapper ${color}`}>
      <Icon className="service-icon-svg" size={28} color="white" />
    </div>
    <h3 className="service-card-title">{title}</h3>
    <p className="service-card-description">
      {description}
    </p>
    <ul className="service-features-list">
      {features.map((feature, index) => (
        <li key={index} className="service-feature-item">
          <div className="feature-dot" />
          {feature}
        </li>
      ))}
    </ul>
    {id === 'local' && (
      <Link to="/" className="service-action-btn">
        {localCtaText}
      </Link>
    )}
  </motion.div>
);

export const Services = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        pageTitle: 'எங்கள் போக்குவரத்து சேவைகள்',
        pageSubtitle: 'அரசு மற்றும் தனியார் போக்குவரத்து தீர்வுகளின் பல்வகை வலையமைப்பின் மூலம் தமிழ்நாடு முழுவதும் மக்களை இணைக்கிறோம்.',
        localSearch: 'உள்ளூர் பஸ்களை தேடுங்கள்',
        whyChoose: 'ஏன் TN Smart Bus?',
        safety: 'பாதுகாப்பு முதலில்',
        punctuality: 'நேர்த்தி',
        value: 'சிறந்த மதிப்பு',
        support: '24/7 உதவி',
      }
    : {
        pageTitle: 'Our Transport Services',
        pageSubtitle: 'Connecting millions across Tamil Nadu through a diverse network of state-run and private transport solutions.',
        localSearch: 'Search Local Buses',
        whyChoose: 'Why Choose TN Smart Bus?',
        safety: 'Safety First',
        punctuality: 'Punctuality',
        value: 'Best Value',
        support: '24/7 Support',
      };

  const services = [
    {
      id: "local",
      title: "Local Area Services",
      icon: Bus,
      color: "bg-blue-600",
      description: "Dedicated local bus services for short-distance travel within 100 km. Connecting neighborhoods, local markets, and transit hubs with high frequency.",
      features: [
        "Short-distance routes (< 100 km)",
        "High frequency service",
        "Flat fare options",
        "Easy boarding & alighting"
      ]
    },
    {
      id: "setc",
      title: "SETC Intercity",
      icon: Globe,
      color: "bg-indigo-600",
      description: "State Express Transport Corporation (SETC) provides premium long-distance connectivity (> 100 km) across Tamil Nadu and neighboring states.",
      features: [
        "Long-distance routes (> 100 km)",
        "AC Sleeper & Semi-Sleeper",
        "Online reservation system",
        "GPS tracking enabled"
      ]
    },
    {
      id: "tnstc",
      title: "TNSTC Regional",
      icon: Map,
      color: "bg-emerald-600",
      description: "Tamil Nadu State Transport Corporation (TNSTC) operates regional transport for medium to long distances (> 100 km), connecting major towns.",
      features: [
        "Regional routes (> 100 km)",
        "Frequent departures",
        "Affordable fare structure",
        "Student & Senior citizen passes"
      ]
    },
    {
      id: "private",
      title: "Private Operators",
      icon: Zap,
      color: "bg-orange-500",
      description: "We partner with leading private bus operators to provide additional choice and luxury options for travelers, ensuring competitive services and modern amenities.",
      features: [
        "Premium luxury coaches",
        "Flexible boarding points",
        "Dynamic pricing options",
        "Enhanced entertainment systems"
      ]
    },
    {
      id: "rural",
      title: "Rural Connectivity",
      icon: Users,
      color: "bg-stone-600",
      description: "Our commitment to reaching every corner of the state. Small buses and dedicated rural routes ensure that even the most remote villages stay connected to urban centers.",
      features: [
        "Village-to-Town connectivity",
        "Mini-bus operations",
        "Subsidized travel options",
        "Essential service priority"
      ]
    }
  ];

  return (
    <div className="services-container">
      <div className="services-header">
        <div className="text-center-wrapper">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="services-title"
          >
            {text.pageTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="services-subtitle"
            style={{ margin: '0 auto' }}
          >
            {text.pageSubtitle}
          </motion.p>
        </div>
      </div>

      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard key={index} {...service} localCtaText={text.localSearch} />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="why-choose-card why-choose-section"
      >
        <div className="why-choose-content">
          <h2 className="why-choose-title">{text.whyChoose}</h2>
          <div className="benefits-grid">
            <motion.div whileHover={{ x: 5 }} className="benefit-item">
              <div className="benefit-icon-box">
                <Shield className="benefit-icon" />
              </div>
              <div>
                <h4 className="benefit-text-title">{text.safety}</h4>
                <p className="benefit-text-desc">Verified operators and real-time tracking for every journey.</p>
              </div>
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="benefit-item">
              <div className="benefit-icon-box">
                <Clock className="benefit-icon" />
              </div>
              <div>
                <h4 className="benefit-text-title">{text.punctuality}</h4>
                <p className="benefit-text-desc">Optimized routes and schedules to save your valuable time.</p>
              </div>
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="benefit-item">
              <div className="benefit-icon-box">
                <Award className="benefit-icon" />
              </div>
              <div>
                <h4 className="benefit-text-title">{text.value}</h4>
                <p className="benefit-text-desc">Transparent pricing with no hidden charges or booking fees.</p>
              </div>
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="benefit-item">
              <div className="benefit-icon-box">
                <Users className="benefit-icon" />
              </div>
              <div>
                <h4 className="benefit-text-title">{text.support}</h4>
                <p className="benefit-text-desc">Dedicated helpdesk to assist you at any point of your travel.</p>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="decorative-blob" />
        <div className="decorative-blob" style={{ bottom: 0, top: 'auto', width: '384px', height: '384px', marginRight: '-192px', marginBottom: '-192px', opacity: 0.5 }} />
      </motion.div>
    </div>
  );
};
