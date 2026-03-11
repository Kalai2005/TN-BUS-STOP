import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import '../styles/Admin.css';
import { useLanguage } from '../context/LanguageContext';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
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
      };

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(setStats);
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
          <button className="add-bus-btn">{text.addBus}</button>
        </div>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{text.busNumber}</th>
                <th>{text.type}</th>
                <th>{text.operator}</th>
                <th>{text.status}</th>
                <th>{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="mono-bold">TN-01-AN-1234</td>
                <td className="text-muted">AC Sleeper</td>
                <td className="font-medium">SETC</td>
                <td>
                  <span className="status-badge">ACTIVE</span>
                </td>
                <td>
                  <button className="edit-btn">{text.edit}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
