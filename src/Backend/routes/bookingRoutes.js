import express from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const PUBLIC_URL_FILE = path.resolve(process.cwd(), '.public-url');
const TRY_CLOUDFLARE_MAX_AGE_MS = Number(process.env.TRY_CLOUDFLARE_MAX_AGE_MS || 90 * 1000);

const isPrivateHost = (hostValue) => {
  const host = String(hostValue || '').trim().toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.17.') ||
    host.startsWith('172.18.') ||
    host.startsWith('172.19.') ||
    host.startsWith('172.2') ||
    host.startsWith('172.30.') ||
    host.startsWith('172.31.')
  );
};

const buildTicketCode = (booking) => booking?.qrCode || `TICKET-${booking?._id?.toString().slice(-8).toUpperCase()}`;

const parseHostFromUrl = (value) => {
  try {
    return new URL(String(value || '').trim()).hostname;
  } catch {
    return '';
  }
};

const readRuntimePublicBaseUrl = () => {
  try {
    const fileValue = fs.readFileSync(PUBLIC_URL_FILE, 'utf8').trim().replace(/\/+$/, '');
    if (!fileValue) {
      return '';
    }

    const host = parseHostFromUrl(fileValue).toLowerCase();
    if (host.endsWith('.trycloudflare.com')) {
      const stats = fs.statSync(PUBLIC_URL_FILE);
      const ageMs = Date.now() - Number(stats.mtimeMs || 0);
      if (ageMs > TRY_CLOUDFLARE_MAX_AGE_MS) {
        return '';
      }
    }

    return fileValue;
  } catch {
    return '';
  }
};

const isValidPublicUrl = (value) => {
  const host = parseHostFromUrl(value);
  return Boolean(host) && !isPrivateHost(host);
};

const buildTicketDownloadUrl = (req, bookingId) => {
  const publicTicketBaseUrl = buildPublicBaseUrl(req);

  return publicTicketBaseUrl
    ? `${publicTicketBaseUrl}/api/bookings/public/${bookingId}`
    : '';
};

const getPublicUrlWarning = (req) => {
  const runtimePublicUrl = readRuntimePublicBaseUrl();
  if (isValidPublicUrl(runtimePublicUrl)) {
    return '';
  }

  const configuredBaseUrl = String(process.env.PUBLIC_TICKET_BASE_URL || '').trim();
  if (!configuredBaseUrl) {
    return 'Set PUBLIC_TICKET_BASE_URL to a public URL or tunnel address. Private LAN addresses will not work on other networks.';
  }

  const host = parseHostFromUrl(configuredBaseUrl);
  if (!host) {
    return 'PUBLIC_TICKET_BASE_URL must be a valid absolute URL, for example https://your-domain.com or your tunnel URL.';
  }

  if (isPrivateHost(host)) {
    return 'PUBLIC_TICKET_BASE_URL is a private LAN address. Use a public HTTPS URL, port forwarding, or a tunnel like ngrok or Cloudflare Tunnel for cross-network downloads.';
  }

  return '';
};

const renderTicketLandingPage = (booking, pdfUrl, urlWarning = '') => {
  const ticketId = buildTicketCode(booking);
  const passengerName = booking.userId?.name || booking.passengerName || 'N/A';
  const routeLabel = `${booking.routeId?.source || booking.boardingPoint || 'N/A'} -> ${booking.routeId?.destination || booking.droppingPoint || 'N/A'}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bus Ticket Download</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: linear-gradient(180deg, #eef6ff 0%, #ffffff 55%);
        color: #0f172a;
      }
      .wrap {
        max-width: 540px;
        margin: 0 auto;
        padding: 24px 16px 32px;
      }
      .card {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }
      .sub {
        margin: 0 0 18px;
        color: #475569;
        line-height: 1.5;
      }
      .meta {
        display: grid;
        gap: 10px;
        margin: 18px 0 24px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 14px;
        background: #f8fafc;
        border-radius: 14px;
      }
      .label {
        color: #64748b;
        font-size: 13px;
      }
      .value {
        text-align: right;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .primary {
        display: block;
        text-align: center;
        text-decoration: none;
        background: #0f766e;
        color: #fff;
        font-weight: 700;
        padding: 14px 18px;
        border-radius: 14px;
        margin-bottom: 10px;
      }
      .secondary {
        display: block;
        text-align: center;
        text-decoration: none;
        color: #0f766e;
        font-weight: 700;
        padding: 13px 18px;
        border-radius: 14px;
        border: 1px solid #99f6e4;
        background: #f0fdfa;
      }
      .hint {
        margin: 16px 0 0;
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
      }
      .status {
        margin: 12px 0 18px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #ecfeff;
        color: #155e75;
        font-size: 14px;
        line-height: 1.5;
      }
      .warning {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #fff7ed;
        color: #9a3412;
        font-size: 13px;
        line-height: 1.5;
      }
      .mono { word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Your ticket is ready</h1>
        <p class="sub">Tap the button below to download the PDF ticket. If your phone opens a preview instead, use the secondary link or the browser menu to save the file.</p>
        <div class="status" id="ticket-status">Preparing your download...</div>
        <div class="meta">
          <div class="row"><span class="label">Ticket ID</span><span class="value mono">${ticketId}</span></div>
          <div class="row"><span class="label">Passenger</span><span class="value">${passengerName}</span></div>
          <div class="row"><span class="label">Route</span><span class="value">${routeLabel}</span></div>
        </div>
        <a class="primary" href="${pdfUrl}">Download PDF</a>
        <a class="secondary" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">Open PDF</a>
        ${urlWarning ? `<div class="warning">${urlWarning}</div>` : ''}
        <p class="hint">The QR code points to this page so the ticket can open reliably on mobile devices.</p>
      </div>
    </div>
    <script>
      (async () => {
        const statusEl = document.getElementById('ticket-status');
        try {
          const response = await fetch(${JSON.stringify(pdfUrl)}, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error('Download failed');
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = ${JSON.stringify(`ticket-${ticketId}.pdf`)};
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          statusEl.textContent = 'Download started. If it did not save automatically, tap the Download PDF button below.';
        } catch (error) {
          statusEl.textContent = 'Automatic download was blocked. Tap Download PDF below to save the file.';
        }
      })();
    </script>
  </body>
</html>`;
};

const buildPublicBaseUrl = (req) => {
  const runtimePublicUrl = readRuntimePublicBaseUrl();
  if (isValidPublicUrl(runtimePublicUrl)) {
    return runtimePublicUrl;
  }

  const configuredBaseUrl = String(process.env.PUBLIC_TICKET_BASE_URL || '').trim().replace(/\/+$/, '');

  const forwardedProto = String(req.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const forwardedHost = String(req.get('x-forwarded-host') || '')
    .split(',')[0]
    .trim();
  const host = forwardedHost || String(req.get('host') || '').split(',')[0].trim();
  const protocol = forwardedProto || (req.secure ? 'https' : req.protocol || 'http');

  const requestBaseUrl = host ? `${protocol}://${host}` : '';

  if (!configuredBaseUrl) {
    return requestBaseUrl;
  }

  const configuredHost = parseHostFromUrl(configuredBaseUrl);
  if (!configuredHost) {
    return requestBaseUrl;
  }

  if (isPrivateHost(configuredHost)) {
    return requestBaseUrl;
  }

  // If app is accessed through HTTPS, avoid returning plain HTTP URLs.
  if (protocol === 'https' && configuredBaseUrl.startsWith('http://')) {
    return configuredBaseUrl.replace(/^http:\/\//i, 'https://');
  }

  return configuredBaseUrl;
};

// Create a new booking
router.post('/create', verifyToken, async (req, res) => {
  try {
    const {
      busId,
      routeId,
      seatNumbers,
      journeyDate,
      boardingPoint,
      droppingPoint,
      totalPrice,
      pricePerSeat,
      paymentMethod,
    } = req.body;

    // Validation
    if (!busId || !routeId || !seatNumbers || !journeyDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if bus exists and has available seats
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Check if route exists
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // Create booking
    const booking = new Booking({
      userId: req.userId,
      busId,
      routeId,
      seatNumbers,
      journeyDate: new Date(journeyDate),
      boardingPoint,
      droppingPoint,
      totalPassengers: seatNumbers.length,
      totalPrice: totalPrice || seatNumbers.length * pricePerSeat,
      pricePerSeat,
      paymentMethod: paymentMethod || 'card',
    });

    await booking.save();

    const bookingId = booking._id.toString();
    const qrCode = buildTicketCode(booking);
    const qrDownloadUrl = buildTicketDownloadUrl(req, bookingId);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      qr_download_url: qrDownloadUrl,
      booking: {
        ...booking.toObject(),
        qr_code: qrCode,
        qr_download_url: qrDownloadUrl,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Public ticket details endpoint for external QR URL access
router.get('/public/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('busId', 'busNumber busType')
      .populate('routeId', 'source destination')
      .populate('userId', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const bookingId = booking._id.toString();
    const qrCode = buildTicketCode(booking);
    const qrDownloadUrl = buildTicketDownloadUrl(req, bookingId);
    const pdfUrl = `${qrDownloadUrl}/pdf`;
    const urlWarning = getPublicUrlWarning(req);

    if (String(req.query.format || '').toLowerCase() === 'json' || req.accepts(['html', 'json']) === 'json') {
      return res.json({
        success: true,
        booking: {
          id: booking._id,
          qr_code: qrCode,
          qr_download_url: qrDownloadUrl,
          passenger_name: booking.userId?.name || 'N/A',
          bus_number: booking.busId?.busNumber || 'N/A',
          bus_type: booking.busId?.busType || 'N/A',
          source: booking.routeId?.source || booking.boardingPoint,
          destination: booking.routeId?.destination || booking.droppingPoint,
          boarding_point: booking.boardingPoint,
          dropping_point: booking.droppingPoint,
          seat_numbers: booking.seatNumbers,
          journey_date: booking.journeyDate,
          total_price: booking.totalPrice,
          status: booking.status,
          created_at: booking.createdAt,
        },
        url_warning: urlWarning,
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderTicketLandingPage(booking, pdfUrl, urlWarning));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public ticket PDF endpoint for external QR URL access
router.get('/public/:bookingId/pdf', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('busId', 'busNumber busType')
      .populate('routeId', 'source destination')
      .populate('userId', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const ticketId = buildTicketCode(booking);
    const filename = `ticket-${String(ticketId).replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;
    const journeyDate = booking.journeyDate
      ? new Date(booking.journeyDate).toLocaleDateString('en-GB')
      : 'N/A';
    const bookedOn = booking.createdAt
      ? new Date(booking.createdAt).toLocaleString('en-GB')
      : 'N/A';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    doc.fontSize(20).text('Bus Ticket', { align: 'center' });
    doc.moveDown(0.8);
    doc.fontSize(11).fillColor('#444').text('Tamil Nadu Smart Bus Transport', { align: 'center' });
    doc.moveDown(1.2);
    doc.fillColor('#000');

    const lines = [
      ['Ticket ID', ticketId],
      ['Passenger', booking.passengerName || booking.userId?.name || 'N/A'],
      ['Bus', `${booking.busId?.busType || 'N/A'} (${booking.busId?.busNumber || 'N/A'})`],
      ['Route', `${booking.routeId?.source || booking.boardingPoint || 'N/A'} -> ${booking.routeId?.destination || booking.droppingPoint || 'N/A'}`],
      ['Boarding Point', booking.boardingPoint || 'N/A'],
      ['Dropping Point', booking.droppingPoint || 'N/A'],
      ['Seats', Array.isArray(booking.seatNumbers) && booking.seatNumbers.length ? booking.seatNumbers.join(', ') : 'N/A'],
      ['Journey Date', journeyDate],
      ['Total Fare', `INR ${Number(booking.totalPrice || 0).toFixed(2)}`],
      ['Status', booking.status || 'confirmed'],
      ['Booked On', bookedOn],
    ];

    lines.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(11).text(`${label}: `, { continued: true });
      doc.font('Helvetica').fontSize(11).text(String(value || 'N/A'));
      doc.moveDown(0.35);
    });

    doc.moveDown(0.8);
    doc.fontSize(10).fillColor('#555').text('Show this ticket at boarding for verification.', { align: 'left' });
    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Get user bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .populate('busId', 'busNumber busType totalSeats')
      .populate('routeId', 'source destination distance basePrice')
      .sort({ journeyDate: -1 });

    const bookingsWithTicketLinks = bookings.map((booking) => ({
      ...booking.toObject(),
      qr_code: buildTicketCode(booking),
      qr_download_url: buildTicketDownloadUrl(req, booking._id.toString()),
    }));

    res.json({
      success: true,
      count: bookingsWithTicketLinks.length,
      bookings: bookingsWithTicketLinks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get booking details
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('busId')
      .populate('routeId')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.userId._id.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      booking: {
        ...booking.toObject(),
        qr_code: buildTicketCode(booking),
        qr_download_url: buildTicketDownloadUrl(req, booking._id.toString()),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel booking
router.post('/:bookingId/cancel', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking can be cancelled
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Booking cannot be cancelled' });
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellationReason = reason || null;
    booking.cancellationDate = new Date();
    booking.paymentStatus = 'refunded';

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update booking (admin only)
router.put('/:bookingId', verifyToken, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update bookings' });
    }

    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
