module.exports = app => {
  const alert = require("../controllers/users.controller.js");
  var router = require("express").Router();
  const { authJwt } = require("../middleware");

  // Create a new Tutorial
  router.get("/", alert.findAll);
  router.post("/singup", alert.singup);
  router.post("/login", alert.login);
  router.get("/verify_email", alert.verify_email);
  router.get("/forgot_password", alert.forgot_password);
  router.get("/reset_password", alert.reset_password);
  router.post("/picture_upload", alert.picture_upload);
  router.post("/update", alert.update);
  router.post("/import_csv", alert.import_csv);

  app.use('/api/users', router);
};
