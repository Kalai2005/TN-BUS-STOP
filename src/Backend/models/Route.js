import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: [true, 'Please provide a route name'],
    },
    routeNumber: {
      type: String,
      required: [true, 'Please provide a route number'],
      unique: true,
    },
    source: {
      type: String,
      required: [true, 'Please provide source city'],
    },
    destination: {
      type: String,
      required: [true, 'Please provide destination city'],
    },
    distance: {
      type: Number,
      required: [true, 'Please provide distance in km'],
    },
    stops: {
      type: [
        {
          stopName: String,
          stopTime: String, // HH:MM format
          distance: Number, // Distance from source
        },
      ],
      required: [true, 'Please provide route stops'],
    },
    estimatedDuration: {
      type: String, // HH:MM format
      required: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Please provide base price'],
    },
    pricePerKm: {
      type: Number,
      default: 1.2,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isLocalRoute: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
routeSchema.index({ source: 1, destination: 1 });
routeSchema.index({ routeNumber: 1 });

const Route = mongoose.model('Route', routeSchema);

export default Route;
