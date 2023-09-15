const express = require("express");
const router = express.Router();
const workerController = require("../controller/workerController");
const userController = require("../controller/userController");
const paymentController = require("../controller/paymentController");
const multerConfig = require("../configurations/multerConfig");
const jwt = require("../middleware/jwt");

//workers
router.post(
  "/workerSignup",
  multerConfig.single("file"),
  workerController.signupSubmit
);
router.post(
  "/workerOtpProcess",
  multerConfig.single("file"),
  workerController.otpProceed
);
router.get("/FetchCategory", workerController.getCategory);
router.post("/workerLogin", workerController.workerLogin);
router.get("/fetchWorkerData", jwt, workerController.getWorkerDetails);
router.put(
  "/workerEditProfilePhoto",
  jwt,
  multerConfig.single("file"),
  workerController.editPhoto
);
router.put("/workerEditProfileData", jwt, workerController.editDetails);
router.get("/fetchUserRequest", jwt, workerController.fetchRequest);
router.put("/workAccept", jwt, workerController.workAccept);
router.put("/workReject", jwt, workerController.workReject);
router.get("/fetchAcceptedWorks", jwt, workerController.acceptedWorks);
router.put("/updateDescription", jwt, workerController.updateDescription);
router.get("/viewProgress/:id", jwt, workerController.viewProgress);
router.put("/updateWorkProgress/:id", jwt, workerController.updateWorkStatus);
router.post("/postAmount/:id", jwt, workerController.postAmount);
router.post(
  "/pushImages/:id",
  jwt,
  multerConfig.array("files", 3),
  workerController.pushImage
);
router.get("/getCount", jwt, workerController.getCount);

//users
router.get("/fetchCategories", userController.getCategory);
router.post("/userSignup", userController.userSignup);
router.post("/userOtp", userController.userOtp);
router.post("/userLogin", userController.userLogin);
router.get("/fetchWorkers/:id", userController.getWorkers);
router.get("/fetchWorkerDetails/:id", userController.workerDetails);
router.post(
  "/hireWorker/:id",
  jwt,
  multerConfig.single("file"),
  userController.hireWorker
);
router.get("/fetchUserData", jwt, userController.getUserData);
router.put(
  "/updatePhoto",
  jwt,
  multerConfig.single("file"),
  userController.editPhoto
);
router.get("/hiredWorkers", jwt, userController.hiredWorks);
router.put("/updateUserData", jwt, userController.updateDetails);
router.get("/getProgressValue/:id", jwt, userController.getProgressValue);
router.post("/razorpay", jwt, paymentController.razorpayment);
router.get("/getAmount/:id", jwt, userController.getAmount);
router.post("/rating/:id", jwt, userController.rating);
router.get("/showRating/:id", userController.showRating);
router.get("/getProgressImages/:id", jwt, userController.progressImages);
router.get("/clientDataMessage", jwt, userController.clientDataMessage);
router.get("/workerDataMessage/:id", jwt, userController.workDataMessage);
router.get("/getPaymentData/:id", jwt, userController.getPaymentData);
router.get("/workCompleteData/:id", jwt, paymentController.successPageData);
router.get("/viewWorkHistory", jwt, userController.viewWorkHistory);
router.get("/historyData/:id", jwt, userController.historyData);
router.post("/reportWorker/:id", jwt, userController.reportWorker);

module.exports = router;
