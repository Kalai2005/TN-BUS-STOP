import mongoose from 'mongoose';

const conductorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID'],
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Please provide license number'],
      unique: true,
    },
    licenseExpiry: {
      type: Date,
      required: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
    },
    currentBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null,
    },
    assignedRoutes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Route',
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    totalTripsCompleted: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    documents: {
      aadhar: String,
      drivingLicense: String,
      panCard: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
conductorSchema.index({ userId: 1 });
conductorSchema.index({ licenseNumber: 1 });

const Conductor = mongoose.model('Conductor', conductorSchema);

export default Conductor;
