import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Please provide a bus ID'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Please provide a route ID'],
    },
    seatNumbers: {
      type: [String],
      required: [true, 'Please select at least one seat'],
    },
    journeyDate: {
      type: Date,
      required: [true, 'Please provide a journey date'],
    },
    boardingPoint: {
      type: String,
      required: [true, 'Please provide a boarding point'],
    },
    droppingPoint: {
      type: String,
      required: [true, 'Please provide a dropping point'],
    },
    totalPassengers: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: [true, 'Please provide total price'],
    },
    pricePerSeat: {
      type: Number,
      required: true,
    },
    qrCode: {
      type: String,
      default: null,
    },
    seatNumber: {
      type: String,
      default: null,
    },
    ticketCount: {
      type: Number,
      default: 1,
    },
    boardingStop: {
      type: String,
      default: null,
    },
    dropStop: {
      type: String,
      default: null,
    },
    unitFare: {
      type: Number,
      default: null,
    },
    fare: {
      type: Number,
      default: null,
    },
    passengerName: {
      type: String,
      default: null,
    },
    passengerAge: {
      type: Number,
      default: null,
    },
    passengerGender: {
      type: String,
      default: null,
    },
    physicalIssuedAt: {
      type: Date,
      default: null,
    },
    physicalIssuedBy: {
      type: String,
      default: null,
    },
    boardedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cash'],
      default: 'card',
    },
    transactionId: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancellationDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
bookingSchema.index({ userId: 1, journeyDate: -1 });
bookingSchema.index({ busId: 1, journeyDate: 1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
