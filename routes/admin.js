const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminContoller')
const upload = require('../configurations/multerConfig')
const jwt = require('../middleware/jwt')


router.post('/adminLogin',adminController.loginSubmit)
router.get('/adminGetWorker', jwt, adminController.showWorkers)
router.get('/adminVerifiedGetWorker', jwt, adminController.verifiedWorkers)
router.get('/adminViewProof/:proof', adminController.proof )
router.post('/adminAddCategory',jwt, upload.single('file'), adminController.addCategory)
router.get('/adminFetchCategory',jwt, adminController.getCategory)
router.post('/adminAccept',jwt, adminController.accept)
router.post('/adminReject',jwt, adminController.reject)
router.post('/adminBlockWorker',jwt, adminController.blockWorker)
router.post('/adminUnblockWorker',jwt, adminController.unBlockWorker)
router.get('/adminFetchUsers', adminController.fetchUsers)

module.exports = router;
