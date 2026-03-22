import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toLowerText = (value) => String(value || "").toLowerCase();

const parsePrivateKey = (value) => {
  if (!value) return "";
  return String(value).replace(/\\n/g, "\n");
};

const getCredentialsFromFile = () => {
  const configuredPath = process.env.FIREBASE_CREDENTIALS_PATH;
  const candidatePaths = [
    configuredPath,
    path.resolve(process.cwd(), "Firebase credentials.json"),
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    try {
      if (!existsSync(candidatePath)) {
        continue;
      }

      const raw = readFileSync(candidatePath, "utf8");
      const payload = JSON.parse(raw);

      if (payload.project_id && payload.client_email && payload.private_key) {
        return {
          projectId: payload.project_id,
          clientEmail: payload.client_email,
          privateKey: parsePrivateKey(payload.private_key),
        };
      }
    } catch {
      // Try the next candidate if this file is missing or malformed.
    }
  }

  return null;
};

const getFirestoreDb = () => {
  let projectId = process.env.FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    const fileCredentials = getCredentialsFromFile();
    if (fileCredentials) {
      projectId = fileCredentials.projectId;
      clientEmail = fileCredentials.clientEmail;
      privateKey = fileCredentials.privateKey;
    }
  }

  try {
    if (!getApps().length) {
      if (projectId && clientEmail && privateKey) {
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      } else {
        initializeApp({ credential: applicationDefault() });
      }
    }

    return getFirestore();
  } catch (error) {
    return null;
  }
};

const seedFirestoreFromSqlite = async (sqliteDb, firestore) => {
  const schedulesSnapshot = await firestore.collection("schedules").limit(1).get();
  if (!schedulesSnapshot.empty) {
    return;
  }

  const buses = sqliteDb.prepare("SELECT * FROM buses").all();
  const routes = sqliteDb.prepare("SELECT * FROM routes").all();
  const schedules = sqliteDb.prepare(`
    SELECT s.id, s.bus_id, s.route_id, s.departure_time, s.arrival_time, s.fare,
           b.bus_number, b.bus_type, b.operator, b.capacity,
           r.source, r.destination, r.distance_km
    FROM schedules s
    JOIN buses b ON b.id = s.bus_id
    JOIN routes r ON r.id = s.route_id
  `).all();

  const bookings = sqliteDb.prepare(`
    SELECT bk.*, s.fare, s.departure_time, s.arrival_time,
           r.source, r.destination, r.distance_km,
           b.bus_number, b.bus_type, b.operator
    FROM bookings bk
    JOIN schedules s ON s.id = bk.schedule_id
    JOIN routes r ON r.id = s.route_id
    JOIN buses b ON b.id = s.bus_id
  `).all();

  let batch = firestore.batch();
  let operations = 0;

  const commitIfNeeded = async () => {
    if (operations === 0) return;
    await batch.commit();
    batch = firestore.batch();
    operations = 0;
  };

  const queueWrite = async (ref, data) => {
    batch.set(ref, data);
    operations += 1;
    if (operations >= 400) {
      await commitIfNeeded();
    }
  };

  for (const bus of buses) {
    await queueWrite(firestore.collection("buses").doc(String(bus.id)), {
      ...bus,
      capacity: toNumber(bus.capacity),
    });
  }

  for (const route of routes) {
    await queueWrite(firestore.collection("routes").doc(String(route.id)), {
      ...route,
      distance_km: toNumber(route.distance_km),
      source_lower: toLowerText(route.source),
      destination_lower: toLowerText(route.destination),
    });
  }

  for (const schedule of schedules) {
    await queueWrite(firestore.collection("schedules").doc(String(schedule.id)), {
      ...schedule,
      id: toNumber(schedule.id),
      bus_id: toNumber(schedule.bus_id),
      route_id: toNumber(schedule.route_id),
      fare: toNumber(schedule.fare),
      capacity: toNumber(schedule.capacity, 40),
      distance_km: toNumber(schedule.distance_km),
      source_lower: toLowerText(schedule.source),
      destination_lower: toLowerText(schedule.destination),
    });
  }

  for (const booking of bookings) {
    await queueWrite(firestore.collection("bookings").doc(String(booking.id)), {
      ...booking,
      id: toNumber(booking.id),
      user_id: toNumber(booking.user_id, 1),
      schedule_id: toNumber(booking.schedule_id),
      fare: toNumber(booking.fare),
      distance_km: toNumber(booking.distance_km),
      created_at: booking.booking_date || new Date().toISOString(),
    });
  }

  await commitIfNeeded();
};

const sortByDeparture = (a, b) => String(a.departure_time || "").localeCompare(String(b.departure_time || ""));

const parseStopEntry = (entry) => {
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    const stopName = String(entry.stop_name || entry.name || "").trim();
    const stopTime = String(entry.stop_time || entry.time || "").trim();
    if (!stopName) return null;
    return {
      stop_name: stopName,
      ...(stopTime ? { stop_time: stopTime } : {}),
    };
  }

  const raw = String(entry || "").trim();
  if (!raw) return null;

  const [namePart, timePart] = raw.split("|").map((part) => String(part || "").trim());
  if (!namePart) return null;

  const payload = { stop_name: namePart };
  if (timePart) {
    payload.stop_time = timePart;
  }

  return payload;
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

const buildSearchableSchedule = ({
  id,
  bus,
  route,
  route_doc_id,
  departure_time,
  arrival_time,
  fare,
}) => ({
  id,
  bus_id: toNumber(bus.id),
  route_id: route.id,
  route_doc_id: route_doc_id || null,
  departure_time,
  arrival_time,
  fare: toNumber(fare),
  bus_number: bus.bus_number,
  bus_type: bus.bus_type,
  operator: bus.operator,
  capacity: toNumber(bus.capacity, 40),
  source: route.source,
  destination: route.destination,
  source_lower: toLowerText(route.source),
  destination_lower: toLowerText(route.destination),
  distance_km: toNumber(route.distance_km),
});

export const createFirestoreStore = async (sqliteDb) => {
  const firestore = getFirestoreDb();

  if (!firestore) {
    return {
      enabled: false,
      mode: "sqlite",
      reason: "Firebase credentials not configured; using SQLite.",
    };
  }

  try {
    await seedFirestoreFromSqlite(sqliteDb, firestore);
  } catch (error) {
    console.warn("Firestore seed failed, falling back to SQLite.", error.message);
    return {
      enabled: false,
      mode: "sqlite",
      reason: "Unable to initialize Firestore seed from SQLite.",
    };
  }

  return {
    enabled: true,
    mode: "firestore",
    reason: "Firestore initialized successfully.",
    async getLocations() {
      const routes = await firestore.collection("routes").get();
      const set = new Set();

      routes.forEach((doc) => {
        const data = doc.data();
        if (data.source) set.add(data.source);
        if (data.destination) set.add(data.destination);
      });

      return Array.from(set);
    },

    async search(source, destination) {
      const sourceNeedle = toLowerText(source);
      const destinationNeedle = toLowerText(destination);
      const schedules = await firestore.collection("schedules").get();

      const results = [];
      schedules.forEach((doc) => {
        const item = doc.data();
        const sourceMatches = !sourceNeedle || toLowerText(item.source).includes(sourceNeedle);
        const destinationMatches = !destinationNeedle || toLowerText(item.destination).includes(destinationNeedle);

        if (sourceMatches && destinationMatches) {
          results.push({
            id: toNumber(item.id, Number(doc.id) || 0),
            ...item,
          });
        }
      });

      return results.sort(sortByDeparture);
    },

    async getScheduleById(id) {
      const doc = await firestore.collection("schedules").doc(String(id)).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return {
        id: toNumber(data.id, Number(doc.id) || 0),
        ...data,
      };
    },

    async getScheduleStops(scheduleId) {
      const schedule = await this.getScheduleById(scheduleId);
      if (!schedule) return { found: false, stops: [] };

      const routeDocId = String(schedule.route_doc_id || schedule.route_id || "");
      const routeNumericId = toNumber(schedule.route_id, NaN);

      const [byDocId, byRouteId] = await Promise.all([
        routeDocId
          ? firestore
              .collection("route_stops")
              .where("route_doc_id", "==", routeDocId)
              .get()
          : Promise.resolve({ docs: [] }),
        Number.isFinite(routeNumericId)
          ? firestore
              .collection("route_stops")
              .where("route_id", "==", routeNumericId)
              .get()
          : Promise.resolve({ docs: [] }),
      ]);

      const needsSourceFallback = byDocId.docs.length === 0 && byRouteId.docs.length === 0;
      let bySourceDestination = { docs: [] };

      if (needsSourceFallback && schedule.source && schedule.destination) {
        bySourceDestination = await firestore
          .collection("route_stops")
          .where("source", "==", schedule.source)
          .where("destination", "==", schedule.destination)
          .get();
      }

      const unique = new Map();
      [...byDocId.docs, ...byRouteId.docs, ...bySourceDestination.docs].forEach((doc) => {
        const data = doc.data();
        unique.set(doc.id, {
          id: doc.id,
          stop_name: data.stop_name,
          stop_time: data.stop_time || null,
          stop_order: toNumber(data.stop_order, 0),
        });
      });

      const stops = Array.from(unique.values())
        .filter((stop) => stop.stop_name)
        .sort((a, b) => a.stop_order - b.stop_order);

      return { found: true, stops };
    },

    async getBookedSeats(scheduleId) {
      const snapshot = await firestore
        .collection("bookings")
        .where("schedule_id", "==", toNumber(scheduleId))
        .get();

      return snapshot.docs
        .map((doc) => doc.data())
        .filter((row) => row.status === "confirmed")
        .map((row) => row.seat_number)
        .filter(Boolean);
    },

    async createBooking({ user_id, schedule_id, seat_number, passenger_name, passenger_age, passenger_gender }) {
      const schedule = await this.getScheduleById(schedule_id);
      if (!schedule) {
        return { success: false, statusCode: 404, message: "Schedule not found" };
      }

      const isLocalRoute = String(schedule.bus_type || "").toLowerCase().includes("local");
      if (!isLocalRoute && !seat_number) {
        return { success: false, statusCode: 400, message: "Seat number is required for this bus" };
      }

      const finalSeatNumber = isLocalRoute ? "N/A" : seat_number;

      if (!isLocalRoute) {
        const existingSeat = await firestore
          .collection("bookings")
          .where("schedule_id", "==", toNumber(schedule_id))
          .get();

        const seatTaken = existingSeat.docs.some((doc) => {
          const row = doc.data();
          return row.status === "confirmed" && row.seat_number === finalSeatNumber;
        });

        if (seatTaken) {
          return { success: false, statusCode: 409, message: "Seat is already booked" };
        }
      }

      const qrCode = `TICKET-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
      const bookingRef = firestore.collection("bookings").doc();

      const bookingPayload = {
        id: bookingRef.id,
        user_id: toNumber(user_id, 1),
        schedule_id: toNumber(schedule_id),
        seat_number: finalSeatNumber,
        booking_date: new Date().toISOString(),
        status: "confirmed",
        qr_code: qrCode,
        passenger_name,
        passenger_age: toNumber(passenger_age),
        passenger_gender,
        fare: toNumber(schedule.fare),
        departure_time: schedule.departure_time,
        arrival_time: schedule.arrival_time,
        source: schedule.source,
        destination: schedule.destination,
        distance_km: toNumber(schedule.distance_km),
        bus_number: schedule.bus_number,
        bus_type: schedule.bus_type,
        operator: schedule.operator,
      };

      await bookingRef.set(bookingPayload);

      return {
        success: true,
        bookingId: bookingRef.id,
        qr_code: qrCode,
      };
    },

    async getUserBookings(userId) {
      const snapshot = await firestore
        .collection("bookings")
        .where("user_id", "==", toNumber(userId, 1))
        .get();

      return snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            ...data,
          };
        })
        .sort((a, b) => String(b.booking_date || "").localeCompare(String(a.booking_date || "")));
    },

    async updateBookingStatus(id, status) {
      const ref = firestore.collection("bookings").doc(String(id));
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return { found: false };
      }
      await ref.update({ status });
      return { found: true };
    },

    async getAdminStats() {
      const [busesSnapshot, bookingsSnapshot] = await Promise.all([
        firestore.collection("buses").get(),
        firestore.collection("bookings").get(),
      ]);

      let revenue = 0;
      bookingsSnapshot.forEach((doc) => {
        const item = doc.data();
        revenue += toNumber(item.fare);
      });

      return {
        totalBuses: { count: busesSnapshot.size },
        totalBookings: { count: bookingsSnapshot.size },
        revenue: { total: revenue },
      };
    },

    async getAdminSchedules(limit = 25) {
      const snapshot = await firestore.collection("schedules").get();

      return snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            ...data,
          };
        })
        .sort((a, b) => String(b.departure_time || "").localeCompare(String(a.departure_time || "")))
        .slice(0, toNumber(limit, 25));
    },

    async createAdminSchedule(payload) {
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
        stops,
      } = payload;

      const busNumber = String(bus_number || "").trim();
      const busType = String(bus_type || "").trim();
      const busOperator = String(operator || "").trim();
      const sourceCity = String(source || "").trim();
      const destinationCity = String(destination || "").trim();
      const departureTime = String(departure_time || "").trim();
      const arrivalTime = String(arrival_time || "").trim();

      if (!busNumber || !busType || !busOperator || !sourceCity || !destinationCity || !departureTime || !arrivalTime) {
        return { success: false, statusCode: 400, message: "Missing required fields" };
      }

      const parsedCapacity = Math.max(1, toNumber(capacity, 40));
      const parsedFare = Math.max(0, toNumber(fare, 0));
      const parsedDistance = Math.max(0, toNumber(distance_km, 0));
      const stopList = parseStopsInput(stops);

      const [busSnapshot, routeSnapshot, scheduleSnapshot] = await Promise.all([
        firestore.collection("buses").where("bus_number", "==", busNumber).limit(1).get(),
        firestore
          .collection("routes")
          .where("source", "==", sourceCity)
          .where("destination", "==", destinationCity)
          .limit(1)
          .get(),
        firestore
          .collection("schedules")
          .where("bus_number", "==", busNumber)
          .where("source", "==", sourceCity)
          .where("destination", "==", destinationCity)
          .where("departure_time", "==", departureTime)
          .limit(1)
          .get(),
      ]);

      if (!scheduleSnapshot.empty) {
        return { success: false, statusCode: 409, message: "Schedule already exists" };
      }

      let busRef;
      let busData;
      if (busSnapshot.empty) {
        busRef = firestore.collection("buses").doc();
        busData = {
          id: toNumber(busRef.id, 0) || busRef.id,
          bus_number: busNumber,
          bus_type: busType,
          capacity: parsedCapacity,
          operator: busOperator,
        };
      } else {
        busRef = busSnapshot.docs[0].ref;
        busData = {
          id: toNumber(busSnapshot.docs[0].data().id, toNumber(busRef.id, 0) || busRef.id),
          ...busSnapshot.docs[0].data(),
          bus_type: busType,
          capacity: parsedCapacity,
          operator: busOperator,
        };
      }

      let routeRef;
      let routeData;
      if (routeSnapshot.empty) {
        routeRef = firestore.collection("routes").doc();
        routeData = {
          id: toNumber(routeRef.id, 0) || routeRef.id,
          source: sourceCity,
          destination: destinationCity,
          distance_km: parsedDistance,
          source_lower: toLowerText(sourceCity),
          destination_lower: toLowerText(destinationCity),
        };
      } else {
        routeRef = routeSnapshot.docs[0].ref;
        routeData = {
          id: toNumber(routeSnapshot.docs[0].data().id, toNumber(routeRef.id, 0) || routeRef.id),
          ...routeSnapshot.docs[0].data(),
          distance_km: parsedDistance || toNumber(routeSnapshot.docs[0].data().distance_km, 0),
        };
      }

      const scheduleRef = firestore.collection("schedules").doc();
      const scheduleData = buildSearchableSchedule({
        id: toNumber(scheduleRef.id, 0) || scheduleRef.id,
        bus: busData,
        route: routeData,
        route_doc_id: routeRef.id,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        fare: parsedFare,
      });

      const batch = firestore.batch();
      batch.set(busRef, busData, { merge: true });
      batch.set(routeRef, routeData, { merge: true });
      batch.set(scheduleRef, scheduleData);

      stopList.forEach((stop) => {
        const stopRef = firestore.collection("route_stops").doc();
        batch.set(stopRef, {
          ...stop,
          route_id: routeData.id,
          route_doc_id: routeRef.id,
          source: routeData.source,
          destination: routeData.destination,
        });
      });

      await batch.commit();

      return {
        success: true,
        schedule: {
          ...scheduleData,
          id: scheduleRef.id,
        },
        stops: stopList,
      };
    },
  };
};
