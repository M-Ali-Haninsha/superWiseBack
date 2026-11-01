const nodemailer = require("nodemailer");
const config = require("../config/env");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: config.mail.user, pass: config.mail.pass },
});

async function sendOtp(email, otp) {
  await transporter.sendMail({
    from: config.mail.user,
    to: email,
    subject: "Your SuperWise OTP",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}

module.exports = { sendOtp };
