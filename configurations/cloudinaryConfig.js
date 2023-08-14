const cloudinary = require('cloudinary').v2;


cloudinary.config({
  cloud_name: "df3qijj4a",
  api_key: "575787315449472",
  api_secret: "REDACTED",
  secure: true
});

module.exports = cloudinary