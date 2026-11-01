const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config/env");
const userModel = require("../models/userModel");
const workerModel = require("../models/workerModel");
const adminModel = require("../models/adminModel");
const { badRequest, notFound, conflict } = require("../utils/httpError");

const ADMIN_SHARE = 0.1;

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

async function findPendingPayment(userId, workerId) {
  const user = await userModel.findById(userId);
  const payment = user?.payment.find((p) => p.workerId?.toString() === workerId);
  if (!payment) throw notFound("The worker has not requested a payment yet");
  if (payment.status === "completed") throw conflict("This work is already paid for");
  return { user, payment };
}

// Step 1: create a Razorpay order for the amount the worker requested. The
// amount always comes from the database, never from the browser.
async function createOrder(userId, workerId) {
  const { user, payment } = await findPendingPayment(userId, workerId);

  const order = await razorpay.orders.create({
    amount: Math.round(payment.amount * 100),
    currency: "INR",
    receipt: `sw_${payment._id}`,
  });

  payment.orderId = order.id;
  await user.save();
  return { order, key: config.razorpay.keyId };
}

function signatureIsValid(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return (
    typeof signature === "string" &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

// Step 2: after Razorpay checkout succeeds, check its signature and only then
// mark the work as paid and split the income.
async function verifyPayment(userId, { workerId, orderId, paymentId, signature }) {
  if (!signatureIsValid(orderId, paymentId, signature)) {
    throw badRequest("Payment verification failed");
  }

  // Atomically flip pending -> completed so a payment is only credited once.
  const claimed = await userModel.findOneAndUpdate(
    {
      _id: userId,
      payment: { $elemMatch: { workerId, orderId, status: "pending" } },
    },
    {
      $set: {
        "payment.$.status": "completed",
        "payment.$.payedDate": new Date(),
        "payment.$.paymentId": paymentId,
      },
    }
  );
  if (!claimed) throw conflict("No pending payment matches this order");

  const amount = claimed.payment.find((p) => p.orderId === orderId).amount;

  await Promise.all([
    userModel.updateOne(
      { _id: userId, "workStatus.workerId": workerId },
      { $set: { "workStatus.$.paymentStatus": "completed" } }
    ),
    workerModel.updateOne(
      { _id: workerId, "requests.userInfo": userId },
      {
        $set: { "requests.$.paymentStatus": "completed" },
        $inc: { income: amount * (1 - ADMIN_SHARE) },
      }
    ),
    adminModel.updateOne({}, { $inc: { income: amount * ADMIN_SHARE } }),
  ]);
}

module.exports = { createOrder, verifyPayment, signatureIsValid, razorpay };
