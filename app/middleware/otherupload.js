const util = require("util");
const path = require("path");
const multer = require("multer");

var storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(`${__dirname}/../../images`));
  },
  filename: (req, file, callback) => {
    // console.log(req);
    console.log(file);
    const match = ["image/png", "image/jpeg"];
    // if (match.indexOf(file.mimetype) === -1) {
    //   var message = `${file.originalname} is invalid. Only accept png/jpeg.`;
    //   return callback(message, null);
    // }


      var filename = `${Date.now()}-${file.originalname}`;
      callback(null, filename);

  }
});
var uploadFiles = multer({ storage: storage }).single("image");
var uploadFilesMiddleware = util.promisify(uploadFiles);
module.exports = uploadFilesMiddleware;
