const workerModel = require('../models/workerModel')
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { otpGen } = require('../configurations/otpGenerator')
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';
const cloudinary = require('../configurations/cloudinaryConfig')
const categoryModel = require('../models/category')

const bcryptPassword = async (password) => {
    try {
      const hashpassword = await bcrypt.hash(password, 10);
      return hashpassword;
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

//node mailer
const mail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "johnabraha57@gmail.com",
      pass: "tiwbzhsjpldbeade",
    },
  });

  const mailOptions = {
    from: "johnabraha57@gmail.com",
    to: email,
    subject: "Your OTP",
    text: `Your OTP is ${otp}.`,
  };

  // send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};


  let otp;
  let userdata;
  let getFile;
  const signupSubmit = async (req, res) => {
    try {
      getFile = req.file.filename
      const check = await workerModel.exists({
        email: req.body.email,
      });
      if (check) {
        res.status(200).json({"checked": true})
      } else {
        otp = otpGen();
        userdata = req.body;
        console.log('workerData',userdata);
        console.log('this is otp', otp);
        mail(req.body.email, otp);
        res.status(200).json({"otpGen":true})
      }
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const otpProceed = async (req, res) => {
    try {
      console.log('workerData',userdata);
      const Eotp = req.body.otp;
      const sentOtp = otp;
      if (Eotp == sentOtp) {
        const workerDetails = userdata;
        const { firstName, lastName, email, password, department, phoneNo, district } = workerDetails;
        const hashpassword = await bcryptPassword(password);
        const categoryId = await categoryModel.findOne({name: department})
          const worker = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashpassword,
            file: getFile,
            department: categoryId._id,
            phoneNo: phoneNo,
            district: district,
            isVerified: false,
            isBlocked: false
          };
          await workerModel.insertMany([worker]);
          res.status(200).json({'otpDone': true});
      } else {
        res.status(200).json({'error': true})
      }
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
      console.log(err);
    }
  };

  const getCategory = async(req, res) => {
    try{
      const category = await categoryModel.find()
      if(category) {
        res.status(200).json({recievedCat: category})
      }
    }catch(err){
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  const workerLogin = async(req, res) => {
    try{
      const email = req.body.email;
      const password = req.body.password;
      const worker = await workerModel.findOne({ email: email });
      if (worker) {
        const passwordMatch = await bcrypt.compare(password, worker.password);
        if (passwordMatch) {
          const token = jwt.sign({ value: worker }, secretKey, { expiresIn: '6000000' });
         res.status(200).json({msg:'passMatched', token})

          } else {
            res.status(200).json({msg:'passwordWrong'})
          }
        } else {
            res.status(200).json({msg:'wrongEmail'})
        }
    }catch {
      res.status(500).json()
    }
  }

  const getWorkerDetails = async(req, res)=>{
    try {
      const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        const decoded = jwt.verify(token, secretKey);
        const findedValue = await workerModel.findOne({_id: decoded.value._id}).populate("department")
        res.status(200).json({data:findedValue})
    }catch {
      res.status(500).json()
    }
  }

  const editPhoto = async(req, res)=>{
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const result = await cloudinary.uploader.upload(req.file.path); 
      await workerModel.updateOne({_id: decoded.value._id},{$set:{image: result.secure_url}})
      res.status(200).json({done:true})
    } catch {
      res.status(500).json()
    }
  }

  const editDetails = async(req, res)=>{
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const category = await categoryModel.findOne({ name: req.body.department });
      console.log(category);
      if (!category) {
        return res.status(200).json({ error: 'Invalid department' });
      }
      await workerModel.updateOne(
        { _id: decoded.value._id },
        {
          $set: {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            department: category.id,
            phoneNo: req.body.phoneNo,
            district: req.body.location,
          },
        }
      );
      res.status(200).json({updated:'data updated'})
    } catch {
      res.status(500).json()
    }
  }

  const updateDescription = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      await workerModel.updateOne({_id:decoded.value._id}, {$set: {description: req.body.description}},{upsert:true})
      res.status(200).json({done:true})
    } catch {
      res.status(500).json()
    }
  }



  const fetchRequest = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const workerId = decoded.value._id

      const worker = await workerModel.findById(workerId).populate('requests.userInfo');

      if(!worker) {
        return res.status(200).json({ error: 'no requests' });
      }

      const requests = worker.requests.filter(request => !request.accepted);
      res.status(200).json({ requests });
    } catch {
      res.status(500).json()
    }
  }

  const workAccept = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const workerId = decoded.value._id

      const requestId = req.body.id;
    
      const worker = await workerModel.findOne({
        _id: workerId,
        'requests._id': requestId,
      });
      if (!worker) {
        return res.status(200).json({ error: 'Worker or request not found.' });
      }
      const requestIndex = worker.requests.findIndex((req) => req._id.toString() === requestId);
    
      if (requestIndex === -1) {
        return res.status(200).json({ error: 'Request not found.' });
      }
    
      worker.requests[requestIndex].accepted = true;
    
      await worker.save();
    
      res.status(200).json({ done: true });
    } catch {
      res.status(500).json()
    }
  }

  const workReject = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        const decoded = jwt.verify(token, secretKey);
        const workerId = decoded.value._id;

        const requestId = req.body.id;

        const worker = await workerModel.findOne({
            _id: workerId,
            'requests._id': requestId,
        });

        if (!worker) {
            return res.status(200).json({ error: 'Worker or request not found.' });
        }

        const requestIndex = worker.requests.findIndex((req) => req._id.toString() === requestId);

        if (requestIndex === -1) {
            return res.status(200).json({ error: 'Request not found.' });
        }

        worker.requests.splice([requestIndex], 1);

        await worker.save();

        res.status(200).json({ done: true });
    } catch {
        res.status(500).json();
    }
};


  const acceptedWorks = async (req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const workerId = decoded.value._id

      const worker = await workerModel.findById(workerId).populate('requests.userInfo');

      if(!worker) {
        return res.status(200).json({ error: 'no requests' });
      }

      const accepted = worker.requests.filter(request => request.accepted);
      res.status(200).json({ accepted });
    } catch {
      res.status(500).json()
    }
  }
module.exports = {
    signupSubmit,
    otpProceed,
    getCategory,
    workerLogin,
    getWorkerDetails,
    editPhoto,
    editDetails,
    fetchRequest,
    workAccept,
    workReject,
    acceptedWorks,
    updateDescription
}