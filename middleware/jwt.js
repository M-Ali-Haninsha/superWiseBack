const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
  
    const tokenValue = token.split(' ')[1];
  
    jwt.verify(tokenValue, secretKey, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
            console.log(err)
          return res.status(403).json({ message: 'session has expired' });
        } else {
          return res.status(403).json({ message: 'Invalid token' });
        }
      }
  
      req.user = decoded;
      next();
    });
  }
  
  module.exports = authenticateToken;