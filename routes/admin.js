const express = require("express");
const admin = require("../controllers/admin.controller");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { imageUpload } = require("../middleware/upload");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

const router = express.Router();

router.post("/adminLogin", authLimiter, validate({ body: s.login }), admin.login);

// Everything below requires an admin token.
router.use(authenticate("admin"));

const withId = validate({ params: s.idParam });
const withEmail = validate({ body: s.emailBody });
const withBodyId = validate({ body: s.requestId });

router.get("/adminGetWorker", admin.unverifiedWorkers);
router.get("/adminVerifiedGetWorker", admin.verifiedWorkers);
router.get("/adminViewProof/:id", withId, admin.proofUrl);
router.post("/adminAccept", withEmail, admin.acceptWorker);
router.post("/adminReject", withEmail, admin.rejectWorker);
router.post("/adminBlockWorker", withBodyId, admin.blockWorker);
router.post("/adminUnblockWorker", withBodyId, admin.unblockWorker);
router.get("/adminFetchUsers", admin.listUsers);
router.post("/adminBlockUser", withBodyId, admin.blockUser);
router.post("/adminUnblockUser", withBodyId, admin.unblockUser);
router.get("/getIncome", admin.income);
router.get("/countDetails", admin.counts);
router.get("/getChartValue", admin.chart);
router.get("/getComplaints", admin.complaints);
router.get("/adminFetchCategory", admin.listCategories);
router.post(
  "/adminAddCategory",
  imageUpload.single("file"),
  validate({ body: s.category }),
  admin.addCategory
);
router.post(
  "/editCategory/:id",
  withId,
  imageUpload.single("file"),
  validate({ body: s.category }),
  admin.editCategory
);

module.exports = router;
