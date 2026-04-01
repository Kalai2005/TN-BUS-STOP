import React, { useState } from 'react';
import { ScanLine, Printer, Ticket, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import '../styles/ConductorScan.css';

const fallback = (value, empty = 'N/A') => {
  const text = String(value || '').trim();
  return text || empty;
};

const buildPrintableHtml = (ticket) => {
  const issuedDate = ticket.physical_issued_at
    ? new Date(ticket.physical_issued_at).toLocaleString('en-IN')
    : 'N/A';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Physical Ticket</title>
    <style>
      @page { size: 58mm auto; margin: 4mm; }
      body {
        margin: 0;
        color: #111;
        background: #fff;
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
      }
      .ticket {
        width: 50mm;
        margin: 0 auto;
      }
      .brand {
        text-align: center;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.4px;
      }
      .divider {
        border-top: 1px dashed #000;
        margin: 6px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin: 2px 0;
      }
      .label {
        color: #000;
      }
      .value {
        text-align: right;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .mono {
        font-size: 11px;
        word-break: break-all;
      }
      .center {
        text-align: center;
      }
      .title {
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="brand">TN SMART BUS</div>
      <div class="center title">PHYSICAL TICKET</div>
      <div class="divider"></div>

      <div class="row"><span class="label">Ticket ID</span><span class="value mono">${fallback(ticket.qr_code)}</span></div>
      <div class="row"><span class="label">Booking</span><span class="value">BK-${fallback(ticket.booking_id)}</span></div>
      <div class="row"><span class="label">Passenger</span><span class="value">${fallback(ticket.passenger_name)}</span></div>
      <div class="row"><span class="label">Age/Gender</span><span class="value">${fallback(ticket.passenger_age)}/${fallback(ticket.passenger_gender)}</span></div>
      <div class="row"><span class="label">Route</span><span class="value">${fallback(ticket.source)} -> ${fallback(ticket.destination)}</span></div>
      <div class="row"><span class="label">Departure</span><span class="value">${fallback(ticket.departure_time)}</span></div>
      <div class="row"><span class="label">Arrival</span><span class="value">${fallback(ticket.arrival_time)}</span></div>
      <div class="row"><span class="label">Seat</span><span class="value">${fallback(ticket.seat_number)}</span></div>
      <div class="row"><span class="label">Fare</span><span class="value">INR ${Number(ticket.fare || 0)}</span></div>
      <div class="row"><span class="label">Bus</span><span class="value">${fallback(ticket.bus_number)}</span></div>
      <div class="row"><span class="label">Issued By</span><span class="value">${fallback(ticket.physical_issued_by)}</span></div>
      <div class="row"><span class="label">Issued At</span><span class="value">${issuedDate}</span></div>

      <div class="divider"></div>
      <div class="center">Please keep this ticket till destination</div>
    </div>
  </body>
</html>`;
};

export const ConductorScan = () => {
  const [qrCode, setQrCode] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [conductorId, setConductorId] = useState('CND-01');
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [scannedBooking, setScannedBooking] = useState(null);

  const handleScan = async (event) => {
    event.preventDefault();

    if (!qrCode.trim()) {
      setFeedback({ type: 'error', message: 'Enter a QR code before scanning.' });
      return;
    }

    setLoadingScan(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await api.conductorScan({
        qrCode: qrCode.trim(),
        busNumber: busNumber.trim(),
      });

      if (!response.success) {
        throw new Error(response.message || 'Unable to verify ticket');
      }

      setScannedBooking(response.booking || null);
      if (response.alreadyIssued) {
        setFeedback({ type: 'warning', message: 'Physical ticket already issued for this booking.' });
      } else {
        setFeedback({ type: 'success', message: 'Ticket verified. Ready to print physical ticket.' });
      }
    } catch (error) {
      setScannedBooking(null);
      setFeedback({ type: 'error', message: error.message || 'Scan failed' });
    } finally {
      setLoadingScan(false);
    }
  };

  const printPhysicalTicket = (ticketPayload) => {
    const popup = window.open('', '_blank', 'width=420,height=720');
    if (!popup) {
      setFeedback({ type: 'error', message: 'Popup blocked. Allow popups to print ticket.' });
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintableHtml(ticketPayload));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleIssuePhysicalTicket = async () => {
    if (!scannedBooking) {
      setFeedback({ type: 'error', message: 'Scan a valid ticket first.' });
      return;
    }

    // Validate booking ID
    const bookingId = Number(scannedBooking.id);
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      setFeedback({ type: 'error', message: `Invalid booking ID: ${scannedBooking.id}. Please scan again.` });
      return;
    }

    setLoadingIssue(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await api.issuePhysicalTicket({
        bookingId: bookingId,
        conductorId: conductorId.trim() || 'conductor',
      });

      if (!response.success) {
        throw new Error(response.message || 'Physical ticket generation failed');
      }

      const ticketPayload = response.ticket || {
        ...scannedBooking,
        booking_id: scannedBooking.id,
        physical_issued_at: response.issuedAt,
        physical_issued_by: response.issuedBy,
      };

      setScannedBooking((prev) => ({
        ...(prev || {}),
        physical_issued_at: response.issuedAt,
        physical_issued_by: response.issuedBy,
      }));

      printPhysicalTicket(ticketPayload);
      setFeedback({ type: 'success', message: 'Physical ticket generated and ready to print.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to issue physical ticket' });
    } finally {
      setLoadingIssue(false);
    }
  };

  return (
    <div className="conductor-page">
      <div className="conductor-header">
        <h2>Conductor Scan Console</h2>
        <p>Scan ticket QR, verify booking, and print a physical ticket.</p>
      </div>

      <form className="scan-form" onSubmit={handleScan}>
        <label>
          QR Code / Ticket ID
          <input
            value={qrCode}
            onChange={(event) => setQrCode(event.target.value)}
            placeholder="TICKET-XXXXXXXXX or ticket URL"
            required
          />
        </label>

        <label>
          Bus Number (optional check)
          <input
            value={busNumber}
            onChange={(event) => setBusNumber(event.target.value)}
            placeholder="TN-01-AN-1234"
          />
        </label>

        <label>
          Conductor ID
          <input
            value={conductorId}
            onChange={(event) => setConductorId(event.target.value)}
            placeholder="CND-01"
            required
          />
        </label>

        <button className="scan-btn" type="submit" disabled={loadingScan}>
          <ScanLine size={18} />
          {loadingScan ? 'Verifying...' : 'Verify Ticket'}
        </button>
      </form>

      {feedback.message && (
        <div className={`feedback ${feedback.type}`}>
          {feedback.type === 'error' || feedback.type === 'warning' ? <AlertTriangle size={16} /> : <Ticket size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {scannedBooking && (
        <div className="ticket-preview">
          <h3>Verified Booking</h3>
          <div className="preview-grid">
            <p><span>Ticket ID:</span> {fallback(scannedBooking.qr_code)}</p>
            <p><span>Booking Ref:</span> BK-{fallback(scannedBooking.id)}</p>
            <p><span>Passenger:</span> {fallback(scannedBooking.passenger_name)}</p>
            <p><span>Age / Gender:</span> {fallback(scannedBooking.passenger_age)} / {fallback(scannedBooking.passenger_gender)}</p>
            <p><span>Route:</span> {fallback(scannedBooking.source)} {' -> '} {fallback(scannedBooking.destination)}</p>
            <p><span>Departure:</span> {fallback(scannedBooking.departure_time)}</p>
            <p><span>Arrival:</span> {fallback(scannedBooking.arrival_time)}</p>
            <p><span>Seat:</span> {fallback(scannedBooking.seat_number)}</p>
            <p><span>Fare:</span> INR {Number(scannedBooking.fare || 0)}</p>
            <p><span>Bus:</span> {fallback(scannedBooking.bus_number)}</p>
            <p><span>Status:</span> {fallback(scannedBooking.status)}</p>
            <p><span>Issued:</span> {scannedBooking.physical_issued_at ? 'Yes' : 'No'}</p>
          </div>

          <button
            className="issue-btn"
            type="button"
            onClick={handleIssuePhysicalTicket}
            disabled={loadingIssue || Boolean(scannedBooking.physical_issued_at)}
          >
            <Printer size={18} />
            {scannedBooking.physical_issued_at
              ? 'Already Issued'
              : loadingIssue
                ? 'Generating...'
                : 'Generate Physical Ticket'}
          </button>
        </div>
      )}
    </div>
  );
};
