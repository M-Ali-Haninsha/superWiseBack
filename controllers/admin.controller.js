const adminModel = require("../models/adminModel");
const authService = require("../services/auth.service");
const adminService = require("../services/admin.service");
const categoryService = require("../services/category.service");

const login = async (req, res) => {
  const token = await authService.login({ model: adminModel, role: "admin", ...req.body });
  res.status(200).json({ msg: "passMatched", token });
};

const unverifiedWorkers = async (req, res) => {
  res.json({ workers: await adminService.listWorkers(false) });
};

const verifiedWorkers = async (req, res) => {
  res.json({ workers: await adminService.listWorkers(true) });
};

const proofUrl = async (req, res) => {
  res.json({ url: await adminService.proofUrl(req.params.id) });
};

const acceptWorker = async (req, res) => {
  await adminService.verifyWorker(req.body.email);
  res.json({ done: true });
};

const rejectWorker = async (req, res) => {
  await adminService.rejectWorker(req.body.email);
  res.json({ done: true });
};

const blockWorker = async (req, res) => {
  await adminService.setWorkerBlocked(req.body.id, true);
  res.json({ done: true });
};

const unblockWorker = async (req, res) => {
  await adminService.setWorkerBlocked(req.body.id, false);
  res.json({ done: true });
};

const listUsers = async (req, res) => {
  res.json({ user: await adminService.listUsers() });
};

const blockUser = async (req, res) => {
  await adminService.setUserBlocked(req.body.id, true);
  res.json({ done: true });
};

const unblockUser = async (req, res) => {
  await adminService.setUserBlocked(req.body.id, false);
  res.json({ done: true });
};

const income = async (req, res) => {
  res.json({ income: await adminService.income() });
};

const counts = async (req, res) => {
  res.json(await adminService.counts());
};

const chart = async (req, res) => {
  res.json(await adminService.workersPerCategory());
};

const complaints = async (req, res) => {
  res.json(await adminService.complaints(req.user.id));
};

const listCategories = async (req, res) => {
  res.json({ recievedCat: await categoryService.list() });
};

const addCategory = async (req, res) => {
  await categoryService.add(req.body, req.file);
  res.status(201).json({ done: true });
};

const editCategory = async (req, res) => {
  await categoryService.edit(req.params.id, req.body, req.file);
  res.json({ done: true });
};

module.exports = {
  login,
  unverifiedWorkers,
  verifiedWorkers,
  proofUrl,
  acceptWorker,
  rejectWorker,
  blockWorker,
  unblockWorker,
  listUsers,
  blockUser,
  unblockUser,
  income,
  counts,
  chart,
  complaints,
  listCategories,
  addCategory,
  editCategory,
};
