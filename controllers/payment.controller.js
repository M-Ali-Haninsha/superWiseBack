const paymentService = require("../services/payment.service");

const createOrder = async (req, res) => {
  const { order, key } = await paymentService.createOrder(req.user.id, req.body.workerId);
  res.status(201).json({ success: true, value: order, key });
};

const verifyPayment = async (req, res) => {
  await paymentService.verifyPayment(req.user.id, req.body);
  res.json({ success: true });
};

module.exports = { createOrder, verifyPayment };
