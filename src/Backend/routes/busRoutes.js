import express from 'express';
import Bus from '../models/Bus.js';
import Booking from '../models/Booking.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all buses
router.get('/', async (req, res) => {
  try {
    const { type, active } = req.query;
    let filter = {};

    if (type) filter.busType = type;
    if (active !== undefined) filter.isActive = active === 'true';

    const buses = await Bus.find(filter).populate('routeIds', 'source destination');

    res.json({
      success: true,
      count: buses.length,
      buses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bus by ID
router.get('/:busId', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId).populate('routeIds').populate('conductorId', 'name phone');

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json({
      success: true,
      bus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new bus (admin only)
router.post('/create', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      busNumber,
      busType,
      registrationNumber,
      totalSeats,
      operatorName,
      driverName,
      driverPhone,
      manufacturingYear,
      amenities,
      seatLayout,
    } = req.body;

    // Validation
    if (!busNumber || !registrationNumber || !totalSeats) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if bus already exists
    const existingBus = await Bus.findOne({
      $or: [{ busNumber }, { registrationNumber }],
    });

    if (existingBus) {
      return res.status(400).json({ message: 'Bus with this number or registration already exists' });
    }

    const bus = new Bus({
      busNumber,
      busType: busType || 'Private',
      registrationNumber,
      totalSeats,
      operatorName,
      driverName,
      driverPhone,
      manufacturingYear,
      amenities: amenities || [],
      seatLayout: seatLayout || { rows: Math.ceil(totalSeats / 3), seatsPerRow: 3 },
    });

    await bus.save();

    res.status(201).json({
      success: true,
      message: 'Bus created successfully',
      bus,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update bus (admin only)
router.put('/:busId', verifyToken, isAdmin, async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.busId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json({
      success: true,
      message: 'Bus updated successfully',
      bus,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get available seats for a bus on a specific date
router.get('/:busId/available-seats', async (req, res) => {
  try {
    const { journeyDate } = req.query;

    if (!journeyDate) {
      return res.status(400).json({ message: 'Journey date is required' });
    }

    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const bookings = await Booking.find({
      busId: req.params.busId,
      journeyDate: {
        $gte: new Date(journeyDate),
        $lt: new Date(new Date(journeyDate).getTime() + 24 * 60 * 60 * 1000),
      },
      status: { $ne: 'cancelled' },
    });

    const bookedSeats = new Set();
    bookings.forEach((booking) => {
      booking.seatNumbers.forEach((seat) => bookedSeats.add(seat));
    });

    // Generate all seat numbers based on seat layout
    const allSeats = [];
    const { rows, seatsPerRow } = bus.seatLayout;

    for (let i = 1; i <= rows; i++) {
      for (let j = 1; j <= seatsPerRow; j++) {
        const seatNumber = `${i}-${j}`;
        allSeats.push({
          number: seatNumber,
          isAvailable: !bookedSeats.has(seatNumber),
        });
      }
    }

    res.json({
      success: true,
      busId: req.params.busId,
      journeyDate,
      totalSeats: bus.totalSeats,
      availableCount: allSeats.filter((s) => s.isAvailable).length,
      seats: allSeats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
