import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import PDFDocument from "pdfkit";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { getTravelAdvice } from "./src/Backend/geminiService.js";
import { createFirestoreStore } from "./src/Backend/firestoreStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("bus_system.db");

const CITY_ALIASES = {
  chennai: 'Chennai',
  madurai: 'Madurai',
  madhurai: 'Madurai',
  coimbatore: 'Coimbatore',
  coimbature: 'Coimbatore',
  koyambatore: 'Coimbatore',
  trichy: 'Trichy',
  tiruchirappalli: 'Trichy',
  bangalore: 'Bangalore',
  bengaluru: 'Bangalore',
  pondicherry: 'Pondicherry',
  puducherry: 'Pondicherry',
  tirunelveli: 'Tirunelveli',
  thirunelveli: 'Tirunelveli',
  kanyakumari: 'Kanyakumari',
  kanniyakumari: 'Kanyakumari',
};

const normalizeCity = (value = '') => {
  const key = String(value).trim().toLowerCase();
  return CITY_ALIASES[key] || value;
};

const CANONICAL_LOCAL_BUS_NUMBER = "TN-30-L-7015";
const ALLOWED_ADMIN_BUS_TYPES = new Set(["TNSTC", "KSRTC", "SETC", "Local buses"]);

const FARE_CONFIG = {
  local: { base: 4, perKm: 1.2, perStop: 0.8, min: 6 },
  express: { base: 20, perKm: 1.8, perStop: 1.5, min: 20 },
};

const calculateDistanceStopFare = ({ distanceKm, stopCount, isLocalRoute }) => {
  const config = isLocalRoute ? FARE_CONFIG.local : FARE_CONFIG.express;
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const safeStops = Math.max(2, Number(stopCount) || 2);

  const fare = config.base + (safeDistance * config.perKm) + ((safeStops - 1) * config.perStop);
  return Math.max(config.min, Math.round(fare));
};

const toHHMM = (totalMinutes) => {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const parseStopEntry = (entry) => {
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    const stopName = String(entry.stop_name || entry.name || "").trim();
    const stopTime = String(entry.stop_time || entry.time || "").trim();
    const segmentPrice = Number(entry.segment_price);
    if (!stopName) return null;
    return {
      stop_name: stopName,
      stop_time: stopTime || null,
      segment_price: Number.isFinite(segmentPrice) ? Math.max(0, segmentPrice) : 0,
    };
  }

  const raw = String(entry || "").trim();
  if (!raw) return null;

  const [namePart, timePart, pricePart] = raw.split("|").map((part) => String(part || "").trim());
  if (!namePart) return null;

  const parsedPrice = Number(pricePart);

  return {
    stop_name: namePart,
    stop_time: timePart || null,
    segment_price: Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 0,
  };
};

const parseStopsInput = (stops) => {
  if (Array.isArray(stops)) {
    return stops
      .map(parseStopEntry)
      .filter(Boolean)
      .map((stop, index) => ({ ...stop, stop_order: index + 1 }));
  }

  const normalizedStops = String(stops || "")
    .replace(/\\n/g, "\n")
    .replace(/`n/g, "\n");

  return normalizedStops
    .split(/[\n,]/)
    .map(parseStopEntry)
    .filter(Boolean)
    .map((stop, index) => ({ ...stop, stop_order: index + 1 }));
};

const buildAbsoluteApiUrl = (req, relativePath) => {
  const configuredBaseUrl = String(process.env.PUBLIC_TICKET_BASE_URL || "").trim();
  if (configuredBaseUrl) {
    const normalizedBase = configuredBaseUrl.replace(/\/+$/, "");
    return `${normalizedBase}${relativePath}`;
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const originalHost = String(req.get("host") || "").trim();
  const lanIp = getLocalNetworkIPv4();

  // Replace localhost-style hosts so external phones on the same network can reach the server.
  const normalizedHost = originalHost
    .replace(/^localhost/i, lanIp || "localhost")
    .replace(/^127\.0\.0\.1/i, lanIp || "127.0.0.1");

  return `${protocol}://${normalizedHost}${relativePath}`;
};

const getLocalNetworkIPv4 = () => {
  const interfaces = os.networkInterfaces();

  const isLikelyVirtualInterface = (name = "") => {
    const key = String(name).toLowerCase();
    return (
      key.includes("vethernet") ||
      key.includes("virtual") ||
      key.includes("vmware") ||
      key.includes("vbox") ||
      key.includes("hyper-v") ||
      key.includes("wsl") ||
      key.includes("loopback") ||
      key.includes("docker") ||
      key.includes("bluetooth")
    );
  };

  const isPreferredLanAddress = (address = "") => {
    return /^192\.168\./.test(address) || /^10\./.test(address);
  };

  const fallbackCandidates = [];

  for (const [name, netIf] of Object.entries(interfaces)) {
    if (!Array.isArray(netIf) || isLikelyVirtualInterface(name)) continue;
    for (const detail of netIf) {
      if (!detail || detail.internal || detail.family !== "IPv4") continue;
      if (isPreferredLanAddress(detail.address)) {
        return detail.address;
      }
      fallbackCandidates.push(detail.address);
    }
  }

  return fallbackCandidates[0] || "";
};

const createTicketPdfUrl = (req, qrCode) => {
  const safeCode = encodeURIComponent(String(qrCode || "").trim());
  return buildAbsoluteApiUrl(req, `/api/tickets/${safeCode}/pdf`);
};

const extractTicketQrCode = (inputValue) => {
  const raw = String(inputValue || "").trim();
  if (!raw) return "";

  const directMatch = raw.match(/TICKET-[A-Z0-9]+/i);
  if (directMatch) {
    return directMatch[0].toUpperCase();
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);

      const fromQuery =
        parsed.searchParams.get("qr_code") ||
        parsed.searchParams.get("qr") ||
        parsed.searchParams.get("ticket") ||
        parsed.searchParams.get("id") ||
        "";
      const queryMatch = String(fromQuery).match(/TICKET-[A-Z0-9]+/i);
      if (queryMatch) {
        return queryMatch[0].toUpperCase();
      }

      const pathMatch = parsed.pathname.match(/\/api\/tickets\/([^/]+)\/pdf/i);
      if (pathMatch?.[1]) {
        const decoded = decodeURIComponent(pathMatch[1]);
        const normalized = decoded.match(/TICKET-[A-Z0-9]+/i);
        if (normalized) {
          return normalized[0].toUpperCase();
        }
      }
    } catch {
      return "";
    }
  }

  return "";
};

const getBookingByQrCodeSqlite = (qrCode) => {
  return db.prepare(`
    SELECT bk.id, bk.qr_code, bk.status, bk.booking_date, bk.seat_number,
           bk.ticket_count, bk.boarding_stop, bk.drop_stop, bk.unit_fare, bk.total_fare,
           bk.passenger_name, bk.passenger_age, bk.passenger_gender,
           bk.physical_issued_at, bk.physical_issued_by, bk.boarded_at,
           s.id AS schedule_id, s.departure_time, s.arrival_time, COALESCE(bk.total_fare, s.fare) AS fare,
           r.source, r.destination, r.distance_km,
           b.bus_number, b.bus_type, b.operator
    FROM bookings bk
    JOIN schedules s ON bk.schedule_id = s.id
    JOIN routes r ON s.route_id = r.id
    JOIN buses b ON s.bus_id = b.id
    WHERE bk.qr_code = ?
    LIMIT 1
  `).get(qrCode);
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-IN");
};

const getTicketPdfFileName = (booking) => {
  return `tn-bus-ticket-${String(booking.qr_code || "ticket").replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
};

const writeTicketPdfHeaders = (res, booking) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${getTicketPdfFileName(booking)}"`);
};

const generateTicketPdfBuffer = async (booking) => {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ size: "A5", margin: 36 });

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).text("TN SMART BUS", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(11).text("Digital Ticket", { align: "center" });
      doc.moveDown(1);

      // Fetch QR code from external API
      const qrData = JSON.stringify({
        ticketId: booking.qr_code,
        bookingRef: `BK-${booking.id}`,
        passengerName: booking.passenger_name,
        busNumber: booking.bus_number,
        source: booking.source,
        destination: booking.destination,
        boardingStop: booking.boarding_stop,
        dropStop: booking.drop_stop,
        departureTime: booking.departure_time,
        seatNumber: booking.seat_number,
        ticketCount: booking.ticket_count,
      });

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
      console.log(`[QR] Fetching QR code from: ${qrUrl}`);

      let qrImage = null;
      try {
        const qrResponse = await fetch(qrUrl);
        if (qrResponse.ok) {
          qrImage = await qrResponse.buffer();
          console.log(`[QR] Successfully fetched QR code (${qrImage.length} bytes)`);
        } else {
          console.warn(`[QR] Failed to fetch QR code: ${qrResponse.status}`);
        }
      } catch (fetchError) {
        console.warn(`[QR] Error fetching QR code:`, fetchError.message);
      }

      // Add QR code to PDF if available
      if (qrImage) {
        doc.image(qrImage, {
          align: "center",
          width: 150
        });
        doc.moveDown(0.5);
      }

      doc.fontSize(11);
      const boardingStop = booking.boarding_stop || booking.source || "N/A";
      const destinationStop = booking.drop_stop || booking.destination || "N/A";
      doc.text(`Ticket ID: ${booking.qr_code || "N/A"}`);
      doc.text(`Booking Ref: BK-${booking.id || "N/A"}`);
      doc.text(`Passenger: ${booking.passenger_name || "N/A"}`);
      doc.text(`Age / Gender: ${booking.passenger_age || "N/A"} / ${booking.passenger_gender || "N/A"}`);
      doc.text(`Booked Route: ${boardingStop} -> ${destinationStop}`);
      doc.text(`Boarding Stop: ${boardingStop}`);
      doc.text(`Drop Stop: ${destinationStop}`);
      doc.text(`Departure: ${booking.departure_time || "N/A"}`);
      doc.text(`Arrival: ${booking.arrival_time || "N/A"}`);
      doc.text(`Seat: ${booking.seat_number || "N/A"}`);
      doc.text(`Tickets: ${Number(booking.ticket_count || 1)}`);
      doc.text(`Bus: ${booking.bus_number || "N/A"}`);
      doc.text(`Operator: ${booking.operator || "N/A"}`);
      doc.text(`Fare: INR ${Number(booking.fare || 0)}`);
      doc.text(`Booked On: ${formatDateTime(booking.booking_date)}`);
      doc.text(`Status: ${booking.status || "N/A"}`);

      doc.moveDown(1);
      doc.fontSize(9).fillColor("#555").text("Prototype ticket. Please show this ticket with QR code and valid ID while boarding.", {
        align: "left",
      });

      doc.end();
    } catch (error) {
      console.error(`[PDF] Error generating ticket PDF:`, error);
      reject(error);
    }
  });
};

const sendTicketPdfBuffer = (res, booking, pdfBuffer) => {
  writeTicketPdfHeaders(res, booking);
  res.end(pdfBuffer);
};

const streamTicketPdf = async (res, booking) => {
  try {
    const pdfBuffer = await generateTicketPdfBuffer(booking);
    sendTicketPdfBuffer(res, booking, pdfBuffer);
  } catch (error) {
    console.error(`[PDF] Error streaming ticket:`, error);
    res.status(500).json({ success: false, message: "Failed to generate ticket PDF" });
  }
};

const persistFirestoreTicketPdfIfPossible = async (store, qrCode, booking) => {
  if (!store?.uploadTicketPdfByQrCode || !booking) return { success: false };

  try {
    const pdfBuffer = await generateTicketPdfBuffer(booking);
    const saveResult = await store.uploadTicketPdfByQrCode({
      qr_code: qrCode,
      pdf_buffer: pdfBuffer,
      file_name: getTicketPdfFileName(booking),
    });

    return {
      success: Boolean(saveResult?.success),
      downloadUrl: saveResult?.downloadUrl || "",
      message: saveResult?.message || "",
    };
  } catch (error) {
    console.error(`[Firestore] Error persisting ticket PDF:`, error);
    return { success: false, message: error.message };
  }
};

const listenWithPortFallback = (app, startPort, host = "0.0.0.0", maxRetries = 10) =>
  new Promise((resolve, reject) => {
    const tryListen = (port, retriesLeft) => {
      const server = app.listen(port, host, () => {
        resolve({ server, port });
      });

      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && retriesLeft > 0) {
          console.warn(`Port ${port} is in use. Trying port ${port + 1}...`);
          tryListen(port + 1, retriesLeft - 1);
          return;
        }

        reject(error);
      });
    };

    tryListen(startPort, maxRetries);
  });

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'passenger'
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    destination TEXT,
    distance_km REAL
  );

  CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_number TEXT UNIQUE,
    bus_type TEXT, -- AC, Non-AC, Sleeper, Seater
    capacity INTEGER,
    operator TEXT -- TNSTC, SETC, Private
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id INTEGER,
    route_id INTEGER,
    departure_time TEXT,
    arrival_time TEXT,
    fare REAL,
    between_stop_rate REAL,
    FOREIGN KEY(bus_id) REFERENCES buses(id),
    FOREIGN KEY(route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    stop_name TEXT,
    stop_order INTEGER,
    stop_time TEXT,
    segment_price REAL,
    FOREIGN KEY(route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    schedule_id INTEGER,
    seat_number TEXT,
    ticket_count INTEGER DEFAULT 1,
    boarding_stop TEXT,
    drop_stop TEXT,
    unit_fare REAL,
    total_fare REAL,
    booking_date TEXT,
    status TEXT DEFAULT 'confirmed',
    qr_code TEXT,
    physical_issued_at TEXT,
    physical_issued_by TEXT,
    boarded_at TEXT,
    passenger_name TEXT,
    passenger_age INTEGER,
    passenger_gender TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(schedule_id) REFERENCES schedules(id)
  );
`);

// Add passenger details columns if they don't exist (for existing DBs)
try { db.exec("ALTER TABLE bookings ADD COLUMN passenger_name TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN passenger_age INTEGER;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN passenger_gender TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN ticket_count INTEGER DEFAULT 1;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN boarding_stop TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN drop_stop TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN unit_fare REAL;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN total_fare REAL;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN physical_issued_at TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN physical_issued_by TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN boarded_at TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE schedules ADD COLUMN between_stop_rate REAL;"); } catch(e) {}
try { db.exec("ALTER TABLE route_stops ADD COLUMN segment_price REAL;"); } catch(e) {}

// Seed Data (if empty)
const routeCount = db.prepare("SELECT count(*) as count FROM routes").get();
if (routeCount.count === 0) {
  const insertRoute = db.prepare("INSERT INTO routes (source, destination, distance_km) VALUES (?, ?, ?)");
  insertRoute.run("Chennai", "Madurai", 462);
  insertRoute.run("Chennai", "Coimbatore", 510);
  insertRoute.run("Madurai", "Kanyakumari", 245);
  insertRoute.run("Trichy", "Chennai", 330);
  insertRoute.run("Salem", "Chennai", 345);
  insertRoute.run("Chennai", "Pondicherry", 150);
  insertRoute.run("Chennai", "Vellore", 140);
  insertRoute.run("Coimbatore", "Erode", 100);
  insertRoute.run("Madurai", "Tirunelveli", 160);
  insertRoute.run("Trichy", "Thanjavur", 55);
  insertRoute.run("Chennai", "Bangalore", 350);
  insertRoute.run("Bangalore", "Chennai", 350);
  insertRoute.run("Hosur", "Chennai", 310);
  insertRoute.run("Nagercoil", "Kanyakumari", 20);
  insertRoute.run("Chennai", "Tirupati", 135);
  insertRoute.run("Coimbatore", "Pollachi", 45);
  insertRoute.run("Madurai", "Dindigul", 65);
  insertRoute.run("Trichy", "Pudukkottai", 50);
  insertRoute.run("Salem", "Namakkal", 55);
  insertRoute.run("Chennai", "Chengalpattu", 55);
  insertRoute.run("Chennai", "Tambaram", 25);
  insertRoute.run("Chennai", "Avadi", 22);
  insertRoute.run("Coimbatore", "Tiruppur", 50);
  insertRoute.run("Madurai", "Thirumangalam", 20);
  insertRoute.run("Trichy", "Srirangam", 10);
  insertRoute.run("Salem", "Omalur", 15);
  insertRoute.run("Erode", "Bhavani", 12);
  insertRoute.run("Vellore", "Katpadi", 7);
  insertRoute.run("Tirunelveli", "Palayamkottai", 5);
  insertRoute.run("Thanjavur", "Kumbakonam", 40);
  insertRoute.run("Chennai", "Salem", 345);
  insertRoute.run("Chennai", "Trichy", 330);
  insertRoute.run("Chennai", "Tirunelveli", 625);
  insertRoute.run("Chennai", "Kanyakumari", 705);
  insertRoute.run("Coimbatore", "Madurai", 215);
  insertRoute.run("Coimbatore", "Trichy", 220);
  insertRoute.run("Coimbatore", "Salem", 165);
  insertRoute.run("Madurai", "Chennai", 462);
  insertRoute.run("Madurai", "Coimbatore", 215);
  insertRoute.run("Madurai", "Trichy", 135);
  insertRoute.run("Trichy", "Madurai", 135);
  insertRoute.run("Trichy", "Coimbatore", 220);
  insertRoute.run("Salem", "Coimbatore", 165);
  insertRoute.run("Erode", "Coimbatore", 100);
  insertRoute.run("Tiruppur", "Coimbatore", 50);
  insertRoute.run("Kumbakonam", "Thanjavur", 40);

  const insertBus = db.prepare("INSERT INTO buses (bus_number, bus_type, capacity, operator) VALUES (?, ?, ?, ?)");
  insertBus.run("TN-01-AN-1234", "AC Sleeper", 30, "SETC");
  insertBus.run("TN-59-BZ-5678", "Ultra Deluxe", 40, "TNSTC");
  insertBus.run("TN-38-CX-9012", "AC Seater", 36, "Private");
  insertBus.run("TN-01-XY-5566", "AC Sleeper", 30, "SETC");
  insertBus.run("KA-01-MJ-7788", "Scania AC Multi-Axle", 45, "KSRTC");
  insertBus.run("TN-22-ZZ-9900", "Non-AC Seater", 50, "TNSTC");
  insertBus.run("TN-01-L-1001", "Local Non-AC", 55, "TNSTC");
  insertBus.run("TN-38-L-2002", "Local Non-AC", 55, "TNSTC");
  insertBus.run("TN-59-L-3003", "Local Non-AC", 55, "TNSTC");
  insertBus.run("TN-45-L-4004", "Local Non-AC", 55, "TNSTC");
  insertBus.run("TN-30-L-5005", "Local Non-AC", 55, "TNSTC");

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, fare)
    SELECT ?, id, ?, ?, ? FROM routes WHERE source = ? AND destination = ? LIMIT 1
  `);

  insertSchedule.run(1, "21:00", "05:30", 850, "Chennai", "Madurai");
  insertSchedule.run(2, "22:30", "07:00", 450, "Chennai", "Madurai");
  insertSchedule.run(3, "20:00", "04:00", 1200, "Chennai", "Coimbatore");
  insertSchedule.run(4, "06:00", "09:30", 350, "Chennai", "Pondicherry");
  insertSchedule.run(5, "23:00", "06:00", 950, "Chennai", "Bangalore");
  insertSchedule.run(6, "08:00", "11:00", 250, "Chennai", "Vellore");
  insertSchedule.run(2, "14:00", "17:30", 300, "Madurai", "Tirunelveli");
  insertSchedule.run(3, "10:00", "11:30", 150, "Trichy", "Thanjavur");
  insertSchedule.run(5, "22:00", "05:00", 950, "Bangalore", "Chennai");
  insertSchedule.run(7, "07:00", "08:30", 60, "Chennai", "Chengalpattu");
  insertSchedule.run(8, "09:00", "10:15", 50, "Coimbatore", "Pollachi");
  insertSchedule.run(7, "08:00", "09:00", 30, "Chennai", "Tambaram");
  insertSchedule.run(7, "10:00", "11:00", 25, "Chennai", "Avadi");
  insertSchedule.run(8, "07:30", "08:45", 55, "Coimbatore", "Tiruppur");
  insertSchedule.run(9, "08:15", "08:45", 20, "Madurai", "Thirumangalam");
  insertSchedule.run(10, "09:00", "09:30", 15, "Trichy", "Srirangam");
  insertSchedule.run(11, "07:00", "07:45", 20, "Salem", "Omalur");
  insertSchedule.run(11, "11:00", "11:30", 15, "Erode", "Bhavani");
  insertSchedule.run(7, "12:00", "12:15", 10, "Vellore", "Katpadi");
  insertSchedule.run(9, "13:00", "13:15", 10, "Tirunelveli", "Palayamkottai");
  insertSchedule.run(10, "14:00", "15:00", 45, "Thanjavur", "Kumbakonam");
}


const addLocalData = () => {
  const oldLocalRoutes = [
    ["Chennai", "Tambaram"],
    ["Chennai", "Avadi"],
    ["Coimbatore", "Tiruppur"],
    ["Madurai", "Thirumangalam"],
    ["Trichy", "Srirangam"],
    ["Salem", "Omalur"],
    ["Erode", "Bhavani"],
    ["Vellore", "Katpadi"],
    ["Tirunelveli", "Palayamkottai"],
    ["Thanjavur", "Kumbakonam"],
    ["Madurai", "Alagar Kovil"],
    ["Trichy", "Samayapuram"],
    ["Coimbatore", "Perur"],
    ["Salem", "Yercaud"],
    ["Chennai", "Sriperumbudur"],
    ["Chennai", "Poonamallee"],
    ["Chennai", "Red Hills"],
    ["Coimbatore", "Mettupalayam"],
    ["Madurai", "Melur"],
    ["Trichy", "Lalgudi"]
  ];

  const localStopTimeline = [
    { name: "Salem", time: "07:00", kmFromSalem: 0 },
    { name: "Thiruvagoundanoor bypass", time: "07:04", kmFromSalem: 5 },
    { name: "Kanthampatti bypass", time: "07:06", kmFromSalem: 8 },
    { name: "Kondalampatti bypass", time: "07:08", kmFromSalem: 10 },
    { name: "Ariyanoor", time: "07:15", kmFromSalem: 17 },
    { name: "Kakapalayam", time: "07:20", kmFromSalem: 22 },
    { name: "Magudanchavadi", time: "07:23", kmFromSalem: 26 },
    { name: "Kalipaati pirivi road", time: "07:28", kmFromSalem: 32 },
    { name: "Vaikuntham", time: "07:30", kmFromSalem: 35 },
    { name: "Toll gate", time: "07:33", kmFromSalem: 38 },
    { name: "Sankagiri", time: "07:43", kmFromSalem: 48 },
    { name: "Sanyasipatti", time: "07:50", kmFromSalem: 56 },
    { name: "Veppadai", time: "07:55", kmFromSalem: 61 },
    { name: "Pallipalayam", time: "08:00", kmFromSalem: 66 },
    { name: "Karunkalpalayam", time: "08:08", kmFromSalem: 73 },
    { name: "Erode", time: "08:15", kmFromSalem: 80 }
  ];

  const localStopNames = localStopTimeline.map(s => s.name);

  const clearOldLocalBookings = db.prepare(`
    DELETE FROM bookings
    WHERE schedule_id IN (
      SELECT s.id
      FROM schedules s
      JOIN routes r ON r.id = s.route_id
      WHERE (
        r.source = ? AND r.destination = ?
      )
    )
  `);

  const clearOldLocalSchedules = db.prepare(`
    DELETE FROM schedules
    WHERE route_id IN (
      SELECT id FROM routes WHERE source = ? AND destination = ?
    )
  `);

  const clearOldLocalRouteStops = db.prepare(`
    DELETE FROM route_stops
    WHERE route_id IN (
      SELECT id FROM routes WHERE source = ? AND destination = ?
    )
  `);

  const clearOldLocalRoute = db.prepare("DELETE FROM routes WHERE source = ? AND destination = ?");

  const clearLegacyStopBookings = db.prepare(`
    DELETE FROM bookings
    WHERE schedule_id IN (
      SELECT s.id
      FROM schedules s
      JOIN routes r ON r.id = s.route_id
      WHERE r.source = ? OR r.destination = ?
    )
  `);

  const clearLegacyStopSchedules = db.prepare(`
    DELETE FROM schedules
    WHERE route_id IN (
      SELECT id FROM routes WHERE source = ? OR destination = ?
    )
  `);

  const clearLegacyStopRouteStops = db.prepare(`
    DELETE FROM route_stops
    WHERE route_id IN (
      SELECT id FROM routes WHERE source = ? OR destination = ?
    )
  `);

  const clearLegacyStopRoutes = db.prepare("DELETE FROM routes WHERE source = ? OR destination = ?");

  oldLocalRoutes.forEach(([source, destination]) => {
    clearOldLocalBookings.run(source, destination);
    clearOldLocalRouteStops.run(source, destination);
    clearOldLocalSchedules.run(source, destination);
    clearOldLocalRoute.run(source, destination);
  });

 
  localStopNames.forEach(source => {
    localStopNames.forEach(destination => {
      if (source === destination) return;
      clearOldLocalBookings.run(source, destination);
      clearOldLocalRouteStops.run(source, destination);
      clearOldLocalSchedules.run(source, destination);
      clearOldLocalRoute.run(source, destination);
    });
  });

  
  ["Erode bus stand"].forEach((legacyStop) => {
    clearLegacyStopBookings.run(legacyStop, legacyStop);
    clearLegacyStopRouteStops.run(legacyStop, legacyStop);
    clearLegacyStopSchedules.run(legacyStop, legacyStop);
    clearLegacyStopRoutes.run(legacyStop, legacyStop);
  });

  const insertRoute = db.prepare("INSERT OR IGNORE INTO routes (source, destination, distance_km) VALUES (?, ?, ?)");

  db.prepare("INSERT OR IGNORE INTO buses (bus_number, bus_type, capacity, operator) VALUES (?, ?, ?, ?)")
    .run(CANONICAL_LOCAL_BUS_NUMBER, "Local Non-AC", 55, "TNSTC");

  const localBus = db.prepare("SELECT id FROM buses WHERE bus_number = ?").get(CANONICAL_LOCAL_BUS_NUMBER);
  if (!localBus) return;

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, fare)
    SELECT ?, id, ?, ?, ? FROM routes 
    WHERE source = ? AND destination = ? 
    AND NOT EXISTS (
      SELECT 1 FROM schedules s2 
      WHERE s2.bus_id = ? AND s2.route_id = routes.id AND s2.departure_time = ?
    )
    LIMIT 1
  `);

  const toMinutes = (hhmm) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    return (hh * 60) + mm;
  };

  const forwardStartMinutes = toMinutes(localStopTimeline[0].time);
  const forwardEndMinutes = toMinutes(localStopTimeline[localStopTimeline.length - 1].time);
  const reverseStartMinutes = forwardStartMinutes; // Start reverse run at 07:00 from Erode

  const reverseTimes = localStopTimeline.map((stop) => {
    const stopMinutes = toMinutes(stop.time);
    const reverseOffset = forwardEndMinutes - stopMinutes;
    return toHHMM(reverseStartMinutes + reverseOffset);
  });

  for (let i = 0; i < localStopTimeline.length - 1; i += 1) {
    for (let j = i + 1; j < localStopTimeline.length; j += 1) {
      const source = localStopTimeline[i];
      const destination = localStopTimeline[j];
      const routeDistance = destination.kmFromSalem - source.kmFromSalem;
      const fare = Math.max(6, Math.round(routeDistance * 0.9));

      insertRoute.run(source.name, destination.name, routeDistance);
      insertSchedule.run(
        localBus.id,
        source.time,
        destination.time,
        fare,
        source.name,
        destination.name,
        localBus.id,
        source.time
      );

     
      insertRoute.run(destination.name, source.name, routeDistance);
      insertSchedule.run(
        localBus.id,
        reverseTimes[j],
        reverseTimes[i],
        fare,
        destination.name,
        source.name,
        localBus.id,
        reverseTimes[j]
      );
    }
  }
};

addLocalData();


const addMajorCityData = () => {
  const extraRoutes = [
    ['Chennai', 'Salem', 345],
    ['Chennai', 'Trichy', 330],
    ['Chennai', 'Tirunelveli', 625],
    ['Chennai', 'Kanyakumari', 705],
    ['Coimbatore', 'Madurai', 215],
    ['Coimbatore', 'Trichy', 220],
    ['Coimbatore', 'Salem', 165],
    ['Madurai', 'Chennai', 462],
    ['Madurai', 'Coimbatore', 215],
    ['Madurai', 'Trichy', 135],
    ['Trichy', 'Madurai', 135],
    ['Trichy', 'Coimbatore', 220],
    ['Salem', 'Coimbatore', 165],
    ['Erode', 'Coimbatore', 100],
    ['Tiruppur', 'Coimbatore', 50],
    ['Kumbakonam', 'Thanjavur', 40],
    ['Chennai', 'Cuddalore', 183],
    ['Chennai', 'Villupuram', 160],
    ['Madurai', 'Rameswaram', 173],
    ['Coimbatore', 'Mettupalayam', 36],
    ['Salem', 'Dharmapuri', 65],
    ['Trichy', 'Karur', 82],
  ];

  const insertIfMissing = db.prepare(`
    INSERT INTO routes (source, destination, distance_km)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM routes WHERE source = ? AND destination = ?
    )
  `);

  extraRoutes.forEach(([source, destination, distance]) => {
    insertIfMissing.run(source, destination, distance, source, destination);
  });
};

addMajorCityData();

const addMajorCitySchedules = () => {
  const scheduleSeeds = [
    ['TN-01-AN-1234', '22:00', '05:30', 780, 'Chennai', 'Salem'],
    ['TN-59-BZ-5678', '21:30', '03:30', 620, 'Chennai', 'Trichy'],
    ['TN-01-AN-1234', '20:30', '06:30', 980, 'Chennai', 'Tirunelveli'],
    ['TN-38-CX-9012', '19:30', '07:30', 1150, 'Chennai', 'Kanyakumari'],
    ['TN-59-BZ-5678', '06:00', '10:30', 380, 'Coimbatore', 'Madurai'],
    ['TN-38-CX-9012', '07:00', '11:30', 400, 'Coimbatore', 'Trichy'],
    ['TN-22-ZZ-9900', '08:00', '11:30', 290, 'Coimbatore', 'Salem'],
    ['TN-59-BZ-5678', '22:00', '06:30', 820, 'Madurai', 'Chennai'],
    ['TN-22-ZZ-9900', '06:30', '11:00', 360, 'Madurai', 'Coimbatore'],
    ['TN-22-ZZ-9900', '07:30', '10:00', 220, 'Madurai', 'Trichy'],
    ['TN-22-ZZ-9900', '11:30', '14:00', 220, 'Trichy', 'Madurai'],
    ['TN-22-ZZ-9900', '12:00', '16:30', 360, 'Trichy', 'Coimbatore'],
    ['TN-22-ZZ-9900', '14:00', '17:30', 290, 'Salem', 'Coimbatore'],
    ['TN-30-L-7015', '09:30', '11:00', 70, 'Erode', 'Coimbatore'],
    ['TN-30-L-7015', '11:30', '12:45', 45, 'Tiruppur', 'Coimbatore'],
    ['TN-30-L-7015', '13:30', '14:45', 35, 'Kumbakonam', 'Thanjavur'],
  ];

  const insertScheduleIfMissing = db.prepare(`
    INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, fare)
    SELECT b.id, r.id, ?, ?, ?
    FROM buses b
    JOIN routes r ON r.source = ? AND r.destination = ?
    WHERE b.bus_number = ?
      AND NOT EXISTS (
        SELECT 1
        FROM schedules s
        WHERE s.bus_id = b.id
          AND s.route_id = r.id
          AND s.departure_time = ?
      )
    LIMIT 1
  `);

  scheduleSeeds.forEach(([busNumber, departureTime, arrivalTime, fare, source, destination]) => {
    insertScheduleIfMissing.run(
      departureTime,
      arrivalTime,
      fare,
      source,
      destination,
      busNumber,
      departureTime,
    );
  });
};

addMajorCitySchedules();

const assignLocalBusesToShortRoutes = () => {
  
  const shortRoutes = db.prepare(`
    SELECT id, source, destination, distance_km
    FROM routes
    WHERE distance_km < 80
  `).all();

  if (shortRoutes.length === 0) return;

  
  db.prepare(`
    DELETE FROM schedules
    WHERE id IN (
      SELECT s.id
      FROM schedules s
      JOIN routes r ON r.id = s.route_id
      JOIN buses b ON b.id = s.bus_id
      WHERE r.distance_km < 80
        AND b.bus_type LIKE '%Local%'
        AND b.bus_number != ?
    )
  `).run(CANONICAL_LOCAL_BUS_NUMBER);

  const localBuses = db.prepare(`
    SELECT id, bus_number
    FROM buses
    WHERE bus_type LIKE '%Local%'
      AND bus_number != ?
    ORDER BY bus_number ASC
  `).all(CANONICAL_LOCAL_BUS_NUMBER);

  if (localBuses.length === 0) return;

  let busIndex = 0;
  const insertScheduleIfMissing = db.prepare(`
    INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, fare)
    SELECT ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM schedules
      WHERE route_id = ? AND bus_id = ?
    )
  `);

  shortRoutes.forEach((route) => {
    
    const durationMinutes = Math.max(10, Math.ceil((route.distance_km / 30) * 60));
    const fare = Math.max(6, Math.round(route.distance_km * 0.9));

    const departureSlots = [7 * 60, 10 * 60, 14 * 60, 18 * 60];
    const baseDepartureMinutes = departureSlots[busIndex % departureSlots.length];
    const staggerMinutes = (Math.floor(busIndex / departureSlots.length) % 3) * 20;
    const departureMinutes = baseDepartureMinutes + staggerMinutes;
    const arrivalMinutes = departureMinutes + durationMinutes;
    const departureTime = toHHMM(departureMinutes % (24 * 60));
    const arrivalTime = toHHMM(arrivalMinutes % (24 * 60));

    // Cycle through local buses
    const localBus = localBuses[busIndex % localBuses.length];
    busIndex++;

    insertScheduleIfMissing.run(
      localBus.id,
      route.id,
      departureTime,
      arrivalTime,
      fare,
      route.id,
      localBus.id,
    );
  });
};

assignLocalBusesToShortRoutes();


const userCount = db.prepare("SELECT count(*) as count FROM users WHERE id = 1").get();
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)");
  insertUser.run(1, "passenger@example.com", "Default Passenger", "passenger");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HMR_PORT = Number(process.env.VITE_HMR_PORT) || 24679;
  const firestoreStore = await createFirestoreStore(db);

  app.use(express.json());

  // VERY FIRST MIDDLEWARE - log ALL requests
  app.use((req, res, next) => {
    console.log(`\n[FIRST-MIDDLEWARE] ${req.method} ${req.path} (${req.originalUrl})`);
    next();
  });

  // Debug middleware to log DELETE admin requests
  app.use((req, res, next) => {
    if (req.method === 'DELETE' && req.path.includes('admin')) {
      console.log(`\n[DELETE-MIDDLEWARE] DELETE to admin route: ${req.path}`);
    }
    next();
  });

  console.log(`Data mode: ${firestoreStore.mode}. ${firestoreStore.reason}`);

  
  app.get("/api/locations", async (req, res) => {
    if (firestoreStore.enabled) {
      const locations = await firestoreStore.getLocations();
      res.json(locations);
      return;
    }

    const sources = db.prepare("SELECT DISTINCT source FROM routes").all().map(r => r.source);
    const destinations = db.prepare("SELECT DISTINCT destination FROM routes").all().map(r => r.destination);
    const allLocations = [...new Set([...sources, ...destinations])];
    res.json(allLocations);
  });

  app.post("/api/advice", async (req, res) => {
    const { source, destination } = req.body;
    const advice = await getTravelAdvice(source, destination);
    res.json({ advice });
  });

  app.get("/api/search", async (req, res) => {
    const rawSource = String(req.query.source || '');
    const rawDestination = String(req.query.destination || '');
    const source = normalizeCity(rawSource);
    const destination = normalizeCity(rawDestination);

    if (firestoreStore.enabled) {
      const results = await firestoreStore.search(source, destination);
      res.json(results);
      return;
    }

    const query = `
      SELECT s.*, b.bus_number, b.bus_type, b.operator, r.source, r.destination, r.distance_km
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      WHERE r.source LIKE ? AND r.destination LIKE ?
      ORDER BY s.departure_time ASC
    `;
    const results = db.prepare(query).all(`%${source}%`, `%${destination}%`);
    const enrichedResults = results.map((item) => {
      const stops = db.prepare(`
        SELECT stop_name, stop_time, stop_order, COALESCE(segment_price, 0) AS segment_price
        FROM route_stops
        WHERE route_id = ?
        ORDER BY stop_order ASC, id ASC
      `).all(item.route_id);

      return {
        ...item,
        between_stops: stops,
        stops_count: stops.length,
      };
    });

    res.json(enrichedResults);
  });

  app.get("/api/schedules/:id", async (req, res) => {
    const { id } = req.params;

    if (firestoreStore.enabled) {
      const schedule = await firestoreStore.getScheduleById(id);

      if (!schedule) {
        res.status(404).json({ success: false, message: "Schedule not found" });
        return;
      }

      res.json(schedule);
      return;
    }

    const query = `
      SELECT s.id, s.departure_time, s.arrival_time, s.fare, COALESCE(s.between_stop_rate, 0) AS between_stop_rate,
             b.bus_number, b.bus_type, b.operator, b.capacity,
             r.source, r.destination, r.distance_km
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      WHERE s.id = ?
      LIMIT 1
    `;
    const schedule = db.prepare(query).get(id);

    if (!schedule) {
      res.status(404).json({ success: false, message: "Schedule not found" });
      return;
    }

    res.json(schedule);
  });

  app.get("/api/schedules/:id/seats", async (req, res) => {
    const { id } = req.params;

    if (firestoreStore.enabled) {
      const seats = await firestoreStore.getBookedSeats(id);
      res.json({ schedule_id: Number(id), bookedSeats: seats });
      return;
    }

    const seats = db
      .prepare(
        "SELECT seat_number FROM bookings WHERE schedule_id = ? AND status = 'confirmed'"
      )
      .all(id)
      .map((row) => row.seat_number);

    res.json({ schedule_id: Number(id), bookedSeats: seats });
  });

  app.get("/api/schedules/:id/stops", async (req, res) => {
    const { id } = req.params;

    if (firestoreStore.enabled) {
      const result = await firestoreStore.getScheduleStops(id);
      if (!result.found) {
        res.status(404).json({ success: false, message: "Schedule not found", stops: [] });
        return;
      }
      res.json({ success: true, schedule_id: Number(id), stops: result.stops });
      return;
    }

    const schedule = db.prepare("SELECT route_id FROM schedules WHERE id = ? LIMIT 1").get(id);
    if (!schedule) {
      res.status(404).json({ success: false, message: "Schedule not found", stops: [] });
      return;
    }

    const stops = db.prepare(`
      SELECT id, stop_name, stop_time, stop_order, COALESCE(segment_price, 0) AS segment_price
      FROM route_stops
      WHERE route_id = ?
      ORDER BY stop_order ASC, id ASC
    `).all(schedule.route_id);

    res.json({ success: true, schedule_id: Number(id), stops });
  });

  app.post("/api/bookings", async (req, res) => {
    const {
      user_id,
      schedule_id,
      seat_number,
      passenger_name,
      passenger_age,
      passenger_gender,
      boarding_stop,
      drop_stop,
      ticket_count,
    } = req.body;

    if (!schedule_id || !passenger_name || !passenger_age || !passenger_gender) {
      res.status(400).json({ success: false, message: "Missing required booking fields" });
      return;
    }

    if (firestoreStore.enabled) {
      const bookingResult = await firestoreStore.createBooking({
        user_id,
        schedule_id,
        seat_number,
        passenger_name,
        passenger_age,
        passenger_gender,
        boarding_stop,
        drop_stop,
        ticket_count,
      });

      if (!bookingResult.success) {
        res.status(bookingResult.statusCode || 400).json({
          success: false,
          message: bookingResult.message || "Booking failed",
        });
        return;
      }

      let pdfStoredInFirestore = false;
      let qrDownloadUrl = createTicketPdfUrl(req, bookingResult.qr_code);
      if (firestoreStore.getBookingByQrCode && firestoreStore.uploadTicketPdfByQrCode) {
        try {
          const ticketLookup = await firestoreStore.getBookingByQrCode(bookingResult.qr_code);
          if (ticketLookup?.success && ticketLookup.booking) {
            const storageResult = await persistFirestoreTicketPdfIfPossible(
              firestoreStore,
              bookingResult.qr_code,
              ticketLookup.booking
            );
            pdfStoredInFirestore = storageResult.success;
            if (storageResult.downloadUrl) {
              qrDownloadUrl = storageResult.downloadUrl;
            }
          }
        } catch (error) {
          console.warn("Unable to upload ticket PDF to Firebase Storage:", error.message);
        }
      }

      res.json({
        ...bookingResult,
        qr_download_url: qrDownloadUrl,
        pdf_stored_in_firestore: pdfStoredInFirestore,
      });
      return;
    }

    const scheduleInfo = db
      .prepare(
        `SELECT s.id, s.route_id, s.between_stop_rate, b.bus_type, r.source, r.destination, r.distance_km
         FROM schedules s
         JOIN buses b ON s.bus_id = b.id
         JOIN routes r ON s.route_id = r.id
         WHERE s.id = ?`
      )
      .get(schedule_id);

    if (!scheduleInfo) {
      res.status(404).json({ success: false, message: "Schedule not found" });
      return;
    }

    const isLocalRoute = String(scheduleInfo.bus_type || '').toLowerCase().includes('local');
    const parsedTicketCount = Number.isInteger(Number(ticket_count)) ? Number(ticket_count) : 1;

    if (parsedTicketCount < 1 || parsedTicketCount > 10) {
      res.status(400).json({ success: false, message: "ticket_count must be between 1 and 10" });
      return;
    }

    if (!isLocalRoute && !seat_number) {
      res.status(400).json({ success: false, message: "Seat number is required for this bus" });
      return;
    }

    let finalBoardingStop = null;
    let finalDropStop = null;
    let routeStopCount = 2;
    let segmentStopCount = 2;
    let segmentDistanceKm = Number(scheduleInfo.distance_km || 0);

    if (isLocalRoute) {
      const routeStops = db.prepare(`
        SELECT stop_name, stop_order, COALESCE(segment_price, 0) AS segment_price
        FROM route_stops
        WHERE route_id = ?
        ORDER BY stop_order ASC, id ASC
      `).all(scheduleInfo.route_id);

      const fullRouteStops = [
        { stop_name: scheduleInfo.source },
        ...routeStops,
        { stop_name: scheduleInfo.destination },
      ];

      const dedupedStops = [];
      const seen = new Set();
      fullRouteStops.forEach((stop) => {
        const stopName = String(stop.stop_name || "").trim();
        if (!stopName) return;
        const key = stopName.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        dedupedStops.push(stopName);
      });

      const requestedBoarding = String(boarding_stop || "").trim() || scheduleInfo.source;
      const requestedDrop = String(drop_stop || "").trim() || scheduleInfo.destination;
      const boardingIndex = dedupedStops.findIndex((stopName) => stopName.toLowerCase() === requestedBoarding.toLowerCase());
      const dropIndex = dedupedStops.findIndex((stopName) => stopName.toLowerCase() === requestedDrop.toLowerCase());

      if (boardingIndex === -1 || dropIndex === -1 || boardingIndex >= dropIndex) {
        res.status(400).json({ success: false, message: "Invalid local boarding/drop stops" });
        return;
      }

      finalBoardingStop = dedupedStops[boardingIndex];
      finalDropStop = dedupedStops[dropIndex];
      routeStopCount = Math.max(dedupedStops.length, 2);
      segmentStopCount = Math.max((dropIndex - boardingIndex) + 1, 2);

      const totalSegments = Math.max(routeStopCount - 1, 1);
      const segmentRatio = Math.min(1, Math.max(1 / totalSegments, (segmentStopCount - 1) / totalSegments));
      segmentDistanceKm = Math.max(0, Number(scheduleInfo.distance_km || 0)) * segmentRatio;

      const fallbackSegmentRate = Math.max(0, Number(scheduleInfo.between_stop_rate) || 0);
      const orderedStops = [
        { stop_name: scheduleInfo.source },
        ...routeStops,
        { stop_name: scheduleInfo.destination },
      ];
      const segmentPrices = [];
      for (let segmentIndex = 0; segmentIndex < orderedStops.length - 1; segmentIndex += 1) {
        const fromRouteStop = routeStops[segmentIndex];
        const configuredPrice = Number(fromRouteStop?.segment_price || 0);
        segmentPrices.push(configuredPrice > 0 ? configuredPrice : fallbackSegmentRate);
      }

      const selectedPrices = segmentPrices.slice(boardingIndex, dropIndex);
      const summedSegmentFare = selectedPrices.reduce((sum, price) => sum + Number(price || 0), 0);

      if (summedSegmentFare > 0) {
        segmentDistanceKm = 0;
        const segmentBasedUnitFare = Math.max(1, Math.round(summedSegmentFare));
        const totalFare = segmentBasedUnitFare * parsedTicketCount;
        const qr_code = `TICKET-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const info = db.prepare(`
      INSERT INTO bookings (
        user_id,
        schedule_id,
        seat_number,
        ticket_count,
        boarding_stop,
        drop_stop,
        unit_fare,
        total_fare,
        booking_date,
        qr_code,
        passenger_name,
        passenger_age,
        passenger_gender
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
          user_id || 1,
          schedule_id,
          "N/A",
          parsedTicketCount,
          finalBoardingStop,
          finalDropStop,
          segmentBasedUnitFare,
          totalFare,
          new Date().toISOString(),
          qr_code,
          passenger_name,
          passenger_age,
          passenger_gender
        );
        res.json({
          success: true,
          bookingId: info.lastInsertRowid,
          qr_code,
          unit_fare: segmentBasedUnitFare,
          total_fare: totalFare,
          qr_download_url: createTicketPdfUrl(req, qr_code),
        });
        return;
      }
    } else {
      const routeStops = db.prepare(`
        SELECT id
        FROM route_stops
        WHERE route_id = ?
      `).all(scheduleInfo.route_id);
      routeStopCount = Math.max((routeStops?.length || 0) + 2, 2);
      segmentStopCount = routeStopCount;
    }

    const fixedBetweenStopRate = Math.max(0, Number(scheduleInfo.between_stop_rate) || 0);
    const unitFare = (isLocalRoute && fixedBetweenStopRate > 0)
      ? Math.max(1, Math.round(fixedBetweenStopRate * Math.max(segmentStopCount - 1, 1)))
      : calculateDistanceStopFare({
          distanceKm: segmentDistanceKm,
          stopCount: segmentStopCount,
          isLocalRoute,
        });
    const totalFare = unitFare * parsedTicketCount;

    const finalSeatNumber = isLocalRoute ? "N/A" : seat_number;

    const existingSeat = isLocalRoute
      ? null
      : db
          .prepare(
            "SELECT id FROM bookings WHERE schedule_id = ? AND seat_number = ? AND status = 'confirmed'"
          )
          .get(schedule_id, seat_number);

    if (existingSeat) {
      res.status(409).json({ success: false, message: "Seat is already booked" });
      return;
    }

    const qr_code = `TICKET-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const info = db.prepare(`
      INSERT INTO bookings (
        user_id,
        schedule_id,
        seat_number,
        ticket_count,
        boarding_stop,
        drop_stop,
        unit_fare,
        total_fare,
        booking_date,
        qr_code,
        passenger_name,
        passenger_age,
        passenger_gender
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user_id || 1,
      schedule_id,
      finalSeatNumber,
      parsedTicketCount,
      finalBoardingStop,
      finalDropStop,
      unitFare,
      totalFare,
      new Date().toISOString(),
      qr_code,
      passenger_name,
      passenger_age,
      passenger_gender
    );
    res.json({
      success: true,
      bookingId: info.lastInsertRowid,
      qr_code,
      unit_fare: unitFare,
      total_fare: totalFare,
      qr_download_url: createTicketPdfUrl(req, qr_code),
    });
  });

  app.get("/api/tickets/:qrCode/pdf", async (req, res) => {
    const qrCode = extractTicketQrCode(req.params.qrCode);

    if (!qrCode) {
      res.status(400).json({ success: false, message: "Valid ticket code is required" });
      return;
    }

    if (firestoreStore.enabled) {
      const result = firestoreStore.getBookingByQrCode
        ? await firestoreStore.getBookingByQrCode(qrCode)
        : await firestoreStore.scanBookingForConductor({ qr_code: qrCode, bus_number: "" });

      if (!result.success || !result.booking) {
        res.status(result.statusCode || 404).json({ success: false, message: result.message || "Ticket not found" });
        return;
      }

      if (result.booking.status !== "confirmed") {
        res.status(409).json({ success: false, message: `Ticket is ${result.booking.status}` });
        return;
      }

      try {
        const storageResult = await persistFirestoreTicketPdfIfPossible(firestoreStore, qrCode, result.booking);
        if (storageResult.success && storageResult.downloadUrl) {
          res.redirect(storageResult.downloadUrl);
          return;
        }
      } catch (error) {
        console.warn("Unable to backfill ticket PDF in Firebase Storage:", error.message);
      }

      await streamTicketPdf(res, result.booking);
      return;
    }

    const booking = getBookingByQrCodeSqlite(qrCode);
    if (!booking) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    if (booking.status !== "confirmed") {
      res.status(409).json({ success: false, message: `Ticket is ${booking.status}` });
      return;
    }

    await streamTicketPdf(res, booking);
  });

  app.get("/api/user/bookings/:userId", async (req, res) => {
    if (firestoreStore.enabled) {
      const results = await firestoreStore.getUserBookings(req.params.userId);
      res.json(results);
      return;
    }

    const query = `
        SELECT bk.*, s.departure_time, s.arrival_time, COALESCE(bk.total_fare, s.fare) AS fare, r.source, r.destination, r.distance_km,
          b.bus_number, b.bus_type, b.operator,
             bk.passenger_name, bk.passenger_age, bk.passenger_gender
      FROM bookings bk
      JOIN schedules s ON bk.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      JOIN buses b ON s.bus_id = b.id
      WHERE bk.user_id = ?
    `;
    const results = db.prepare(query).all(req.params.userId);
    res.json(results);
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (firestoreStore.enabled) {
      const result = await firestoreStore.updateBookingStatus(id, status);
      if (!result.found) {
        res.status(404).json({ success: false, message: "Booking not found" });
        return;
      }
      res.json({ success: true });
      return;
    }

    db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.post("/api/conductor/scan", async (req, res) => {
    const qrCode = extractTicketQrCode(req.body?.qr_code);
    const busNumber = String(req.body?.bus_number || "").trim();

    if (!qrCode) {
      res.status(400).json({ success: false, message: "Valid QR code or ticket URL is required" });
      return;
    }

    if (firestoreStore.enabled) {
      const result = await firestoreStore.scanBookingForConductor({
        qr_code: qrCode,
        bus_number: busNumber,
      });

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.json(result);
      return;
    }

    const booking = getBookingByQrCodeSqlite(qrCode);

    if (!booking) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    if (booking.status !== "confirmed") {
      res.status(409).json({ success: false, message: `Ticket is ${booking.status}` });
      return;
    }

    if (busNumber && String(booking.bus_number || "").toLowerCase() !== busNumber.toLowerCase()) {
      res.status(409).json({ success: false, message: "Ticket belongs to a different bus" });
      return;
    }

    res.json({
      success: true,
      alreadyIssued: Boolean(booking.physical_issued_at),
      booking,
    });
  });

  app.post("/api/conductor/issue-physical", async (req, res) => {
    const bookingId = Number(req.body?.booking_id);
    const conductorId = String(req.body?.conductor_id || "").trim() || "conductor";

    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      res.status(400).json({ success: false, message: "Valid booking_id is required" });
      return;
    }

    if (firestoreStore.enabled) {
      const result = await firestoreStore.issuePhysicalTicket({
        booking_id: String(bookingId),
        conductor_id: conductorId,
      });

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.json(result);
      return;
    }

    const issuePhysicalTicketTx = db.transaction((id, issuer) => {
      const existing = db.prepare(`
        SELECT bk.id, bk.qr_code, bk.status, bk.booking_date, bk.seat_number,
           bk.ticket_count, bk.boarding_stop, bk.drop_stop, bk.unit_fare, bk.total_fare,
           bk.passenger_name, bk.passenger_age, bk.passenger_gender,
               bk.physical_issued_at, bk.physical_issued_by,
           s.id AS schedule_id, s.departure_time, s.arrival_time, COALESCE(bk.total_fare, s.fare) AS fare,
               r.source, r.destination,
               b.bus_number, b.bus_type, b.operator
        FROM bookings bk
        JOIN schedules s ON bk.schedule_id = s.id
        JOIN routes r ON s.route_id = r.id
        JOIN buses b ON s.bus_id = b.id
        WHERE bk.id = ?
        LIMIT 1
      `).get(id);

      if (!existing) {
        return { success: false, statusCode: 404, message: "Booking not found" };
      }

      if (existing.status !== "confirmed") {
        return { success: false, statusCode: 409, message: `Ticket is ${existing.status}` };
      }

      if (existing.physical_issued_at) {
        return {
          success: false,
          statusCode: 409,
          message: "Physical ticket is already issued",
          alreadyIssued: true,
          issuedAt: existing.physical_issued_at,
          issuedBy: existing.physical_issued_by || null,
        };
      }

      const now = new Date().toISOString();
      const updateResult = db.prepare(`
        UPDATE bookings
        SET physical_issued_at = ?, physical_issued_by = ?, boarded_at = ?
        WHERE id = ? AND physical_issued_at IS NULL
      `).run(now, issuer, now, id);

      if (updateResult.changes !== 1) {
        return {
          success: false,
          statusCode: 409,
          message: "Physical ticket is already issued",
          alreadyIssued: true,
        };
      }

      return {
        success: true,
        alreadyIssued: false,
        issuedAt: now,
        issuedBy: issuer,
        ticket: {
          booking_id: existing.id,
          qr_code: existing.qr_code,
          booking_date: existing.booking_date,
          schedule_id: existing.schedule_id,
          source: existing.source,
          destination: existing.destination,
          departure_time: existing.departure_time,
          arrival_time: existing.arrival_time,
          fare: existing.fare,
          ticket_count: existing.ticket_count,
          boarding_stop: existing.boarding_stop,
          drop_stop: existing.drop_stop,
          unit_fare: existing.unit_fare,
          total_fare: existing.total_fare,
          seat_number: existing.seat_number,
          passenger_name: existing.passenger_name,
          passenger_age: existing.passenger_age,
          passenger_gender: existing.passenger_gender,
          bus_number: existing.bus_number,
          bus_type: existing.bus_type,
          operator: existing.operator,
          physical_issued_at: now,
          physical_issued_by: issuer,
        },
      };
    });

    const result = issuePhysicalTicketTx(bookingId, conductorId);
    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.json(result);
  });

  
  app.get("/api/admin/stats", async (req, res) => {
    if (firestoreStore.enabled) {
      const stats = await firestoreStore.getAdminStats();
      res.json(stats);
      return;
    }

    const stats = {
      totalBuses: db.prepare("SELECT count(*) as count FROM buses").get(),
      totalBookings: db.prepare("SELECT count(*) as count FROM bookings").get(),
      revenue: db.prepare("SELECT sum(COALESCE(bk.total_fare, s.fare)) as total FROM bookings bk JOIN schedules s ON bk.schedule_id = s.id").get()
    };
    res.json(stats);
  });

  app.get("/api/admin/schedules", async (req, res) => {
    const limit = Number(req.query.limit) || 25;

    if (firestoreStore.enabled) {
      const schedules = await firestoreStore.getAdminSchedules(limit);
      res.json(schedules);
      return;
    }

    const schedules = db.prepare(`
      SELECT s.id, s.departure_time, s.arrival_time, s.fare, s.between_stop_rate,
             b.bus_number, b.bus_type, b.operator, b.capacity,
             r.id AS route_id, r.source, r.destination, r.distance_km,
             (SELECT count(*) FROM route_stops rs WHERE rs.route_id = r.id) AS stops_count
      FROM schedules s
      JOIN buses b ON s.bus_id = b.id
      JOIN routes r ON s.route_id = r.id
      ORDER BY s.id DESC
      LIMIT ?
    `).all(limit);

    console.log(`[GET /api/admin/schedules] Returned ${schedules.length} schedules with IDs:`, schedules.map(s => s.id));
    res.json(schedules);
  });

  // Debug endpoint - show all available schedules
  app.get("/api/admin/debug/schedules", async (req, res) => {
    if (firestoreStore.enabled) {
      res.json({ mode: 'firestore', note: 'Check Firestore console' });
      return;
    }

    const schedules = db.prepare("SELECT id FROM schedules ORDER BY id DESC").all();
    console.log("[DEBUG] All schedules in DB:", schedules);
    res.json({ 
      mode: 'sqlite',
      totalCount: schedules.length,
      ids: schedules.map(s => s.id),
      message: `There are ${schedules.length} schedules in the database`
    });
  });

  app.post("/api/admin/buses", async (req, res) => {
    const {
      bus_number,
      bus_type,
      operator,
      capacity,
      source,
      destination,
      distance_km,
      departure_time,
      arrival_time,
      fare,
      between_stop_rate,
      stops,
    } = req.body || {};

    const busNumber = String(bus_number || "").trim();
    const busType = String(bus_type || "").trim();
    const busOperator = String(operator || "").trim();
    const sourceCity = String(source || "").trim();
    const destinationCity = String(destination || "").trim();
    const departureTime = String(departure_time || "").trim();
    const arrivalTime = String(arrival_time || "").trim();
    const parsedCapacity = Math.max(1, Number(capacity) || 40);
    const parsedDistance = Math.max(0, Number(distance_km) || 0);
    const parsedFare = Math.max(0, Number(fare) || 0);
    const parsedBetweenStopRate = Math.max(0, Number(between_stop_rate) || 0);
    const stopList = parseStopsInput(stops);
    const computedStopCount = Math.max(stopList.length + 2, 2);
    const finalFare = parsedFare > 0
      ? parsedFare
      : calculateDistanceStopFare({
          distanceKm: parsedDistance,
          stopCount: computedStopCount,
          isLocalRoute: String(busType).toLowerCase().includes("local"),
        });

    if (!busNumber || !busType || !busOperator || !sourceCity || !destinationCity || !departureTime || !arrivalTime) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    if (!ALLOWED_ADMIN_BUS_TYPES.has(busType)) {
      res.status(400).json({
        success: false,
        message: "bus_type must be one of: TNSTC, KSRTC, SETC, Local buses",
      });
      return;
    }

    if (firestoreStore.enabled) {
      const result = await firestoreStore.createAdminSchedule({
        bus_number: busNumber,
        bus_type: busType,
        operator: busOperator,
        capacity: parsedCapacity,
        source: sourceCity,
        destination: destinationCity,
        distance_km: parsedDistance,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        fare: finalFare,
        between_stop_rate: parsedBetweenStopRate,
        stops,
      });

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.status(201).json(result);
      return;
    }

    const createSchedule = db.transaction(() => {
      let bus = db.prepare("SELECT id FROM buses WHERE bus_number = ?").get(busNumber);
      if (!bus) {
        const busInsert = db
          .prepare("INSERT INTO buses (bus_number, bus_type, capacity, operator) VALUES (?, ?, ?, ?)")
          .run(busNumber, busType, parsedCapacity, busOperator);
        bus = { id: Number(busInsert.lastInsertRowid) };
      } else {
        db.prepare("UPDATE buses SET bus_type = ?, capacity = ?, operator = ? WHERE id = ?")
          .run(busType, parsedCapacity, busOperator, bus.id);
      }

      let route = db.prepare("SELECT id FROM routes WHERE source = ? AND destination = ? LIMIT 1").get(sourceCity, destinationCity);
      if (!route) {
        const routeInsert = db
          .prepare("INSERT INTO routes (source, destination, distance_km) VALUES (?, ?, ?)")
          .run(sourceCity, destinationCity, parsedDistance);
        route = { id: Number(routeInsert.lastInsertRowid) };
      } else {
        db.prepare("UPDATE routes SET distance_km = ? WHERE id = ?").run(parsedDistance, route.id);
      }

      const existingSchedule = db.prepare(`
        SELECT s.id
        FROM schedules s
        WHERE s.bus_id = ? AND s.route_id = ? AND s.departure_time = ?
        LIMIT 1
      `).get(bus.id, route.id, departureTime);

      if (existingSchedule) {
        return { duplicate: true };
      }

      const scheduleInsert = db
        .prepare("INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, fare, between_stop_rate) VALUES (?, ?, ?, ?, ?, ?)")
        .run(bus.id, route.id, departureTime, arrivalTime, finalFare, parsedBetweenStopRate);

      db.prepare("DELETE FROM route_stops WHERE route_id = ?").run(route.id);
      const stopInsert = db.prepare("INSERT INTO route_stops (route_id, stop_name, stop_order, stop_time, segment_price) VALUES (?, ?, ?, ?, ?)");
      stopList.forEach((stop) => {
        stopInsert.run(route.id, stop.stop_name, stop.stop_order, stop.stop_time, Number(stop.segment_price || 0));
      });

      const schedule = db.prepare(`
        SELECT s.id, s.departure_time, s.arrival_time, s.fare, s.between_stop_rate,
               b.bus_number, b.bus_type, b.operator, b.capacity,
               r.source, r.destination, r.distance_km
        FROM schedules s
        JOIN buses b ON s.bus_id = b.id
        JOIN routes r ON s.route_id = r.id
        WHERE s.id = ?
        LIMIT 1
      `).get(Number(scheduleInsert.lastInsertRowid));

      return {
        duplicate: false,
        schedule,
        stops: stopList,
      };
    });

    const result = createSchedule();

    if (result.duplicate) {
      res.status(409).json({ success: false, message: "Schedule already exists" });
      return;
    }

    res.status(201).json({ success: true, ...result });
  });

  app.put("/api/admin/schedules/:id", async (req, res) => {
    try {
      const scheduleId = String(req.params?.id || "").trim();
      const {
        bus_number,
        bus_type,
        operator,
        capacity,
        source,
        destination,
        distance_km,
        departure_time,
        arrival_time,
        fare,
        between_stop_rate,
        stops,
      } = req.body || {};

      if (!scheduleId) {
        res.status(400).json({ success: false, message: "Schedule ID is required" });
        return;
      }

      const busNumber = String(bus_number || "").trim();
      const busType = String(bus_type || "").trim();
      const busOperator = String(operator || "").trim();
      const sourceCity = String(source || "").trim();
      const destinationCity = String(destination || "").trim();
      const departureTime = String(departure_time || "").trim();
      const arrivalTime = String(arrival_time || "").trim();
      const parsedCapacity = Math.max(1, Number(capacity) || 40);
      const parsedDistance = Math.max(0, Number(distance_km) || 0);
      const parsedFare = Math.max(0, Number(fare) || 0);
      const parsedBetweenStopRate = Math.max(0, Number(between_stop_rate) || 0);
      const stopList = parseStopsInput(stops);
      const computedStopCount = Math.max(stopList.length + 2, 2);
      const finalFare = parsedFare > 0
        ? parsedFare
        : calculateDistanceStopFare({
            distanceKm: parsedDistance,
            stopCount: computedStopCount,
            isLocalRoute: String(busType).toLowerCase().includes("local"),
          });

      if (!busNumber || !busType || !busOperator || !sourceCity || !destinationCity || !departureTime || !arrivalTime) {
        res.status(400).json({ success: false, message: "Missing required fields" });
        return;
      }

      if (!ALLOWED_ADMIN_BUS_TYPES.has(busType)) {
        res.status(400).json({
          success: false,
          message: "bus_type must be one of: TNSTC, KSRTC, SETC, Local buses",
        });
        return;
      }

      if (firestoreStore.enabled) {
        const result = await firestoreStore.updateSchedule(scheduleId, {
          bus_number: busNumber,
          bus_type: busType,
          operator: busOperator,
          capacity: parsedCapacity,
          source: sourceCity,
          destination: destinationCity,
          distance_km: parsedDistance,
          departure_time: departureTime,
          arrival_time: arrivalTime,
          fare: finalFare,
          between_stop_rate: parsedBetweenStopRate,
          stops,
        });

        if (!result.success) {
          res.status(result.statusCode || 400).json(result);
          return;
        }

        res.json(result);
        return;
      }

      // For SQLite, convert string ID to number
      const numericId = Number(scheduleId);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        res.status(400).json({ success: false, message: "Invalid schedule ID" });
        return;
      }

      const updateSchedule = db.transaction((id) => {
        const existing = db.prepare(`
          SELECT s.id, s.bus_id, s.route_id
          FROM schedules s
          WHERE s.id = ?
          LIMIT 1
        `).get(id);

        if (!existing) {
          return { success: false, statusCode: 404, message: "Schedule not found" };
        }

        let bus = db.prepare("SELECT id FROM buses WHERE bus_number = ?").get(busNumber);
        if (!bus) {
          const busInsert = db
            .prepare("INSERT INTO buses (bus_number, bus_type, capacity, operator) VALUES (?, ?, ?, ?)")
            .run(busNumber, busType, parsedCapacity, busOperator);
          bus = { id: Number(busInsert.lastInsertRowid) };
        } else {
          db.prepare("UPDATE buses SET bus_type = ?, capacity = ?, operator = ? WHERE id = ?")
            .run(busType, parsedCapacity, busOperator, bus.id);
        }

        let route = db.prepare("SELECT id FROM routes WHERE source = ? AND destination = ? LIMIT 1").get(sourceCity, destinationCity);
        if (!route) {
          const routeInsert = db
            .prepare("INSERT INTO routes (source, destination, distance_km) VALUES (?, ?, ?)")
            .run(sourceCity, destinationCity, parsedDistance);
          route = { id: Number(routeInsert.lastInsertRowid) };
        } else {
          db.prepare("UPDATE routes SET distance_km = ? WHERE id = ?").run(parsedDistance, route.id);
        }

        db.prepare("UPDATE schedules SET bus_id = ?, route_id = ?, departure_time = ?, arrival_time = ?, fare = ?, between_stop_rate = ? WHERE id = ?")
          .run(bus.id, route.id, departureTime, arrivalTime, finalFare, parsedBetweenStopRate, id);

        db.prepare("DELETE FROM route_stops WHERE route_id = ?").run(route.id);
        const stopInsert = db.prepare("INSERT INTO route_stops (route_id, stop_name, stop_order, stop_time, segment_price) VALUES (?, ?, ?, ?, ?)");
        stopList.forEach((stop) => {
          stopInsert.run(route.id, stop.stop_name, stop.stop_order, stop.stop_time, Number(stop.segment_price || 0));
        });

        const schedule = db.prepare(`
          SELECT s.id, s.departure_time, s.arrival_time, s.fare, s.between_stop_rate,
                 b.bus_number, b.bus_type, b.operator, b.capacity,
                 r.source, r.destination, r.distance_km
          FROM schedules s
          JOIN buses b ON s.bus_id = b.id
          JOIN routes r ON s.route_id = r.id
          WHERE s.id = ?
          LIMIT 1
        `).get(id);

        return {
          success: true,
          message: "Schedule updated successfully",
          schedule,
          stops: stopList,
        };
      });

      const result = updateSchedule(numericId);

      if (!result.success) {
        res.status(result.statusCode || 400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Update schedule error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/schedules/:id", async (req, res) => {
    console.log(`\n[DELETE] === ENDPOINT CALLED ===`);
    console.log(`[DELETE] Req.params:`, req.params);
    console.log(`[DELETE] Req.params.id:`, req.params.id, `(type: ${typeof req.params.id})`);
    
    try {
      const scheduleId = String(req.params?.id || "").trim();
      console.log(`[DELETE] Extracted scheduleId:`, scheduleId);

      if (!scheduleId) {
        console.log(`[DELETE] Schedule ID is required - returning 400`);
        res.status(400).json({ success: false, message: "Schedule ID is required" });
        return;
      }

      if (firestoreStore.enabled) {
        console.log(`[DELETE] Using Firestore mode`);
        const result = await firestoreStore.deleteSchedule(scheduleId);

        if (!result.success) {
          console.log(`[DELETE] Firestore delete failed:`, result);
          res.status(result.statusCode || 400).json(result);
          return;
        }

        console.log(`[DELETE] Firestore delete success`);
        res.json(result);
        return;
      }

      console.log(`[DELETE] Using SQLite mode`);
      // For SQLite, convert string ID to number
      const numericId = Number(scheduleId);
      console.log(`[DELETE] Converted ID to number:`, numericId, `(valid: ${Number.isFinite(numericId) && numericId > 0})`);
      
      if (!Number.isFinite(numericId) || numericId <= 0) {
        console.log(`[DELETE] Invalid schedule ID (not a valid number)`);
        res.status(400).json({ success: false, message: "Invalid schedule ID" });
        return;
      }

      // Debug: Log the ID being deleted and what exists in database
      const allSchedules = db.prepare("SELECT id FROM schedules ORDER BY id DESC").all();
      const availableIds = allSchedules.map(s => s.id);
      console.log(`[DELETE] Attempting to delete schedule ID ${numericId}`);
      console.log(`[DELETE] Available schedule IDs in DB: [${availableIds.join(', ')}]`);

      const deleteSchedule = db.transaction((id) => {
        console.log(`[DELETE] Inside transaction, checking if ID ${id} exists...`);
        const existing = db.prepare("SELECT id FROM schedules WHERE id = ? LIMIT 1").get(id);
        console.log(`[DELETE] Query result:`, existing);

        if (!existing) {
          const msg = availableIds.length > 0 
            ? `Schedule ID ${id} not found. Available IDs: [${availableIds.join(', ')}]`
            : `Schedule ID ${id} not found. No schedules exist.`;
          console.log(`[DELETE] ${msg}`);
          return { success: false, statusCode: 404, message: msg };
        }

        console.log(`[DELETE] ID ${id} found! Deleting...`);
        db.prepare("DELETE FROM schedules WHERE id = ?").run(id);
        console.log(`[DELETE] Successfully deleted schedule ID ${id}`);

        return { success: true, message: "Schedule deleted successfully" };
      });

      const result = deleteSchedule(numericId);
      console.log(`[DELETE] Transaction result:`, result);

      if (!result.success) {
        console.log(`[DELETE] Sending error response with status ${result.statusCode || 400}:`, result);
        res.status(result.statusCode || 400).json(result);
        return;
      }

      console.log(`[DELETE] Sending success response:`, result);
      res.json(result);
    } catch (error) {
      console.error(`[DELETE] ❌ Catch block - error:`, error);
      console.error(`[DELETE] Error details:`, {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  
  if (process.env.NODE_ENV !== "production") {
    // List all registered routes before adding Vite
    console.log(`\n[ROUTES] All registered Express routes:`);
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods);
        routes.push(`${methods.map(m => m.toUpperCase()).join(',')} ${middleware.route.path}`);
      }
    });
    routes.forEach(r => console.log(`  ${r}`));
    console.log(`[ROUTES] Total routes: ${routes.length}\n`);

    // Add a catch-all for unmatched API routes BEFORE Vite middleware
    app.use('/api', (req, res, next) => {
      console.log(`[API-404] No route matched for ${req.method} ${req.path}`);
      res.status(404).json({ 
        success: false, 
        message: `API endpoint not found: ${req.method} ${req.path}` 
      });
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: HMR_PORT },
      },
      appType: "spa",
    });
    console.log(`[VITE] Adding Vite middleware now...`);
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const { port: activePort } = await listenWithPortFallback(app, PORT, "0.0.0.0", 10);
  console.log(`Server running on http://localhost:${activePort}`);
}

startServer();
