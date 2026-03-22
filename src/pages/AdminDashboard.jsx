import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import '../styles/Admin.css';
import { useLanguage } from '../context/LanguageContext';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [formData, setFormData] = useState({
    bus_number: '',
    bus_type: '',
    operator: '',
    capacity: '40',
    source: '',
    destination: '',
    distance_km: '0',
    departure_time: '',
    arrival_time: '',
    fare: '0',
    stops: '',
  });
  const { language } = useLanguage();

  const text = language === 'ta'
    ? {
        title: 'நிர்வாக கட்டுப்பாட்டு பலகை',
        authorized: 'அங்கீகரிக்கப்பட்ட அணுகல்',
        totalBuses: 'மொத்த பஸ்கள்',
        totalBookings: 'மொத்த முன்பதிவுகள்',
        totalRevenue: 'மொத்த வருமானம்',
        inventory: 'இன்வெண்டரி மேலாண்மை',
        addBus: 'புதிய பஸ் சேர்க்க',
        busNumber: 'பஸ் எண்',
        type: 'வகை',
        operator: 'ஆபரேட்டர்',
        status: 'நிலை',
        actions: 'செயல்கள்',
        edit: 'திருத்து',
        routeDetails: 'பாதை விவரங்கள்',
        departure: 'புறப்படும் இடம்',
        destination: 'இறங்கும் இடம்',
        distance: 'தூரம் (கி.மீ)',
        departureTime: 'புறப்படும் நேரம்',
        arrivalTime: 'சேரும் நேரம்',
        fare: 'கட்டணம் (₹)',
        betweenStops: 'இடை நிறுத்தங்கள்',
        betweenStopsHint: 'ஒரு வரிக்கு ஒரு நிறுத்தம். நேரத்துடன் சேர்க்க வேண்டுமெனில்: Stop Name|HH:MM',
        saveBus: 'பஸ் சேமிக்க',
        latestSchedules: 'சமீபத்தில் சேர்க்கப்பட்ட அட்டவணைகள்',
        route: 'பாதை',
        timing: 'நேரம்',
        stops: 'நிறுத்தங்கள்',
        active: 'செயலில்',
        loading: 'ஏற்றப்படுகிறது...',
        addSuccess: 'பஸ் மற்றும் பாதை வெற்றிகரமாக சேர்க்கப்பட்டது.',
        addFailed: 'பஸ் சேர்க்க முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
      }
    : {
        title: 'Admin Control Panel',
        authorized: 'Authorized Access',
        totalBuses: 'Total Buses',
        totalBookings: 'Total Bookings',
        totalRevenue: 'Total Revenue',
        inventory: 'Inventory Management',
        addBus: 'Add New Bus',
        busNumber: 'Bus Number',
        type: 'Type',
        operator: 'Operator',
        status: 'Status',
        actions: 'Actions',
        edit: 'Edit',
        routeDetails: 'Route Details',
        departure: 'Departure',
        destination: 'Destination',
        distance: 'Distance (km)',
        departureTime: 'Departure Time',
        arrivalTime: 'Arrival Time',
        fare: 'Fare (₹)',
        betweenStops: 'Between Stops',
        betweenStopsHint: 'One stop per line. Add optional time as: Stop Name|HH:MM',
        saveBus: 'Save Bus',
        latestSchedules: 'Latest Added Schedules',
        route: 'Route',
        timing: 'Timing',
        stops: 'Stops',
        active: 'ACTIVE',
        loading: 'Loading...',
        addSuccess: 'Bus and route added successfully.',
        addFailed: 'Unable to add bus. Please try again.',
      };

  const loadStats = async () => {
    const response = await fetch('/api/admin/stats');
    const payload = await response.json();
    setStats(payload);
  };

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const response = await fetch('/api/admin/schedules?limit=15');
      const payload = await response.json();
      setSchedules(Array.isArray(payload) ? payload : []);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/admin/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: Number(formData.capacity),
          distance_km: Number(formData.distance_km),
          fare: Number(formData.fare),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || text.addFailed);
      }

      setFeedback({ type: 'success', message: text.addSuccess });
      setFormData((prev) => ({
        ...prev,
        source: '',
        destination: '',
        distance_km: '0',
        departure_time: '',
        arrival_time: '',
        fare: '0',
        stops: '',
      }));

      await Promise.all([loadStats(), loadSchedules()]);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || text.addFailed });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadSchedules();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">{text.title}</h2>
        <div className="auth-badge">
          <ShieldCheck className="badge-icon" /> {text.authorized}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-label">{text.totalBuses}</div>
          <div className="stats-value">{stats?.totalBuses?.count || 0}</div>
        </div>
        <div className="stats-card">
          <div className="stats-label">{text.totalBookings}</div>
          <div className="stats-value">{stats?.totalBookings?.count || 0}</div>
        </div>
        <div className="stats-card dark">
          <div className="stats-label accent">{text.totalRevenue}</div>
          <div className="stats-value">₹{stats?.revenue?.total || 0}</div>
        </div>
      </div>

      <div className="inventory-section">
        <div className="inventory-header">
          <h3 className="inventory-title">{text.inventory}</h3>
          <span className="add-bus-btn">{text.addBus}</span>
        </div>

        <form className="bus-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>{text.busNumber}</span>
              <input name="bus_number" value={formData.bus_number} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.type}</span>
              <input name="bus_type" value={formData.bus_type} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.operator}</span>
              <input name="operator" value={formData.operator} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>Capacity</span>
              <input type="number" min="1" name="capacity" value={formData.capacity} onChange={onInputChange} required />
            </label>
          </div>

          <h4 className="form-subtitle">{text.routeDetails}</h4>
          <div className="form-grid">
            <label className="form-field">
              <span>{text.departure}</span>
              <input name="source" value={formData.source} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.destination}</span>
              <input name="destination" value={formData.destination} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.distance}</span>
              <input type="number" min="0" step="0.1" name="distance_km" value={formData.distance_km} onChange={onInputChange} />
            </label>
            <label className="form-field">
              <span>{text.fare}</span>
              <input type="number" min="0" step="1" name="fare" value={formData.fare} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.departureTime}</span>
              <input type="time" name="departure_time" value={formData.departure_time} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.arrivalTime}</span>
              <input type="time" name="arrival_time" value={formData.arrival_time} onChange={onInputChange} required />
            </label>
          </div>

          <label className="form-field full-width">
            <span>{text.betweenStops}</span>
            <textarea
              name="stops"
              value={formData.stops}
              onChange={onInputChange}
              rows="4"
              placeholder={text.betweenStopsHint}
            />
            <small className="field-hint">{text.betweenStopsHint}</small>
          </label>

          <div className="form-actions">
            <button className="save-btn" type="submit" disabled={submitting}>
              {submitting ? text.loading : text.saveBus}
            </button>
            {feedback.message && (
              <p className={`form-feedback ${feedback.type === 'success' ? 'success' : 'error'}`}>
                {feedback.message}
              </p>
            )}
          </div>
        </form>

        <div className="list-heading-row">
          <h4 className="list-heading">{text.latestSchedules}</h4>
        </div>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{text.busNumber}</th>
                <th>{text.route}</th>
                <th>{text.timing}</th>
                <th>{text.operator}</th>
                <th>{text.stops}</th>
                <th>{text.status}</th>
              </tr>
            </thead>
            <tbody>
              {loadingSchedules ? (
                <tr className="table-row">
                  <td colSpan="6" className="text-muted">{text.loading}</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr className="table-row">
                  <td colSpan="6" className="text-muted">No schedules found.</td>
                </tr>
              ) : (
                schedules.map((item) => (
                  <tr className="table-row" key={item.id}>
                    <td>
                      <div className="mono-bold">{item.bus_number}</div>
                      <div className="text-muted">{item.bus_type}</div>
                    </td>
                    <td className="font-medium">{item.source} → {item.destination}</td>
                    <td className="text-muted">{item.departure_time} - {item.arrival_time}</td>
                    <td className="font-medium">{item.operator}</td>
                    <td className="text-muted">{item.stops_count ?? '-'}</td>
                    <td>
                      <span className="status-badge">{text.active}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
