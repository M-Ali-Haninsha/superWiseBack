const cloudinary = require('../configurations/cloudinaryConfig')
const categoryModel = require('../models/category')



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
    getCategory,
    addCategory,
    editCategory
}