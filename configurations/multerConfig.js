const multer = require('multer')
const path = require('path')
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        console.log('destination',file);
        cb(null, path.join(__dirname, '../public/files'))
    },
     filename:(req, file, cb)=>{
        console.log('filename',file.originalname);

        const name = Date.now()+'-'+ file.originalname;
        cb(null, name)
        }  
})

module.exports  = multer({storage:storage})