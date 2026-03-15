import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Bus, Clock, Info, ShieldCheck, Map as MapIcon, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Home.css';
import { useLanguage } from '../context/LanguageContext';

export const Home = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const text = language === 'ta'
    ? {
        localModeError: 'உள்ளூர் பஸ் தேடல் செயலில் உள்ளது: உங்கள் உள்ளூர் தொடக்கம் மற்றும் இலக்கை உள்ளிடவும்.',
        samePlaceError: 'தொடக்கம் மற்றும் இலக்கு ஒரே மாதிரி இருக்கக்கூடாது',
      destinationRequired: 'இருக்கும் பஸ்களை காண இலக்கை தேர்வு செய்யவும்.',
        heroTop: 'தமிழ்நாடு முழுவதும் பயணம் செய்யுங்கள்',
        heroBottom: 'நம்பிக்கையுடன்',
        accentState: 'தமிழ்நாடு',
        heroSubtitle: 'பஸ்களை தேடுங்கள், முன்பதிவு செய்யுங்கள், மற்றும் நேரடியாக கண்காணிக்கவும்.',
        from: 'இருந்து',
        to: 'வரை',
        date: 'தேதி',
        sourcePlaceholder: 'தொடக்க நகரம்',
        destinationPlaceholder: 'இலக்கு நகரம்',
        noCities: 'நகரங்கள் கிடைக்கவில்லை',
        searching: 'தேடுகிறது...',
        searchBuses: 'பஸ்களை தேடுங்கள்',
        showDestinationBuses: 'இலக்குக்கான பஸ்கள்',
        aiTip: 'AI பயண குறிப்பு',
        busesFound: 'பஸ்கள் கண்டுபிடிக்கப்பட்டன',
        destinationViewPrefix: 'இலக்கிற்கு கிடைக்கும் பஸ்கள்',
        availability: 'நேரடி கிடைக்கும் நிலை',
        nextDayArrival: 'அடுத்த நாள் வருகை',
        localBus: 'உள்ளூர் பஸ்',
        intercity: 'இடநகர்',
        regional: 'பிராந்திய',
        setSource: 'தொடக்கமாக அமைக்கவும்',
        setDestination: 'இலக்காக அமைக்கவும்',
        selectSeats: 'இருக்கைகளை தேர்வு செய்',
        noBuses: 'பஸ்கள் இல்லை',
        tryDifferent: 'வேறு நகரம் அல்லது தேதியை முயற்சிக்கவும்.',
        verified: 'சரிபார்க்கப்பட்ட ஆபரேட்டர்கள்',
        verifiedDesc: 'அனைத்து பஸ்களும் பாதுகாப்பு தரத்திற்கு சரிபார்க்கப்பட்டவை.',
        liveTracking: 'நேரடி கண்காணிப்பு',
        liveTrackingDesc: 'உங்கள் பஸ் எங்கு உள்ளது என்பதைத் துல்லியமாக அறியலாம்.',
        digitalTickets: 'டிஜிட்டல் டிக்கெட்டுகள்',
        digitalTicketsDesc: 'காகிதம் தேவையில்லை. QR குறியீட்டை காட்டுங்கள்.',
      }
    : {
        localModeError: 'Local Bus Search Active: Please enter your local source and destination.',
        samePlaceError: 'Source and Destination cannot be same',
      destinationRequired: 'Please select a destination to view available buses.',
        heroTop: 'Travel Across',
        heroBottom: 'with Confidence',
        accentState: 'Tamil Nadu',
        heroSubtitle: "Search, book, and track buses in real-time. The digital backbone of Tamil Nadu's public transport.",
        from: 'From',
        to: 'To',
        date: 'Date',
        sourcePlaceholder: 'Source City',
        destinationPlaceholder: 'Destination City',
        noCities: 'No cities found',
        searching: 'Searching...',
        searchBuses: 'Search Buses',
        showDestinationBuses: 'Buses To Destination',
        aiTip: 'AI Travel Tip',
        busesFound: 'Buses Found for',
        destinationViewPrefix: 'Available buses to',
        availability: 'Real-time availability',
        nextDayArrival: 'Next day arrival',
        localBus: 'Local Bus',
        intercity: 'Intercity',
        regional: 'Regional',
        setSource: 'Set as source',
        setDestination: 'Set as destination',
        selectSeats: 'Select Seats',
        noBuses: 'No buses found',
        tryDifferent: 'Try searching for different cities or dates.',
        verified: 'Verified Operators',
        verifiedDesc: 'All buses are inspected for safety and quality standards.',
        liveTracking: 'Live Tracking',
        liveTrackingDesc: 'Know exactly where your bus is with system-assisted tracking.',
        digitalTickets: 'Digital Tickets',
        digitalTicketsDesc: "No more paper. Show your QR code to the conductor and you're set.",
      };
  const [locations, setLocations] = useState([]);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');

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

  const getTimeInMinutes = (value) => {
    if (!value) return null;

    const [hours, minutes] = String(value).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return (hours * 60) + minutes;
  };

  const getJourneyMeta = (departure, arrival) => {
    const departureMinutes = getTimeInMinutes(departure);
    const arrivalMinutesRaw = getTimeInMinutes(arrival);

    if (departureMinutes === null || arrivalMinutesRaw === null) {
      return { durationLabel: 'N/A', dayOffset: 0 };
    }

    let arrivalMinutes = arrivalMinutesRaw;
    let dayOffset = 0;

    while (arrivalMinutes < departureMinutes) {
      arrivalMinutes += 24 * 60;
      dayOffset += 1;
    }

    const durationMinutes = arrivalMinutes - departureMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return {
      durationLabel: `${hours}h ${minutes}m`,
      dayOffset,
    };
  };

  React.useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/locations');
        const data = await res.json();
        setLocations(data);
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    };
    fetchLocations();

    
    const params = new URLSearchParams(location.search);
    if (params.get('type') === 'local') {
      setError(text.localModeError);
    }
  }, [location.search, text.localModeError]);

  const runSearch = async ({ sourceValue, destinationValue }) => {
    if (!destinationValue.trim()) {
      setError(text.destinationRequired);
      return;
    }

    setError('');

    if (sourceValue.trim() && sourceValue === destinationValue) {
      setError(text.samePlaceError);
      return;
    }

    setLoading(true);
    setSearched(false);
    setAdvice('');

    try {
      const res = await fetch(`/api/search?source=${encodeURIComponent(sourceValue)}&destination=${encodeURIComponent(destinationValue)}`);
      const data = await res.json();
      setResults(data);
      setSearched(true);
      
      // Get AI Advice
      const adviceRes = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceValue || 'Any', destination: destinationValue })
      });
      const adviceData = await adviceRes.json();
      setAdvice(adviceData.advice);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch({ sourceValue: source, destinationValue: destination });
  };

  const handleDestinationAvailability = async () => {
    await runSearch({ sourceValue: '', destinationValue: destination });
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-gradient"></div>
        <div className="hero-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hero-text"
          >
            <h1 className="hero-title">
              {text.heroTop} <span className="accent-text">{text.accentState}</span> <br /> {text.heroBottom}
            </h1>
            <p className="hero-subtitle">
              {text.heroSubtitle}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="search-card"
          >
            <form onSubmit={handleSearch} className="search-form">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="search-error-msg"
                >
                  {error}
                </motion.div>
              )}
              <div className="form-field">
                <label className="field-label">{text.from}</label>
                <div className="input-wrapper">
                  <MapPin className="field-icon" />
                  <input 
                    type="text"
                    placeholder={text.sourcePlaceholder}
                    className="field-input"
                    value={source}
                    onFocus={() => {
                      setShowSourceSuggestions(true);
                      // Refresh suggestions on focus
                      const filtered = locations.filter(
                        loc =>
                          loc.toLowerCase().includes(source.toLowerCase()) &&
                          loc !== destination
                      );
                      setSourceSuggestions(filtered);
                    }}
                    onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 200)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSource(value);
                      const filtered = locations.filter(
                        loc =>
                          loc.toLowerCase().includes(value.toLowerCase()) &&
                          loc !== destination
                      );
                      setSourceSuggestions(filtered);
                    }}
                    required
                  />
                </div>

                {showSourceSuggestions && (source || locations.length > 0) && (
                  <ul className="suggestion-list">
                    {(source ? sourceSuggestions : locations).map((item, index) => (
                      <li
                        key={index}
                        onMouseDown={() => {
                          setSource(item);
                          setShowSourceSuggestions(false);
                        }}
                      >
                        <MapPin className="suggestion-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {source && sourceSuggestions.length === 0 && (
                      <li className="no-suggestion">{text.noCities}</li>
                    )}
                  </ul>
                )}
              </div>
              <div className="form-field">
                <label className="field-label">{text.to}</label>
                <div className="input-wrapper">
                  <MapPin className="field-icon" />
                  <input 
                    type="text"
                    placeholder={text.destinationPlaceholder}
                    className="field-input"
                    value={destination}
                    onFocus={() => {
                      setShowDestinationSuggestions(true);
                      // Refresh suggestions on focus
                      const filtered = locations.filter(
                        loc =>
                          loc.toLowerCase().includes(destination.toLowerCase()) &&
                          loc !== source
                      );
                      setDestinationSuggestions(filtered);
                    }}
                    onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDestination(value);
                      const filtered = locations.filter(
                        loc =>
                          loc.toLowerCase().includes(value.toLowerCase()) &&
                          loc !== source
                      );
                      setDestinationSuggestions(filtered);
                    }}
                    required
                  />
                </div>

                {showDestinationSuggestions && (destination || locations.length > 0) && (
                  <ul className="suggestion-list">
                    {(destination ? destinationSuggestions : locations).map((item, index) => (
                      <li
                        key={index}
                        onMouseDown={() => {
                          setDestination(item);
                          setShowDestinationSuggestions(false);
                        }}
                      >
                        <MapPin className="suggestion-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {destination && destinationSuggestions.length === 0 && (
                      <li className="no-suggestion">{text.noCities}</li>
                    )}
                  </ul>
                )}
              </div>
              <div className="form-field">
                <label className="field-label">{text.date}</label>
                <div className="input-wrapper">
                  <Calendar className="field-icon" />
                  <input 
                    type="date" 
                    className="field-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-action">
                <button 
                  type="submit"
                  disabled={loading}
                  className="search-btn"
                >
                  {loading ? text.searching : <><Search className="btn-icon" /> <span>{text.searchBuses}</span></>}
                </button>
                <button
                  type="button"
                  disabled={loading || !destination.trim()}
                  className="destination-buses-btn"
                  onClick={handleDestinationAvailability}
                >
                  <Bus className="btn-icon" />
                  <span>{text.showDestinationBuses}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="results-section">
        <div className="results-container">
          {searched && (
            <div className="results-header-group">
              {advice && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="advice-banner"
                >
                  <div className="advice-icon-wrapper">
                    <Info className="advice-icon" />
                  </div>
                  <div>
                    <h4 className="advice-title">{text.aiTip}</h4>
                    <p className="advice-text">{advice}</p>
                  </div>
                </motion.div>
              )}

              <div className="results-header">
                <h2 className="results-title">
                  {source.trim()
                    ? `${results.length} ${text.busesFound} ${source} to ${destination}`
                    : `${results.length} ${text.destinationViewPrefix} ${destination}`}
                </h2>
                <div className="results-meta">
                  <Clock className="meta-icon" />
                  {text.availability}
                </div>
              </div>
            </div>
          )}

          <div className="bus-list">
            <AnimatePresence mode="popLayout">
              {results.map((bus, idx) => {
                const journeyMeta = getJourneyMeta(bus.departure_time, bus.arrival_time);

                return (
                  <motion.div 
                    key={bus.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bus-card"
                  >
                    <div className="bus-card-content">
                      <div className="bus-info">
                          <div className="bus-header">
                            <div className="operator-group">
                              <span className="operator-badge">
                                {bus.operator}
                              </span>
                              {bus.distance_km < 100 ? (
                                <span className="local-badge">{text.localBus}</span>
                              ) : (
                                <span className="long-distance-badge">
                                  {bus.operator === 'SETC' ? text.intercity : text.regional}
                                </span>
                              )}
                            </div>
                            <span className="bus-number">{bus.bus_number}</span>
                          </div>
                          <div className="bus-route-info">
                            <div 
                              className="route-stop clickable-stop"
                              onClick={() => setSource(bus.source)}
                              title={text.setSource}
                            >
                              <div className="stop-time">{formatTime(bus.departure_time)}</div>
                              <div className="stop-name">{bus.source}</div>
                            </div>
                            <div className="route-visual">
                              <div className="visual-line">
                                <div className="visual-icon-wrapper">
                                  <Bus className="visual-icon" />
                                </div>
                              </div>
                              <div className="visual-duration">{journeyMeta.durationLabel}</div>
                              <div className="visual-distance">{bus.distance_km} km</div>
                            </div>
                            <div 
                              className="route-stop text-right clickable-stop"
                              onClick={() => setDestination(bus.destination)}
                              title={text.setDestination}
                            >
                              <div className="stop-time">{formatTime(bus.arrival_time)}</div>
                              {journeyMeta.dayOffset > 0 && (
                                <div className="stop-day-note">{text.nextDayArrival}</div>
                              )}
                              <div className="stop-name">{bus.destination}</div>
                            </div>
                          </div>
                      </div>
                      
                      <div className="bus-actions">
                        <div className="bus-type">{bus.bus_type}</div>
                        <div className="bus-fare">₹{bus.fare}</div>
                        <Link 
                          to={`/book/${bus.id}`}
                          className="select-btn"
                        >
                          {text.selectSeats}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {searched && results.length === 0 && (
              <div className="no-results">
                <Bus className="no-results-icon" />
                <h3 className="no-results-title">{text.noBuses}</h3>
                <p className="no-results-text">{text.tryDifferent}</p>
              </div>
            )}
            
            {!searched && (
              <div className="features-grid">
                <div className="feature-card feature-emerald">
                  <ShieldCheck className="feature-icon" />
                  <h3 className="feature-title">{text.verified}</h3>
                  <p className="feature-text">{text.verifiedDesc}</p>
                </div>
                <div className="feature-card feature-dark">
                  <MapIcon className="feature-icon feature-accent" />
                  <h3 className="feature-title">{text.liveTracking}</h3>
                  <p className="feature-text">{text.liveTrackingDesc}</p>
                </div>
                <div className="feature-card feature-light">
                  <QrCode className="feature-icon" />
                  <h3 className="feature-title">{text.digitalTickets}</h3>
                  <p className="feature-text">{text.digitalTicketsDesc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
};
