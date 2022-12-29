module.exports = (sequelize, Sequelize) => {
  const Customer = sequelize.define("customer", {
    first_name: {
      type: Sequelize.STRING
    },
    last_name: {
      type: Sequelize.STRING
    },
    company_name: {
      type: Sequelize.STRING
    },
    address: {
      type: Sequelize.STRING
    },
    city: {
      type: Sequelize.STRING
    },
    county: {
      type: Sequelize.STRING
    },
    state: {
      type: Sequelize.STRING
    },
    zip: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING
    },
    phone1: {
      type: Sequelize.STRING
    },
    phone2: {
      type: Sequelize.STRING
    }
  });

  return Customer;
};