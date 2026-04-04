import express from 'express';
import Conductor from '../models/Conductor.js';
import User from '../models/User.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all conductors
router.get('/', async (req, res) => {
  try {
    const conductors = await Conductor.find()
      .populate('userId', 'name email phone')
      .populate('currentBusId', 'busNumber')
      .populate('assignedRoutes', 'routeName source destination');

    res.json({
      success: true,
      count: conductors.length,
      conductors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conductor by ID
router.get('/:conductorId', async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.conductorId)
      .populate('userId')
      .populate('currentBusId')
      .populate('assignedRoutes');

    if (!conductor) {
      return res.status(404).json({ message: 'Conductor not found' });
    }

    res.json({
      success: true,
      conductor,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new conductor (admin only)
router.post('/create', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      userId,
      licenseNumber,
      licenseExpiry,
      yearsOfExperience,
      documents,
    } = req.body;

    // Validation
    if (!userId || !licenseNumber || !licenseExpiry) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if conductor already exists for this user
    const existingConductor = await Conductor.findOne({ userId });
    if (existingConductor) {
      return res.status(400).json({ message: 'Conductor profile already exists for this user' });
    }

    const conductor = new Conductor({
      userId,
      licenseNumber,
      licenseExpiry: new Date(licenseExpiry),
      yearsOfExperience: yearsOfExperience || 0,
      documents: documents || {},
    });

    await conductor.save();

    // Update user role to conductor
    user.role = 'conductor';
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Conductor profile created successfully',
      conductor,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update conductor (admin only)
router.put('/:conductorId', verifyToken, isAdmin, async (req, res) => {
  try {
    const conductor = await Conductor.findByIdAndUpdate(req.params.conductorId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!conductor) {
      return res.status(404).json({ message: 'Conductor not found' });
    }

    res.json({
      success: true,
      message: 'Conductor updated successfully',
      conductor,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Assign bus to conductor (admin only)
router.post('/:conductorId/assign-bus', verifyToken, isAdmin, async (req, res) => {
  try {
    const { busId } = req.body;

    if (!busId) {
      return res.status(400).json({ message: 'Bus ID is required' });
    }

    const conductor = await Conductor.findByIdAndUpdate(
      req.params.conductorId,
      { currentBusId: busId },
      { new: true }
    );

    if (!conductor) {
      return res.status(404).json({ message: 'Conductor not found' });
    }

    res.json({
      success: true,
      message: 'Bus assigned successfully',
      conductor,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Assign routes to conductor (admin only)
router.post('/:conductorId/assign-routes', verifyToken, isAdmin, async (req, res) => {
  try {
    const { routeIds } = req.body;

    if (!routeIds || !Array.isArray(routeIds)) {
      return res.status(400).json({ message: 'Route IDs must be an array' });
    }

    const conductor = await Conductor.findByIdAndUpdate(
      req.params.conductorId,
      { assignedRoutes: routeIds },
      { new: true }
    );

    if (!conductor) {
      return res.status(404).json({ message: 'Conductor not found' });
    }

    res.json({
      success: true,
      message: 'Routes assigned successfully',
      conductor,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update conductor rating (after trip completion)
router.post('/:conductorId/update-rating', verifyToken, isAdmin, async (req, res) => {
  try {
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 0 and 5' });
    }

    const conductor = await Conductor.findById(req.params.conductorId);
    if (!conductor) {
      return res.status(404).json({ message: 'Conductor not found' });
    }

    const totalReviews = conductor.reviewCount || 0;
    const currentRating = conductor.rating || 0;
    const newAverage = (currentRating * totalReviews + rating) / (totalReviews + 1);

    conductor.rating = newAverage;
    conductor.reviewCount = totalReviews + 1;
    await conductor.save();

    res.json({
      success: true,
      message: 'Rating updated successfully',
      conductor,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
