const categoryModel = require('../models/category')
const userModel = require('../models/userModel')
const workerModel = require('../models/workerModel')
const { otpGen } = require('../configurations/otpGenerator')
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';
const cloudinary = require('../configurations/cloudinaryConfig')

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

const getCategory = async(req, res)=>{
    try{
        const category = await categoryModel.find()
        res.status(200).json({result: category})
    }catch{
        res.status(500).json()
    }
}

let otp;
let userData;
const userSignup = async(req, res)=> {
    try{
        const check = await userModel.exists({
            email: req.body.email,
          });
          if (check) {
            res.status(200).json({"checked": true})
          } else {
            otp = otpGen();
            userData = req.body;
            console.log('this is otp', otp);
            mail(req.body.email, otp);
            res.status(200).json({"otpGen":true})
          }
    }catch{
        res.status(500).json()
    }
}

const userOtp = async(req, res)=> {
    try {
        const Eotp = req.body.data;
        const sentOtp = otp;
        if (Eotp == sentOtp) {
          const userDetails = userData;
          const { firstName, lastName, email, password, phoneNo, location } = userDetails;
          const hashpassword = await bcryptPassword(password);
            const user = {
              firstName: firstName,
              lastName: lastName,
              email: email,
              password: hashpassword,
              phone: phoneNo,
              location: location,
              isBlocked:false
            };
            await userModel.insertMany([user]);
            res.status(200).json({'otpDone': true});
        } else {
          res.status(200).json({'error': true})
        }
    } catch (error) {
        res.status(500).json()
    }
}

const userLogin = async(req, res) => {
    try{
      const email = req.body.email;
      const password = req.body.password;
      const user = await userModel.findOne({ email: email });
      if (user) {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
          const token = jwt.sign({ value: user }, secretKey, { expiresIn: '6000000' });
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

  const getWorkers = async(req, res)=> {
    try {
      const workers = await workerModel.find({department:req.params.id, isVerified:true}).populate("department")
      res.status(200).json({data: workers})
    } catch {
      res.status(500).json()
    }
  }

  const workerDetails = async(req, res)=>{
    try {
      const workerData = await workerModel.findOne({_id:req.params.id}).populate("department")
      res.status(200).json({data: workerData})
    } catch {
      res.status(500).json()
    }
  }

  const hireWorker = async(req, res)=> {
    try {
      console.log('body', req.body);
      console.log('file', req.file);
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      let userId = decoded.value._id;
  
      const existingWorker = await workerModel.findOne({
          _id: req.params.id,
          'requests.userInfo': userId
      });
  
      if (existingWorker) {
          return res.status(200).json({ error: 'User already has a request.' });
      }
  
      const newRequest = {
          userInfo: userId,
          requirement: req.body.description,
          accepted: false
      };
  
      if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path);
          newRequest.file = result.secure_url;
      }
  
      await workerModel.updateOne(
          { _id: req.params.id },
          { $push: { requests: newRequest } },
          { upsert: true }
      );
  
      res.status(200).json({ done: true });
  } catch {
      res.status(500).json()
    }
  }

  const getUserData = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const userId = decoded.value._id

      const data = await userModel.findOne({_id:userId})

      res.status(200).json({fetchedData: data})
    } catch {
      res.status(500).json()
    }
  }

  const editPhoto = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const userId = decoded.value._id
      const result = await cloudinary.uploader.upload(req.file.path);
      const data = await userModel.updateOne({_id:userId}, {$set:{image: result.secure_url}})
      res.status(200).json({done: true})
    } catch {
      res.status(500).json()
    }
  }

  const hiredWorks = async(req, res)=> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const userId = decoded.value._id
      
      const worker = await workerModel.find({ 'requests.userInfo': userId }).populate('department')
      res.status(200).json({worker})
    } catch {
      res.status(500).json()
    }
  }

  const updateDetails = async(req, res)=> {
    try {
      console.log(req.body);
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      const decoded = jwt.verify(token, secretKey);
      const userId = decoded.value._id
      await userModel.updateOne(
        { _id: userId },
        {
          $set: {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phoneNo,
            location: req.body.location,
          },
        }
        )
      res.status(200).json({done:true})
    } catch {
      res.status(500).json()
    }
  }

module.exports = {
    getCategory,
    userSignup,
    userOtp,
    userLogin,
    getWorkers,
    workerDetails,
    hireWorker,
    getUserData,
    editPhoto,
    hiredWorks,
    updateDetails
}