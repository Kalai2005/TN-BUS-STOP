import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: [true, 'Please provide a bus number'],
      unique: true,
    },
    busType: {
      type: String,
      enum: ['TNSTC', 'KSRTC', 'SETC', 'Local buses', 'Private'],
      required: [true, 'Please provide a bus type'],
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    totalSeats: {
      type: Number,
      required: [true, 'Please provide total seats'],
      min: 1,
    },
    seatLayout: {
      type: {
        rows: Number,
        seatsPerRow: Number,
      },
      default: { rows: 12, seatsPerRow: 3 },
    },
    amenities: {
      type: [String],
      default: [],
      // e.g., ['wifi', 'charging', 'blanket', 'pillow', 'water']
    },
    operatorName: {
      type: String,
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverPhone: {
      type: String,
      required: true,
    },
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    routeIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Route',
      default: [],
    },
    manufacturingYear: {
      type: Number,
      required: true,
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    nextMaintenanceDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOutOfService: {
      type: Boolean,
      default: false,
    },
    outOfServiceReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
busSchema.index({ busNumber: 1 });
busSchema.index({ busType: 1 });
busSchema.index({ isActive: 1 });

const Bus = mongoose.model('Bus', busSchema);

export default Bus;
