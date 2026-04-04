import express from 'express';
import Route from '../models/Route.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all routes with optional filters
router.get('/', async (req, res) => {
  try {
    const { source, destination, isLocal } = req.query;
    let filter = { isActive: true };

    if (source) {
      filter.source = { $regex: source, $options: 'i' };
    }
    if (destination) {
      filter.destination = { $regex: destination, $options: 'i' };
    }
    if (isLocal !== undefined) {
      filter.isLocalRoute = isLocal === 'true';
    }

    const routes = await Route.find(filter).sort({ routeName: 1 });

    res.json({
      success: true,
      count: routes.length,
      routes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search routes by source and destination
router.post('/search', async (req, res) => {
  try {
    const { source, destination } = req.body;

    if (!source || !destination) {
      return res.status(400).json({ message: 'Source and destination are required' });
    }

    const routes = await Route.find({
      source: { $regex: source, $options: 'i' },
      destination: { $regex: destination, $options: 'i' },
      isActive: true,
    });

    res.json({
      success: true,
      count: routes.length,
      routes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new route (admin only)
router.post('/create', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      routeName,
      routeNumber,
      source,
      destination,
      distance,
      stops,
      estimatedDuration,
      basePrice,
      pricePerKm,
      isLocalRoute,
    } = req.body;

    // Validation
    if (!routeName || !routeNumber || !source || !destination || !distance) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if route already exists
    const existingRoute = await Route.findOne({ routeNumber });
    if (existingRoute) {
      return res.status(400).json({ message: 'Route with this number already exists' });
    }

    const route = new Route({
      routeName,
      routeNumber,
      source,
      destination,
      distance,
      stops: stops || [],
      estimatedDuration,
      basePrice,
      pricePerKm: pricePerKm || 1.2,
      isLocalRoute: isLocalRoute || false,
    });

    await route.save();

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      route,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get routes by city
router.get('/city/:city', async (req, res) => {
  try {
    const { city } = req.params;

    const routes = await Route.find({
      $or: [{ source: { $regex: city, $options: 'i' } }, { destination: { $regex: city, $options: 'i' } }],
      isActive: true,
    });

    res.json({
      success: true,
      count: routes.length,
      routes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get route by ID
router.get('/:routeId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json({
      success: true,
      route,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update route (admin only)
router.put('/:routeId', verifyToken, isAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.routeId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json({
      success: true,
      message: 'Route updated successfully',
      route,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete route (admin only)
router.delete('/:routeId', verifyToken, isAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(
      req.params.routeId,
      { isActive: false },
      { new: true }
    );

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json({
      success: true,
      message: 'Route deactivated successfully',
      route,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
