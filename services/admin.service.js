const adminModel = require("../models/adminModel");
const workerModel = require("../models/workerModel");
const userModel = require("../models/userModel");
const uploadService = require("./upload.service");
const { CLIENT_CONTACT } = require("./projections");
const { notFound } = require("../utils/httpError");

async function listWorkers(isVerified) {
  const workers = await workerModel
    .find({ isVerified })
    .select("-requests +proof +file")
    .populate("department", "name")
    .lean();
  return workers.map(({ proof, file, ...worker }) => ({
    ...worker,
    department: worker.department?.name,
    hasProof: Boolean(proof?.publicId),
    legacyProof: Boolean(file && !proof?.publicId),
  }));
}

async function proofUrl(workerId) {
  const worker = await workerModel.findById(workerId).select("+proof");
  if (!worker) throw notFound("Worker not found");
  if (!worker.proof?.publicId) {
    throw notFound("This worker has no ID proof on file");
  }
  return uploadService.signedProofUrl(worker.proof);
}

async function verifyWorker(email) {
  const result = await workerModel.updateOne({ email }, { $set: { isVerified: true } });
  if (!result.matchedCount) throw notFound("Worker not found");
}

async function rejectWorker(email) {
  const result = await workerModel.deleteOne({ email, isVerified: false });
  if (!result.deletedCount) throw notFound("Unverified worker not found");
}

async function setBlocked(model, id, isBlocked) {
  const result = await model.updateOne({ _id: id }, { $set: { isBlocked } });
  if (!result.matchedCount) throw notFound("Account not found");
}

const setWorkerBlocked = (id, blocked) => setBlocked(workerModel, id, blocked);
const setUserBlocked = (id, blocked) => setBlocked(userModel, id, blocked);

const listUsers = () => userModel.find().select("-workStatus -payment");

async function income() {
  const admin = await adminModel.findOne();
  return admin?.income ?? 0;
}

async function counts() {
  const [workerCount, clientCount, workerData] = await Promise.all([
    workerModel.countDocuments(),
    userModel.countDocuments(),
    workerModel.find().select("-requests -income").populate("department").limit(5),
  ]);
  return { workerCount, clientCount, workerData };
}

function workersPerCategory() {
  return workerModel.aggregate([
    { $group: { _id: "$department", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "departmentInfo",
      },
    },
    { $unwind: "$departmentInfo" },
    { $project: { departmentName: "$departmentInfo.name", workerCount: "$count" } },
  ]);
}

async function complaints(adminId) {
  const admin = await adminModel
    .findById(adminId)
    .populate("complaints.clientId", CLIENT_CONTACT)
    .populate("complaints.workerId", "firstName lastName email phoneNo district image");
  if (!admin) throw notFound("Admin not found");
  return admin;
}

module.exports = {
  listWorkers,
  proofUrl,
  verifyWorker,
  rejectWorker,
  setWorkerBlocked,
  setUserBlocked,
  listUsers,
  income,
  counts,
  workersPerCategory,
  complaints,
};
