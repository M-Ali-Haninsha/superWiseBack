const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    income: {
        type: Number
    } 
});

const adminData=mongoose.model('adminData', adminSchema);

module.exports = adminData;