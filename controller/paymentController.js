const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';
const workerModel = require('../models/workerModel')
const adminModel = require('../models/adminModel')
const clientModel = require('../models/userModel')

var instance = new Razorpay({
    key_id: 'rzp_test_TDRJfd82mop9MS',
    key_secret:'g845t1p06XsgYkrcjXYSfFCY',
  });


  const razorpayment = async (req, res)=> {
    try {
      var options = {
        amount: req.body.data * 100,
        currency: "INR",
        receipt: 'Order0141',
        payment_capture: 0,
      };
      instance.orders.create(options, async(err, order)=> {
        if(err) {
          console.log(err);
          next(err);
        }
        if(order) {

          const amount = req.body.data
          const adminIncome = (amount * 0.1);
          const workerIncome = (amount * 0.9);

          const authHeader = req.headers.authorization;
          const token = authHeader && authHeader.split(' ')[1];
          const decoded = jwt.verify(token, secretKey);
          const userId = decoded.value._id

          await workerModel.updateOne(
            { _id: req.body.workerId, 'requests.userInfo': userId},
            { $set: { 'requests.$.paymentStatus': 'completed'} }
          );

          await clientModel.updateOne({_id:userId, 'payment.workerId': req.body.workerId}, {$set:{'payment.$.status':'completed', 'payment.$.payedDate':Date.now()}},{upsert:true})
          await clientModel.updateOne({_id:userId, 'workStatus.workerId':req.body.workerId}, {$set:{'workStatus.$.paymentStatus':'completed'}}, {upsert:true})

          await adminModel.updateOne(
            { },
            { $inc: { income: adminIncome } },
            { upsert: true }
          );
  
          await workerModel.updateOne(
            { _id: req.body.workerId },
            { $inc: { income: workerIncome } },
            { upsert: true }
          );
  
          console.log('database updated');
          res.json({success:true, status:"Order created Successfully", value: order, key:'rzp_test_TDRJfd82mop9MS'})
        }
      })
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error.'});
    }
  };

  const successPageData = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const userId = decoded.value._id

      console.log('id',req.params.id);

    } catch {
      res.status(500).json({error:'internal server error'})
    }
  }

  

  module.exports = {
    razorpayment,
    successPageData
  }