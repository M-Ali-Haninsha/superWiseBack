const express = require('express');
const router = express.Router();
const workerController = require('../controller/workerController')
const userController = require('../controller/userController')
const multerConfig = require('../configurations/multerConfig')
const jwt = require('../middleware/jwt')

//workers
router.post('/workerSignup',multerConfig.single('file'), workerController.signupSubmit)
router.post('/workerOtpProcess', multerConfig.single('file'),  workerController.otpProceed)
router.get('/FetchCategory', workerController.getCategory)
router.post('/workerLogin', workerController.workerLogin)
router.get('/fetchWorkerData',jwt, workerController.getWorkerDetails)
router.put('/workerEditProfilePhoto', jwt,multerConfig.single('file'), workerController.editPhoto)
router.put('/workerEditProfileData', jwt, workerController.editDetails)
router.get('/fetchUserRequest',jwt, workerController.fetchRequest)

//users
router.get('/fetchCategories', userController.getCategory)
router.post('/userSignup', userController.userSignup)
router.post('/userOtp', userController.userOtp)
router.post('/userLogin', userController.userLogin)
router.get('/fetchWorkers/:id', userController.getWorkers)
router.get('/fetchWorkerDetails/:id', userController.workerDetails)
router.post('/hireWorker/:id', jwt, userController.hireWorker)

module.exports = router;
