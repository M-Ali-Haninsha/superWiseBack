const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "must be a valid id");
const email = z.string().trim().toLowerCase().email("must be a valid email");
const name = z.string().trim().min(1, "is required").max(50);
const phone = z.coerce.number({ error: "must be a number" }).int().positive();
const text = (max) => z.string().trim().min(1, "is required").max(max);

const idParam = z.object({ id: objectId });

const login = z.object({ email, password: z.string().min(1, "is required") });

const userSignup = z.object({
  firstName: name,
  lastName: name,
  email,
  password: z.string().min(6, "must be at least 6 characters"),
  phoneNo: phone,
  location: text(100),
});

const workerSignup = z.object({
  firstName: name,
  lastName: name,
  email,
  password: z.string().min(6, "must be at least 6 characters"),
  department: text(100),
  phoneNo: phone,
  district: text(100),
});

const otp = z.object({
  email,
  otp: z.string().trim().regex(/^\d{4}$/, "must be 4 digits"),
});

const updateUser = z.object({
  firstName: name,
  lastName: name,
  phoneNo: phone,
  location: text(100),
});

const updateWorker = z.object({
  firstName: name,
  lastName: name,
  department: text(100),
  phoneNo: phone,
  location: text(100),
});

const hire = z.object({
  description: text(1000),
  date: z.coerce.date({ error: "must be a valid date" }),
});

const rating = z.object({
  starValue: z.coerce.number().int().min(1).max(5),
  // Older clients send { comment: { comment: "..." } }.
  comment: z.preprocess(
    (value) => (value && typeof value === "object" ? value.comment : value),
    z.string().trim().max(1000).default("")
  ),
});

const report = z.object({ reason: text(1000) });
const description = z.object({ description: z.string().trim().max(2000) });
const requestId = z.object({ id: objectId });
const progress = z.object({ progress: z.coerce.number().int().min(0).max(100) });

const amount = z.object({
  selectedType: z.string(),
  type: z.string().trim().max(100).optional(),
  amount: z.coerce.number().positive("must be greater than 0"),
});

const createOrder = z.object({ workerId: objectId });

const verifyPayment = z
  .object({
    workerId: objectId,
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  })
  .transform((b) => ({
    workerId: b.workerId,
    orderId: b.razorpay_order_id,
    paymentId: b.razorpay_payment_id,
    signature: b.razorpay_signature,
  }));

const emailBody = z.object({ email });
const category = z.object({
  categoryName: text(100),
  description: text(1000),
});

module.exports = {
  idParam,
  login,
  userSignup,
  workerSignup,
  otp,
  updateUser,
  updateWorker,
  hire,
  rating,
  report,
  description,
  requestId,
  progress,
  amount,
  createOrder,
  verifyPayment,
  emailBody,
  category,
};
