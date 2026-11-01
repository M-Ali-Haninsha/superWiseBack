const userModel = require("../models/userModel");
const workerModel = require("../models/workerModel");
const adminModel = require("../models/adminModel");
const categoryModel = require("../models/category");
const uploadService = require("./upload.service");
const { WORKER_PUBLIC, CLIENT_SUMMARY } = require("./projections");
const { notFound, conflict, forbidden } = require("../utils/httpError");

const sameId = (a, b) => a?.toString() === b?.toString();

async function getUser(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw notFound("User not found");
  return user;
}

const listCategories = () => categoryModel.find();

function listWorkersByCategory(categoryId) {
  return workerModel
    .find({ department: categoryId, isVerified: true, isBlocked: false })
    .select(WORKER_PUBLIC)
    .populate("department");
}

async function getWorkerPublic(workerId) {
  const worker = await workerModel
    .findById(workerId)
    .select(WORKER_PUBLIC)
    .populate("department");
  if (!worker) throw notFound("Worker not found");
  return worker;
}

async function hireWorker(userId, workerId, { description, date }, file) {
  const worker = await workerModel.findOne({
    _id: workerId,
    isVerified: true,
    isBlocked: false,
  });
  if (!worker) throw notFound("Worker not found");
  if (worker.requests.some((r) => sameId(r.userInfo, userId))) {
    throw conflict("You have already sent a request to this worker");
  }

  const request = {
    userInfo: userId,
    requirement: description,
    date,
    paymentStatus: "pending",
    accepted: false,
  };
  if (file) request.file = await uploadService.uploadImage(file, "requests");

  await workerModel.updateOne({ _id: workerId }, { $push: { requests: request } });
}

async function updatePhoto(userId, file) {
  const image = await uploadService.uploadImage(file, "profiles");
  await userModel.updateOne({ _id: userId }, { $set: { image } });
}

async function updateProfile(userId, { firstName, lastName, phoneNo, location }) {
  await userModel.updateOne(
    { _id: userId },
    { $set: { firstName, lastName, phone: phoneNo, location } }
  );
}

// Workers this client has hired whose work is not paid for yet. Each worker
// only carries this client's own request, not other clients'.
async function hiredWorkers(userId) {
  const workers = await workerModel
    .find({
      requests: {
        $elemMatch: { userInfo: userId, paymentStatus: { $ne: "completed" } },
      },
    })
    .select("-income")
    .populate("department")
    .lean();
  return workers.map((worker) => ({
    ...worker,
    requests: worker.requests.filter((r) => sameId(r.userInfo, userId)),
  }));
}

async function getProgress(userId, workerId) {
  const user = await getUser(userId);
  return user.workStatus.find((s) => sameId(s.workerId, workerId))?.progressBar;
}

async function getAmount(userId, workerId) {
  const user = await getUser(userId);
  return user.payment.find((p) => sameId(p.workerId, workerId))?.amount;
}

async function rateWorker(userId, workerId, { starValue, comment }) {
  const worker = await workerModel.findById(workerId);
  if (!worker) throw notFound("Worker not found");

  const hired = worker.requests.some(
    (r) => sameId(r.userInfo, userId) && r.accepted
  );
  if (!hired) throw forbidden("You can only rate workers you have hired");
  if (worker.rating.some((r) => sameId(r.userRef, userId))) {
    throw conflict("You have already rated this worker");
  }

  worker.rating.push({ userRef: userId, starValue, comment });
  await worker.save();
}

async function getRatings(workerId) {
  const worker = await workerModel
    .findById(workerId)
    .select("rating")
    .populate("rating.userRef", CLIENT_SUMMARY);
  if (!worker) throw notFound("Worker not found");
  return worker.rating;
}

async function getProgressImages(userId, workerId) {
  const user = await getUser(userId);
  const status = user.workStatus.find((s) => sameId(s.workerId, workerId));
  if (!status) throw notFound("No work found with this worker");
  return status.images;
}

async function getPaymentData(userId, workerId) {
  const user = await getUser(userId);
  const details = user.payment.find((p) => sameId(p.workerId, workerId));
  return { paymentData: user, details };
}

async function getCompletedWork(userId, workerId) {
  const user = await getUser(userId);
  const payment = user.payment.find(
    (p) => sameId(p.workerId, workerId) && p.status === "completed"
  );
  if (!payment) throw notFound("No completed payment for this worker");
  const worker = await getWorkerPublic(workerId);
  return { payment, worker, client: user };
}

async function getWorkHistory(userId) {
  const user = await userModel.findById(userId).populate({
    path: "workStatus.workerId",
    select: WORKER_PUBLIC,
    populate: { path: "department", model: "category" },
  });
  if (!user) throw notFound("User not found");
  user.workStatus = user.workStatus.filter((s) => s.paymentStatus === "completed");
  return user;
}

async function getHistoryDetail(userId, workerId) {
  const clientData = await getUser(userId);
  const workerData = await getWorkerPublic(workerId);
  const payments = clientData.payment.filter((p) => sameId(p.workerId, workerId));
  return { payments, clientData, workerData };
}

async function reportWorker(userId, workerId, reason) {
  if (!(await workerModel.exists({ _id: workerId }))) {
    throw notFound("Worker not found");
  }
  const admin = await adminModel.findOne();
  if (!admin) throw notFound("No admin account to receive the report");

  const alreadyReported = admin.complaints.some(
    (c) => sameId(c.clientId, userId) && sameId(c.workerId, workerId)
  );
  if (alreadyReported) throw conflict("You have already reported this worker");

  admin.complaints.push({ clientId: userId, workerId, issue: reason });
  await admin.save();
}

module.exports = {
  getUser,
  listCategories,
  listWorkersByCategory,
  getWorkerPublic,
  hireWorker,
  updatePhoto,
  updateProfile,
  hiredWorkers,
  getProgress,
  getAmount,
  rateWorker,
  getRatings,
  getProgressImages,
  getPaymentData,
  getCompletedWork,
  getWorkHistory,
  getHistoryDetail,
  reportWorker,
};
