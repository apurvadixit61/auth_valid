const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
verifyToken = (req, res, next) => {
let token = req.headers["x-access-token"];

  if (!token) {

    return res.send({statuscode: 404,data:[],token:null,  message: 'No token provided!'});

  }
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.send({statuscode: 404,data:[],token:null, message: 'Unauthorized!'});

    }

    req.userId = decoded.id;
    next();
  });
};
const authJwt = {
  verifyToken: verifyToken
};
module.exports = authJwt;
