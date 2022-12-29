const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.customers = require("./customer.model.js")(sequelize, Sequelize); 
// db.tutorials = require("./tutorial.model.js")(sequelize, Sequelize); 
// db.drivers = require("./driver.model.js")(sequelize, Sequelize);ssss
module.exports = db;
