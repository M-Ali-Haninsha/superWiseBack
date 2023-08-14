const otpGenerator = require('otp-generator')

const otpGen = ()=>{
    const otp= otpGenerator.generate(4, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    return otp;
}

module.exports={
    otpGen
}