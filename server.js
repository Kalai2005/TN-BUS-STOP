import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./src/Backend/config/mongoDb.js";
import authRoutes from "./src/Backend/routes/authRoutes.js";
import bookingRoutes from "./src/Backend/routes/bookingRoutes.js";
import busRoutes from "./src/Backend/routes/busRoutes.js";
import routeRoutes from "./src/Backend/routes/routeRoutes.js";
import conductorRoutes from "./src/Backend/routes/conductorRoutes.js";
import Route from "./src/Backend/models/Route.js";
import Bus from "./src/Backend/models/Bus.js";
import Booking from "./src/Backend/models/Booking.js";
import { getTravelAdvice, getChatbotReply } from "./src/Backend/aiService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

// Security headers for Google Sign-In support
app.use((req, res, next) => {
  const host = (req.get("host") || "").split(":")[0].toLowerCase();
  const forwardedProto = (req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const isHttps = req.secure || forwardedProto === "https";
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";

  // COOP is only honored on potentially trustworthy origins (HTTPS or localhost).
  if (isHttps || isLocalhost) {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  }

  // Ensure proper credentials handling
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Avoid noisy browser 404 for default favicon requests in development.
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

const parseTimeToMinutes = (value) => {
  if (!value) return null;

  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return (hours * 60) + minutes;
};

const formatMinutesToTime = (minutesTotal) => {
  if (!Number.isFinite(minutesTotal)) return "06:00";

  const normalized = ((Math.round(minutesTotal) % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const addDurationToTime = (time, duration) => {
  const startMinutes = parseTimeToMinutes(time);
  const durationMinutes = parseTimeToMinutes(duration);

  if (startMinutes === null || durationMinutes === null) {
    return "18:00";
  }

  return formatMinutesToTime(startMinutes + durationMinutes);
};

const buildLegacyScheduleRecord = (bus, route, index = 0) => {
  const stops = Array.isArray(route?.stops) ? route.stops : [];
  const firstStopTime = stops.find((stop) => stop?.stopTime)?.stopTime || "06:00";
  const lastStopTime = [...stops].reverse().find((stop) => stop?.stopTime)?.stopTime;
  const scheduleId = bus?._id && route?._id
    ? `${bus._id.toString()}:${route._id.toString()}`
    : (route?._id?.toString() || bus?._id?.toString() || `legacy-${index}`);

  return {
    id: scheduleId,
    bus_number: bus?.busNumber || route?.routeNumber || "N/A",
    bus_type: bus?.busType || (route?.isLocalRoute ? "Local buses" : "Private"),
    operator: bus?.operatorName || route?.routeName || "N/A",
    source: route?.source || "",
    destination: route?.destination || "",
    departure_time: firstStopTime,
    arrival_time: lastStopTime || addDurationToTime(firstStopTime, route?.estimatedDuration),
    distance_km: Number(route?.distance || 0),
    fare: Number(route?.basePrice || 0),
    capacity: Number(bus?.totalSeats || 0),
    between_stops: stops.map((stop) => ({
      stop_name: stop?.stopName || "",
      stop_time: stop?.stopTime || "",
      segment_price: Number(stop?.segment_price || 0),
    })).filter((stop) => stop.stop_name),
    stops_count: stops.length,
    routeId: route?._id?.toString() || null,
    busId: bus?._id?.toString() || null,
  };
};

const parseMinutesDifference = (departureTime, arrivalTime) => {
  const departureMinutes = parseTimeToMinutes(departureTime);
  const arrivalMinutes = parseTimeToMinutes(arrivalTime);

  if (departureMinutes === null || arrivalMinutes === null) {
    return null;
  }

  let normalizedArrival = arrivalMinutes;
  while (normalizedArrival < departureMinutes) {
    normalizedArrival += 24 * 60;
  }

  return normalizedArrival - departureMinutes;
};

const formatMinutesAsDuration = (minutesTotal) => {
  if (!Number.isFinite(minutesTotal)) {
    return "00:00";
  }

  const hours = String(Math.floor(minutesTotal / 60)).padStart(2, "0");
  const minutes = String(minutesTotal % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const toLegacyBookingId = (bookingId) => {
  const raw = String(bookingId || "").trim();
  if (!raw) return 0;

  const hex = raw.replace(/[^a-fA-F0-9]/g, "").slice(-8);
  if (!hex) return 0;

  const numeric = Number.parseInt(hex, 16);
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildLegacyTicketPayload = (booking) => {
  const bus = booking?.busId || {};
  const route = booking?.routeId || {};
  const legacyId = toLegacyBookingId(booking?._id?.toString());

  return {
    id: legacyId,
    booking_id: legacyId,
    qr_code: booking?.qrCode || `TICKET-${legacyId}`,
    status: booking?.status || "confirmed",
    booking_date: booking?.createdAt || new Date().toISOString(),
    seat_number: booking?.seatNumber || (Array.isArray(booking?.seatNumbers) ? booking.seatNumbers[0] : "N/A"),
    ticket_count: booking?.ticketCount || (Array.isArray(booking?.seatNumbers) ? booking.seatNumbers.length : 1),
    boarding_stop: booking?.boardingStop || booking?.boardingPoint || route?.source || "N/A",
    drop_stop: booking?.dropStop || booking?.droppingPoint || route?.destination || "N/A",
    unit_fare: booking?.unitFare || booking?.pricePerSeat || booking?.fare || 0,
    total_fare: booking?.totalPrice || booking?.fare || 0,
    passenger_name: booking?.passengerName || booking?.userId?.name || "N/A",
    passenger_age: booking?.passengerAge || "N/A",
    passenger_gender: booking?.passengerGender || "N/A",
    physical_issued_at: booking?.physicalIssuedAt || null,
    physical_issued_by: booking?.physicalIssuedBy || null,
    boarded_at: booking?.boardedAt || null,
    source: route?.source || booking?.boardingPoint || "N/A",
    destination: route?.destination || booking?.droppingPoint || "N/A",
    departure_time: route?.departure_time || booking?.departureTime || "N/A",
    arrival_time: route?.arrival_time || booking?.arrivalTime || "N/A",
    fare: booking?.totalPrice || booking?.fare || 0,
    bus_number: bus?.busNumber || booking?.bus_number || "N/A",
    bus_type: bus?.busType || booking?.bus_type || "N/A",
    operator: bus?.operatorName || booking?.operator || "N/A",
  };
};

const buildRouteStops = (stops = []) => (
  stops
    .map((stop) => ({
      stopName: stop?.stop_name || stop?.stopName || "",
      stopTime: stop?.stop_time || stop?.stopTime || "",
      distance: Number(stop?.distance || 0),
    }))
    .filter((stop) => stop.stopName)
);

const resolveLegacySchedule = async (scheduleId) => {
  const rawId = String(scheduleId || "").trim();
  if (!rawId) return null;

  const [busId, routeId] = rawId.split(":");

  if (busId && routeId) {
    const [bus, route] = await Promise.all([
      Bus.findById(busId),
      Route.findById(routeId),
    ]);

    if (bus && route) {
      return { bus, route };
    }
  }

  const route = await Route.findById(rawId);
  if (route) {
    const assignedBus = await Bus.findOne({ routeIds: route._id });
    return { bus: assignedBus, route };
  }

  return null;
};

const upsertLegacySchedule = async ({
  busNumber,
  busType,
  operator,
  capacity,
  source,
  destination,
  distanceKm,
  departureTime,
  arrivalTime,
  fare,
  betweenStopRate,
  stops,
}) => {
  const routeName = `${source} - ${destination}`;
  const routeNumber = `RT-${String(busNumber || routeName).replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase()}`;
  const stopList = buildRouteStops(stops);
  const estimatedDuration = formatMinutesAsDuration(parseMinutesDifference(departureTime, arrivalTime) || 0);

  let bus = await Bus.findOne({ busNumber });
  if (!bus) {
    bus = new Bus({
      busNumber,
      busType,
      registrationNumber: `REG-${busNumber}`,
      totalSeats: capacity,
      operatorName: operator,
      driverName: operator,
      driverPhone: "0000000000",
      manufacturingYear: new Date().getFullYear(),
      routeIds: [],
    });
  } else {
    bus.busType = busType;
    bus.totalSeats = capacity;
    bus.operatorName = operator;
  }

  let route = await Route.findOne({ routeNumber });
  if (!route) {
    route = new Route({
      routeName,
      routeNumber,
      source,
      destination,
      distance: distanceKm,
      stops: [],
      estimatedDuration,
      basePrice: fare,
      pricePerKm: 1.2,
      isLocalRoute: String(busType || "").toLowerCase().includes("local"),
    });
  } else {
    route.routeName = routeName;
    route.source = source;
    route.destination = destination;
    route.distance = distanceKm;
    route.estimatedDuration = estimatedDuration;
    route.basePrice = fare;
    route.isLocalRoute = String(busType || "").toLowerCase().includes("local");
  }

  route.stops = stopList;
  await route.save();

  bus.routeIds = Array.from(new Set([...(Array.isArray(bus.routeIds) ? bus.routeIds.map((id) => id.toString()) : []), route._id.toString()]))
    .map((id) => id);
  await bus.save();

  return buildLegacyScheduleRecord(bus, route);
};

const buildLegacySchedules = async ({ source, destination, limit } = {}) => {
  const routeFilter = { isActive: true };

  if (source) {
    routeFilter.source = { $regex: source, $options: "i" };
  }

  if (destination) {
    routeFilter.destination = { $regex: destination, $options: "i" };
  }

  const routes = await Route.find(routeFilter).sort({ createdAt: -1 });
  const buses = await Bus.find({ isActive: true }).populate({ path: "routeIds", match: { isActive: true } });

  const schedules = [];

  for (const bus of buses) {
    const assignedRoutes = Array.isArray(bus.routeIds) ? bus.routeIds : [];

    for (const route of assignedRoutes) {
      if (!route) continue;

      schedules.push(buildLegacyScheduleRecord(bus, route, schedules.length));
    }
  }

  if (schedules.length === 0) {
    routes.forEach((route, routeIndex) => {
      schedules.push(buildLegacyScheduleRecord(null, route, routeIndex));
    });
  }

  return typeof limit === "number" ? schedules.slice(0, limit) : schedules;
};

// ==================== MONGODB CONNECTION ====================
await connectDB();

// ==================== HEALTH CHECK ENDPOINT ====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    googleClientId: process.env.GOOGLE_CLIENT_ID ? "✅ Configured" : "❌ Missing",
  });
});

// ==================== API ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/conductors", conductorRoutes);

// Legacy compatibility endpoints used by the current UI.
app.get("/api/locations", async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true }).select("source destination");
    const locations = [...new Set(routes.flatMap((route) => [route.source, route.destination]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    res.json(locations);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const { source = "", destination = "" } = req.query;
    const schedules = await buildLegacySchedules({ source, destination });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/advice", async (req, res) => {
  try {
    const { source = "Any", destination = "" } = req.body || {};

    if (!destination) {
      return res.status(400).json({ success: false, message: "Destination is required" });
    }

    const advice = await getTravelAdvice(source, destination);
    res.json({ success: true, advice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/chatbot', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const reply = await getChatbotReply({ message, history });
    return res.json({ success: true, reply });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/stats", async (req, res) => {
  try {
    const [totalBuses, totalBookings, totalRoutes] = await Promise.all([
      Bus.countDocuments(),
      Booking.countDocuments(),
      Route.countDocuments(),
    ]);

    const revenueResult = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    res.json({
      success: true,
      totalBuses: { count: totalBuses },
      totalBookings: { count: totalBookings },
      totalRoutes: { count: totalRoutes },
      revenue: { total: revenueResult[0]?.total || 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/schedules", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const schedules = await buildLegacySchedules({ limit: Number.isFinite(limit) ? limit : undefined });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/debug/schedules", async (req, res) => {
  try {
    const schedules = await buildLegacySchedules();

    res.json({
      success: true,
      ids: schedules.map((schedule) => schedule.id),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/buses", async (req, res) => {
  try {
    const schedule = await upsertLegacySchedule({
      busNumber: String(req.body?.bus_number || "").trim(),
      busType: String(req.body?.bus_type || "").trim(),
      operator: String(req.body?.operator || "").trim(),
      capacity: Number(req.body?.capacity || 40),
      source: String(req.body?.source || "").trim(),
      destination: String(req.body?.destination || "").trim(),
      distanceKm: Number(req.body?.distance_km || 0),
      departureTime: String(req.body?.departure_time || "").trim(),
      arrivalTime: String(req.body?.arrival_time || "").trim(),
      fare: Number(req.body?.fare || 0),
      betweenStopRate: Number(req.body?.between_stop_rate || 0),
      stops: req.body?.stops || [],
    });

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put("/api/admin/schedules/:id", async (req, res) => {
  try {
    const resolved = await resolveLegacySchedule(req.params.id);
    if (!resolved?.route) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    const busNumber = String(req.body?.bus_number || resolved.bus?.busNumber || "").trim();
    const busType = String(req.body?.bus_type || resolved.bus?.busType || "").trim();
    const operator = String(req.body?.operator || resolved.bus?.operatorName || "").trim();
    const capacity = Number(req.body?.capacity || resolved.bus?.totalSeats || 40);
    const source = String(req.body?.source || resolved.route?.source || "").trim();
    const destination = String(req.body?.destination || resolved.route?.destination || "").trim();
    const distanceKm = Number(req.body?.distance_km || resolved.route?.distance || 0);
    const departureTime = String(req.body?.departure_time || resolved.route?.stops?.[0]?.stopTime || "").trim();
    const arrivalTime = String(req.body?.arrival_time || resolved.route?.estimatedDuration || "").trim();
    const fare = Number(req.body?.fare || resolved.route?.basePrice || 0);
    const stops = req.body?.stops || [];
    const routeStops = buildRouteStops(stops);

    let bus = resolved.bus || null;
    if (!bus) {
      bus = new Bus({
        busNumber,
        busType,
        registrationNumber: `REG-${busNumber}`,
        totalSeats: capacity,
        operatorName: operator,
        driverName: operator,
        driverPhone: "0000000000",
        manufacturingYear: new Date().getFullYear(),
        routeIds: [resolved.route._id],
      });
    } else {
      bus.busNumber = busNumber;
      bus.busType = busType;
      bus.totalSeats = capacity;
      bus.operatorName = operator;
      if (!bus.routeIds.some((routeId) => routeId.toString() === resolved.route._id.toString())) {
        bus.routeIds.push(resolved.route._id);
      }
    }

    bus.routeIds = Array.from(new Set(bus.routeIds.map((id) => id.toString())));
    await bus.save();

    resolved.route.routeName = `${source} - ${destination}`;
    resolved.route.source = source;
    resolved.route.destination = destination;
    resolved.route.distance = distanceKm;
    resolved.route.basePrice = fare;
    resolved.route.isLocalRoute = String(busType || "").toLowerCase().includes("local");
    resolved.route.stops = routeStops;

    const durationMinutes = parseMinutesDifference(departureTime, String(req.body?.arrival_time || ""))
      ?? parseMinutesDifference(departureTime, resolved.route.estimatedDuration)
      ?? 0;
    resolved.route.estimatedDuration = formatMinutesAsDuration(durationMinutes);
    await resolved.route.save();

    res.json({ success: true, schedule: buildLegacyScheduleRecord(bus, resolved.route) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete("/api/admin/schedules/:id", async (req, res) => {
  try {
    const resolved = await resolveLegacySchedule(req.params.id);
    if (!resolved?.route) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    resolved.route.isActive = false;
    await resolved.route.save();

    if (resolved.bus) {
      resolved.bus.routeIds = resolved.bus.routeIds.filter((routeId) => routeId.toString() !== resolved.route._id.toString());
      await resolved.bus.save();
    }

    res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post("/api/conductor/scan", async (req, res) => {
  try {
    const qrCode = String(req.body?.qr_code || "").trim();
    const busNumber = String(req.body?.bus_number || "").trim().toLowerCase();

    if (!qrCode) {
      return res.status(400).json({ success: false, message: "Valid QR code or ticket URL is required" });
    }

    const bookings = await Booking.find()
      .populate({ path: "busId", select: "busNumber busType operatorName" })
      .populate({ path: "routeId", select: "source destination departure_time arrival_time" })
      .populate({ path: "userId", select: "name email phone" });

    const target = bookings.find((booking) => {
      const legacyId = toLegacyBookingId(booking._id.toString());
      const ticketCode = `TICKET-${legacyId}`;
      const codeMatches = qrCode.toUpperCase() === ticketCode || qrCode === String(legacyId) || qrCode === booking._id.toString();
      const busMatches = !busNumber || String(booking.busId?.busNumber || "").toLowerCase() === busNumber;
      return codeMatches && busMatches;
    });

    if (!target) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (target.status !== "confirmed") {
      return res.status(409).json({ success: false, message: `Ticket is ${target.status}` });
    }

    const ticket = buildLegacyTicketPayload(target);
    res.json({
      success: true,
      alreadyIssued: Boolean(ticket.physical_issued_at),
      booking: ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/conductor/issue-physical", async (req, res) => {
  try {
    const bookingId = Number(req.body?.booking_id);
    const conductorId = String(req.body?.conductor_id || "").trim() || "conductor";

    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, message: "Valid booking_id is required" });
    }

    const bookings = await Booking.find()
      .populate({ path: "busId", select: "busNumber busType operatorName" })
      .populate({ path: "routeId", select: "source destination departure_time arrival_time" })
      .populate({ path: "userId", select: "name email phone" });

    const target = bookings.find((booking) => toLegacyBookingId(booking._id.toString()) === bookingId);
    if (!target) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (target.status !== "confirmed") {
      return res.status(409).json({ success: false, message: `Ticket is ${target.status}` });
    }

    if (target.physicalIssuedAt) {
      const ticket = buildLegacyTicketPayload(target);
      return res.status(409).json({
        success: false,
        message: "Physical ticket is already issued",
        alreadyIssued: true,
        issuedAt: target.physicalIssuedAt,
        issuedBy: target.physicalIssuedBy || null,
        ticket,
      });
    }

    target.physicalIssuedAt = new Date();
    target.physicalIssuedBy = conductorId;
    target.boardedAt = new Date();
    await target.save();

    const ticket = buildLegacyTicketPayload(target);

    res.json({
      success: true,
      alreadyIssued: false,
      issuedAt: ticket.physical_issued_at,
      issuedBy: conductorId,
      ticket,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== HEALTH CHECK ====================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ==================== VITE DEVELOPMENT SERVER ====================
async function setupViteDevServer() {
  if (process.env.NODE_ENV === "production") {
    // In production, serve static files from dist
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    
    // Serve index.html for all other routes (SPA)
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    // In development, use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);

    // Serve index.html for all non-API routes
    app.get(/^(?!\/api)/, (req, res, next) => {
      if (req.path.startsWith("/@")) return next();
      vite.transformIndexHtml(req.originalUrl, 
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Bus Transport System</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.jsx"></script>
          </body>
        </html>`
      ).then(html => res.end(html));
    });
  }
}

// ==================== SERVER START ====================
async function startServer() {
  try {
    await setupViteDevServer();

    // ==================== ERROR HANDLING ====================
    app.use((err, req, res, next) => {
      console.error("Error:", err);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    });

    // ==================== 404 HANDLER ====================
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`
✅ Server is running!
📍 Local:   http://localhost:${PORT}
📍 API:     http://localhost:${PORT}/api
📍 Health:  http://localhost:${PORT}/api/health
🚀 Environment: ${process.env.NODE_ENV || "development"}
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

if (process.env.NETLIFY !== "true") {
  startServer();
}

export { app };
