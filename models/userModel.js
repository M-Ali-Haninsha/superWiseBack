const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
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
    phone: {
        type:Number
    },
    password:{
        type:String,
        required:true
    },
    location: {
        type:String
    },
    image: {
        type: String
    },
    workStatus: [{
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:'workerData'
        },
        progressBar: {
            type: Number
        },
        status: {
            type: String
        },
        amount: {
            type: Number
        }

    }],
    isBlocked: {
        type: Boolean
    }
});

const userData=mongoose.model('userData', userSchema);

module.exports = userData;