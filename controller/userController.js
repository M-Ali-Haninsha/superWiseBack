const categoryModel = require("../models/category");
const userModel = require("../models/userModel");
const workerModel = require("../models/workerModel");
const adminModel = require("../models/adminModel");
const { otpGen } = require("../configurations/otpGenerator");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secretKey = "your-secret-key";
const cloudinary = require("../configurations/cloudinaryConfig");

const bcryptPassword = async (password) => {
  try {
    const hashpassword = await bcrypt.hash(password, 10);
    return hashpassword;
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
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

const getCategory = async (req, res) => {
  try {
    const category = await categoryModel.find();
    res.status(200).json({ result: category });
  } catch {
    res.status(500).json();
  }
};

let otp;
let userData;
const userSignup = async (req, res) => {
  try {
    const check = await userModel.exists({
      email: req.body.email,
    });
    if (check) {
      res.status(200).json({ checked: true });
    } else {
      otp = otpGen();
      userData = req.body;
      console.log("this is otp", otp);
      mail(req.body.email, otp);
      res.status(200).json({ otpGen: true });
    }
  } catch {
    res.status(500).json();
  }
};

const userOtp = async (req, res) => {
  try {
    const Eotp = req.body.datas;
    const sentOtp = otp;
    if (Eotp == sentOtp) {
      const userDetails = userData;
      const { firstName, lastName, email, password, phoneNo, location } =
        userDetails;
      const hashpassword = await bcryptPassword(password);
      const user = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: hashpassword,
        phone: phoneNo,
        location: location,
        isBlocked: false,
      };
      await userModel.insertMany([user]);
      res.status(200).json({ otpDone: true });
    } else {
      res.status(200).json({ error: true });
    }
  } catch (error) {
    res.status(500).json();
  }
};

const userLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const user = await userModel.findOne({ email: email });
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        const token = jwt.sign({ value: user }, secretKey, {
          expiresIn: "6000000",
        });
        res.status(200).json({ msg: "passMatched", token });
      } else {
        res.status(200).json({ msg: "passwordWrong" });
      }
    } else {
      res.status(200).json({ msg: "wrongEmail" });
    }
  } catch {
    res.status(500).json();
  }
};

const getWorkers = async (req, res) => {
  try {
    const workers = await workerModel
      .find({ department: req.params.id, isVerified: true })
      .populate("department");
    res.status(200).json({ data: workers });
  } catch {
    res.status(500).json();
  }
};

const workerDetails = async (req, res) => {
  try {
    const workerData = await workerModel
      .findOne({ _id: req.params.id })
      .populate("department");
    res.status(200).json({ data: workerData });
  } catch {
    res.status(500).json();
  }
};

const hireWorker = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    let userId = decoded.value._id;

    const existingWorker = await workerModel.findOne({
      _id: req.params.id,
      "requests.userInfo": userId,
    });

    if (existingWorker) {
      return res.status(200).json({ error: "User already has a request." });
    }

    const newRequest = {
      userInfo: userId,
      requirement: req.body.description,
      date: req.body.date,
      paymentStatus: "pending",
      accepted: false,
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
    res.status(500).json();
  }
};

const getUserData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    const data = await userModel.findOne({ _id: userId });

    res.status(200).json({ fetchedData: data });
  } catch {
    res.status(500).json();
  }
};

const editPhoto = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;
    const result = await cloudinary.uploader.upload(req.file.path);
    const data = await userModel.updateOne(
      { _id: userId },
      { $set: { image: result.secure_url } }
    );
    res.status(200).json({ done: true });
  } catch {
    res.status(500).json();
  }
};

const hiredWorks = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    const worker = await workerModel
      .find({
        requests: {
          $elemMatch: {
            userInfo: userId,
            paymentStatus: { $ne: "completed" },
          },
        },
      })
      .populate("department");
    res.status(200).json({ worker });
  } catch {
    res.status(500).json();
  }
};

const updateDetails = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;
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
    );
    res.status(200).json({ done: true });
  } catch {
    res.status(500).json();
  }
};

const getProgressValue = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;
    let value = await userModel.findOne({ _id: userId });
    let newValue;
    let status;
    for (let x of value.workStatus) {
      if (x.workerId == req.params.id) {
        newValue = x.progressBar;
      }
    }
    res.status(200).json({ data: newValue });
  } catch {
    res.status(500).json();
  }
};

const getAmount = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    let client = await userModel.findOne({ _id: userId });
    let amount;
    for (let x of client.payment) {
      if (x.workerId == req.params.id) {
        amount = x.amount;
      }
    }
    res.status(200).json({ amount: amount });
  } catch {
    res.status(500).json({ error: "server error" });
  }
};

const rating = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    let finded = await workerModel.findOne({
      _id: req.params.id,
      "rating.userRef": userId,
    });

    if (finded) {
      console.log("finded");
    } else {
      let test = req.body.comment;
      let ratingData = {
        userRef: userId,
        starValue: req.body.starValue,
        comment: test.comment,
      };
      await workerModel.updateOne(
        { _id: req.params.id },
        { $push: { rating: ratingData } }
      );
      res.status(200).json({ done: true });
    }
  } catch {
    res.status(500).json({ err: "server error" });
  }
};

const showRating = async (req, res) => {
  try {
    let workerId = req.params.id;
    let data = await workerModel
      .findOne({ _id: workerId })
      .populate("rating.userRef");
    res.status(200).json({ rating: data.rating });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

const progressImages = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    const user = await userModel.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const workerIdToFind = req.params.id;

    const workStatusObject = user.workStatus.find(
      (status) => status.workerId.toString() === workerIdToFind
    );

    if (!workStatusObject) {
      return res.status(404).json({ error: "Worker not found in workStatus" });
    }

    const progressImages = workStatusObject.images;

    res.status(200).json({ progressImages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const clientDataMessage = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    let clientDataMessage = await userModel.findOne({ _id: userId });
    res.status(200).json({ clientDataMessage });
  } catch {
    res.status(500).json({ error: "server error" });
  }
};

const workDataMessage = async (req, res) => {
  try {
    let workerDataMessage = await workerModel.findOne({ _id: req.params.id });
    res.status(200).json({ workerDataMessage });
  } catch {
    res.status(500).json({ error: "server error" });
  }
};

const getPaymentData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    console.log(req.params.id);

    let paymentData = await userModel.findOne({ _id: userId });
    let details;
    for (let data of paymentData.payment) {
      if (data.workerId == req.params.id) {
        details = data;
      }
    }

    console.log(paymentData);
    res.status(200).json({ paymentData, details });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

const viewWorkHistory = async (req, res) => {
  try {
    console.log("entered");

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    const user = await userModel.findOne({ _id: userId }).populate({
      path: "workStatus.workerId",
      populate: {
        path: "department",
        model: "category",
      },
    });

    if (user) {
      const filteredWorkStatus = user.workStatus.filter(
        (status) => status.paymentStatus === "completed"
      );

      user.workStatus = filteredWorkStatus;

      console.log(user);
      res.status(200).json({ user });
    } else {
      console.log("No user found with the given ID.");
    }
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

const historyData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;

    const clientData = await userModel.findOne({ _id: userId });
    const workerData = await workerModel
      .findOne({ _id: req.params.id })
      .populate("department");
    userModel
      .findOne({ _id: userId })
      .populate({
        path: "payment",
        match: { workerId: req.params.id },
      })
      .then((user) => {
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const payments = user.payment.filter(
          (payment) => payment.workerId.toString() === req.params.id
        );

        res.status(200).json({ payments, clientData, workerData });
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "Internal server error" });
      });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

const reportWorker = async (req, res) => {
  try {
    console.log("entered");

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.value._id;
    console.log(req.params.id);
    console.log(req.body);

    let clientCheck = await adminModel.findOne({
      "complaints.clientId": userId,
    });

    if (!clientCheck) {
      let complaint = {
        clientId: userId,
        workerId: req.params.id,
        issue: req.body.reason,
      };
      console.log(complaint);
      await adminModel.updateOne(
        {},
        { $push: { complaints: complaint } },
        { upsert: true }
      );
      res.status(200).json({ reportUpdated: true });
    } else {
      res.status(200).json({ clientFound: "already reported" });
    }
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

// const bookedDates = async(req, res) => {
//   try {
//     const workerId = req.params.id;
    
//     const worker = await workerModel.findById(workerId);
//     const bookedDates = worker.requests.map(request => request.date);
//     res.status(200).json(bookedDates)
//   } catch {
//     res.status(500).json({error:" Internal server error"})
//   }
// }

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
  updateDetails,
  getProgressValue,
  getAmount,
  rating,
  showRating,
  progressImages,
  clientDataMessage,
  workDataMessage,
  getPaymentData,
  viewWorkHistory,
  historyData,
  reportWorker,
  // bookedDates
};
