import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import '../styles/Booking.css';
import { useLanguage } from '../context/LanguageContext';

export const Booking = () => {
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        chooseSeat: 'தொடர கிடைக்கும் இருக்கையை தேர்வு செய்யவும்.',
        invalidSchedule: 'தவறான அட்டவணை. மீண்டும் பஸ்களை தேடவும்.',
        unableLoadDetails: 'பஸ் விவரங்களை ஏற்ற முடியவில்லை.',
        seatNotRequired: 'உள்ளூர் பஸ்களுக்கு இருக்கை தேர்வு அவசியமில்லை.',
        loadFailed: 'முன்பதிவு விவரங்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
        selectSeatFirst: 'முதலில் ஒரு இருக்கையை தேர்வு செய்யவும்.',
        seatWaiting: 'தேர்ந்தெடுத்த இருக்கை காத்திருப்பு பட்டியலில் உள்ளது. மற்றொரு இருக்கையை தேர்வு செய்யவும்.',
        seatBooked: 'தேர்ந்தெடுத்த இருக்கை ஏற்கனவே முன்பதிவு செய்யப்பட்டுள்ளது. வேறு இருக்கையை தேர்வு செய்யவும்.',
        fillPassenger: 'பயணி விவரங்களை முழுமையாக நிரப்பவும்.',
        passengerNameMin: 'பயணி பெயர் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்.',
        validAge: '1 முதல் 120 வரை சரியான வயதை உள்ளிடவும்.',
        bookingFailed: 'முன்பதிவு தோல்வி. மீண்டும் முயற்சிக்கவும்.',
        unexpectedError: 'முன்பதிவு செய்யும்போது பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
        loadingBooking: 'முன்பதிவு விவரங்கள் ஏற்றப்படுகிறது...',
        unableToLoad: 'முன்பதிவை ஏற்ற முடியவில்லை',
        scheduleNotFound: 'அட்டவணை கிடைக்கவில்லை.',
        backToSearch: 'தேடலுக்கு திரும்பு',
        bookingSuccess: 'முன்பதிவு வெற்றிகரமாக முடிந்தது!',
        ticketConfirmed: 'உங்கள் டிக்கெட் உறுதி செய்யப்பட்டது மற்றும் பயண வரலாற்றில் சேர்க்கப்பட்டது.',
        viewTicket: 'டிக்கெட் பார்க்க',
        goBookings: 'என் முன்பதிவுகளுக்கு செல்லவும்',
        completeBooking: 'உங்கள் முன்பதிவை முடிக்கவும்',
        selectSeat: 'இருக்கை தேர்வு',
        available: 'கிடைக்கும்',
        booked: 'முன்பதிவு செய்யப்பட்டது',
        waiting: 'காத்திருப்பு',
        refreshSeats: 'இருக்கை கிடைக்கும் நிலை புதுப்பிக்கப்படுகிறது...',
        localDetected: 'உள்ளூர் பஸ் சேவை கண்டறியப்பட்டது. ஏறும் போது இருக்கை ஒதுக்கப்படும்.',
        passengerDetails: 'பயணி விவரங்கள்',
        fullName: 'முழு பெயர்',
        age: 'வயது',
        gender: 'பாலினம்',
        paymentSummary: 'கட்டண சுருக்கம்',
        seatNumber: 'இருக்கை எண்',
        notSelected: 'தேர்வு செய்யப்படவில்லை',
        baseFare: 'அடிப்படை கட்டணம்',
        serviceFee: 'சேவை கட்டணம்',
        totalAmount: 'மொத்த தொகை',
        nextDayArrival: 'அடுத்த நாள் வருகை',
      }
    : {
        chooseSeat: 'Please choose an available seat to continue.',
        invalidSchedule: 'Invalid schedule. Please search buses again.',
        unableLoadDetails: 'Unable to load bus details.',
        seatNotRequired: 'Seat selection is not required for local bus services.',
        loadFailed: 'Failed to load booking details. Please try again.',
        selectSeatFirst: 'Please select a seat first.',
        seatWaiting: 'Selected seat is in waiting list. Please choose an available seat.',
        seatBooked: 'Selected seat is already booked. Please choose another seat.',
        fillPassenger: 'Please fill all passenger details.',
        passengerNameMin: 'Passenger name should be at least 2 characters.',
        validAge: 'Please enter a valid passenger age between 1 and 120.',
        bookingFailed: 'Booking failed. Please try again.',
        unexpectedError: 'Something went wrong while booking. Please try again.',
        loadingBooking: 'Loading booking details...',
        unableToLoad: 'Unable to Load Booking',
        scheduleNotFound: 'Schedule not found.',
        backToSearch: 'Back to Search',
        bookingSuccess: 'Booking Successful!',
        ticketConfirmed: 'Your ticket has been confirmed and added to your travel history.',
        viewTicket: 'View Ticket',
        goBookings: 'Go to My Bookings',
        completeBooking: 'Complete Your Booking',
        selectSeat: 'Select Seat',
        available: 'Available',
        booked: 'Booked',
        waiting: 'Waiting',
        refreshSeats: 'Refreshing seat availability...',
        localDetected: 'Local bus service detected. Seat allocation happens at boarding, so seat selection is not required.',
        passengerDetails: 'Passenger Details',
        fullName: 'Full Name',
        age: 'Age',
        gender: 'Gender',
        paymentSummary: 'Payment Summary',
        seatNumber: 'Seat Number',
        notSelected: 'Not selected',
        baseFare: 'Base Fare',
        serviceFee: 'Service Fee',
        totalAmount: 'Total Amount',
        nextDayArrival: 'Next day arrival',
      };
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [booked, setBooked] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState('');
  const [busDetails, setBusDetails] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('tnpay');
  const [passenger, setPassenger] = useState({
    name: '',
    age: '',
    gender: 'male'
  });
  const [error, setError] = useState('');
  const [seatMessage, setSeatMessage] = useState(text.chooseSeat);

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

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  useEffect(() => {
    const loadBookingData = async () => {
      if (!id) {
        setError(text.invalidSchedule);
        setLoadingSchedule(false);
        setLoadingSeats(false);
        return;
      }

      setError('');
      setLoadingSchedule(true);
      setLoadingSeats(true);

      try {
        const schedule = await api.getScheduleById(id);

        if (!schedule || schedule.success === false) {
          setError(schedule?.message || text.unableLoadDetails);
          setBusDetails(null);
          return;
        }

        const isLocal = String(schedule.bus_type || '').toLowerCase().includes('local');

        setBusDetails({
          id: schedule.id,
          operator: schedule.operator,
          busType: schedule.bus_type,
          busNumber: schedule.bus_number,
          source: schedule.source,
          destination: schedule.destination,
          departureTime: schedule.departure_time,
          arrivalTime: schedule.arrival_time,
          distanceKm: schedule.distance_km,
          route: `${schedule.source} to ${schedule.destination}`,
          fare: Number(schedule.fare || 0),
          capacity: Number(schedule.capacity || 40),
          isLocal,
        });

        if (isLocal) {
          setBookedSeats([]);
          setSelectedSeat('');
          setSeatMessage(text.seatNotRequired);
        } else {
          const seatData = await api.getBookedSeats(id);
          setBookedSeats(Array.isArray(seatData?.bookedSeats) ? seatData.bookedSeats : []);
          setSeatMessage(text.chooseSeat);
        }

      } catch (err) {
        console.error('Failed to load booking data:', err);
        setError(text.loadFailed);
      } finally {
        setLoadingSchedule(false);
        setLoadingSeats(false);
      }
    };

    loadBookingData();
  }, [id, text.invalidSchedule, text.unableLoadDetails, text.seatNotRequired, text.chooseSeat, text.loadFailed]);


  const waitingListSeats = ['A4', 'C3'];

  const totalSeats = busDetails?.capacity || 40;
  const isLocalBus = Boolean(busDetails?.isLocal);
  const baseFare = Number(busDetails?.fare || 0);
  const serviceFee = isLocalBus ? 1 : 25;
  const totalAmount = baseFare + serviceFee;
  const bookingDayOffset = getDayOffset(busDetails?.departureTime, busDetails?.arrivalTime);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPassenger(prev => ({ ...prev, [name]: value }));
  };

  const validatePassenger = () => {
    const trimmedName = passenger.name.trim();
    const numericAge = Number(passenger.age);

    if (!isLocalBus) {
      if (!selectedSeat) {
        return text.selectSeatFirst;
      }

      if (waitingListSeats.includes(selectedSeat)) {
        return text.seatWaiting;
      }

      if (bookedSeats.includes(selectedSeat)) {
        return text.seatBooked;
      }
    }

    if (!trimmedName || !passenger.age || !passenger.gender) {
      return text.fillPassenger;
    }

    if (trimmedName.length < 2) {
      return text.passengerNameMin;
    }

    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      return text.validAge;
    }

    return '';
  };

  const handleSeatSelect = (seat) => {
    if (seat.isBooked) {
      setSeatMessage(`Seat ${seat.id} is already booked.`);
      return;
    }

    if (seat.isWaiting) {
      setSeatMessage(`Seat ${seat.id} is currently in waiting list. Please select another seat.`);
      return;
    }

    setSelectedSeat(seat.id);
    setError('');
    setSeatMessage(`Seat ${seat.id} selected.`);
  };

  const handleBook = async () => {
    const validationError = validatePassenger();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (!isLocalBus) {
        
        const latestSeatData = await api.getBookedSeats(id);
        const latestBookedSeats = Array.isArray(latestSeatData?.bookedSeats)
          ? latestSeatData.bookedSeats
          : [];

        if (latestBookedSeats.includes(selectedSeat)) {
          setBookedSeats(latestBookedSeats);
          setError(`Seat ${selectedSeat} was just booked by another user. Please select another seat.`);
          setSelectedSeat('');
          return;
        }
      }

      const data = await api.book({
        scheduleId: id,
        seatNumber: isLocalBus ? 'N/A' : selectedSeat,
        passengerName: passenger.name.trim(),
        passengerAge: Number(passenger.age),
        passengerGender: passenger.gender,
      });

      if (!data?.success) {
        setError(data?.message || text.bookingFailed);
        return;
      }

      setTicket(data);
      setBooked(true);
      setShowSuccessModal(true);

      
      if (!isLocalBus && selectedSeat) {
        setBookedSeats((prev) => [...new Set([...prev, selectedSeat])]);
      }
    } catch (err) {
      console.error('Booking failed:', err);
      setError(text.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  const seats = [...Array(totalSeats)].map((_, i) => {
    const seatId = `${String.fromCharCode(65 + Math.floor(i/4))}${(i%4)+1}`;
    return {
      id: seatId,
      isBooked: bookedSeats.includes(seatId),
      isWaiting: waitingListSeats.includes(seatId)
    };
  });

  if (loadingSchedule) return <div className="loading-spinner">{text.loadingBooking}</div>;

  if (!busDetails) {
    return (
      <div className="booking-page">
        <div className="booking-card-main">
          <h2 className="booking-title">{text.unableToLoad}</h2>
          <p className="booking-inline-error">{error || text.scheduleNotFound}</p>
          <button className="confirm-btn" onClick={() => navigate('/')}>{text.backToSearch}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <AnimatePresence>
        {showSuccessModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="success-modal"
            >
              <div className="modal-icon-wrapper">
                <ShieldCheck className="modal-success-icon" />
              </div>
              <h3 className="modal-title">{text.bookingSuccess}</h3>
              <p className="modal-text">{text.ticketConfirmed}</p>
              <div className="modal-actions">
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="modal-btn-primary"
                >
                  {text.viewTicket}
                </button>
                <button 
                  onClick={() => navigate('/my-bookings')}
                  className="modal-btn-secondary"
                >
                  {text.goBookings}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!booked ? (
        <div className="booking-card-main">
          <div className="booking-header-info">
            <h2 className="booking-title">{text.completeBooking}</h2>
            <div className="bus-summary-mini">
              <span className="mini-operator">{busDetails.operator}</span>
              <span className="mini-route">{busDetails.route}</span>
            </div>
          </div>
          
          <div className="booking-grid">
            <div className="seat-selection-section">
              {!isLocalBus ? (
                <>
                  <div className="section-header-flex">
                    <h3 className="section-label">{text.selectSeat}</h3>
                    <div className="seat-legend">
                      <div className="legend-item"><span className="dot available"></span> {text.available}</div>
                      <div className="legend-item"><span className="dot booked"></span> {text.booked}</div>
                      <div className="legend-item"><span className="dot waiting"></span> {text.waiting}</div>
                    </div>
                  </div>
                  <div className="seat-grid">
                    {seats.map((seat) => (
                      <button 
                        key={seat.id}
                        disabled={seat.isBooked}
                        onClick={() => handleSeatSelect(seat)}
                        className={`seat-item ${selectedSeat === seat.id ? 'selected' : ''} ${seat.isBooked ? 'booked' : ''} ${seat.isWaiting ? 'waiting-list' : ''}`}
                      >
                        {seat.id}
                      </button>
                    ))}
                  </div>
                  <p className="seat-inline-note">{loadingSeats ? text.refreshSeats : seatMessage}</p>
                </>
              ) : (
                <div className="local-bus-note">{text.localDetected}</div>
              )}

              <div className="passenger-details-form">
                <h3 className="section-label">{text.passengerDetails}</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="input-label">{text.fullName}</label>
                    <input 
                      type="text" 
                      name="name"
                      value={passenger.name}
                      onChange={handleInputChange}
                      placeholder="Enter passenger name"
                      className="form-input"
                    />
                  </div>
                  <div className="form-row-flex">
                    <div className="form-group flex-1">
                      <label className="input-label">{text.age}</label>
                      <input 
                        type="number" 
                        name="age"
                        value={passenger.age}
                        onChange={handleInputChange}
                        placeholder="Age"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label className="input-label">{text.gender}</label>
                      <select 
                        name="gender"
                        value={passenger.gender}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="summary-section">
              <h3 className="summary-title">{text.paymentSummary}</h3>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="booking-error-msg"
                >
                  {error}
                </motion.div>
              )}
              <div className="summary-list">
                {!isLocalBus && (
                  <div className="summary-item">
                    <span className="summary-label">{text.seatNumber}</span>
                    <span className="summary-value">{selectedSeat || text.notSelected}</span>
                  </div>
                )}
                <div className="summary-item">
                  <span className="summary-label">{text.baseFare}</span>
                  <span className="summary-value">₹{baseFare}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">{text.serviceFee}</span>
                  <span className="summary-value">₹{serviceFee}</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-item total">
                  <span className="summary-label">{text.totalAmount}</span>
                  <span className="summary-value total-price">₹{totalAmount}</span>
                </div>
              </div>
              
              <div className="payment-methods-section">
                <h4 className="payment-methods-title">Select Payment Method</h4>
                <div className="payment-methods-grid">
                  <button 
                    className={`payment-method-item ${paymentMethod === 'tnpay' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('tnpay')}
                  >
                    <div className="method-dot"></div>
                    <span className="method-name">TN-Pay</span>
                  </button>
                  <button 
                    className={`payment-method-item ${paymentMethod === 'gpay' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('gpay')}
                  >
                    <div className="method-dot"></div>
                    <span className="method-name">GPay</span>
                  </button>
                  <button 
                    className={`payment-method-item ${paymentMethod === 'paytm' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('paytm')}
                  >
                    <div className="method-dot"></div>
                    <span className="method-name">Paytm</span>
                  </button>
                </div>
              </div>

              <div className="payment-notice">
                <CreditCard size={16} />
                <span>Secure payment via {paymentMethod === 'tnpay' ? 'TN-Pay' : paymentMethod === 'gpay' ? 'Google Pay' : 'Paytm'} Gateway</span>
              </div>

              <button 
                onClick={handleBook}
                disabled={loading || (loadingSeats && !isLocalBus) || (!isLocalBus && !selectedSeat)}
                className="confirm-btn"
              >
                {loading ? 'Processing...' : (
                  <span className="btn-content">
                    Confirm & Pay ₹{totalAmount} <ArrowRight size={18} />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="confirmation-card"
        >
          <div className="confirmation-header">
            <div className="success-icon-wrapper">
              <ShieldCheck className="success-icon" />
            </div>
            <h2 className="confirmation-title">Booking Confirmed!</h2>
            <p className="confirmation-text">Your digital ticket is ready. Please show this QR code during boarding.</p>
          </div>

          <div className="ticket-status-strip">
            <span className="ticket-type-pill">Digital Ticket</span>
            <span className="ticket-status-pill">Status: Confirmed</span>
          </div>

          <div className="ticket-highlights-grid">
            <div className="highlight-item">
              <span className="highlight-label">Route</span>
              <span className="highlight-value">{busDetails.source} {'->'} {busDetails.destination}</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-label">Journey Time</span>
              <span className="highlight-value">{formatTime(busDetails.departureTime)} - {formatTime(busDetails.arrivalTime)}</span>
              {bookingDayOffset > 0 && (
                <span className="time-day-note">{text.nextDayArrival}</span>
              )}
            </div>
            <div className="highlight-item">
              <span className="highlight-label">Seat</span>
              <span className="highlight-value">{isLocalBus ? 'Allocated at boarding' : selectedSeat}</span>
            </div>
            <div className="highlight-item highlight-item-accent">
              <span className="highlight-label">Amount Paid</span>
              <span className="highlight-value">₹{totalAmount}</span>
            </div>
          </div>
          
          <div className="qr-container">
            <QRCodeSVG value={ticket.qr_code} size={200} />
          </div>

          <div className="ticket-divider"></div>
          
          <div className="ticket-info">
            <div className="info-group">
              <h4 className="info-group-title">Passenger Details</h4>
              <div className="info-row">
                <span className="info-label">Passenger</span>
                <span className="info-value">{passenger.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Age / Gender</span>
                <span className="info-value">
                  {passenger.age} yrs / {passenger.gender ? (passenger.gender.charAt(0).toUpperCase() + passenger.gender.slice(1)) : 'N/A'}
                </span>
              </div>
            </div>

            <div className="info-group">
              <h4 className="info-group-title">Bus Details</h4>
              <div className="info-row">
                <span className="info-label">Operator</span>
                <span className="info-value">{busDetails.operator}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Bus</span>
                <span className="info-value">{busDetails.busType} ({busDetails.busNumber})</span>
              </div>
              <div className="info-row">
                <span className="info-label">Distance</span>
                <span className="info-value">{Math.round(Number(busDetails.distanceKm || 0))} km</span>
              </div>
            </div>

            <div className="info-group info-group-full">
              <h4 className="info-group-title">Ticket Details</h4>
              <div className="info-row">
                <span className="info-label">Ticket ID</span>
                <span className="info-value mono">{ticket.qr_code}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Booking Reference</span>
                <span className="info-value">BK-{ticket.bookingId}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Booked On</span>
                <span className="info-value">{formatDateTime(new Date().toISOString())}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Boarding Time</span>
                <span className="info-value">{formatTime(busDetails.departureTime)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Arrival Time</span>
                <span className="info-value with-note">
                  <span>{formatTime(busDetails.arrivalTime)}</span>
                  {bookingDayOffset > 0 && <span className="time-day-note">{text.nextDayArrival}</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="confirmation-actions">
            <Link to="/my-bookings" className="view-bookings-link">
              View My Bookings
            </Link>
            <Link to="/" className="back-home-link">
              Back to Home
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
};
