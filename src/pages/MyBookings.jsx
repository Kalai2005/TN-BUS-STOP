import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Ticket, XCircle, AlertTriangle, QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import '../styles/MyBookings.css';
import { useLanguage } from '../context/LanguageContext';

export const MyBookings = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        pageTitle: 'என் பயண வரலாறு',
        digitalTicket: 'டிஜிட்டல் டிக்கெட்',
        presentTicket: 'பேருந்தில் ஏறும் போது சரிபார்ப்பிற்கு இந்த டிக்கெட்டை காட்டவும்.',
        route: 'பாதை',
        journey: 'பயணம்',
        seat: 'இருக்கை',
        fare: 'கட்டணம்',
        passenger: 'பயணி',
        bus: 'பஸ்',
        ticketDetails: 'டிக்கெட் விவரங்கள்',
        status: 'நிலை',
        cancel: 'ரத்து',
        loading: 'ஏற்றுகிறது...',
        noBookings: 'இன்னும் முன்பதிவுகள் இல்லை.',
        allocatedBoarding: 'ஏறும் போது ஒதுக்கப்படும்',
        cancelBooking: 'முன்பதிவை ரத்து செய்யவா?',
        cancelWarn: 'இந்த முன்பதிவை ரத்து செய்ய விரும்புகிறீர்களா? இந்த செயலையை மாற்ற முடியாது.',
        keep: 'இல்லை, வைத்திருக்கவும்',
        yesCancel: 'ஆம், ரத்து செய்',
        cancelling: 'ரத்து செய்கிறது...',
        nextDayArrival: 'அடுத்த நாள் வருகை',
      }
    : {
        pageTitle: 'My Travel History',
        digitalTicket: 'Digital Ticket',
        presentTicket: 'Present this ticket at boarding for verification.',
        route: 'Route',
        journey: 'Journey',
        seat: 'Seat',
        fare: 'Fare',
        passenger: 'Passenger',
        bus: 'Bus',
        ticketDetails: 'Ticket Details',
        status: 'Status',
        cancel: 'Cancel',
        loading: 'Loading...',
        noBookings: 'No bookings found yet.',
        allocatedBoarding: 'Allocated at boarding',
        cancelBooking: 'Cancel Booking?',
        cancelWarn: 'Are you sure you want to cancel this booking? This action cannot be undone.',
        keep: 'No, Keep it',
        yesCancel: 'Yes, Cancel',
        cancelling: 'Cancelling...',
        nextDayArrival: 'Next day arrival',
      };
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatTime = (value) => {
    if (!value) return 'N/A';
    const [hours, minutes] = String(value).split(':');
    if (hours === undefined || minutes === undefined) return value;

    const hourNumber = Number(hours);
    if (Number.isNaN(hourNumber)) return value;

    const meridiem = hourNumber >= 12 ? 'PM' : 'AM';
    const formattedHour = hourNumber % 12 || 12;
    return `${formattedHour}:${minutes} ${meridiem}`;
  };

  const formatSeat = (seatNumber) => {
    if (!seatNumber || seatNumber === 'N/A') return text.allocatedBoarding;
    return seatNumber;
  };

  const formatBookingDate = (value, pattern = 'PPP') => {
    if (!value) return 'N/A';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return format(date, pattern);
  };

  const getDayOffset = (departure, arrival) => {
    const [departureHours, departureMinutes] = String(departure || '').split(':').map(Number);
    const [arrivalHours, arrivalMinutes] = String(arrival || '').split(':').map(Number);

    if (
      Number.isNaN(departureHours) ||
      Number.isNaN(departureMinutes) ||
      Number.isNaN(arrivalHours) ||
      Number.isNaN(arrivalMinutes)
    ) {
      return 0;
    }

    const departureTotal = (departureHours * 60) + departureMinutes;
    let arrivalTotal = (arrivalHours * 60) + arrivalMinutes;
    let dayOffset = 0;

    while (arrivalTotal < departureTotal) {
      arrivalTotal += 24 * 60;
      dayOffset += 1;
    }

    return dayOffset;
  };

  const normalizeBooking = (booking = {}) => {
    const bookingId = booking.id || booking._id || booking.bookingId || '';
    const seatNumbers = Array.isArray(booking.seatNumbers) ? booking.seatNumbers : [];
    const passengerName = booking.passenger_name
      || booking.passengerName
      || booking.userId?.name
      || 'N/A';

    return {
      ...booking,
      id: bookingId,
      booking_date: booking.booking_date || booking.createdAt || booking.journeyDate || null,
      qr_code: booking.qr_code || booking.qrCode || `TICKET-${String(bookingId).slice(-8).toUpperCase()}`,
      qr_download_url: booking.qr_download_url || '',
      source: booking.source || booking.routeId?.source || booking.boardingPoint || 'N/A',
      destination: booking.destination || booking.routeId?.destination || booking.droppingPoint || 'N/A',
      fare: booking.totalPrice ?? booking.total_fare ?? booking.fare ?? booking.routeId?.basePrice ?? 0,
      distance_km: booking.distance_km ?? booking.routeId?.distance ?? 0,
      operator: booking.operator || booking.busId?.operatorName || 'N/A',
      bus_type: booking.bus_type || booking.busId?.busType || 'N/A',
      bus_number: booking.bus_number || booking.busId?.busNumber || 'N/A',
      departure_time: booking.departure_time || booking.routeId?.stops?.[0]?.stopTime || 'N/A',
      arrival_time: booking.arrival_time || booking.routeId?.stops?.[Math.max((booking.routeId?.stops?.length || 1) - 1, 0)]?.stopTime || 'N/A',
      passenger_name: passengerName,
      passenger_age: booking.passenger_age ?? booking.passengerAge ?? 'N/A',
      passenger_gender: booking.passenger_gender ?? booking.passengerGender ?? 'N/A',
      seat_number: booking.seat_number || (seatNumbers.length ? seatNumbers.join(', ') : 'N/A'),
    };
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    api.getUserBookings()
      .then(data => {
        const normalized = Array.isArray(data)
          ? data.map((item) => normalizeBooking(item))
          : [];

        setBookings(normalized);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load bookings:', err);
        setBookings([]);
        setLoading(false);
      });
  };

  const activeBooking = selectedBooking ? normalizeBooking(selectedBooking) : null;

  const bookingDayOffset = activeBooking
    ? getDayOffset(activeBooking.departure_time, activeBooking.arrival_time)
    : 0;

  const handleCancel = async () => {
    if (!cancellingId) return;
    setIsProcessing(true);
    try {
      const result = await api.cancelBooking(cancellingId, 'Cancelled by user');
      if (result?.success !== false) {
        fetchBookings();
        setCancellingId(null);
      }
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="my-bookings-page">
      <h2 className="page-title">{text.pageTitle}</h2>
      
      <AnimatePresence>
        {activeBooking && (
          <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="ticket-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal-btn" onClick={() => setSelectedBooking(null)}>
                <X size={24} />
              </button>
              <div className="ticket-modal-scroll">
                <div className="modal-ticket-header">
                  <QrCode className="modal-ticket-icon" />
                  <h3 className="modal-title">{text.digitalTicket}</h3>
                  <p className="modal-subtitle">{text.presentTicket}</p>
                </div>

                <div className="modal-status-strip">
                  <span className="modal-status-pill">{activeBooking.status}</span>
                  <span className="modal-status-pill light">Booked on {formatBookingDate(activeBooking.booking_date, 'dd MMM yyyy')}</span>
                </div>

                <div className="modal-highlight-grid">
                  <div className="modal-highlight-card">
                    <span className="modal-highlight-label">{text.route}</span>
                    <span className="modal-highlight-value">{activeBooking.source} → {activeBooking.destination}</span>
                  </div>
                  <div className="modal-highlight-card">
                    <span className="modal-highlight-label">{text.journey}</span>
                    <span className="modal-highlight-value">{formatTime(activeBooking.departure_time)} - {formatTime(activeBooking.arrival_time)}</span>
                    {bookingDayOffset > 0 && (
                      <span className="time-day-note">{text.nextDayArrival}</span>
                    )}
                  </div>
                  <div className="modal-highlight-card">
                    <span className="modal-highlight-label">{text.seat}</span>
                    <span className="modal-highlight-value">{formatSeat(activeBooking.seat_number)}</span>
                  </div>
                  <div className="modal-highlight-card accent">
                    <span className="modal-highlight-label">{text.fare}</span>
                    <span className="modal-highlight-value">₹{Number(activeBooking.fare || 0)}</span>
                  </div>
                </div>

                <div className="modal-qr-container">
                  <QRCodeSVG value={activeBooking.qr_download_url || activeBooking.qr_code} size={180} />
                  <div className="qr-id">{activeBooking.qr_code}</div>
                </div>

                <div className="ticket-divider"></div>

                <div className="modal-ticket-details">
                  <div className="detail-group">
                    <h4 className="detail-group-title">{text.passenger}</h4>
                    <div className="detail-row">
                      <span className="detail-label">Name</span>
                      <span className="detail-value">{activeBooking.passenger_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Age / Gender</span>
                      <span className="detail-value">
                        {activeBooking.passenger_age} yrs / {activeBooking.passenger_gender ? (activeBooking.passenger_gender.charAt(0).toUpperCase() + activeBooking.passenger_gender.slice(1)) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="detail-group">
                    <h4 className="detail-group-title">{text.bus}</h4>
                    <div className="detail-row">
                      <span className="detail-label">Operator</span>
                      <span className="detail-value">{activeBooking.operator || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Bus</span>
                      <span className="detail-value">{activeBooking.bus_type || 'N/A'} ({activeBooking.bus_number || 'N/A'})</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Distance</span>
                      <span className="detail-value">{Math.round(Number(activeBooking.distance_km || 0))} km</span>
                    </div>
                  </div>

                  <div className="detail-group detail-group-full">
                    <h4 className="detail-group-title">{text.ticketDetails}</h4>
                    <div className="detail-row">
                      <span className="detail-label">Ticket ID</span>
                      <span className="detail-value mono">{activeBooking.qr_code}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Booking Reference</span>
                      <span className="detail-value">BK-{activeBooking.id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Departure</span>
                      <span className="detail-value">{formatTime(activeBooking.departure_time)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Arrival</span>
                      <span className="detail-value with-note">
                        <span>{formatTime(activeBooking.arrival_time)}</span>
                        {bookingDayOffset > 0 && <span className="time-day-note">{text.nextDayArrival}</span>}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="modal-footer-text">Show this QR code to the conductor during boarding.</p>
              </div>
            </motion.div>
          </div>
        )}

        {cancellingId && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="confirm-modal"
            >
              <div className="modal-icon-wrapper warning">
                <AlertTriangle className="modal-warning-icon" />
              </div>
              <h3 className="modal-title">{text.cancelBooking}</h3>
              <p className="modal-text">{text.cancelWarn}</p>
              <div className="modal-actions-horizontal">
                <button 
                  onClick={() => setCancellingId(null)}
                  disabled={isProcessing}
                  className="modal-btn-cancel"
                >
                  {text.keep}
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="modal-btn-confirm"
                >
                  {isProcessing ? text.cancelling : text.yesCancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bookings-list">
        {loading ? (
          <div className="loading-state">{text.loading}</div>
        ) : bookings.length > 0 ? (
          bookings.map((b, index) => (
            <div 
              key={b._id || b.id || b.bookingId || b.qr_code || `${String(b.booking_date || 'booking')}-${index}`}
              className={`booking-card ${b.status === 'confirmed' ? 'clickable' : ''}`}
              onClick={() => b.status === 'confirmed' && setSelectedBooking(b)}
            >
              <div className="booking-info">
                <div className="ticket-icon-wrapper">
                  <Ticket className="ticket-icon" />
                </div>
                <div className="route-details">
                  <div className="route-text">{b.source} → {b.destination}</div>
                  <div className="date-text">{formatBookingDate(b.booking_date, 'PPP')}</div>
                  <div className="passenger-mini-info">
                    {b.passenger_name} ({b.passenger_age}, {b.passenger_gender})
                  </div>
                </div>
              </div>
              <div className="card-right-section">
                <div className="status-section">
                  <div className="status-label">{text.status}</div>
                  <div className={`status-badge ${b.status}`}>
                    {b.status.toUpperCase()}
                  </div>
                </div>
                {b.status === 'confirmed' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCancellingId(b.id || b._id || b.bookingId);
                    }}
                    className="cancel-booking-btn"
                    title="Cancel Booking"
                  >
                    <XCircle size={18} />
                    <span>{text.cancel}</span>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p className="empty-text">{text.noBookings}</p>
          </div>
        )}
      </div>
    </div>
  );
};
