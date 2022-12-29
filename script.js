const express = require("express");
const cors = require("cors");
const app = express();
var http = require('http');
    var ejs = require('ejs');
const corsOpts = {
  origin: '*',

  methods: [
    'GET',
    'POST',
  ],

  // allowedHeaders: [
  //   'Content-Type',
  // ],
};
app.use(cors(corsOpts));
app.use(express.static('images'));
app.use(express.static('uploads'));

// app.use(cors(corsOptions));
// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs')

app.get('/template', (req, res) => {
    res.render('propery_template')
    // res.send("hello chetan")
})

// ejs.renderFile(__dirname + '/../emailTemplate/propery_template.ejs', function(err, data) {
//   console.log(err || data);
// });

const db = require("./app/models");
db.sequelize.sync();
// require("./app/routes/turorial.routes")(app);
require("./app/route/user.routes")(app);
require("./app/route/property.routes")(app);

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});
// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
