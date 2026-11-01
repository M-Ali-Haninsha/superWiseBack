const workerModel = require("../models/workerModel");
const authService = require("../services/auth.service");
const uploadService = require("../services/upload.service");
const workerService = require("../services/worker.service");
const categoryService = require("../services/category.service");
const { badRequest, conflict } = require("../utils/httpError");

const signup = async (req, res) => {
  if (!req.file) throw badRequest("An ID proof file is required");
  const { email, ...data } = req.body;
  // Checked before uploading so a duplicate signup doesn't leave a stray file.
  if (await workerModel.exists({ email })) {
    throw conflict("An account with this email already exists");
  }
  const proof = await uploadService.uploadProof(req.file);
  await authService.startSignup({
    model: workerModel,
    role: "worker",
    email,
    data: { ...data, proof },
  });
  res.status(200).json({ otpGen: true });
};

const confirmOtp = async (req, res) => {
  const data = await authService.confirmSignup({ role: "worker", ...req.body });
  await workerService.createWorker(data);
  res.status(201).json({ otpDone: true });
};

const login = async (req, res) => {
  const token = await authService.login({ model: workerModel, role: "worker", ...req.body });
  res.status(200).json({ msg: "passMatched", token });
};

const getCategories = async (req, res) => {
  res.json({ recievedCat: await categoryService.list() });
};

const getProfile = async (req, res) => {
  res.json({ data: await workerService.getSelf(req.user.id) });
};

const updatePhoto = async (req, res) => {
  if (!req.file) throw badRequest("An image file is required");
  await workerService.updatePhoto(req.user.id, req.file);
  res.json({ done: true });
};

const updateDetails = async (req, res) => {
  await workerService.updateDetails(req.user.id, req.body);
  res.json({ updated: "data updated" });
};

const updateDescription = async (req, res) => {
  await workerService.updateDescription(req.user.id, req.body.description);
  res.json({ done: true });
};

const pendingRequests = async (req, res) => {
  res.json({ requests: await workerService.pendingRequests(req.user.id) });
};

const acceptRequest = async (req, res) => {
  await workerService.acceptRequest(req.user.id, req.body.id);
  res.json({ done: true });
};

const rejectRequest = async (req, res) => {
  await workerService.rejectRequest(req.user.id, req.body.id);
  res.json({ done: true });
};

const acceptedWorks = async (req, res) => {
  res.json(await workerService.acceptedWorks(req.user.id));
};

const viewProgress = async (req, res) => {
  res.json(await workerService.viewProgress(req.user.id, req.params.id));
};

const updateProgress = async (req, res) => {
  await workerService.updateProgress(req.user.id, req.params.id, req.body.progress);
  res.json({ updated: "status updated" });
};

const postAmount = async (req, res) => {
  await workerService.postAmount(req.user.id, req.params.id, req.body);
  res.json({ done: true });
};

const pushImages = async (req, res) => {
  await workerService.pushImages(req.user.id, req.params.id, req.files);
  res.json({ success: true });
};

const dashboard = async (req, res) => {
  res.json(await workerService.dashboard(req.user.id));
};

module.exports = {
  signup,
  confirmOtp,
  login,
  getCategories,
  getProfile,
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
