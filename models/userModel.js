const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "workerData",
  },
  imageUrl: {
    type: String,
  },
});

const userSchema = new mongoose.Schema({
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
  },
  phone: {
    type: Number,
  },
  password: {
    type: String,
    required: true,
  },
  location: {
    type: String,
  },
  image: {
    type: String,
  },
  workStatus: [
    {
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workerData",
      },
      progressBar: {
        type: Number,
      },
      images: [imageSchema],
      status: {
        type: String,
      },
      paymentStatus: {
        type: String,
        default: "pending",
      },
    },
  ],
  payment: [
    {
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workerData",
      },
      type: {
        type: String,
      },
      amount: {
        type: Number,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      payedDate: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
      },
    },
  ],
  isBlocked: {
    type: Boolean,
  },
});

const userData = mongoose.model("userData", userSchema);

module.exports = userData;
