const userModel = require("../models/userModel");
const authService = require("../services/auth.service");
const userService = require("../services/user.service");

const signup = async (req, res) => {
  const { email, ...data } = req.body;
  await authService.startSignup({ model: userModel, role: "user", email, data });
  res.status(200).json({ otpGen: true });
};

const confirmOtp = async (req, res) => {
  const data = await authService.confirmSignup({ role: "user", ...req.body });
  await userModel.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    phone: data.phoneNo,
    location: data.location,
    isBlocked: false,
  });
  res.status(201).json({ otpDone: true });
};

const login = async (req, res) => {
  const token = await authService.login({ model: userModel, role: "user", ...req.body });
  res.status(200).json({ msg: "passMatched", token });
};

const getCategories = async (req, res) => {
  res.json({ result: await userService.listCategories() });
};

const getWorkers = async (req, res) => {
  res.json({ data: await userService.listWorkersByCategory(req.params.id) });
};

const workerDetails = async (req, res) => {
  res.json({ data: await userService.getWorkerPublic(req.params.id) });
};

const hireWorker = async (req, res) => {
  await userService.hireWorker(req.user.id, req.params.id, req.body, req.file);
  res.status(201).json({ done: true });
};

const getProfile = async (req, res) => {
  res.json({ fetchedData: await userService.getUser(req.user.id) });
};

const updatePhoto = async (req, res) => {
  await userService.updatePhoto(req.user.id, req.file);
  res.json({ done: true });
};

const hiredWorkers = async (req, res) => {
  res.json({ worker: await userService.hiredWorkers(req.user.id) });
};

const updateProfile = async (req, res) => {
  await userService.updateProfile(req.user.id, req.body);
  res.json({ done: true });
};

const getProgress = async (req, res) => {
  res.json({ data: await userService.getProgress(req.user.id, req.params.id) });
};

const getAmount = async (req, res) => {
  res.json({ amount: await userService.getAmount(req.user.id, req.params.id) });
};

const rateWorker = async (req, res) => {
  await userService.rateWorker(req.user.id, req.params.id, req.body);
  res.status(201).json({ done: true });
};

const getRatings = async (req, res) => {
  res.json({ rating: await userService.getRatings(req.params.id) });
};

const getProgressImages = async (req, res) => {
  const progressImages = await userService.getProgressImages(req.user.id, req.params.id);
  res.json({ progressImages });
};

const clientForChat = async (req, res) => {
  res.json({ clientDataMessage: await userService.getUser(req.user.id) });
};

const workerForChat = async (req, res) => {
  res.json({ workerDataMessage: await userService.getWorkerPublic(req.params.id) });
};

const getPaymentData = async (req, res) => {
  res.json(await userService.getPaymentData(req.user.id, req.params.id));
};

const completedWork = async (req, res) => {
  res.json(await userService.getCompletedWork(req.user.id, req.params.id));
};

const workHistory = async (req, res) => {
  res.json({ user: await userService.getWorkHistory(req.user.id) });
};

const historyDetail = async (req, res) => {
  res.json(await userService.getHistoryDetail(req.user.id, req.params.id));
};

const reportWorker = async (req, res) => {
  await userService.reportWorker(req.user.id, req.params.id, req.body.reason);
  res.status(201).json({ reportUpdated: true });
};

module.exports = {
  signup,
  confirmOtp,
  login,
  getCategories,
  getWorkers,
  workerDetails,
  hireWorker,
  getProfile,
  updatePhoto,
  hiredWorkers,
  updateProfile,
  getProgress,
  getAmount,
  rateWorker,
  getRatings,
  getProgressImages,
  clientForChat,
  workerForChat,
  getPaymentData,
  completedWork,
  workHistory,
  historyDetail,
  reportWorker,
};
