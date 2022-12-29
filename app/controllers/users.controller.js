const db = require("../models");
const config = require("../config/auth.config");
const ejs = require('ejs');
const path = require('path');
var formidable = require('formidable');
const Op = db.Sequelize.Op;
var bcrypt = require("bcryptjs");
var crypto = require('crypto');
const nodemailer = require('nodemailer');
var dateTime = require('node-datetime');
var jwt = require("jsonwebtoken");
const fs = require("fs");
var utils = require('util');
var FCM = require('fcm-node');
var serverKey = 'YOURSERVERKEYHERE'; //put your server key here
var fcm = new FCM(serverKey);
const csv = require('fast-csv');
const imageUpload = require("../middleware/imageupload");

let transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: "developerallthings@gmail.com",
		pass: "jprrpwvxvsrkejph",
	},
});

// Create and Save a new Driver
// Retrieve all Drivers from the database.
exports.findAll = (req, res) => {
	console.log('ok');
	console.log(db);
};

function randomValueHex(len) {
	return crypto.randomBytes(Math.ceil(len / 2))
		.toString('hex') // convert to hexadecimal format
		.slice(0, len).toUpperCase(); // return required number of characters
}

function isEmpty(obj) {
	return !obj || Object.keys(obj).length === 0;
}


function makeid(length) {
	var result = '';
	var characters = '0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() *
			charactersLength));
	}
	return result;
}


exports.singup = (req, res) => {
	console.log("calling1.........")

	let password_request;
	if (!req.body.email) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Email can not be empty!'
		});

	}

	let singup_checked_status = req.body.singup_checked_status;
	if (singup_checked_status == 1) {
		password_request = req.body.password;
	} else {
		password_request = 'NFX25612' + req.body.first_name
	}

	let final_password = bcrypt.hashSync(password_request, 8)
	var string = randomValueHex(6) + "-" + randomValueHex(4) + "-" + randomValueHex(6);
	console.log(string);
	// Create a User
	const user = {
		username: req.body.username ? req.body.username : '',
		first_name: req.body.first_name ? req.body.first_name : '',
		last_name: req.body.last_name ? req.body.last_name : '',
		email: req.body.email ? req.body.email : '',
		password: final_password,
		email_verify_token: string
	}
	db.sequelize.query(
		"SELECT * from users where  email='" + req.body.email + "'", null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (isEmpty(myTableRows[0])) {

			sql = "INSERT INTO users(username,first_name,email,password,last_name,email_verify_token) VALUES ('" + req.body.username + "','" + req.body.first_name + "','" + req.body.email + "', '" + bcrypt.hashSync(req.body.password, 8) + "', '" + req.body.last_name + "','" + string + "');"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {

				let verificationLink = "http://localhost:8080/api/users/verify_email?key=" + req.body.email + "&token=" + string
				let mailOptions

				if (transporter) {

					var receiver, content


					ejs.renderFile('./emailTemplate/welcome.ejs', {
						username: user.email,
						password: req.body.password,
						receiver,
						content,
						verificationLink
					}, (err, data) => {
						if (err) {
							console.log(err);
						} else {
							mailOptions = {
								from: 'infopropert@gmail.com',
								to: req.body.email,
								subject: 'Thank you for signing up',
								html: data
							};

							transporter.sendMail(mailOptions, (error, info) => {
								if (error) {
									return console.log(error);
									// return res.json({ status: "success", message: "User Registration Successfull", record });
								}

								if (info.messageId) {
									return res.send({
										statuscode: true,
										data: myTableRows[0],
										token: null,
										message: 'User successfully registered'
									});
								} else {
									return res.json({
										status: "False",
										message: "Registration Failed",
										error
									});
								}
							});
						}
					})
				}


			});


		} else {

			if (myTableRows[0][0].email == req.body.email) {
				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: 'Email already Exists!'
				});
			}



		}

	})

};

exports.verify_email = (req, res) => {
	if (!req.query.key) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Email can not be empty!'
		});
	}
	if (!req.query.token) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'token can not be empty!'
		});
	}

	let sql = "select * from users where email='" + req.query.key + "' and email_verify_token ='" + req.query.token + "'"
	console.log(sql);
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (isEmpty(myTableRows[0])) {
			return res.send({
				statuscode: false,
				data: [],
				token: null,
				message: 'Error verifiy email!'
			});
		} else {
			var dt = dateTime.create();
			var formatted = dt.format('Y-m-d H:M:S');
			console.log(formatted);
			let update_sql = "UPDATE users SET confirmed_at =  '" + formatted + "'  WHERE email = '" + req.query.key + "'"
			db.sequelize.query(
				update_sql, null, {
				raw: true
			}
			).then(function (myTableRow) {
			
				res.sendFile(path.join(__dirname + '/test.html'));

			})

		}

	});

}


exports.login = (req, res) => {

	if (!req.body.email) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Email/Username can not be empty!'
		});
	}

	if (!req.body.password) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Password can not be empty!'
		});
	}

	let password = bcrypt.hashSync(req.body.password, 8)
	let sql = "select * from users where email='" + req.body.email + "' or username='" + req.body.email + "'"
	console.log(sql);
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {

		if (isEmpty(myTableRows[0])) {
			return res.send({
				statuscode: false,
				data: [],
				token: null,
				message: 'These credentials do not match our records.!'
			});
		} else {
			console.log(myTableRows[0]);
			if (myTableRows[0][0].confirmed_at == null && myTableRows[0][0].is_verify == null) {
				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: 'Email/OTP is not verify Yet '
				});

			} else {

				bcrypt.compare(req.body.password, myTableRows[0][0].password, function (err, resq) {
					if (err) {
						return res.send({
							statuscode: false,
							data: [],
							token: null,
							message: 'some error occured',
							token: null
						});

					}

					if (resq) {
						/// Send JWT
						var token = jwt.sign({
							id: myTableRows[0][0].id
						}, config.secret, {
							expiresIn: 86400 // 24 hours
						});

						return res.send({
							statuscode: true,
							data: myTableRows[0],
							message: "You are logged in as: " + myTableRows[0][0].username,
							token: token
						});


					} else {
						// response is OutgoingMessage object that server response http request
						return res.send({
							statuscode: false,
							data: [],
							token: null,
							message: 'Passwords do not match',
							token: null
						});
					}

				});
			}



		}
	})

}

exports.forgot_password = (req, res) => {
	let sql = "select * from users where email='" + req.query.email + "'"
	console.log(sql);
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (isEmpty(myTableRows[0])) {
			return res.send({
				statuscode: false,
				data: [],
				token: null,
				message: 'Email not Exists!'
			});
		} else {

			let verificationLink = "http://localhost:8080/resetpassword/" + req.query.email + "/" + myTableRows[0][0].email_verify_token
			let mailOptions

			if (transporter) {

				var receiver, content

				ejs.renderFile('./emailTemplate/forgot.ejs', {
					receiver,
					content,
					verificationLink
				}, (err, data) => {
					if (err) {
						console.log(err);
					} else {
						mailOptions = {
							from: 'infopropert@gmail.com',
							to: req.query.email,
							subject: 'Reset Password',
							html: data
						};

						transporter.sendMail(mailOptions, (error, info) => {
							if (error) {
								return console.log(error);
								// return res.json({ status: "success", message: "User Registration Successfull", record });
							}
							console.log(info);
							if (info.messageId) {
								return res.send({
									statuscode: true,
									data: [],
									message: "Reset email send succesfully",
									token: 'token'
								});
							} else {
								return res.json({
									status: "False",
									message: "Registration Failed",
									error
								});
							}
						});
					}
				})
			}
		}
	})

}

exports.reset_password = (req, res) => {

	if (!req.query.key) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Email can not be empty!'
		});
	}
	if (!req.query.token) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'token can not be empty!'
		});
	}


	if (!req.query.password) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'new password  can not be empty!'
		});
	}


	let sql = "select * from users where email='" + req.query.key + "' and email_verify_token ='" + req.query.token + "'"
	// console.log("sql",sql);

	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (isEmpty(myTableRows[0])) {
			return res.send({
				statuscode: false,
				data: [],
				token: null,
				message: 'Error changing password!'
			});
		} else {
			const string = randomValueHex(6) + "-" + randomValueHex(4) + "-" + randomValueHex(6);
			// console.log("string=",string)

			let update_sql = "UPDATE users SET email_verify_token ='" + string + "',password =  '" + bcrypt.hashSync(req.query.password, 8) + "'  WHERE email = '" + req.query.key + "'"
			db.sequelize.query(
				update_sql, null, {
				raw: true
			}
			).then(function (myTableRow) {

				return res.send({
					statuscode: true,
					data: [],
					message: "Password Change succesfully",
					token: 'token'
				});

			})

		}

	})



}

exports.user_by_id = (req, res) => {
	let sql = "select * from users where id=" + req.query.id
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {

		return res.send({
			statuscode: true,
			data: myTableRows[0],
			message: "User get successfully",
			token: 'token'
		});
	})

}


exports.picture_upload = (req, res) => {
	var form = new formidable.IncomingForm();
	form.parse(req, async (err, fields, files) => {
		const id = fields.id;
		const key = fields.key;
		console.log(files.image);
		if (files.image) {

			const match = ["image/png", "image/jpeg","application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 'application/pdf'];

			if (match.indexOf(files.image.mimetype) === -1) {

				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: `${files.image.originalFilename} is invalid. Only accept png/jpg/pdf/xlsx/docs.`
				});

			}

			
		var newFileName = `${Date.now()}-${files.image.originalFilename}`;


		var oldpath = files.image.filepath;
		var newpath = path.join(`${__dirname}/../../images/`) + newFileName;

		fs.rename(oldpath, newpath, function(err) {
			// if (err) {
			// 	return next(err);
			// }
		})
		let sql = "update users set  " + fields.key + "  ='" + newFileName + "'   where id=" + fields.id

		db.sequelize.query(
			sql, null, {
				raw: true
			}
		).then(function(myTableRows) {

			return res.send({
				statuscode: true,
				data: [],
				token: null,
				message: 'Congtrulation your document uploads succesfully'
			});

		})


		}else{
			return res.send({
				statuscode: false,
				data: [],
				token: null,
				message: 'Please select a file to upload.'
			});
		}
	})
}


exports.update = (req, res) => {
	var form = new formidable.IncomingForm();
	form.parse(req, async (err, fields, files) => {
		let sql="UPDATE users SET first_name = '"+fields.first_name+"',last_name ='"+fields.last_name+"' WHERE id =" +fields.id
		db.sequelize.query(
			sql, null, {
				raw: true
			}
		).then(function(myTableRow) {
			return res.send({
				statuscode: true,
				data: [],
				token: null,
				message: 'User account updated succesfully'
			});
		})
	})
}

exports.import_csv = async (req, res) =>
{
	// await imageUpload(req, res);
	var fileaddress=path.dirname(require.main.filename)+'/uploads/us-500.csv';
	// console.log(path.dirname(require.main.filename)+'/uploads/us-500.csv');
	UploadCsvDataToMySQL(fileaddress)
}

function UploadCsvDataToMySQL(filePath)
{
	let stream = fs.createReadStream(filePath);
    let csvData = [];

	let csvStream = csv
    .parse()
    .on("data", function (data) {
        csvData.push(data);
    })
    .on("end", function () {

        // Remove Header ROW
        csvData.shift();
		console.log(csvData[0]);
		// let query = 'INSERT INTO customer (first_name, last_name, company_name, address, city, county, state, zip, email, phone1, phone2) VALUES ?';

		// db.sequelize.query(
		// 	query, [csvData], {
		// 	raw: true
		// }
		// ).then(function(myTableRow) {
		// 	return res.send({
		// 		statuscode: true,
		// 		data: [],
		// 		token: null,
		// 		message: 'CSV imported succesfully'
		// 	});
		// })

        
        // delete file after saving to MySQL database
        // -> you can comment the statement to see the uploaded CSV file.
        // fs.unlinkSync(filePath)
    });

    stream.pipe(csvStream);

}