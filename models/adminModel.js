const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
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
  income: {
    type: Number,
    default: 0,
  },
  complaints: [
    {
      clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
      },
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "workerData",
      },
      issue: {
        type: String,
      },
    },
  ],
});

const adminData = mongoose.model("adminData", adminSchema);

module.exports = adminData;
