const workerModel = require("../models/workerModel");
const userModel = require("../models/userModel");
const categoryModel = require("../models/category");
const uploadService = require("./upload.service");
const { CLIENT_CONTACT } = require("./projections");
const { badRequest, notFound, forbidden, unprocessable } = require("../utils/httpError");

const sameId = (a, b) => a?.toString() === b?.toString();

const STATUS_BY_PROGRESS = {
  0: "work yet to be started",
  20: "work started",
  50: "work under process",
  100: "work completed",
};

async function findCategoryByName(name) {
  const category = await categoryModel.findOne({ name });
  if (!category) throw badRequest("Invalid department");
  return category;
}

async function createWorker(data) {
  const category = await findCategoryByName(data.department);
  return workerModel.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    proof: data.proof,
    department: category._id,
    phoneNo: data.phoneNo,
    district: data.district,
    isVerified: false,
    isBlocked: false,
  });
}

async function getSelf(workerId) {
  const worker = await workerModel.findById(workerId).populate("department");
  if (!worker) throw notFound("Worker not found");
  return worker;
}

async function updatePhoto(workerId, file) {
  const image = await uploadService.uploadImage(file, "profiles");
  await workerModel.updateOne({ _id: workerId }, { $set: { image } });
}

async function updateDetails(workerId, { firstName, lastName, department, phoneNo, location }) {
  const category = await findCategoryByName(department);
  await workerModel.updateOne(
    { _id: workerId },
    {
      $set: {
        firstName,
        lastName,
        department: category._id,
        phoneNo,
        district: location,
      },
    }
  );
}

async function updateDescription(workerId, description) {
  await workerModel.updateOne({ _id: workerId }, { $set: { description } });
}

async function getWithClients(workerId) {
  const worker = await workerModel
    .findById(workerId)
    .populate("requests.userInfo", CLIENT_CONTACT);
  if (!worker) throw notFound("Worker not found");
  return worker;
}

async function pendingRequests(workerId) {
  const worker = await getWithClients(workerId);
  return worker.requests.filter((r) => !r.accepted);
}

async function findRequest(workerId, requestId) {
  const worker = await workerModel.findById(workerId);
  const request = worker?.requests.id(requestId);
  if (!request) throw notFound("Request not found");
  return { worker, request };
}

async function acceptRequest(workerId, requestId) {
  const { worker, request } = await findRequest(workerId, requestId);
  request.accepted = true;
  await worker.save();

  // Start tracking progress on the client's side.
  await userModel.updateOne(
    { _id: request.userInfo, "workStatus.workerId": { $ne: workerId } },
    {
      $push: {
        workStatus: {
          workerId,
          progressBar: 0,
          status: STATUS_BY_PROGRESS[0],
        },
      },
    }
  );
}

async function rejectRequest(workerId, requestId) {
  const { worker, request } = await findRequest(workerId, requestId);
  request.deleteOne();
  await worker.save();
}

async function acceptedWorks(workerId) {
  const worker = await getWithClients(workerId);
  return {
    accepted: worker.requests.filter((r) => r.accepted && r.paymentStatus === "pending"),
    completed: worker.requests.filter((r) => r.accepted && r.paymentStatus === "completed"),
  };
}

// Throws unless this worker has accepted a request from this client.
async function getClientForWorker(workerId, clientId) {
  const hasJob = await workerModel.exists({
    _id: workerId,
    requests: { $elemMatch: { userInfo: clientId, accepted: true } },
  });
  if (!hasJob) throw forbidden("You have no accepted work for this client");

  const client = await userModel.findById(clientId);
  if (!client) throw notFound("Client not found");
  return client;
}

async function viewProgress(workerId, clientId) {
  const client = await getClientForWorker(workerId, clientId);
  const workStatus = client.workStatus.filter((s) => sameId(s.workerId, workerId));
  const data = {
    _id: client._id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    location: client.location,
    image: client.image,
    workStatus,
    payment: client.payment.filter((p) => sameId(p.workerId, workerId)),
  };
  return { data, newData: workStatus[0]?.progressBar };
}

async function updateProgress(workerId, clientId, progress) {
  const client = await getClientForWorker(workerId, clientId);
  const status = STATUS_BY_PROGRESS[progress] ?? "work status unknown";
  const existing = client.workStatus.find((s) => sameId(s.workerId, workerId));
  if (existing) {
    existing.progressBar = progress;
    existing.status = status;
  } else {
    client.workStatus.push({ workerId, progressBar: progress, status });
  }
  await client.save();
}

async function postAmount(workerId, clientId, { selectedType, type, amount }) {
  if (selectedType !== "normal") throw badRequest("Unsupported payment type");

  const client = await getClientForWorker(workerId, clientId);
  const work = client.workStatus.find((s) => sameId(s.workerId, workerId));
  if (work?.status !== STATUS_BY_PROGRESS[100]) {
    throw unprocessable("work not completed");
  }

  const payment = client.payment.find((p) => sameId(p.workerId, workerId));
  if (payment?.status === "completed") {
    throw unprocessable("This work has already been paid for");
  }
  if (payment) {
    Object.assign(payment, { type, amount, status: "pending", orderId: undefined });
  } else {
    client.payment.push({ workerId, type, amount, status: "pending" });
  }
  await client.save();
}

async function pushImages(workerId, clientId, files) {
  if (!files?.length) throw badRequest("No files provided");

  const client = await getClientForWorker(workerId, clientId);
  const work = client.workStatus.find((s) => sameId(s.workerId, workerId));
  if (!work) throw notFound("No work status for this client");

  const urls = await Promise.all(
    files.map((file) => uploadService.uploadImage(file, "progress"))
  );
  work.images.push(...urls.map((imageUrl) => ({ workerId, imageUrl })));
  await client.save();
}

async function dashboard(workerId) {
  const data = await getWithClients(workerId);
  const avg = data.rating.length
    ? data.rating.reduce((sum, r) => sum + r.starValue, 0) / data.rating.length
    : 0;
  const lengthOfReq = data.requests.filter((r) => !r.accepted).length;
  return { data, count: data.requests.length, avg, lengthOfReq };
}

module.exports = {
  createWorker,
  getSelf,
  updatePhoto,
  updateDetails,
  updateDescription,
  pendingRequests,
  acceptRequest,
  rejectRequest,
  acceptedWorks,
  viewProgress,
  updateProgress,
  postAmount,
  pushImages,
  dashboard,
};
