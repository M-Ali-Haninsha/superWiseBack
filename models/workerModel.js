const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  // Legacy: filename of a proof that was stored on the server's disk.
  file: {
    type: String,
    select: false,
  },
  // ID proof stored privately on Cloudinary; admins get a short-lived link.
  proof: {
    type: {
      publicId: String,
      resourceType: String,
      format: String,
    },
    select: false,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
  },
  phoneNo: {
    type: Number,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  description: {
    type: String,
  },
  requests: [
    {
      userInfo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
      },
      requirement: {
        type: String,
      },
      file: {
        type: String,
      },
      date: {
        type: Date,
      },
      accepted: {
        type: Boolean,
      },
      paymentStatus: {
        type: String,
      },
    },
  ],
  rating: [
    {
      userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
      },
      starValue: {
        type: Number,
      },
      comment: {
        type: String,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  income: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    required: true,
  },
  isBlocked: {
    type: Boolean,
    required: true,
  },
});

const workereData = mongoose.model("workerData", workerSchema);

module.exports = workereData;
