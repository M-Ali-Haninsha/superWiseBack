const workerModel = require("../models/workerModel");
const clientModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { otpGen } = require("../configurations/otpGenerator");
const jwt = require("jsonwebtoken");
const secretKey = "your-secret-key";
const cloudinary = require("../configurations/cloudinaryConfig");
const categoryModel = require("../models/category");

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

let otp;
let userdata;
let getFile;
const signupSubmit = async (req, res) => {
  try {
    getFile = req.file.filename;
    const check = await workerModel.exists({
      email: req.body.email,
    });
    if (check) {
      res.status(200).json({ checked: true });
    } else {
      otp = otpGen();
      userdata = req.body;
      console.log("workerData", userdata);
      console.log("this is otp", otp);
      mail(req.body.email, otp);
      res.status(200).json({ otpGen: true });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const otpProceed = async (req, res) => {
  try {
    console.log("workerData", userdata);
    const Eotp = req.body.otp;
    const sentOtp = otp;
    if (Eotp == sentOtp) {
      const workerDetails = userdata;
      const {
        firstName,
        lastName,
        email,
        password,
        department,
        phoneNo,
        district,
      } = workerDetails;
      const hashpassword = await bcryptPassword(password);
      const categoryId = await categoryModel.findOne({ name: department });
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
        isBlocked: false,
      };
      await workerModel.insertMany([worker]);
      res.status(200).json({ otpDone: true });
    } else {
      res.status(200).json({ error: true });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
    console.log(err);
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await categoryModel.find();
    if (category) {
      res.status(200).json({ recievedCat: category });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const workerLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const worker = await workerModel.findOne({ email: email });
    if (worker) {
      const passwordMatch = await bcrypt.compare(password, worker.password);
      if (passwordMatch) {
        const token = jwt.sign({ value: worker }, secretKey, {
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

const getWorkerDetails = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const findedValue = await workerModel
      .findOne({ _id: decoded.value._id })
      .populate("department");
    res.status(200).json({ data: findedValue });
  } catch {
    res.status(500).json();
  }
};

const editPhoto = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const result = await cloudinary.uploader.upload(req.file.path);
    await workerModel.updateOne(
      { _id: decoded.value._id },
      { $set: { image: result.secure_url } }
    );
    res.status(200).json({ done: true });
  } catch {
    res.status(500).json();
  }
};

const editDetails = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const category = await categoryModel.findOne({ name: req.body.department });
    console.log(category);
    if (!category) {
      return res.status(200).json({ error: "Invalid department" });
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
    res.status(200).json({ updated: "data updated" });
  } catch {
    res.status(500).json();
  }
};

const updateDescription = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    await workerModel.updateOne(
      { _id: decoded.value._id },
      { $set: { description: req.body.description } },
      { upsert: true }
    );
    res.status(200).json({ done: true });
  } catch {
    res.status(500).json();
  }
};

const fetchRequest = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    const worker = await workerModel
      .findById(workerId)
      .populate("requests.userInfo");

    if (!worker) {
      return res.status(200).json({ error: "no requests" });
    }

    const requests = worker.requests.filter((request) => !request.accepted);
    res.status(200).json({ requests });
  } catch {
    res.status(500).json();
  }
};

const workAccept = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    const requestId = req.body.id;

    const worker = await workerModel.findOne({
      _id: workerId,
      "requests._id": requestId,
    });
    if (!worker) {
      return res.status(200).json({ error: "Worker or request not found." });
    }
    const requestIndex = worker.requests.findIndex(
      (req) => req._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(200).json({ error: "Request not found." });
    }

    worker.requests[requestIndex].accepted = true;

    await clientModel.updateOne(
      { _id: requestId },
      { $set: { "workStatus.status": "work yet to be started" } }
    );

    await worker.save();

    res.status(200).json({ done: true });
  } catch {
    res.status(500).json();
  }
};

const workReject = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    const requestId = req.body.id;

    const worker = await workerModel.findOne({
      _id: workerId,
      "requests._id": requestId,
    });

    if (!worker) {
      return res.status(200).json({ error: "Worker or request not found." });
    }

    const requestIndex = worker.requests.findIndex(
      (req) => req._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(200).json({ error: "Request not found." });
    }

    worker.requests.splice([requestIndex], 1);

    await worker.save();

    res.status(200).json({ done: true });
  } catch {
    res.status(500).json();
  }
};

const acceptedWorks = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    const worker = await workerModel
      .findById(workerId)
      .populate("requests.userInfo");

    if (!worker) {
      return res.status(200).json({ error: "no requests" });
    }
    const accepted = worker.requests.filter(
      (request) => request.accepted && request.paymentStatus === "pending"
    );
    const completed = worker.requests.filter(
      (request) => request.accepted && request.paymentStatus === "completed"
    );
    // const accepted = worker.requests.filter(request => request.accepted);
    res.status(200).json({ accepted, completed });
  } catch {
    res.status(500).json();
  }
};

const viewProgress = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    let data = await clientModel.findOne({ _id: req.params.id });
    let newData;
    for (let x of data.workStatus) {
      if (x.workerId == workerId) {
        newData = x.progressBar;
      }
    }
    res.status(200).json({ data, newData });
  } catch {
    res.status(500).json({ error: "server error" });
  }
};

const updateWorkStatus = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    const workerStatus = {
      workerId: workerId,
      progressBar: req.body.progress,
      status: getStatusFromProgress(req.body.progress),
    };

    const user = await clientModel.findOne({ _id: req.params.id });

    console.log("eee", user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingWorkerStatusIndex = user.workStatus.findIndex(
      (status) => status.workerId.toString() === workerId.toString()
    );

    console.log("find", existingWorkerStatusIndex);

    if (existingWorkerStatusIndex === -1) {
      user.workStatus.push(workerStatus);
    } else {
      user.workStatus[existingWorkerStatusIndex] = workerStatus;
    }

    await user.save();

    res.status(200).json({ updated: "status updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function getStatusFromProgress(progress) {
  if (progress === 20) {
    return "work started";
  } else if (progress === 50) {
    return "work under process";
  } else if (progress === 100) {
    return "work completed";
  } else {
    return "work status unknown";
  }
}

const pushImage = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const findedWorkerId = decoded.value._id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const imageUrls = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path);

      if (!result.secure_url) {
        console.error("Image upload failed");
        continue;
      }

      imageUrls.push(result.secure_url);
    }

    if (imageUrls.length === 0) {
      return res.status(500).json({ error: "No images uploaded successfully" });
    }

    const workerId = findedWorkerId;

    const imagesWithWorkerId = imageUrls.map((imageUrl) => ({
      workerId,
      imageUrl,
    }));

    const user = await clientModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const workStatusObject = user.workStatus.find(
      (status) => status.workerId.toString() === workerId
    );

    if (!workStatusObject) {
      return res.status(404).json({ error: "Worker not found in workStatus" });
    }

    workStatusObject.images.push(...imagesWithWorkerId);

    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const postAmount = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    if (req.body.selectedType === "normal") {
      const workStatus = await clientModel.findOne({
        _id: req.params.id,
        "workStatus.workerId": workerId,
      });
      if (workStatus && workStatus.workStatus[0].status === "work completed") {
        const paymentData = {
          workerId: workerId,
          type: req.body.type,
          amount: req.body.amount,
          status: "pending",
        };

        const existingPayment = workStatus.payment.find(
          (payment) => payment.workerId.toString() === workerId
        );

        if (existingPayment) {
          await clientModel.findOneAndUpdate(
            {
              _id: req.params.id,
              "payment.workerId": workerId,
            },
            { $set: { "payment.$": paymentData } }
          );
        } else {
          await clientModel.updateOne(
            { _id: req.params.id },
            { $push: { payment: paymentData } }
          );
        }
        res.status(200).json({ done: true });
      } else {
        res.status(422).json({ workStatus: "work not completed" });
      }
    }
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
};

const getCount = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    const workerId = decoded.value._id;

    const data = await workerModel
      .findOne({ _id: workerId })
      .populate("requests.userInfo");
    let avg = 0;
    for (let average of data.rating) {
      avg = avg + average.starValue / data.rating.length;
    }

    let lengthOfReq = 0;
    for (let reqs of data.requests) {
      if (reqs.accepted == false) {
        lengthOfReq = lengthOfReq + 1;
      }
    }

    const count = data.requests.length;
    res.status(200).json({ data, count, avg, lengthOfReq });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

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
  updateDescription,
  updateWorkStatus,
  viewProgress,
  postAmount,
  pushImage,
  getCount,
};
