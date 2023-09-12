const path = require('path')
const adminModel = require('../models/adminModel')
const workerModel = require('../models/workerModel')
const userModel = require('../models/userModel')
const categoryModel = require('../models/category')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const secretKey = 'your-secret-key';
const cloudinary = require('../configurations/cloudinaryConfig')


const loginSubmit = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const admin = await adminModel.findOne({ email: email });
        if (admin) {
          const passwordMatch = await bcrypt.compare(password, admin.password);
          if (passwordMatch) {
            const token = jwt.sign({ value: admin }, secretKey, { expiresIn: '6000000' });
           res.status(200).json({msg:'passMatched', token})
  
            } else {
              res.status(200).json({msg:'passwordWrong'})
            }
          } else {
              res.status(200).json({msg:'wrongEmail'})
          }
      } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
      }
};

const showWorkers = async (req, res) => {
  try {
    const allWorkers = await workerModel.find({isVerified:false}).lean();
    if (allWorkers) {
      const modifiedWorkers = await Promise.all(allWorkers.map(async (worker) => {
        const departmentId = worker.department;
        const department = await categoryModel.findById(departmentId).lean();
        if (department) {
          return {
            ...worker,
            department: department.name,
          };
        } else {
          return worker;
        }
      }));
      res.status(200).json({ workers: modifiedWorkers });
    }
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

const verifiedWorkers = async (req, res) => {
  try {
    const allWorkers = await workerModel.find({isVerified:true}).lean();
    if (allWorkers) {
      const modifiedWorkers = await Promise.all(allWorkers.map(async (worker) => {
        const departmentId = worker.department;
        const department = await categoryModel.findById(departmentId).lean();
        if (department) {
          return {
            ...worker,
            department: department.name,
          };
        } else {
          return worker;
        }
      }));
      res.status(200).json({ workers: modifiedWorkers });
    }
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

const fetchUsers = async(req, res)=>{
  try{
    const users = await userModel.find()
    res.status(200).json({user: users})
  }catch{
    res.status(500).json()
  }
}

const proof = async(req, res) => {
  try{
    const proof = req.params.proof
    const filePath = path.join(__dirname, '../public/files/', proof)
    res.setHeader('Content-Disposition', `attachment; filename="${proof}"`)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(filePath)
  }catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

const accept = async(req, res) => {
  try{
    console.log('entered');
    const { email } = req.body
    console.log(email);
    await workerModel.updateOne({email: email},{$set:{isVerified:true}})
    res.status(200).json('done')
  }catch {
    res.status(500).json()
  }
}

const reject = async(req, res) => {
  try{
    console.log('entered');
    const { email } = req.body
    console.log(email);
    await workerModel.deleteOne({email: email})
    res.status(200).json('done')
  }catch {
    res.status(500).json()
  }
}

const blockWorker = async(req, res) => {
  try{
    console.log('entered');
    const { id } = req.body
    console.log(id);
    await workerModel.updateOne({_id:id},{$set:{isBlocked:true}})
    res.status(200).json('done')
  }catch {
    res.status(500).json()
  }
}

const unBlockWorker = async(req, res) => {
  try{
    console.log('entered');
    const { id } = req.body
    console.log(id);
    await workerModel.updateOne({_id:id},{$set:{isBlocked:false}})
    res.status(200).json('done')
  }catch {
    res.status(500).json()
  }
}

const blockUser = async(req, res) => {
  try{
    const { id } = req.body
    console.log(id);
    await userModel.updateOne({_id:id},{$set:{isBlocked:true}})
    res.status(200).json('done')
  }catch {
    res.status(500).json()
  }
}

const unBlockUser = async(req, res) => {
  try{
    const { id } = req.body
    console.log(id);
    await userModel.updateOne({_id:id},{$set:{isBlocked:false}})
    res.status(200).json('done')
  }catch {
    res.status(500).json()
  }
}

  const getIncome = async (req, res) => {
    try {
      const data = await adminModel.findOne()
      const income = data.income
      console.log(income);
      res.status(200).json({income})
    } catch {
      res.status(500).json({error:'internal server error'})
    }
  }

  const countDetails = async(req, res)=> {
    try {
      const workerCount = await workerModel.find().count()
      const clientCount = await userModel.find().count()
      const workerData = await workerModel.find().populate('department').limit(5)
      res.status(200).json({workerCount, clientCount, workerData})
    } catch {
      res.status(500).json({error:'internal server error'})
    }
  }

  const getChartValue = async(req, res)=> {
    try {

      workerModel.aggregate([
        {
          $group: {
            _id: '$department', 
            count: { $sum: 1 }, 
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'departmentInfo',
          },
        },
        {
          $unwind: '$departmentInfo', 
        },
        {
          $project: {
            departmentName: '$departmentInfo.name', 
            workerCount: '$count',
          },
        },
      ])
        .exec()
        .then((result) => {
          res.status(200).json(result);
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: 'Internal server error.' });
        });
    } catch {
      res.status(500).json({error: 'internal server error'})
    }
  }
 

module.exports = {
    loginSubmit,
    showWorkers,
    proof,
    accept,
    reject,
    verifiedWorkers,
    blockWorker,
    unBlockWorker,
    fetchUsers,
    blockUser,
    unBlockUser,
    getIncome,
    countDetails,
    getChartValue
}