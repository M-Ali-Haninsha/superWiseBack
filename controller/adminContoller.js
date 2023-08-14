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

const addCategory = async(req, res) => {
  try{
   const data = req.body
   const {categoryName, description} = data
   const result = await cloudinary.uploader.upload(req.file.path); 
   const cat = {
    name: categoryName,
    Image:result.secure_url,
    description: description
   }
   await categoryModel.insertMany([cat])
   res.status(200).json({'done': true})
  } catch(err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

const editCategory = async(req, res)=>{
  try {
    console.log(req.params.id);
    await categoryModel.updateOne({_id: req.params.id},{$set:{name: req.body.categoryName, description: req.body.description}})
    if(req.file){
      const img = await cloudinary.uploader.upload(req.file.path);
      await categoryModel.updateOne({_id: req.params.id},{$set:{name: req.body.categoryName,Image:img.secure_url,description: req.body.description}})
    }
    res.status(200).json({done: true})
  } catch {
    res.status(500).json()
  }
}


module.exports = {
    loginSubmit,
    showWorkers,
    proof,
    getCategory,
    addCategory,
    accept,
    reject,
    verifiedWorkers,
    blockWorker,
    unBlockWorker,
    fetchUsers,
    blockUser,
    unBlockUser,
    editCategory
}