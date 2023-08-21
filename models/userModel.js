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
    isBlocked: {
        type: Boolean
    }
});

const userData=mongoose.model('userData', userSchema);

module.exports = userData;