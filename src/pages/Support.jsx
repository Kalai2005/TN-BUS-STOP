import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Mail, MessageSquare, ChevronRight, Phone, MapPin, AlertCircle, ChevronDown, CreditCard, Ticket, Map, RefreshCcw, Smartphone } from 'lucide-react';
import '../styles/support.css';
import { useLanguage } from '../context/LanguageContext';

export const Support = () => {
  const [activeFaq, setActiveFaq] = useState(null);
  const { language } = useLanguage();

  const text = language === 'ta'
    ? {
        title: 'எப்படி உதவலாம்?',
        subtitle: 'பதில்களை கண்டுபிடிக்கவும், எங்களை தொடர்பு கொள்ளவும், உங்கள் கருத்தை பகிரவும்.',
        faq: 'அடிக்கடி கேட்கப்படும் கேள்விகள்',
        contact: 'எங்களை தொடர்புகொள்ள',
        email: 'மின்னஞ்சல் முகவரி',
        message: 'செய்தி',
        send: 'செய்தி அனுப்பு',
        feedback: 'கருத்து & குறைகள்',
        feedbackIntro: 'உங்கள் கருத்து எங்கள் சேவையை மேம்படுத்த உதவுகிறது.',
      }
    : {
        title: 'How can we help you?',
        subtitle: 'Find answers, get in touch, or share your feedback with us.',
        faq: 'Frequently Asked Questions',
        contact: 'Contact Us',
        email: 'Email Address',
        message: 'Message',
        send: 'Send Message',
        feedback: 'Feedback & Grievance',
        feedbackIntro: 'Your feedback helps us improve our services.',
      };

  const faqs = [
    {
      id: 'booking',
      icon: <Ticket size={20} />,
      question: 'How to book a ticket?',
      answer: (
        <div className="faq-answer-content">
          <p>Booking a ticket on TN Smart Bus is simple and fast:</p>
          <ol>
            <li><strong>Search:</strong> Enter your source, destination, and travel date on the home page.</li>
            <li><strong>Select Bus:</strong> Browse through available buses and select one that fits your schedule and budget.</li>
            <li><strong>Choose Seat:</strong> View the seat layout and pick your preferred available seat.</li>
            <li><strong>Passenger Details:</strong> Enter the names and details of all passengers.</li>
            <li><strong>Payment:</strong> Complete the transaction using UPI, Credit/Debit Card, or Net Banking.</li>
            <li><strong>Confirmation:</strong> Your digital ticket will be generated instantly and sent to your email/SMS.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'cancellation',
      icon: <RefreshCcw size={20} />,
      question: 'Cancellation & Refunds',
      answer: (
        <div className="faq-answer-content">
          <p>We offer a flexible cancellation policy:</p>
          <ul>
            <li><strong>More than 24 hours before departure:</strong> 90% refund of the ticket amount.</li>
            <li><strong>12 to 24 hours before departure:</strong> 75% refund.</li>
            <li><strong>6 to 12 hours before departure:</strong> 50% refund.</li>
            <li><strong>Less than 6 hours before departure:</strong> No refund available.</li>
          </ul>
          <p>Refunds are usually processed within 5-7 business days to the original payment method.</p>
        </div>
      )
    },
    {
      id: 'tracking',
      icon: <Map size={20} />,
      question: 'Bus Tracking Guide',
      answer: (
        <div className="faq-answer-content">
          <p>Track your bus in real-time with these steps:</p>
          <ol>
            <li>Go to the <strong>"Track Bus"</strong> section in the navigation menu.</li>
            <li>Enter your <strong>PNR Number</strong> or <strong>Bus Number</strong>.</li>
            <li>The map will display the current live location of your bus.</li>
            <li>You can see the estimated time of arrival (ETA) for your boarding point.</li>
          </ol>
          <p>Note: Live tracking becomes active 30 minutes before the scheduled departure time.</p>
        </div>
      )
    },
    {
      id: 'qr-tickets',
      icon: <Smartphone size={20} />,
      question: 'Digital QR Tickets',
      answer: (
        <div className="faq-answer-content">
          <p>Go paperless with our Digital QR Tickets:</p>
          <ul>
            <li>After booking, your QR ticket is available in the <strong>"My Bookings"</strong> section.</li>
            <li>You don't need to print the ticket; just show the QR code on your phone to the conductor.</li>
            <li>The conductor will scan the code using a handheld device to verify your booking.</li>
            <li>Ensure your phone has enough battery and the brightness is turned up for easy scanning.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'payments',
      icon: <CreditCard size={20} />,
      question: 'Payment Issues',
      answer: (
        <div className="faq-answer-content">
          <p>Encountered a payment problem? Here's what to do:</p>
          <ul>
            <li><strong>Amount Debited but Ticket Not Generated:</strong> Don't worry! This usually happens due to a network timeout. The amount will be automatically refunded within 24 hours, or the ticket will be confirmed if the bank clears the transaction.</li>
            <li><strong>Payment Failed:</strong> Check if your card is enabled for online transactions or try using a different payment method like UPI.</li>
            <li><strong>Double Deduction:</strong> If you were charged twice for the same booking, the extra amount will be reversed by your bank automatically.</li>
          </ul>
          <p>For urgent assistance, contact our 24/7 support line with your transaction ID.</p>
        </div>
      )
    }
  ];

  const toggleFaq = (id) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  return (
    <div className="support-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="support-header"
      >
        <h1 className="support-title">{text.title}</h1>
        <p className="support-subtitle">{text.subtitle}</p>
      </motion.div>

      <div className="support-sections">
       
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="support-card full-width"
        >
          <div className="card-icon">
            <HelpCircle size={24} />
          </div>
          <h2 className="card-title">{text.faq}</h2>
          <div className="card-content">
            <div className="faq-accordion">
              {faqs.map((faq) => (
                <div 
                  key={faq.id} 
                  className={`faq-item ${activeFaq === faq.id ? 'active' : ''}`}
                  onClick={() => toggleFaq(faq.id)}
                >
                  <div className="faq-question">
                    <div className="faq-question-text">
                      <span className="faq-icon">{faq.icon}</span>
                      {faq.question}
                    </div>
                    <ChevronDown 
                      size={18} 
                      className={`faq-chevron ${activeFaq === faq.id ? 'rotate' : ''}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {activeFaq === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="faq-answer"
                      >
                        <div className="faq-answer-inner">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="support-card"
        >
          <div className="card-icon">
            <Mail size={24} />
          </div>
          <h2 className="card-title">{text.contact}</h2>
          <div className="card-content">
            <div className="contact-form">
              <div className="form-group">
                <label className="form-label">{text.email}</label>
                <input type="email" className="form-input" placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">{text.message}</label>
                <textarea className="form-textarea" rows={3} placeholder="How can we help?"></textarea>
              </div>
              <button className="submit-btn">{text.send}</button>
            </div>
            <div className="contact-meta">
              <div className="contact-meta-item">
                <Phone size={14} /> <span>1800-123-4567 (Toll Free)</span>
              </div>
              <div className="contact-meta-item">
                <MapPin size={14} /> <span>Chennai, Tamil Nadu</span>
              </div>
            </div>
          </div>
        </motion.div>

        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="support-card"
        >
          <div className="card-icon">
            <MessageSquare size={24} />
          </div>
          <h2 className="card-title">{text.feedback}</h2>
          <div className="card-content">
            <p className="feedback-intro">{text.feedbackIntro}</p>
            <div className="feedback-options">
              <div className="feedback-tag">
                <AlertCircle size={14} /> <span>Report a Technical Issue</span>
              </div>
              <div className="feedback-tag">
                <MessageSquare size={14} /> <span>Suggest a New Feature</span>
              </div>
              <div className="feedback-tag">
                <HelpCircle size={14} /> <span>General Feedback</span>
              </div>
            </div>
            
            <div className="grievance-notice">
              <strong>Grievance Redressal:</strong>
              <p className="grievance-text">For serious complaints, please contact our Nodal Officer at grievance@tnsmartbus.gov.in</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

