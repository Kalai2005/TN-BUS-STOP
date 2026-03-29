import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { Home } from './pages/Home';
import { Booking } from './pages/Booking';
import { MyBookings } from './pages/MyBookings';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { About } from './pages/About';
import { Services } from './pages/Services';
import { Contact } from './pages/Contact';
import { Support } from './pages/Support';
import { SearchBus } from './pages/SearchBus';
import { RouteTracking } from './pages/RouteTracking';
import { QRTicket } from './pages/QRTicket';
import { ConductorScan } from './pages/ConductorScan';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LanguageProvider } from './context/LanguageContext';

// Styles
import './styles/App.css';
import './styles/Common.css';
import './styles/Home.css';
import './styles/Login.css';
import './styles/Admin.css';
import './styles/Booking.css';
import './styles/support.css';

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <ScrollToTop />
        <div className="app-wrapper">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchBus />} />
              <Route path="/track" element={<RouteTracking />} />
              <Route path="/ticket" element={<QRTicket />} />
              <Route path="/conductor" element={<ProtectedRoute><ConductorScan /></ProtectedRoute>} />
              <Route path="/book/:id" element={<Booking />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/support" element={<Support />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </LanguageProvider>
  );
}
