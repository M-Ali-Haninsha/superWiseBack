const express = require('express');
const router = express.Router();
const workerController = require('../controller/workerController')
const userController = require('../controller/userController')
const multerConfig = require('../configurations/multerConfig')

//workers
router.post('/workerSignup',multerConfig.single('file'), workerController.signupSubmit)
router.post('/workerOtpProcess', multerConfig.single('file'),  workerController.otpProceed)
router.get('/FetchCategory', workerController.getCategory)
router.post('/workerLogin', workerController.workerLogin)



//users
router.get('/fetchCategories', userController.getCategory)
router.post('/userSignup', userController.userSignup)
router.post('/userOtp', userController.userOtp)
router.post('/userLogin', userController.userLogin)

module.exports = router;
