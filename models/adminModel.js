const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  income: {
    type: Number,
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
