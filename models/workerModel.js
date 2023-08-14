const mongoose = require('mongoose')

const workerSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required: true
    },
    lastName:{
        type: String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    file:{
        type: String,
        required:true
    },
    department:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'category'
    },
    phoneNo:{
        type: Number,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        required: true
    },
    isBlocked: {
        type: Boolean,
        required: true
    }
});

const workereData=mongoose.model('workerData', workerSchema);

module.exports = workereData;