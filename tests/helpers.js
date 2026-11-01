// Shared test setup: fake config, an in-memory MongoDB, and stubs for the
// external services (email, Cloudinary, Razorpay).
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE: "mongodb://placeholder",
  JWT_SECRET: "test-secret",
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
  RAZORPAY_KEY_ID: "rzp_test_key",
  RAZORPAY_KEY_SECRET: "rzp_test_secret",
  MAIL_USER: "test@example.com",
  MAIL_PASS: "test",
});

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const { createApp } = require("../app");
const mailService = require("../services/mail.service");
const uploadService = require("../services/upload.service");
const paymentService = require("../services/payment.service");
const adminModel = require("../models/adminModel");
const categoryModel = require("../models/category");

const sentOtps = new Map();
mailService.sendOtp = async (email, otp) => sentOtps.set(email, otp);
uploadService.uploadImage = async () => "https://example.com/image.jpg";
uploadService.uploadProof = async () => ({
  publicId: "proofs/test",
  resourceType: "image",
  format: "jpg",
});
uploadService.signedProofUrl = () => "https://example.com/signed-proof";
paymentService.razorpay.orders.create = async ({ amount }) => ({
  id: `order_${Date.now()}`,
  amount,
});

let mongo;

async function startDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await mongoose.connection.syncIndexes();
}

async function stopDb() {
  await mongoose.disconnect();
  await mongo?.stop();
}

async function clearDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  sentOtps.clear();
}

const app = createApp();
const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function createAdmin(email = "admin@example.com", password = "admin-pass") {
  await adminModel.create({ email, password: await bcrypt.hash(password, 4) });
  const res = await api().post("/admin/adminLogin").send({ email, password });
  return res.body.token;
}

const createCategory = (name = "Electrician") =>
  categoryModel.create({ name, Image: "https://example.com/c.jpg", description: "d" });

async function signupUser(overrides = {}) {
  const body = {
    firstName: "Asha",
    lastName: "K",
    email: "client@example.com",
    password: "secret123",
    phoneNo: "9876543210",
    location: "Kochi",
    ...overrides,
  };
  await api().post("/userSignup").send(body).expect(200);
  await api()
    .post("/userOtp")
    .send({ email: body.email, otp: sentOtps.get(body.email) })
    .expect(201);
  const res = await api()
    .post("/userLogin")
    .send({ email: body.email, password: body.password })
    .expect(200);
  return res.body.token;
}

async function signupWorker(adminToken, overrides = {}) {
  const fields = {
    firstName: "Ravi",
    lastName: "M",
    email: "worker@example.com",
    password: "secret123",
    department: "Electrician",
    phoneNo: "9123456780",
    district: "Kochi",
    ...overrides,
  };
  let req = api().post("/workerSignup");
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  await req
    .attach("file", Buffer.from("fake image"), {
      filename: "id.jpg",
      contentType: "image/jpeg",
    })
    .expect(200);
  await api()
    .post("/workerOtpProcess")
    .send({ email: fields.email, otp: sentOtps.get(fields.email) })
    .expect(201);
  await api()
    .post("/admin/adminAccept")
    .set(auth(adminToken))
    .send({ email: fields.email })
    .expect(200);
  const res = await api()
    .post("/workerLogin")
    .send({ email: fields.email, password: fields.password })
    .expect(200);
  return res.body.token;
}

const decode = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

module.exports = {
  api,
  auth,
  startDb,
  stopDb,
  clearDb,
  sentOtps,
  createAdmin,
  createCategory,
  signupUser,
  signupWorker,
  decode,
};
