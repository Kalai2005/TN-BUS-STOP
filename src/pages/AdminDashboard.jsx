import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, Edit } from 'lucide-react';
import '../styles/Admin.css';
import { useLanguage } from '../context/LanguageContext';

export const AdminDashboard = () => {
  const busTypeOptions = ['TNSTC', 'KSRTC', 'SETC', 'Local buses'];
  const emptyStop = { stop_name: '', stop_time: '', segment_price: '0' };
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [editingId, setEditingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stopRows, setStopRows] = useState([{ ...emptyStop }]);
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
    between_stop_rate: '0',
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
        delete: 'நீக்கு',
        routeDetails: 'பாதை விவரங்கள்',
        departure: 'புறப்படும் இடம்',
        destination: 'இறங்கும் இடம்',
        distance: 'தூரம் (கி.மீ)',
        departureTime: 'புறப்படும் நேரம்',
        arrivalTime: 'சேரும் நேரம்',
        fare: 'கட்டணம் (₹)',
        betweenStopRate: 'இடைநிறுத்த கட்டணம் (₹/நிறுத்தம்)',
        betweenStops: 'இடை நிறுத்தங்கள்',
        stopName: 'நிறுத்தம்',
        stopTime: 'நேரம்',
        stopPrice: 'விலை (₹)',
        addStop: 'நிறுத்தம் சேர்',
        removeStop: 'நீக்கு',
        betweenStopsHint: 'ஒரு வரிக்கு ஒரு நிறுத்தம். நேரத்துடன் சேர்க்க வேண்டுமெனில்: Stop Name|HH:MM',
        saveBus: 'பஸ் சேமிக்க',
        updateBus: 'பஸ் புதுப்பிக்க',
        latestSchedules: 'சமீபத்தில் சேர்க்கப்பட்ட அட்டவணைகள்',
        route: 'பாதை',
        timing: 'நேரம்',
        stops: 'நிறுத்தங்கள்',
        active: 'செயலில்',
        loading: 'ஏற்றப்படுகிறது...',
        addSuccess: 'பஸ் மற்றும் பாதை வெற்றிகரமாக சேர்க்கப்பட்டது.',
        updateSuccess: 'பஸ் வெற்றிகரமாக புதுப்பிக்கப்பட்டது.',
        deleteSuccess: 'பஸ் வெற்றிகரமாக நீக்கப்பட்டது.',
        addFailed: 'பஸ் சேர்க்க முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
        deleteFailed: 'பஸ் நீக்க முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
        confirmDelete: 'நீக்கலை உறுதிப்படுத்த உறுதிபடுத்தவும்',
        editSchedule: 'அட்டவணையை திருத்து',
        close: 'மூடு',
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
        delete: 'Delete',
        routeDetails: 'Route Details',
        departure: 'Departure',
        destination: 'Destination',
        distance: 'Distance (km)',
        departureTime: 'Departure Time',
        arrivalTime: 'Arrival Time',
        fare: 'Fare (₹)',
        betweenStopRate: 'Between Stop Rate (₹/segment)',
        betweenStops: 'Between Stops',
        stopName: 'Stop Name',
        stopTime: 'Time',
        stopPrice: 'Price (₹)',
        addStop: 'Add Stop',
        removeStop: 'Remove',
        betweenStopsHint: 'One stop per line. Add optional time as: Stop Name|HH:MM',
        saveBus: 'Save Bus',
        updateBus: 'Update Bus',
        latestSchedules: 'Latest Added Schedules',
        route: 'Route',
        timing: 'Timing',
        stops: 'Stops',
        active: 'ACTIVE',
        loading: 'Loading...',
        addSuccess: 'Bus and route added successfully.',
        updateSuccess: 'Bus updated successfully.',
        deleteSuccess: 'Bus deleted successfully.',
        addFailed: 'Unable to add bus. Please try again.',
        deleteFailed: 'Unable to delete bus. Please try again.',
        confirmDelete: 'Confirm deletion',
        editSchedule: 'Edit Schedule',
        close: 'Close',
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

  const checkDatabaseDEBUG = async () => {
    console.log(`[DEBUG] === Checking what schedules exist in database ===`);
    try {
      const response = await fetch('/api/admin/debug/schedules');
      const data = await response.json();
      console.log(`[DEBUG] Response:`, data);
      alert(`Available schedules in DB: ${data?.ids?.join(', ') || 'None'}`);
    } catch (error) {
      console.error(`[DEBUG] Error checking database:`, error);
      alert(`Error checking database: ${error.message}`);
    }
  };

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
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
      between_stop_rate: '0',
      stops: '',
    });
    setStopRows([{ ...emptyStop }]);
    setEditingId(null);
    setShowEditModal(false);
  };

  const onStopRowChange = (index, field, value) => {
    setStopRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };

  const addStopRow = () => {
    setStopRows((prev) => [...prev, { ...emptyStop }]);
  };

  const removeStopRow = (index) => {
    setStopRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [{ ...emptyStop }];
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `/api/admin/schedules/${editingId}` : '/api/admin/buses';
      const successMsg = editingId ? text.updateSuccess : text.addSuccess;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          stops: stopRows
            .map((row) => ({
              stop_name: row.stop_name.trim(),
              stop_time: row.stop_time,
              segment_price: Number(row.segment_price || 0),
            }))
            .filter((row) => row.stop_name),
          capacity: Number(formData.capacity),
          distance_km: Number(formData.distance_km),
          fare: Number(formData.fare),
          between_stop_rate: Number(formData.between_stop_rate),
        }),
      });

      let payload = {};
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          payload = await response.json();
        }
      } catch (parseErr) {
        console.error('Failed to parse response:', parseErr);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || (editingId ? text.deleteFailed : text.addFailed));
      }

      setFeedback({ type: 'success', message: successMsg });
      resetForm();
      await Promise.all([loadStats(), loadSchedules()]);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || (editingId ? text.deleteFailed : text.addFailed) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSchedule = (schedule) => {
    setFormData({
      bus_number: schedule.bus_number || '',
      bus_type: schedule.bus_type || '',
      operator: schedule.operator || '',
      capacity: String(schedule.capacity || 40),
      source: schedule.source || '',
      destination: schedule.destination || '',
      distance_km: String(schedule.distance_km || 0),
      departure_time: schedule.departure_time || '',
      arrival_time: schedule.arrival_time || '',
      fare: String(schedule.fare || 0),
      between_stop_rate: String(schedule.between_stop_rate || 0),
      stops: '',
    });
    setStopRows([{ ...emptyStop }]);
    setEditingId(schedule.id);
    setShowEditModal(true);
  };

  const handleDeleteSchedule = async (scheduleId, busNumber) => {
    if (!window.confirm(`${text.confirmDelete}: ${busNumber}?`)) {
      return;
    }

    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const url = `/api/admin/schedules/${scheduleId}`;
      console.log(`[Delete] === STARTING DELETE ===`);
      console.log(`[Delete] Schedule ID:`, scheduleId, `(type: ${typeof scheduleId})`);
      console.log(`[Delete] Bus Number:`, busNumber);
      console.log(`[Delete] Full URL:`, url);
      console.log(`[Delete] Window location:`, window.location.href);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[Delete] === RESPONSE RECEIVED ===`);
      console.log(`[Delete] Response status: ${response.status} ${response.statusText}`);
      console.log(`[Delete] Response OK: ${response.ok}`);
      console.log(`[Delete] Response headers:`, {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });

      // Always try to parse JSON
      let payload = {};
      const responseText = await response.text();
      console.log(`[Delete] Raw response length: ${responseText.length} characters`);
      console.log(`[Delete] Raw response text:`, responseText);

      if (responseText) {
        try {
          payload = JSON.parse(responseText);
          console.log(`[Delete] Successfully parsed JSON:`, payload);
        } catch (parseErr) {
          console.error(`[Delete] JSON parse error:`, parseErr.message);
          console.error(`[Delete] Failed to parse as JSON: "${responseText}"`);
        }
      } else {
        console.warn(`[Delete] Response body is EMPTY!`);
      }

      // Extract error message
      let errorMessage = payload.message || `HTTP ${response.status}`;
      console.log(`[Delete] Final error message: "${errorMessage}"`);

      if (!response.ok || !payload.success) {
        throw new Error(errorMessage);
      }

      setFeedback({ type: 'success', message: text.deleteSuccess });
      await Promise.all([loadStats(), loadSchedules()]);
    } catch (error) {
      console.error(`[Delete] ❌ Error caught:`, error.message);
      setFeedback({ type: 'error', message: error.message || text.deleteFailed });
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
          <button 
            type="button"
            onClick={checkDatabaseDEBUG}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: '#666',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔍 Check DB
          </button>
        </div>

        <form className="bus-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>{text.busNumber}</span>
              <input name="bus_number" value={formData.bus_number} onChange={onInputChange} required />
            </label>
            <label className="form-field">
              <span>{text.type}</span>
              <select name="bus_type" value={formData.bus_type} onChange={onInputChange} required>
                <option value="" disabled>Select bus type</option>
                {busTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
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
              <span>{text.betweenStopRate}</span>
              <input
                type="number"
                min="0"
                step="0.5"
                name="between_stop_rate"
                value={formData.between_stop_rate}
                onChange={onInputChange}
              />
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
            <div className="stops-builder">
              {stopRows.map((stopRow, index) => (
                <div key={`stop-row-${index}`} className="form-grid">
                  <label className="form-field">
                    <span>{text.stopName}</span>
                    <input
                      value={stopRow.stop_name}
                      onChange={(event) => onStopRowChange(index, 'stop_name', event.target.value)}
                      placeholder="Stop"
                    />
                  </label>
                  <label className="form-field">
                    <span>{text.stopTime}</span>
                    <input
                      type="time"
                      value={stopRow.stop_time}
                      onChange={(event) => onStopRowChange(index, 'stop_time', event.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>{text.stopPrice}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={stopRow.segment_price}
                      onChange={(event) => onStopRowChange(index, 'segment_price', event.target.value)}
                    />
                  </label>
                  <div className="form-field">
                    <span>&nbsp;</span>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => removeStopRow(index)}
                      disabled={submitting}
                    >
                      {text.removeStop}
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="save-btn" onClick={addStopRow} disabled={submitting}>
                {text.addStop}
              </button>
            </div>
            <small className="field-hint">{text.betweenStopsHint}</small>
          </label>

          <div className="form-actions">
            <button className="save-btn" type="submit" disabled={submitting}>
              {submitting ? text.loading : (editingId ? text.updateBus : text.saveBus)}
            </button>
            {editingId && (
              <button className="cancel-btn" type="button" onClick={resetForm} disabled={submitting}>
                {text.close}
              </button>
            )}
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
                <th>{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loadingSchedules ? (
                <tr className="table-row">
                  <td colSpan="7" className="text-muted">{text.loading}</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr className="table-row">
                  <td colSpan="7" className="text-muted">No schedules found.</td>
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
                    <td className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditSchedule(item)}
                        title={text.edit}
                        disabled={submitting}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteSchedule(item.id, item.bus_number)}
                        title={text.delete}
                        disabled={submitting}
                      >
                        <Trash2 size={16} />
                      </button>
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
