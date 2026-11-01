const express = require("express");
const user = require("../controllers/user.controller");
const worker = require("../controllers/worker.controller");
const payment = require("../controllers/payment.controller");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { imageUpload, proofUpload } = require("../middleware/upload");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

const router = express.Router();
const asWorker = authenticate("worker");
const asUser = authenticate("user");
const withId = validate({ params: s.idParam });

// Workers
router.post(
  "/workerSignup",
  authLimiter,
  proofUpload.single("file"),
  validate({ body: s.workerSignup }),
  worker.signup
);
router.post("/workerOtpProcess", authLimiter, validate({ body: s.otp }), worker.confirmOtp);
router.post("/workerLogin", authLimiter, validate({ body: s.login }), worker.login);
router.get("/FetchCategory", worker.getCategories);
router.get("/fetchWorkerData", asWorker, worker.getProfile);
router.put("/workerEditProfilePhoto", asWorker, imageUpload.single("file"), worker.updatePhoto);
router.put("/workerEditProfileData", asWorker, validate({ body: s.updateWorker }), worker.updateDetails);
router.put("/updateDescription", asWorker, validate({ body: s.description }), worker.updateDescription);
router.get("/fetchUserRequest", asWorker, worker.pendingRequests);
router.put("/workAccept", asWorker, validate({ body: s.requestId }), worker.acceptRequest);
router.put("/workReject", asWorker, validate({ body: s.requestId }), worker.rejectRequest);
router.get("/fetchAcceptedWorks", asWorker, worker.acceptedWorks);
router.get("/viewProgress/:id", asWorker, withId, worker.viewProgress);
router.put("/updateWorkProgress/:id", asWorker, withId, validate({ body: s.progress }), worker.updateProgress);
router.post("/postAmount/:id", asWorker, withId, validate({ body: s.amount }), worker.postAmount);
router.post("/pushImages/:id", asWorker, withId, imageUpload.array("files", 3), worker.pushImages);
router.get("/getCount", asWorker, worker.dashboard);

// Clients
router.get("/fetchCategories", user.getCategories);
router.post("/userSignup", authLimiter, validate({ body: s.userSignup }), user.signup);
router.post("/userOtp", authLimiter, validate({ body: s.otp }), user.confirmOtp);
router.post("/userLogin", authLimiter, validate({ body: s.login }), user.login);
router.get("/fetchWorkers/:id", withId, user.getWorkers);
router.get("/fetchWorkerDetails/:id", withId, user.workerDetails);
router.get("/showRating/:id", withId, user.getRatings);
router.post(
  "/hireWorker/:id",
  asUser,
  withId,
  imageUpload.single("file"),
  validate({ body: s.hire }),
  user.hireWorker
);
router.get("/fetchUserData", asUser, user.getProfile);
router.put("/updatePhoto", asUser, imageUpload.single("file"), user.updatePhoto);
router.put("/updateUserData", asUser, validate({ body: s.updateUser }), user.updateProfile);
router.get("/hiredWorkers", asUser, user.hiredWorkers);
router.get("/getProgressValue/:id", asUser, withId, user.getProgress);
router.get("/getAmount/:id", asUser, withId, user.getAmount);
router.post("/rating/:id", asUser, withId, validate({ body: s.rating }), user.rateWorker);
router.get("/getProgressImages/:id", asUser, withId, user.getProgressImages);
router.get("/clientDataMessage", asUser, user.clientForChat);
router.get("/workerDataMessage/:id", authenticate(), withId, user.workerForChat);
router.get("/getPaymentData/:id", asUser, withId, user.getPaymentData);
router.get("/workCompleteData/:id", asUser, withId, user.completedWork);
router.get("/viewWorkHistory", asUser, user.workHistory);
router.get("/historyData/:id", asUser, withId, user.historyDetail);
router.post("/reportWorker/:id", asUser, withId, validate({ body: s.report }), user.reportWorker);

// Payments
router.post("/razorpay", asUser, validate({ body: s.createOrder }), payment.createOrder);
router.post("/razorpay/verify", asUser, validate({ body: s.verifyPayment }), payment.verifyPayment);

module.exports = router;
