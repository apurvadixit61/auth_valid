const db = require("../models");
const path = require("path");
const Op = db.Sequelize.Op;
var bcrypt = require("bcryptjs");
var formidable = require("formidable");
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const fs = require("fs");
const QRCode = require('qrcode')
var easyinvoice = require('easyinvoice');

var utils = require('util');
const stripe = require("stripe")(
	"sk_test_51LyDjZSFdd58PYS5qnAaKwvBSOG2fawBE6WCMkiAMunP80SW7fj1vd8rairzeP7ginaUldRDQEweVAW5YfNIBNKf00uHHnJi3G"
);

const getPagingData = (data, page, limit) => {

	const { count: totalItems, rows: results } = data;
	const currentPage = page ? +page : 0;
	const totalPages = Math.ceil(totalItems / limit);
	if (results.length > 0) {
		return { totalItems, statuscode: true, message: "Get Data Successfully", image_url: process.env.IMAGE_URL, results, totalPages, currentPage };
	} else {
		return { statuscode: false, message: "No Data Found" }
	}

};



function isEmpty(obj) {
	return !obj || Object.keys(obj).length === 0;
}



const getPagination = (page, size) => {

	const limits = size ? +size : 3;
	const offsets = page ? page * limits : 0;
	return { limits, offsets };
};




exports.search_properties = (req, res) => {
	const user_id = req.body.user_id;
	let offset;
	if (!req.body.page) {
		offset = 0
	} else {
		offset = req.body.page
	}
	let limit;
	if (!req.body.limit) {
		limit = 100
	} else {
		limit = req.body.limit
	}
	let aminity = req.body.aminity
	let aminity_query = '';
	let aminity_select = ',subcategory_id as attributes';
	let aminity_join = '';
	let aminity_group_by = '';
	let aminity_feature = '';
	let language_where = '';
	let select_value = '';
	let fav_join = '';
	let distances = '';
	let fav_select = ',subcategory_id as is_fav'
	let filter_attribute = req.body.filter_attribute;



	let tableName;
	if (req.body.city_id) {
		if (req.body.lang == 'en') {
			selectCol = ''
			langcode = ''
			tableName = ''
			select_value = 're_properties.*'



			if (req.body.aminity) {
				aminity_feature = ' left join re_features on re_property_features.feature_id=re_features.id '
				aminity_select = ", GROUP_CONCAT(re_features.name SEPARATOR ',') AS attributes"
			}
		} else {
			select_value = 're_properties.id ,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.number_floor ,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired ,re_properties.avg_review ,re_properties.latitude ,re_properties.longitude ,re_properties.type_id ,re_properties.created_at ,re_properties.updated_at ,re_properties.subcategory_id,re_properties.year_bulit,re_properties.availability,re_properties.living_space'
			tableName = ' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
			langcode = " and re_properties_translations .lang_code ='" + req.body.lang + "'"
			if (req.body.aminity) {
				aminity_feature = ' left join re_features_translations on re_property_features.feature_id=re_features_translations.re_features_id '
				aminity_select = ", GROUP_CONCAT(re_features_translations.name SEPARATOR ',') AS attributes"
			}// language_where ="and re_properties_translations.lang_code ='"+req.body.lang+"'"
		}

		const { limits, offsets } = getPagination(offset, limit);

		if (req.body.user_id) {
			fav_select = ",CASE WHEN (re_account_id=" + user_id + " and is_favorite=1) THEN 1 ELSE 0 END AS is_fav"
			fav_join = " left join re_property_favourites on re_properties.id=re_property_favourites.property_id "
		}


		let m_sql = "select count(*) as count from re_properties " + tableName + " where moderation_status='approved' "
		//  let sql="select * from re_properties "+tableName+" where moderation_status='approved' " + langcode


		if (req.body.aminity) {
			aminity_join = ' left join re_property_features on re_property_features.property_id=re_properties.id '

			aminity.forEach((items, i) => {

				// aminity_select = ", GROUP_CONCAT(re_property_features.feature_id SEPARATOR ',') AS attributes"
				aminity_group_by = ' group by re_properties.id'
				if (i == 0) {
					aminity_query = " feature_id =" + items

				} else {
					aminity_query = aminity_query + " or feature_id =" + items

				}
				m_sql = "select count( DISTINCT re_properties.id ) as count from re_properties " + tableName + aminity_join + aminity_feature + " where moderation_status='approved' "

			})

			aminity_query = ' and (' + aminity_query + ')'
		}


		console.log('test query' + aminity_query);
		m_sql = m_sql + aminity_query
		let sql = "select " + select_value + aminity_select + fav_select + " ,cities.name as city_name from re_properties " + tableName + aminity_join + aminity_feature + fav_join + " left join cities on re_properties.city_id=cities.id where moderation_status='approved' " + aminity_query
		if (req.body.city_id) {

			m_sql = m_sql + " and city_id= " + req.body.city_id
			sql = sql + " and city_id= " + req.body.city_id
		}
		if (req.body.number_bedroom) {

			m_sql = m_sql + " and number_bedroom= " + req.body.number_bedroom
			sql = sql + " and number_bedroom= " + req.body.number_bedroom
		}
		if (req.body.type_id) {   //property type

			m_sql = m_sql + " and type_id= " + req.body.type_id
			sql = sql + " and type_id= " + req.body.type_id
		}
		if (req.body.distance) {   //property type

			// m_sql = m_sql + " and type_id= " + req.body.distance
			// sql = sql + " and type_id= " + req.body.distance

			m_sql = m_sql + " and latitude,longitude,SQRT(POW(69.1 * (latitude - '" + req.body.latitude + "' ), 2) + POW(69.1 * ( '" + req.body.longitude + "' - longitude) *COS(latitude / 57.3), 2)) AS distance on HAVING distance < '" + req.body.distance + "' ORDER BY distance"
			sql = sql + " and latitude,longitude,SQRT(POW(69.1 * (latitude - '" + req.body.latitude + "' ), 2) + POW(69.1 * (  '" + req.body.longitude + "' - longitude) *COS(latitude / 57.3), 2)) AS distance on HAVING distance < '" + req.body.distance + "' ORDER BY distance"
		}

		if (filter_attribute == 'owner') {
			m_sql = m_sql + " and tenant='owner'"
			sql = sql + " and tenant='owner'"
		} else if (filter_attribute == 'approved') {
			m_sql = m_sql + " and moderation_status='approved'"
			sql = sql + " and moderation_status='approved'"
		} else if (filter_attribute == 'furnished') {
			m_sql = m_sql + " and is_furnished=1"
			sql = sql + " and is_furnished=1"
		} else if (filter_attribute == 'images') {
			m_sql = m_sql + " and images=!''"
			sql = sql + " and images=!''"
		}

		if (req.body.category_id) {

			m_sql = m_sql + " and category_id= " + req.body.category_id
			sql = sql + " and category_id= " + req.body.category_id
		}

		if (req.body.number_floor) {

			m_sql = m_sql + " and number_floor= " + req.body.number_floor
			sql = sql + " and number_floor= " + req.body.number_floor
		}


		// if (req.body.period) {

		// 	m_sql = m_sql + " and period= '" + req.body.period + "'"
		// 	sql = sql + " and period= '" + req.body.period + "'"
		// }

		// if (req.body.space_from) {

		// 	if (!req.body.space_to) {
		// 		return res.send({
		// 			statuscode: false,
		// 			data: [],
		// 			token: null,
		// 			message: 'Space To can not be empty!'
		// 		});

		// 	}

		// 	m_sql = m_sql + " and square >= " + req.body.space_from + " and square < " + req.body.space_to
		// 	sql = sql + " and square >= " + req.body.space_from + " and square < " + req.body.space_to
		// }

		if (req.body.price) {
			let price = req.body.price
			var arr = price.split("-")

			m_sql = m_sql + " and price >= " + arr[0] + " and price < " + arr[1]
			sql = sql + " and price >= " + arr[0] + " and price < " + arr[1]
		}

		if (req.body.price_from) {

			if (!req.body.price_to) {
				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: 'Space To can not be empty!'
				});

			}

			m_sql = m_sql + " and price >= " + req.body.price_from + " and price < " + req.body.price_to
			sql = sql + " and price >= " + req.body.price_from + " and price < " + req.body.price_to
		}
		//
		if (req.body.year_bulit) {
			let year_bulit = req.body.year_bulit
			var arr = year_bulit.split("-")

			m_sql = m_sql + " and year_bulit >= " + arr[0] + " and year_bulit < " + arr[1]
			sql = sql + " and year_bulit >= " + arr[0] + " and year_bulit < " + arr[1]
		}

		if (req.body.year_bulit) {

			if (!req.body.year_bulit) {
				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: 'year_bulit To can not be empty!'
				});

			}
			m_sql = m_sql + "and year_bulit >=" + req.body.year_bulit_from + "and year_bulit <" + req.body.year_bulit_to
			sql = sql + "and year_bulit >=" + req.body.year_bulit_from + "and year_bulit<" + req.body.year_bulit_to
		}

		if (req.body.availability) {
			m_sql = m_sql + " and availability= '" + req.body.availability + "'"
			sql = sql + " and availability= '" + req.body.availability + "'"
		}
		if (req.body.living_space) {

			m_sql = m_sql + " and living_space= '" + req.body.living_space + "'"
			sql = sql + " and living_space= '" + req.body.living_space + "'"
		}

		//

		sql = sql + langcode + aminity_group_by + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
		m_Sql = m_sql + langcode + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
		db.sequelize.query(
			m_sql, null, {
			raw: true
		}
		).then(function (myTableRow) {
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {
				// console.log(myTableRow[0][0].count);

				const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


				const results = getPagingData(data, offset, limit);
				res.send(results);




				// return res.send({
				//     statuscode: 200,
				//     data: myTableRows[0],
				//     message: "Properties get successfully",
				//     token: 'token'
				// });
			})
		})

	} else {

		let check = "select * from cities where latitude ='" + req.body.latitude + "' and longitude='" + req.body.longitude + "'"

		db.sequelize.query(
			check, null, {
			raw: true
		}
		).then(function (myTableRowss) {
			if (req.body.lang == 'en') {
				selectCol = ''
				langcode = ''
				tableName = ''
				select_value = 're_properties.*'



				if (req.body.aminity) {
					aminity_feature = ' left join re_features on re_property_features.feature_id=re_features.id '
					aminity_select = ", GROUP_CONCAT(re_features.name SEPARATOR ',') AS attributes"
				}
			} else {
				select_value = 're_properties.id ,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.number_floor ,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired ,re_properties.avg_review ,re_properties.latitude ,re_properties.longitude ,re_properties.type_id ,re_properties.created_at ,re_properties.updated_at ,re_properties.subcategory_id,re_properties.year_bulit,re_properties.availability,re_properties.living_space'
				tableName = ' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
				langcode = " and re_properties_translations .lang_code ='" + req.body.lang + "'"
				if (req.body.aminity) {
					aminity_feature = ' left join re_features_translations on re_property_features.feature_id=re_features_translations.re_features_id '
					aminity_select = ", GROUP_CONCAT(re_features_translations.name SEPARATOR ',') AS attributes"
				}// language_where ="and re_properties_translations.lang_code ='"+req.body.lang+"'"
			}

			const { limits, offsets } = getPagination(offset, limit);

			if (req.body.user_id) {
				fav_select = ",CASE WHEN (re_account_id=" + user_id + " and is_favorite=1) THEN 1 ELSE 0 END AS is_fav"
				fav_join = " left join re_property_favourites on re_properties.id=re_property_favourites.property_id "
			}


			let m_sql = "select count(*) as count from re_properties " + tableName + " where moderation_status='approved' "
			//  let sql="select * from re_properties "+tableName+" where moderation_status='approved' " + langcode


			if (req.body.aminity) {
				aminity_join = ' left join re_property_features on re_property_features.property_id=re_properties.id '

				aminity.forEach((items, i) => {

					// aminity_select = ", GROUP_CONCAT(re_property_features.feature_id SEPARATOR ',') AS attributes"
					aminity_group_by = ' group by re_properties.id'
					if (i == 0) {
						aminity_query = " feature_id =" + items

					} else {
						aminity_query = aminity_query + " or feature_id =" + items

					}
					m_sql = "select count( DISTINCT re_properties.id ) as count from re_properties " + tableName + aminity_join + aminity_feature + " where moderation_status='approved' "

				})

				aminity_query = ' and (' + aminity_query + ')'
			}


			console.log('test query' + aminity_query);
			m_sql = m_sql + aminity_query
			let sql = "select " + select_value + aminity_select + fav_select + " ,cities.name as city_name from re_properties " + tableName + aminity_join + aminity_feature + fav_join + " left join cities on re_properties.city_id=cities.id where moderation_status='approved' " + aminity_query
			if (req.body.latitude) {

				m_sql = m_sql + " and city_id= " + myTableRowss[0][0].id
				sql = sql + " and city_id= " + myTableRowss[0][0].id
			}
			if (req.body.number_bedroom) {

				m_sql = m_sql + " and number_bedroom= " + req.body.number_bedroom
				sql = sql + " and number_bedroom= " + req.body.number_bedroom
			}
			if (req.body.type_id) {

				m_sql = m_sql + " and type_id= " + req.body.type_id
				sql = sql + " and type_id= " + req.body.type_id
			}

			if (req.body.distance) {   //property type

				// m_sql = m_sql + " and type_id= " + req.body.distance
				// sql = sql + " and type_id= " + req.body.distance

				m_sql = m_sql + " and latitude,longitude,SQRT(POW(69.1 * (latitude - '" + req.body.latitude + "' ), 2) + POW(69.1 * ( '" + req.body.longitude + "' - longitude) *COS(latitude / 57.3), 2)) AS distance  HAVING distance < '" + req.body.distance + "' ORDER BY distance"
				sql = sql + " and latitude,longitude,SQRT(POW(69.1 * (latitude - '" + req.body.latitude + "' ), 2) + POW(69.1 * (  '" + req.body.longitude + "' - longitude) *COS(latitude / 57.3), 2)) AS distance  HAVING distance < '" + req.body.distance + "' ORDER BY distance"
			}

			if (req.body.category_id) {

				m_sql = m_sql + " and category_id= " + req.body.category_id
				sql = sql + " and category_id= " + req.body.category_id
			}

			if (req.body.number_floor) {

				m_sql = m_sql + " and number_floor= " + req.body.number_floor
				sql = sql + " and number_floor= " + req.body.number_floor
			}


			// if (req.body.period) {

			// 	m_sql = m_sql + " and period= '" + req.body.period + "'"
			// 	sql = sql + " and period= '" + req.body.period + "'"
			// }

			// if (req.body.space_from) {

			// 	if (!req.body.space_to) {
			// 		return res.send({
			// 			statuscode: false,
			// 			data: [],
			// 			token: null,
			// 			message: 'Space To can not be empty!'
			// 		});

			// 	}

			// 	m_sql = m_sql + " and square >= " + req.body.space_from + " and square < " + req.body.space_to
			// 	sql = sql + " and square >= " + req.body.space_from + " and square < " + req.body.space_to
			// }

			if (req.body.price) {
				let price = req.body.price
				var arr = price.split("-")

				m_sql = m_sql + " and price >= " + arr[0] + " and price < " + arr[1]
				sql = sql + " and price >= " + arr[0] + " and price < " + arr[1]
			}

			if (req.body.price_from) {

				if (!req.body.price_to) {
					return res.send({
						statuscode: false,
						data: [],
						token: null,
						message: 'Space To can not be empty!'
					});

				}

				m_sql = m_sql + " and price >= " + req.body.price_from + " and price < " + req.body.price_to
				sql = sql + " and price >= " + req.body.price_from + " and price < " + req.body.price_to
			}

			//
			if (req.body.year_bulit) {
				let year_bulit = req.body.year_bulit
				var arr = year_bulit.split("-")

				m_sql = m_sql + " and year_bulit >= " + arr[0] + " and year_bulit < " + arr[1]
				sql = sql + " and year_bulit >= " + arr[0] + " and year_bulit < " + arr[1]
			}

			if (req.body.year_bulit) {

				if (!req.body.year_bulit) {
					return res.send({
						statuscode: false,
						data: [],
						token: null,
						message: 'year_bulit To can not be empty!'
					});

				}
				m_sql = m_sql + "and year_bulit >=" + req.body.year_bulit_from + "and year_bulit <" + req.body.year_bulit_to
				sql = sql + "and year_bulit >=" + req.body.year_bulit_from + "and year_bulit<" + req.body.year_bulit_to
			}

			if (req.body.availability) {

				m_sql = m_sql + " and availability= '" + req.body.availability + "'"
				sql = sql + " and availability= '" + req.body.availability + "'"
			}
			if (req.body.living_space) {

				m_sql = m_sql + " and living_space= '" + req.body.living_space + "'"
				sql = sql + " and living_space= '" + req.body.living_space + "'"
			}//


			sql = sql + langcode + aminity_group_by + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
			m_Sql = m_sql + langcode + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
			db.sequelize.query(
				m_sql, null, {
				raw: true
			}
			).then(function (myTableRow) {
				db.sequelize.query(
					sql, null, {
					raw: true
				}
				).then(function (myTableRows) {
					// console.log(myTableRow[0][0].count);

					const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


					const results = getPagingData(data, offset, limit);
					res.send(results);




					// return res.send({
					//     statuscode: 200,
					//     data: myTableRows[0],
					//     message: "Properties get successfully",
					//     token: 'token'
					// });
				})
			})
		})
	}

}



exports.feature_property = (req, res) => {

	let offset;
	if (!req.body.page) {
		offset = 0
	} else {
		offset = req.body.page
	}
	let limit;
	if (!req.body.limit) {
		limit = 0
	} else {
		limit = req.body.limit
	}

	let tableName;
	let fav_select = ',subcategory_id as is_fav';
	let fav_join = '';
	if (req.body.lang == 'en') {
		selectCol = ''
		langcode = ''
		tableName = ''
	} else {
		tableName = ' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
		langcode = " and lang_code ='" + req.body.lang + "'"
	}

	const { limits, offsets } = getPagination(offset, limit);
	if (req.body.user_id) {
		fav_select = ",CASE WHEN (re_account_id=" + req.body.user_id + " and is_favorite=1) THEN 1 ELSE 0 END AS is_fav"
		fav_join = " left join re_property_favourites on re_properties.id=re_property_favourites.property_id "
	}

	let m_sql = "select count(*) as count from re_properties " + tableName + " where moderation_status='approved' and re_properties.is_featured=1 "
	let sql = "select re_properties.*" + fav_select + ",cities.name as city_name from re_properties " + tableName + fav_join + " left join cities on re_properties.city_id=cities.id where moderation_status='approved' and re_properties.is_featured=1 "

	if (req.body.city_id) {
		console.log('test');

		if (req.body.city_id) {

			m_sql = m_sql + "and city_id= " + req.body.city_id
			sql = sql + "and city_id= " + req.body.city_id
		}


		sql = sql + langcode + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
		m_Sql = m_sql + langcode + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
		db.sequelize.query(
			m_sql, null, {
			raw: true
		}
		).then(function (myTableRow) {
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {
				// console.log(myTableRow[0][0].count);

				const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


				const results = getPagingData(data, offset, limit);
				res.send(results);

			})
		})
	} else {
		if (req.body.latitude) {
			if (!req.body.longitude) {
				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: 'Longitude can not be empty!'
				});

			}
			let check = "select * from cities where latitude ='" + req.body.latitude + "' and longitude='" + req.body.longitude + "'"
			db.sequelize.query(
				check, null, {
				raw: true
			}
			).then(function (myTableRowss) {
				if (isEmpty(myTableRowss[0])) {
					//	res.send({status:false,message:"No Data Found"});

					m_sql = m_sql + "and re_properties.latitude= " + req.body.latitude + "and re_properties.longitude=" + req.body.longitude
					sql = sql + "and re_properties.latitude= " + req.body.latitude + "and re_properties.longitude=" + req.body.longitude



					sql = sql + langcode + " order by id LIMIT  " + limits + "  OFFSET " + offsets
					m_Sql = m_sql + langcode + " order by id LIMIT  " + limits + "  OFFSET " + offsets
					db.sequelize.query(
						m_sql, null, {
						raw: true
					}
					).then(function (myTableRowNew) {
						db.sequelize.query(
							sql, null, {
							raw: true
						}
						).then(function (myTableRowNew) {
							console.log("dsfsfsdfsf===========", myTableRowNew[0][0]);
							if (myTableRowNew[0][0] == undefined) {
								res.send({ status: false, message: "No Data Found" });
							}


							const data = { count: myTableRowNew[0][0].count, rows: myTableRowNew[0] };


							const results = getPagingData(data, offset, limit);
							res.send(results);

						})
					})




				} else {
					// console.log(myTableRowss[0][0].id);



					m_sql = m_sql + "and city_id= " + myTableRowss[0][0].id
					sql = sql + "and city_id= " + myTableRowss[0][0].id



					sql = sql + langcode + " order by id LIMIT  " + limits + "  OFFSET " + offsets
					m_Sql = m_sql + langcode + " order by id LIMIT  " + limits + "  OFFSET " + offsets
					db.sequelize.query(
						m_sql, null, {
						raw: true
					}
					).then(function (myTableRow) {
						db.sequelize.query(
							sql, null, {
							raw: true
						}
						).then(function (myTableRows) {
							// console.log(myTableRow[0][0].count);

							const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


							const results = getPagingData(data, offset, limit);
							res.send(results);

						})
					})
				}
			})

		}
	}

}

exports.similar_properties = (req, res) => {
	let leftjoin;
	if (!req.query.id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Id can not be empty!'
		});

	}


	let sql = 'select * from re_properties where id="' + req.query.id + '" '

	select_value = 're_properties.id ,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.number_floor ,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired,re_properties.avg_review ,re_properties.latitude ,re_properties.longitude ,re_properties.type_id ,re_properties.created_at ,re_properties.updated_at ,re_properties.subcategory_id'
	let tableName = ''
	let idcheck = ''


	if (req.query.lang == 'en') {
		tableName = 're_properties'
		idcheck = 'id'
		leftjoin = 'left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id  '
		idcheck = 're_properties.id'
	} else {

		leftjoin = 'left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id '
		idcheck = 're_properties.id'
	}
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (isEmpty(myTableRows[0])) {
			return res.send({ statuscode: false, message: "Id not exists ", results: [] })

		} else {

			let next_sql = "select * from re_properties " + leftjoin + " where type_id=" + myTableRows[0][0].type_id + " and category_id=" + myTableRows[0][0].category_id + " and city_id='" + myTableRows[0][0].city_id + "' and re_properties.moderation_status='approved' and re_properties.id !=" + req.query.id
			console.log(next_sql);
			db.sequelize.query(
				next_sql, null, {
				raw: true
			}
			).then(function (myTableRow) {

				let next_sql = "select * from re_properties where city_id='" + myTableRows[0][0].city_id + "' id !=" + req.query.id
				console.log(next_sql);
				return res.send({ statuscode: true, message: "Get Data Successfully", results: myTableRow[0] })

			})
		}
	})
}






exports.locations = (req, res) => {

	let offset;
	if (!req.body.page) {
		offset = 0
	} else {
		offset = req.body.page
	}
	let limit;
	if (!req.body.limit) {
		limit = 0
	} else {
		limit = req.body.limit
	}
	console.log(req.body.page);
	let tableName;
	if (req.body.lang == 'en') {
		selectCol = ''
		langcode = ''
		tableName = ' re_properties left join cities on re_properties.city_id=cities.id AND re_properties.moderation_status="approved" '
	} else {
		tableName = '  re_properties left join cities on re_properties.city_id=cities.id AND re_properties.moderation_status="approved" '
		// langcode= " where lang_code ='"+req.body.lang+"' "
		langcode = ''

	}
	const { limits, offsets } = getPagination(offset, limit);

	let m_sql = "SELECT cities.*, COUNT(*) as property_count FROM  " + tableName + " where cities.country_id=" + req.body.country_id + " GROUP BY city_id " + langcode + " order by cities.id "
	let sql = "SELECT cities.*, COUNT(*) as property_count FROM  " + tableName + " where cities.country_id=" + req.body.country_id + " GROUP BY city_id " + langcode + " order by cities.id LIMIT  " + limits + "  OFFSET " + offsets
	db.sequelize.query(
		m_sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		db.sequelize.query(
			sql, null, {
			raw: true
		}
		).then(function (myTableRow) {

			const data = { count: myTableRows[0].length, rows: myTableRow[0] };


			const results = getPagingData(data, offset, limit);
			res.send(results);
		})
	})
}



exports.property_by_id = (req, res) => {
	let sql;
	if (req.body.lang == 'en') {
		sql = "select re_properties.*,re_accounts.*, GROUP_CONCAT(DISTINCT  re_features.name SEPARATOR ',') AS attributes,cities.name as city_name ,re_account_details.profile_pic as profile_pic,countries.name as country_name,re_properties.id as id,re_properties.created_at as  created_at ,re_properties.description as  description from re_properties  left join re_account_details on re_account_details.account_id=re_properties.id  left join countries on re_properties.country_id=countries.id left join cities on re_properties.city_id=cities.id left join re_property_features on re_property_features.property_id=re_properties.id left join  re_accounts on re_accounts.id = re_properties.author_id  left join re_features on re_property_features.feature_id=re_features.id  where moderation_status='approved'  and re_properties.id=" + req.body.id + " group by re_properties.id order by re_properties.id LIMIT  10  OFFSET 0"
	} else {

		sql = "select re_properties.id ,re_accounts.*,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.number_floor ,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired ,re_properties.latitude ,re_properties.created_at as  created_at,re_properties.longitude ,re_properties.type_id ,re_properties.cre,countries.name as country_name ated_at ,re_properties.updated_at ,re_properties.subcategory_id,profile_pic, GROUP_CONCAT(re_features_translations.name SEPARATOR ',') AS attributes,cities.name as city_name,countries.name as country_name from re_properties  left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id left join re_property_features on re_property_features.property_id=re_properties.id  left join re_features_translations on re_property_features.feature_id=re_features_translations.re_features_id  left join re_accounts on re_accounts.id = re_properties.author_id   left join cities on re_properties.city_id=cities.id  left join countries on re_properties.country_id=countries.id  left join re_account_details on re_account_details.account_id=re_accounts.id  where moderation_status='approved' and re_properties.id=" + req.body.id + "   and re_properties_translations .lang_code ='" + req.body.lang + "' group by re_properties.id order by re_properties.id LIMIT  10  OFFSET 0;"
	}

	let facilities_sql = 'select * from re_facilities_distances left join re_facilities on re_facilities.id=re_facilities_distances.facility_id  where reference_id=' + req.body.id
	let review = 'SELECT re_reviews.*,first_name,last_name,profile_pic FROM `re_reviews` left join re_accounts on re_accounts.id=re_reviews.account_id left join re_account_details on re_account_details.account_id=re_accounts.id where reviewable_id=' + req.body.id

	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		db.sequelize.query(
			facilities_sql, null, {
			raw: true
		}
		).then(function (myTableRow) {

			db.sequelize.query(
				review, null, {
				raw: true
			}
			).then(function (myTableRowreview) {
				return res.send({
					statuscode: true,
					data: myTableRows[0],
					facities: myTableRow[0],
					reviews: myTableRowreview[0],
					count_review: myTableRowreview[0].length,
					message: "Property get successfully",
					token: 'token'
				});
			})
		})
	})

}




exports.property_by_user_id = (req, res) => {
	let sql;
	console.log("req.body.lang", req.body.lang);
	if (req.body.lang == 'en') {
		sql = "select re_properties.*,re_accounts.*, re_account_details.*,GROUP_CONCAT(re_features.name SEPARATOR ',') AS attributes,cities.name as city_name ,countries.name as country_name,profile_pic,re_properties.zip_code as zip_code,re_properties.id as id,re_properties.description as description ,re_properties.street_no as street_no,re_properties.city_id,re_properties.created_at as  created_at from re_properties  left join re_account_details on re_account_details.account_id=re_properties.id  left join countries on re_properties.country_id=countries.id left join cities on re_properties.city_id=cities.id left join re_property_features on re_property_features.property_id=re_properties.id left join re_accounts on re_accounts.id = re_properties.user_id  left join re_features on re_property_features.feature_id=re_features.id  where  re_properties.id=" + req.body.id + " group by re_properties.id order by re_properties.id"
	} else {

		sql = "select re_properties.id  ,re_accounts.*,re_account_details.*,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.description as description ,re_properties.zip_code as zip_code,re_properties.street_no as street_no ,re_properties.number_floor ,re_properties.created_at as  created_at,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.id,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired ,re_properties.latitude ,re_properties.longitude ,re_properties.type_id ,re_properties.created_at,countries.name as country_name  ,re_properties.updated_at ,re_properties.subcategory_id,profile_pic, GROUP_CONCAT(re_features_translations.name SEPARATOR ',') AS attributes,cities.name as city_name,countries.name as country_name from re_properties  left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id left join re_property_features on re_property_features.property_id=re_properties.id  left join re_features_translations on re_property_features.feature_id=re_features_translations.re_features_id  left join re_accounts on re_accounts.id = re_properties.user_id   left join cities on re_properties.city_id=cities.id  left join countries on re_properties.country_id=countries.id  left join re_account_details on re_account_details.account_id=re_accounts.id  where moderation_status='approved' and re_properties.id=" + req.body.id + "   and re_properties_translations .lang_code ='" + req.body.lang + "' group by re_properties.id order by re_properties.id LIMIT  10  OFFSET 0;"
	}

	console.log("sqlbaba", sql);

	let facilities_sql = 'select * from re_facilities_distances left join re_facilities on re_facilities.id=re_facilities_distances.facility_id  where reference_id=' + req.body.id
	let review = 'SELECT re_reviews.*,first_name,last_name,profile_pic FROM `re_reviews` left join re_accounts on re_accounts.id=re_reviews.account_id left join re_account_details on re_account_details.account_id=re_accounts.id where reviewable_id=' + req.body.id

	console.log("sqlsql=>", sql);
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		console.log("myTableRowsmyTableRows", myTableRows);
		db.sequelize.query(
			facilities_sql, null, {
			raw: true
		}
		).then(function (myTableRow) {

			db.sequelize.query(
				review, null, {
				raw: true
			}
			).then(function (myTableRowreview) {
				return res.send({
					statuscode: true,
					data: myTableRows[0],
					facities: myTableRow[0],
					reviews: myTableRowreview[0],
					count_review: myTableRowreview[0].length,
					message: "Property get successfully",
					token: 'token'
				});
			})
		})
	})

}


exports.add_to_favorite = (req, res) => {

	if (!req.body.property_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Propert Id can not be empty!'
		});

	}
	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'User Id can not be empty!'
		});

	}

	let m_sql = "select * from re_property_favourites where property_id=" + req.body.property_id + " and re_account_id=" + req.body.user_id
	db.sequelize.query(
		m_sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (isEmpty(myTableRows[0])) {
			let sql = "Insert into re_property_favourites (property_id,is_favorite,re_account_id) values (" + req.body.property_id + ",1," + req.body.user_id + ")"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {
				return res.send({
					statuscode: 200,
					data: myTableRows[0],
					message: "Property add to favourites successfully",

				});
			})

		} else {
			let is_favorite;
			let response = ''
			if (myTableRows[0][0].is_favorite == 1) {
				is_favorite = null
				response = 'remove from '

			} else {
				is_favorite = 1
				response = 'add to '
			}
			// let sql = 'update re_property_favourites set is_favorite=' + is_favorite + ' where property_id=' + req.body.property_id + ' and re_account_id=' + req.body.user_id
			let sql = 'DELETE FROM  re_property_favourites where property_id=' + req.body.property_id + ' and re_account_id=' + req.body.user_id

			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {
				return res.send({
					statuscode: 200,
					data: [],
					message: "Property " + response + "shortlist successfully",
					token: 'token'
				});
			})


		}


	})

}

exports.get_favorite = (req, res) => {


	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			message: 'User Id can not be empty!'
		});

	}



	let offset;
	if (!req.body.page) {
		offset = 0
	} else {
		offset = req.body.page
	}
	let limit;
	if (!req.body.limit) {
		limit = 0
	} else {
		limit = req.body.limit
	}
	let aminity = req.body.aminity
	let aminity_query = '';
	let aminity_select = ',subcategory_id as attributes';
	let aminity_join = '';
	let aminity_group_by = '';
	let aminity_feature = '';
	let language_where = '';
	let select_value = '';
	aminity_join = ' left join re_property_features on re_property_features.property_id=re_properties.id '


	let tableName;
	if (req.body.lang == 'en') {
		selectCol = ''
		langcode = ''
		tableName = ''
		select_value = 're_properties.*'
		aminity_feature = ' left join re_features on re_property_features.feature_id=re_features.id '
		aminity_select = ", GROUP_CONCAT(re_features.name SEPARATOR ',') AS attributes"

	} else {
		select_value = 're_properties.id ,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.number_floor ,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired,re_properties.avg_review ,re_properties.latitude ,re_properties.longitude ,re_properties.type_id ,re_properties.created_at ,re_properties.updated_at ,re_properties.subcategory_id'
		tableName = ' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
		langcode = " and re_properties_translations .lang_code ='" + req.body.lang + "'"
		aminity_feature = ' left join re_features_translations on re_property_features.feature_id=re_features_translations.re_features_id '
		aminity_select = ", GROUP_CONCAT(re_features_translations.name SEPARATOR ',') AS attributes"
		// language_where ="and re_properties_translations.lang_code ='"+req.body.lang+"'"
	}

	const { limits, offsets } = getPagination(offset, limit);


	let m_sql = "select count(*) as count from re_property_favourites left join re_properties on re_properties.id=re_property_favourites.property_id " + tableName + " where moderation_status='approved' "
	//  let sql="select * from re_properties "+tableName+" where moderation_status='approved' " + langcode


	// if(req.body.aminity)
	// {
	//  aminity_join=' left join re_property_features on re_property_features.property_id=re_properties.id '
	//
	// 	aminity.forEach((items, i) => {
	//
	// 		// aminity_select = ", GROUP_CONCAT(re_property_features.feature_id SEPARATOR ',') AS attributes"
	// 	aminity_group_by = ' group by re_properties.id'
	// 	if(i==0)
	// 	{
	// 	  aminity_query = " feature_id ="+ items
	//
	// 	}else{
	// 	  aminity_query = aminity_query + " or feature_id ="+ items
	//
	// 	}
	// 	 m_sql="select count( DISTINCT re_properties.id ) as count from re_properties "+tableName+ aminity_join+ aminity_feature+" where moderation_status='approved' "
	//
	// 	})
	//
	// aminity_query=' and ('+aminity_query+')'
	// }


	console.log('test query' + aminity_query);
	m_sql = m_sql + aminity_query
	let sql = "select " + select_value + aminity_select + " from re_property_favourites left join re_properties on re_properties.id=re_property_favourites.property_id " + tableName + aminity_join + aminity_feature + " where moderation_status='approved' " + aminity_query

	if (req.body.user_id) {

		m_sql = m_sql + "and re_account_id= " + req.body.user_id
		sql = sql + "and re_account_id= " + req.body.user_id
	}

	sql = sql + langcode + aminity_group_by + "  group by re_properties.id order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
	m_Sql = m_sql + langcode + " group by re_properties.id  order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
	db.sequelize.query(
		m_sql, null, {
		raw: true
	}
	).then(function (myTableRow) {
		db.sequelize.query(
			sql, null, {
			raw: true
		}
		).then(function (myTableRows) {
			// console.log(myTableRow[0][0].count);

			const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


			const results = getPagingData(data, offset, limit);
			res.send(results);

		})
	})


}

function getFilter(value) {
	let returnArr;
	if (value == 1) {
		let returnArr = ['0-1000', '1000-10000', '10000-100000',
			'100000-500000', '500000-1000000'];
		return returnArr;

	}
	if (value == 2) {
		let returnArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		return returnArr;

	}

	if (value == 3) {
		let returnArr = ['immediately',
			'date',
			'agreement',

		];
		return returnArr;

	}
	return returnArr;
};
exports.all_values = (req, res) => {

	let cities = 'select * from cities'
	let re_features = 'select * from re_features'
	let categories = 'select * from re_categories'
	let countries = 'select * from countries'


	db.sequelize.query(
		re_features, null, {
		raw: true
	}
	).then(function (featuresRow) {
		db.sequelize.query(
			categories, null, {
			raw: true
		}
		).then(function (categoriesRow) {
			db.sequelize.query(
				countries, null, {
				raw: true
			}
			).then(function (countriesRow) {
				let new_arr = { categories: categoriesRow[0], aminities: featuresRow[0], countries: countriesRow[0], budget: getFilter(1), number_bedroom: getFilter(2), aviability: getFilter(3), floor: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
				return res.send({
					statuscode: true,
					data: [new_arr],
					token: null,

					message: 'Filter Values get Successfully'
				});
			})
		})
	})



}
exports.write_reviews = (req, res) => {

	if (!req.body.account_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Account Id can not be empty!'
		});

	}
	if (!req.body.reviewable_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Review Id can not be empty!'
		});

	}
	if (!req.body.reviewable_type) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Review Type can not be empty!'
		});

	}
	if (!req.body.star) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Star can not be empty!'
		});

	}
	let comment = ''
	if (req.body.comment) {
		comment = req.body.comment
	}
	let m_sql = 'SELECT AVG(star) as avg_star FROM re_reviews   WHERE reviewable_id=' + req.body.reviewable_id
	let sql = "INSERT INTO re_reviews (account_id, reviewable_id, reviewable_type, star, comment, status) VALUES (" + req.body.account_id + ", " + req.body.reviewable_id + ", '" + req.body.reviewable_type + "', " + req.body.star + ", '" + comment + "', 'published')"
	db.sequelize.query(
		m_sql, null, {
		raw: true
	}
	).then(function (myTableRow) {
		db.sequelize.query(
			sql, null, {
			raw: true
		}
		).then(function (myTableRows) {

			let update_sql = "update re_properties set avg_review ='" + myTableRow[0][0].avg_star + "' where id=" + req.body.reviewable_id
			db.sequelize.query(
				update_sql, null, {
				raw: true
			}
			).then(function (update_sqlRows) {
				return res.send({
					statuscode: true,
					data: [],
					token: null,

					message: 'Review Save Successfully'
				});
			})
		})
	})

}


exports.cities_property = (req, res) => {

	let offset;
	if (!req.body.page) {
		offset = 0
	} else {
		offset = req.body.page
	}
	let limit;
	if (!req.body.limit) {
		limit = 0
	} else {
		limit = req.body.limit
	}

	let tableName;
	let fav_select = ',subcategory_id as is_fav';
	let fav_join = '';
	if (req.body.lang == 'en') {
		selectCol = ''
		langcode = ''
		tableName = ''
	} else {
		tableName = ' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
		langcode = " and lang_code ='" + req.body.lang + "'"
	}

	const { limits, offsets } = getPagination(offset, limit);
	if (req.body.user_id) {
		fav_select = ",CASE WHEN (re_account_id=48 and is_favorite=1) THEN 1 ELSE 0 END AS is_fav"
		fav_join = " left join re_property_favourites on re_properties.id=re_property_favourites.property_id "
	}

	let m_sql = "select count(*) as count from re_properties " + tableName + " where moderation_status='approved' "
	let sql = "select re_properties.*" + fav_select + ",cities.name as city_name from re_properties " + tableName + fav_join + " left join cities on re_properties.city_id=cities.id where moderation_status='approved' "

	if (req.body.city_id) {
		console.log('test');

		if (req.body.city_id) {

			m_sql = m_sql + "and city_id= " + req.body.city_id
			sql = sql + "and city_id= " + req.body.city_id
		}


		sql = sql + langcode + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
		m_Sql = m_sql + langcode + " order by re_properties.id LIMIT  " + limits + "  OFFSET " + offsets
		db.sequelize.query(
			m_sql, null, {
			raw: true
		}
		).then(function (myTableRow) {
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {
				// console.log(myTableRow[0][0].count);

				const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


				const results = getPagingData(data, offset, limit);
				res.send(results);

			})
		})
	} else {
		if (req.body.latitude) {
			if (!req.body.longitude) {
				return res.send({
					statuscode: false,
					data: [],
					token: null,
					message: 'Longitude can not be empty!'
				});

			}
			let check = "select * from cities where latitude ='" + req.body.latitude + "' and longitude='" + req.body.longitude + "'"
			db.sequelize.query(
				check, null, {
				raw: true
			}
			).then(function (myTableRowss) {
				if (isEmpty(myTableRowss[0])) {

				} else {
					// console.log(myTableRowss[0][0].id);



					m_sql = m_sql + "and city_id= " + myTableRowss[0][0].id
					sql = sql + "and city_id= " + myTableRowss[0][0].id



					sql = sql + langcode + " order by id LIMIT  " + limits + "  OFFSET " + offsets
					m_Sql = m_sql + langcode + " order by id LIMIT  " + limits + "  OFFSET " + offsets
					db.sequelize.query(
						m_sql, null, {
						raw: true
					}
					).then(function (myTableRow) {
						db.sequelize.query(
							sql, null, {
							raw: true
						}
						).then(function (myTableRows) {
							// console.log(myTableRow[0][0].count);

							const data = { count: myTableRow[0][0].count, rows: myTableRows[0] };


							const results = getPagingData(data, offset, limit);
							res.send(results);

						})
					})
				}
			})

		}
	}

}


// amit code 13/10.22



// create property
exports.create_property = (req, res) => {
	if (!req.body.category_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Category  can not be empty!'
		});

	}
	if (!req.body.city_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'City Id can not be empty!'
		});

	}
	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'user Id can not be empty!'
		});

	}

	let tenant = req.body.tenant;
	let property_type = req.body.property_type;
	let category = req.body.category_id;
	let country = req.body.country_id;
	let city = req.body.city_id;
	let zipcode = req.body.zipcode;
	let user_id = req.body.user_id;

	sql = "INSERT INTO  re_properties(user_id,tenant,type_id ,category_id,country_id,city_id,zip_code) VALUES ('" + user_id + "','" + tenant + "','" + property_type + "', '" + category + "', '" + country + "','" + city + "','" + zipcode + "');"
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (item) {
		if (item) {

			res.json({

				statuscode: true,
				message: "Your property created sucessfully",
				Property_id: item[0]
			});
		} else {
			res.json({
				statuscode: false,
				message: "Something went wrong please check..",
			});

		}
	});


}




exports.create_respones = (req, res) => {
	let property_owner__name = [], property_own_name;

	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'User id  can not be empty!'
		});

	}
	if (!req.body.property_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Property Id can not be empty!'
		});

	}
	let property_id = req.body.property_id;
	let user_id = req.body.user_id; // get user name 
	let property_owner_id = req.body.property_owner_id;  // get mail to send this owner for this property 
	let property_title = req.body.property_title;
	let status = req.body.status;
	let total_view = req.body.total_view;

	//code by cp date:11-09-22

	send_watch_template = (obj) => {
		let transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'developerallthings@gmail.com',
				pass: 'jprrpwvxvsrkejph',

			},
		});
		// 		console.log("path watch property=",path.join(__dirname, '/../emailTemplate/propery_template.ejs')) 
		// console.log("path drag status=",path.join(__dirname, '/../../emailTemplate/lead_status_property.ejs'))

		if (transporter) {
			ejs.renderFile(path.join(__dirname, '/../../emailTemplate/propery_template.ejs'), { obj }, (err, data) => {
				// ejs.renderFile('./emailTemplate/propery_template.ejs', { obj }, (err, data) => {

				if (err) {
					console.log(err);
				} else {
					mailOptions = {
						from: 'chetanppt1999@gmail.com',
						to: obj.email,
						subject: 'Thank you for Watch Properties',
						html: data

					};
					transporter.sendMail(mailOptions, (error, info) => {
						if (error) {
							console.log(error);
						}
						if (info.messageId) {
							console.log("Successfull Template Send Your email")
						}
					});
				}
			})
		}
	}

	let check = "select * from lead_respones where property_id ='" + req.body.property_id + "' and user_id='" + req.body.user_id + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {

		if (isEmpty(myTableRowss[0])) {

			sql = "INSERT INTO  lead_respones (property_owner_id,user_id,property_id,property_title,lead_status,total_view) VALUES ('" + property_owner_id + "','" + user_id + "','" + property_id + "','" + property_title + "', '" + status + "', '1');"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (item) {
				if (item) {
					const date = new Date();
					console.log(date.toUTCString());

					//view Property Template send Email 
					let sql = "select re_accounts.*,lead_respones.created_at,lead_respones.property_title,lead_respones.property_owner_id from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id='" + req.body.property_id + "' and lead_respones.property_owner_id='" + req.body.property_owner_id + "'";
					db.sequelize.query(
						sql, null, {
						raw: true
					}
					).then(function (match_temp) {
						console.log("data=", match_temp[0])
						let property_owner_id = match_temp[0][0].property_owner_id
						console.log("property_owner_id=", property_owner_id)

						let sql = "select first_name,last_name from re_accounts where id='" + property_owner_id + "'";
						db.sequelize.query(
							sql, null, {
							raw: true
						}
						).then(function (property_owner_id) {
							if (property_owner_id[0]) {
								console.log("property_owner_id[0] = first =", property_owner_id[0][0].first_name + " last name=" + property_owner_id[0][0].last_name)
								property_own_name = property_owner__name.push(property_owner_id[0][0].first_name + " " + property_owner_id[0][0].last_name)





								console.log("property_owner__name==", property_owner__name[0])
								let address= match_temp[0][0].address
								let pr_own_name = property_owner__name[0]
								let name = match_temp[0][0].first_name + " " + match_temp[0][0].last_name;
								const splitOnSpace = name.split(' ');
								console.log(splitOnSpace);
								const first = splitOnSpace[0][0];
								const last = splitOnSpace[1][0];
								let name_logo = first + "" + last
								let username = match_temp[0][0].username;
								let phone = match_temp[0][0].phone;
								let email = match_temp[0][0].email;
								var created_at = match_temp[0][0].created_at;
								created_at = date.toUTCString(created_at);
								let property_title = match_temp[0][0].property_title
								if (match_temp[0][0] == 'NULL' || match_temp[0][0].username == 'NULL') {
									phone = 'NA';
									username = 'NA';
								}

								obj = { username, name, name_logo, pr_own_name, phone,address,email, created_at, property_title }
								console.log("obj", obj)

								send_watch_template(obj);
							}
						})

					})

					res.json({

						statuscode: true,
						message: "Your lead created sucessfully",
						Property_id: item[0]
					});
				} else {
					res.json({
						statuscode: false,
						message: "Something went wrong please check..",
					});

				}
			});


		} else {

			let db_get_count = myTableRowss[0][0].total_view;
			//console.log("db_get_count",myTableRowss[0][0].total_view);
			let new_count = db_get_count + 1;
			console.log("new_count", new_count);

			let update_sql = "update lead_respones set total_view ='" + new_count + "' where   property_id='" + property_id + "' and  user_id=" + user_id
			db.sequelize.query(
				update_sql, null, {
				raw: true
			}
			).then(function (update_sqlRows) {
				return res.send({
					statuscode: true,
					message: 'Your lead updated sucessfully'
				});
			})
		}		
	})
}


/*exports.get_respones = (req, res) => {
	if (!req.body.property_owner_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'property owner id  can not be empty!'
		});

	}
	if (!req.body.property_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Property Id can not be empty!'
		});

	}
	let property_id = req.body.property_id;
	let user_id = req.body.user_id;
	let property_owner_id=req.body.property_owner_id;
	let data_arr=[];
	let final_arr=[];
	
	let check = "select * from lead_respones where  property_id='"+property_id+"' and property_owner_id ='" + property_owner_id + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {

		if (!isEmpty(myTableRowss[0])) {
			//console.log("test", myTableRowss.length);
			let count= myTableRowss[0].length;
			console.log("test", count);
			for (i = 0; i <= count; i++)
			 {
				let db_user=	myTableRowss[0][i].user_id;
				
				let user_get = "select * from re_accounts where  id='"+db_user+"'"
			
				db.sequelize.query(
					user_get, null, {
					raw: true
				}
				).then(function (item) {
					
					console.log("item=",item[0])

				 data_arr.push(item[0][0]);

					// final_arr.push(data_arr);
					res.json({
					statuscode: true,
					message: "Your lead get sucessfully",
					data:data_arr
				   });
				 
			
			});
			

			 
			}
			console.log("final_arr",final_arr);
			
		//	console.log("data_arr",data_arr);
			//let db_get_count=	myTableRowss[0][0].total_view;

		 
				


		}else{

			return res.send({
				statuscode: false,
				message: 'No data found'
			});


		}

		
	})

}*/




exports.get_respones = (req, res) => {

	if (!req.body.property_owner_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'property owner id  can not be empty!'
		});

	}
	if (!req.body.property_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Property Id can not be empty!'
		});

	}
	let new_request = "select re_accounts.*, lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id=" + req.body.property_id + " and lead_status='new_request' and lead_respones.property_owner_id=" + req.body.property_owner_id;
	let member_gold_qualivited = "select re_accounts.*, lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id=" + req.body.property_id + " and lead_status='member_gold_qualivited' and lead_respones.property_owner_id=" + req.body.property_owner_id;
	let welcome_visiting = "select re_accounts.*, lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id=" + req.body.property_id + " and lead_status='welcome_visiting' and lead_respones.property_owner_id=" + req.body.property_owner_id;
	let he_was_on_the_visiting = "select re_accounts.*, lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id=" + req.body.property_id + " and lead_status='he_was_on_the_visiting' and lead_respones.property_owner_id=" + req.body.property_owner_id;
	let send_application = "select re_accounts.*, lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id=" + req.body.property_id + " and lead_status='send_application' and lead_respones.property_owner_id=" + req.body.property_owner_id;
	let contact = "select re_accounts.*, lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id=" + req.body.property_id + " and lead_status='contact' and lead_respones.property_owner_id=" + req.body.property_owner_id;

	db.sequelize.query(new_request)
		.then(function (results) {
			//if (results[0].length > 0) {

			// for member_gold_qualivited
			db.sequelize.query(member_gold_qualivited)
				.then(function (member_gold_qualivited_result) {
					//})// 01 
					// for welcome_visiting

					db.sequelize.query(welcome_visiting)
						.then(function (welcome_visiting_result) {
							//}) //02
							// for he_was_on_the_visiting
							db.sequelize.query(he_was_on_the_visiting)
								.then(function (he_was_on_the_visiting_result) {
									//})//03
									// for send_application
									db.sequelize.query(send_application)
										.then(function (send_application_result) {
											//})//04

											// for contact_result
											db.sequelize.query(contact)
												.then(function (contact_result) {
													//	})//05

													return res.send({
														statuscode: true,
														message: "get data Successfully",
														new_request_count: results[0].length,
														new_request: results[0],
														member_gold_qualivited_count: member_gold_qualivited_result[0].length,
														member_gold_qualivited_result: member_gold_qualivited_result[0],
														welcome_visiting_count: welcome_visiting_result[0].length,
														welcome_visiting_result: welcome_visiting_result[0],
														he_was_on_the_count: he_was_on_the_visiting_result[0].length,
														he_was_on_the_visiting_result: he_was_on_the_visiting_result[0],
														contact_result_count: contact_result[0].length,
														contact_result: contact_result[0],

														send_application_count: send_application_result[0].length,
														send_application_result: send_application_result[0]

													});
												})
										})
								})
						})
				})


			// } else {
			//       return res.send({
			// 		statuscode: false,
			// 		message: "No data found",
			// 	});
			// }










		});

}




exports.create_property_alert = (req, res) => {
	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'User id  can not be empty!'
		});

	}

	let looking_for = req.body.looking_for;
	let user_id = req.body.user_id;
	let wish_for = req.body.wish_for;
	let property_type = req.body.property_type;
	let budget_prefrence = req.body.budget_prefrence;
	let locations = req.body.locations;
	let badrooms = req.body.badrooms;
	let sale_type = req.body.sale_type;
	let availability = req.body.availability;
	let alert_frequency = req.body.alert_frequency;
	let name_of_alert = req.body.name_of_alert;
	//let status = req.body.status;



	let check = "select * from property_alert  where user_id ='" + user_id + "' and alert_frequency='" + alert_frequency + "' and property_type='" + property_type + "' and locations='" + locations + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {

		if (isEmpty(myTableRowss[0])) {

			sql = "INSERT INTO  property_alert(looking_for,user_id,wish_for,property_type,budget_prefrence,locations,badrooms,sale_type,availability,alert_frequency,name_of_alert,status) VALUES ('" + looking_for + "','" + user_id + "','" + wish_for + "','" + property_type + "', '" + budget_prefrence + "', '" + locations + "', '" + badrooms + "', '" + sale_type + "', '" + availability + "', '" + alert_frequency + "','" + name_of_alert + "','1');"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (item) {
				if (item) {

					res.json({

						statuscode: true,
						message: "Your property alert created sucessfully",
						Property_id: item[0]
					});
				} else {
					res.json({
						statuscode: false,
						message: "Something went wrong please check..",
					});

				}
			});


		} else {


			return res.send({
				statuscode: true,
				message: 'This filter property already into alert'
			});




		}

		//console.log("myTableRowss",myTableRowss);
		// console.log("myTableRowss",myTableRowss.length);
	})

}





async function get_qr_code(fields) {

	var property_type;
	if (fields.property_type == 1) {
		property_type = "Buy";
	} else {
		property_type = "Rent"
	}

	let city_name = fields.city_name;

	//let final_string = property_type + '-' + fields.name + ',' + city_name
	let final_string = 'http://134.209.229.112:3007/property/' + fields.property_id
	console.log("fields", fields);
	const opts = {
		errorCorrectionLevel: 'H',
		type: 'terminal',
		quality: 0.95,
		margin: 1,
		color: {
			dark: '#208698',
			light: '#FFF',
		},
	}
	//  const qrImage = await QRCode.toString(final_string,opts)
	//console.log("qrImage",qrImage);
	// const qrString = 'QR_STRING';
	console.log(final_string);

	const qrImage = await QRCode.toDataURL(final_string, opts);


	let updat_sql = "update re_properties set qr_code ='" + qrImage + "' where id=" + fields.property_id
	db.sequelize.query(
		updat_sql, null, {
		raw: true
	}
	)
}


exports.delete_property_image = (req, res) => {
	let property_id = req.body.property_id;
	let index = req.body.index;
	let check = "select * from re_properties  where id ='" + property_id + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {
		//

		console.log("remaining_data", myTableRowss[0][0].images);
		let db_img = myTableRowss[0][0].images;

		var obj = JSON.parse(db_img);
		let stirbng = delete obj["2"];
		console.log("stirbng", stirbng);


		Object.keys(db_img).forEach(key => {
			if (db_img[key] === "2") {
				delete db_img[key];
			}
		});
		console.log("tset", db_img)

		/*let obg= JSON.parse(db_img);
		let obj=JSON.stringify(db_img);
		//let remaining_data=delete obg.index; // or use => delete test['blue'];
		let remaining_data=delete db_img["2"];
		
		thisIsObject = _.omit(db_img,'2');
		
		console.log("remaining_data",thisIsObject);*/

	})



}


exports.update_property_controller = (req, res) => {
	var form = new formidable.IncomingForm({ multiples: true });
	var file_arr = [];
	form.parse(req, async (err, fields, files) => {
		let map = new Map();
		let Dbimgname;
		let objImg;
		var newFileName_new;
		let get_old_img;
		let new_img_db;
		var temp;
		var len;
		let tenant = fields.tenant;
		let property_type = fields.property_type;
		let category = fields.category_id;
		let country = fields.country_id;
		let city = fields.city_id;
		let zipcode = fields.zipcode;
		let rooms = fields.number_bedroom;
		let living_space = fields.living_space;
		let street_no = fields.street_no;
		let available = fields.available;
		let unit = fields.unit;
		let price = fields.price;
		let available_date = fields.available_date;
		let floor = fields.floor;
		let number_floor = fields.no_of_floor;
		let year_bulit = fields.year_bulit;
		let last_renovation = fields.last_renovation;
		let title = fields.name;
		let description = fields.description;
		let host_name = fields.host_name;
		let host_phone = fields.host_phone;
		let host_email = fields.host_email;
		let images_files = files.images_files;
		let document_file = files.document_file;
		let latitude = fields.latitude;
		let longitude = fields.longitude;
		let number_bathroom = fields.no_of_bathrooms;
		let youtube_link = fields.youtube_link;
		let city_name = fields.city_name;
		let property_id = fields.property_id;
		let host_mobile = fields.host_mobile;
		var item = {};
		//let len;
		// for doc


		if (files.document_upload) {
			console.log("doc");
			newFileName_new = files.document_upload.originalFilename;
			console.log("newFileName_new", newFileName_new);
			var oldpath_new = files.document_upload.filepath;
			var newpath_new = path.join(`${__dirname}/../../../nach24Admin/public/storage/`) + newFileName_new;
			fs.rename(oldpath_new, newpath_new, function (err) { })
		} else {
			newFileName_new = "null";

		}

		// for image add case
		if (files) {
			let check = "select * from re_properties where id ='" + fields.property_id + "'";
			db.sequelize.query(
				check, null, {
				raw: true
			}
			).then(function (myTableRowss) {


				// console.log("myTableRowss",myTableRowss[0][0].images);
				if (!isEmpty(myTableRowss[0][0].images) && myTableRowss[0][0].images != undefined) {
					console.log("temp1")
					get_old_img = myTableRowss[0][0].images;
					console.log("get_old_img", get_old_img);
					temp = JSON.parse(get_old_img);
					len = Object.keys(temp).length;
				} else {
					console.log("temp2")
					temp = "";
				}

				if (files.image == undefined) {
					get_old_img = myTableRowss[0][0].images;
					console.log("get_old_img", get_old_img);
					temp = JSON.parse(get_old_img);
					len = Object.keys(temp).length;
					new_img_db = JSON.stringify(temp);
					description = JSON.stringify(description)
					let sql = "update re_properties set features_id ='" + features + "',number_floor='" + number_floor + "',zip_code='" + zipcode + "',description=" + description + ",tenant='" + tenant + "',type_id ='" + property_type + "',category_id='" + category + "',country_id='" + country + "',city_id='" + city + "',zip_code='" + zipcode + "',number_bedroom='" + rooms + "',living_space='" + living_space + "',street_no='" + street_no + "',availability='" + available + "',unit='" + unit + "',price='" + price + "',availability_date='" + available_date + "',host_mobile='" + host_mobile + "',floor='" + floor + "',year_bulit='" + year_bulit + "',last_renovation='" + last_renovation + "',name='" + title + "',host_name='" + host_name + "',host_email='" + host_email + "',images='" + new_img_db + "',document_file='" + newFileName_new + "',latitude='" + latitude + "',longitude='" + longitude + "',number_bathroom='" + number_bathroom + "' ,youtube_link='" + youtube_link + "',city_name='" + city_name + "' where id=" + fields.property_id
					db.sequelize.query(
						sql, null, {
						raw: true
					}
					).then(function (item) {
						console.log("test", item);
						if (item) {
							res.json({
								statuscode: true,
								message: 'Your property listed  succesfully ,Your property will be publish after some time'

							});
						} else {
							res.json({
								statuscode: false,
								message: "Something went wrong please check..",
							});

						}

					})

				}


				// if image updated with old and new one

				// 	if (files) {
				console.log("tempsssssss", files.image);
				jsObj = {};
				if (files.image != undefined) {
					for (i = 0; i < files.image.length; i++) {
						var file = files.image[i];
						console.log("temptemp", temp);
						temp[len + i + 1] = files.image[i].originalFilename;

						var newFileName = files.image[i].originalFilename;
						console.log("newFileName", newFileName);
						var updated_case = temp[len + i + 1];
						console.log("updated_casedddd", updated_case);
						var oldpath = files.image[i].filepath;
						var indexinc = i;
						var newpath = path.join(`${__dirname}/../../../nach24Admin/public/storage/`) + newFileName
						fs.rename(oldpath, newpath, function (err) { })
						console.log("tempcolor",

						);

						if (temp != "") {
							//	console.log("temp",temp);
							new_img_db = JSON.stringify(temp);
						} else {
							console.log("firsttime", temp);
							Dbimgname = map.set(i + 1, newFileName);
							console.log("Dbimgname", Dbimgname);
							objImg = Object.fromEntries(map.entries());
							console.log("objImg", objImg);
							new_img_db = JSON.stringify(objImg);
							console.log("new_img_db", new_img_db);

						}


					}

					console.log("new_img_db", new_img_db);


					description = JSON.stringify(description)
					let sql = "update re_properties set features_id ='" + features + "',number_floor='" + number_floor + "',zip_code='" + zipcode + "',description=" + description + ",tenant='" + tenant + "',type_id ='" + property_type + "',category_id='" + category + "',country_id='" + country + "',city_id='" + city + "',zip_code='" + zipcode + "',number_bedroom='" + rooms + "',living_space='" + living_space + "',street_no='" + street_no + "',availability='" + available + "',unit='" + unit + "',price='" + price + "',availability_date='" + available_date + "',host_mobile='" + host_mobile + "',floor='" + floor + "',year_bulit='" + year_bulit + "',last_renovation='" + last_renovation + "',name='" + title + "',host_name='" + host_name + "',host_email='" + host_email + "',images='" + new_img_db + "',document_file='" + newFileName_new + "',latitude='" + latitude + "',longitude='" + longitude + "',number_bathroom='" + number_bathroom + "' ,youtube_link='" + youtube_link + "',city_name='" + city_name + "' where id=" + fields.property_id
					db.sequelize.query(
						sql, null, {
						raw: true
					}
					).then(function (item) {
						console.log("test", item);
						if (item) {

							get_qr_code(fields);

							res.json({
								statuscode: true,
								message: 'Your property listed  succesfully ,Your property will be publish after some time'

							});
						} else {
							res.json({
								statuscode: false,
								message: "Something went wrong please check..",
							});

						}

					})

				}
				//}
			})
		}


		//features added
		let features = fields.features
		if (features) {
			var temp = new Array();
			temp = features.split(",");
			console.log("temp", temp);
			if (temp.length > 0) {
				for (let elements of temp) {
					let feature_sql = "INSERT INTO  re_property_features(property_id,feature_id) VALUES (" + property_id + "," + elements + ");"
					db.sequelize.query(
						feature_sql, null, {
						raw: true
					}
					).then(function (item) { });
				}
			}
		} else {
			//console.log("sadsad");
		}



	}); // form parse





}










/*************************************Update_controller*******************************************************/

exports.update_property_controller_old = (req, res) => {
	console.log("rwerwerwerwerewrwrewrewrewr");
	var form = new formidable.IncomingForm({ multiples: true });
	var file_arr = [];
	form.parse(req, async (err, fields, files) => {
		let map = new Map();
		let Dbimgname;
		let objImg;
		var newFileName_new;
		let get_old_img;
		let new_img_db;
		var temp;
		var len;
		// for doc


		if (files.document_upload) {
			console.log("doc");
			newFileName_new = files.document_upload.originalFilename;
			console.log("newFileName_new", newFileName_new);
			var oldpath_new = files.document_upload.filepath;
			var newpath_new = path.join(`${__dirname}/../../../nach24Admin/public/storage/`) + newFileName_new;
			fs.rename(oldpath_new, newpath_new, function (err) { })
		} else {
			newFileName_new = "null";

		}

		// for image
		if (files) {
			let check = "select * from re_properties where id ='" + fields.property_id + "'";
			console.log("check", check);
			db.sequelize.query(
				check, null, {
				raw: true
			}
			).then(function (myTableRowss) {
				if (!isEmpty(myTableRowss)) {
					get_old_img = myTableRowss[0][0].images;
					console.log("get_old_img", get_old_img);
					temp = JSON.parse(get_old_img);
					console.log("temp", temp);
					len = Object.keys(temp).length;
					console.log("len", len);
				}
				if (files) {
					jsObj = {};
					if (files.image != undefined) {



						//var old_string={"indore1":"indore","Mumbai2":"Mumbai","Mumbai4":"Pune"};
						//	var string_omg={"jabalpur1":"jabalpur2","jabalpur4":"jabalpur"};
						//	var merge_new= {...old_string, ...stri
						// console.log("files.image.length",  files.image);
						console.log("files.image.length", files.image.length);
						for (i = 0; i < files.image.length; i++) {
							var file = files.image[i];
							console.log("lesssn", len);
							temp[len + i + 1] = files.image[i].originalFilename;
							console.log("tempo", temp);
							var newFileName = files.image[i].originalFilename;
							var updated_case = temp[len + i + 1];
							var oldpath = files.image[i].filepath;
							var indexinc = i;
							var newpath = path.join(`${__dirname}/../../../nach24Admin/public/storage/`) + newFileName;
							console.log("test", newpath);

							//var dataBaseinsertingImg = { indexinc: newFileName }
							Dbimgname = map.set(i + 1, updated_case);
							console.log("Dbimgname", Dbimgname);
							objImg = Object.fromEntries(map.entries());

							//objImg = Object.fromEntries(map.entries());
							fs.rename(oldpath, newpath, function (err) { })
						}
					}
				}
			})
		}

		console.log("objImg", objImg);

		// console.log("new_img_dddddb",obj3);
		console.log("objImgsssssssss", objImg);
		new_img_db = JSON.stringify(objImg);


		/*	db.sequelize.query(
				check, null, {
				raw: true
			}
			).then(function (myTableRowss) {
				console.log("(myTableRowss.length",myTableRowss.length);
				if(myTableRowss.length > 0){ 
	
					console.log("(myTableRowss.length",myTableRowss.length);
	
	
				 get_old_img=myTableRowss[0][0].images;
				 if(get_old_img!=undefined){
				// console.log("get_old_img",myTableRowss[0][0].images);
				 //new_img_db= get_old_img.merge(odod);
				 
				 }
	
				
	
	
				}else{
					new_img_db=odod;
				}
			})*/

		console.log("new_img_db", new_img_db);


		let tenant = fields.tenant;
		let property_type = fields.property_type;
		let category = fields.category_id;
		let country = fields.country_id;
		let city = fields.city_id;
		let zipcode = fields.zipcode;
		let rooms = fields.number_bedroom;
		let living_space = fields.living_space;
		let street_no = fields.street_no;
		let available = fields.available;
		let unit = fields.unit;
		let price = fields.price;
		let available_date = fields.available_date;
		let floor = fields.floor;
		let number_floor = fields.no_of_floor;
		let year_bulit = fields.year_bulit;
		let last_renovation = fields.last_renovation;
		let title = fields.name;
		let description = fields.description;
		let host_name = fields.host_name;
		let host_phone = fields.host_phone;
		let host_email = fields.host_email;
		let images_files = files.images_files;
		let document_file = files.document_file;
		let latitude = fields.latitude;
		let longitude = fields.longitude;
		let number_bathroom = fields.no_of_bathrooms;
		let youtube_link = fields.youtube_link;
		let city_name = fields.city_name;
		let property_id = fields.property_id;
		let host_mobile = fields.host_mobile;
		//features added
		let features = fields.features

		if (features) {
			var temp = new Array();
			temp = features.split(",");
			console.log("temp", temp);
			if (temp.length > 0) {
				for (let elements of temp) {
					let feature_sql = "INSERT INTO  re_property_features(property_id,feature_id) VALUES (" + property_id + "," + elements + ");"
					db.sequelize.query(
						feature_sql, null, {
						raw: true
					}
					).then(function (item) { });
				}
			}
		} else {
			//console.log("sadsad");
		}


		try {

			//let sql = "update re_properties set features_id ='"+features+"',number_floor='" + number_floor + "',zip_code='" + zipcode + "',description='" + description + "',tenant='" + tenant + "',type_id ='" + property_type + "',category_id='" + category + "',country_id='" + country + "',city_id='" + city + "',zip_code='" + zipcode + "',number_bedroom='" + rooms + "',living_space='" + living_space + "',street_no='" + street_no + "',availability='" + available + "',unit='" + unit + "',price='" + price + "',availability_date='" + available_date + "',host_mobile='" + host_mobile + "',floor='" + floor + "',year_bulit='" + year_bulit + "',last_renovation='" + last_renovation + "',name='" + title + "',description='" + description + "',host_name='" + host_name + "',host_email='" + host_email + "',images='" + new_img_db + "',document_file='" + newFileName_new + "',latitude='" + latitude + "',longitude='" + longitude + "',number_bathroom='" + number_bathroom + "' ,youtube_link='" + youtube_link + "',city_name='" + city_name + "' where id=" + fields.property_id
			description = JSON.stringify(description)
			let sql = "update re_properties set features_id ='" + features + "',number_floor='" + number_floor + "',zip_code='" + zipcode + "',description=" + description + ",tenant='" + tenant + "',type_id ='" + property_type + "',category_id='" + category + "',country_id='" + country + "',city_id='" + city + "',zip_code='" + zipcode + "',number_bedroom='" + rooms + "',living_space='" + living_space + "',street_no='" + street_no + "',availability='" + available + "',unit='" + unit + "',price='" + price + "',availability_date='" + available_date + "',host_mobile='" + host_mobile + "',floor='" + floor + "',year_bulit='" + year_bulit + "',last_renovation='" + last_renovation + "',name='" + title + "',host_name='" + host_name + "',host_email='" + host_email + "',document_file='" + newFileName_new + "',latitude='" + latitude + "',longitude='" + longitude + "',number_bathroom='" + number_bathroom + "' ,youtube_link='" + youtube_link + "',city_name='" + city_name + "' where id=" + fields.property_id
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (item) {
				console.log("test", item);
				if (item) {
					res.json({
						statuscode: true,
						message: 'Your property listed  succesfully ,Your property will be publish after some time'

					});
				} else {
					res.json({
						statuscode: false,
						message: "Something went wrong please check..",
					});

				}

			})

		} catch (e) {
			console.log("e", e);

		}

	}); // form parse





}




exports.get_property_facilities = (req, res) => {

	let sql = "select * from re_facilities where status='published'";
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		return res.send({ status: true, message: "Get Data Successfully", results: myTableRows[0] })

	})
}


exports.get_all_transaction = (req, res) => {

	let user_id = req.body.uid;
	let start_date = req.body.start_date;
	let end_date = req.body.end_date;
	let filter_data_prams;
	if (start_date != "" && end_date != "") {
		filter_data_prams = 'created_at BETWEEN "' + start_date + '" AND "' + end_date + '"AND';
	} else {
		filter_data_prams = "";
	}
	let sql = "SELECT * FROM re_transactions WHERE " + filter_data_prams + " user_id='" + user_id + "'";
	//    let sql = "select * from re_transactions "+filter_data_prams+"  where user_id="+user_id;
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (myTableRows[0].length > 0) {
			return res.send({ status: true, message: "Get Data Transactions", results: myTableRows[0] })
		} else {
			return res.send({ status: false, message: "No Data Found" })
		}
	})
}






exports.get_all_services = (req, res) => {
	let user_id = req.params.uid;
	let sql = "select * from re_services";
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (!isEmpty(myTableRows[0])) {
			return res.send({ status: true, message: "Get all services provider", results: myTableRows[0] })
		} else {
			return res.send({ status: false, message: "Data does not found" })
		}

	})
}

exports.get_all_package = (req, res) => {
	//let user_id=req.params.uid;
	let sql = "select * from re_packages";
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (!isEmpty(myTableRows[0])) {
			return res.send({ status: true, message: "Get all packages", results: myTableRows[0] })
		} else {
			return res.send({ status: false, message: "Data does not found" })
		}

	})
}


exports.get_all_services_provider = (req, res) => {
	let uid = req.params.uid;
	let sql = "select * from re_services_providers where services_id=" + uid;
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (!isEmpty(myTableRows[0])) {
			return res.send({ status: true, message: "Get all services provider", results: myTableRows[0] })
		} else {
			return res.send({ status: false, message: "Data does not found" })
		}

	})
}



// exports.update_drag_status = (req, res) => {

// 	let primary_id = req.body.id;
// 	let lead_status = req.body.lead_status;

// 	let sql = "update lead_respones set lead_status='" + lead_status + "' where id ='" + primary_id + "'"
// 	db.sequelize.query(
// 		sql, null, {
// 		raw: true
// 	}
// 	).then(function (item) {
// 		console.log("test", item);
// 		if (item) {
// 			res.json({
// 				statuscode: true,
// 				message: 'Your lead status sucessfully changed'

// 			});
// 		} else {
// 			res.json({
// 				statuscode: false,
// 				message: "Something went wrong please check..",
// 			});

// 		}

// 	})



// }


//by Chetan 17/11/22
exports.update_drag_status = (req, res) => {

	console.log("__dirname", __dirname);
	console.log("path.join", path.join(__dirname));

	send_watch_template = (obj) => {
		let transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'developerallthings@gmail.com',
				pass: 'jprrpwvxvsrkejph',

			},
		});
		//path.join(__dirname, 'templates/registration_confirmation.ejs'
		//'./emailTemplate/lead_status_property.ejs',
		if (transporter) {
			//	var newpath_new = path.join(`${__dirname}/../../../nach24Admin/public/storage/`) + newFileName_new;
			ejs.renderFile(path.join(__dirname, '/../../emailTemplate/lead_status_property.ejs'), { obj }, (err, data) => {

				if (err) {
					console.log("error=", err);
				} else {
					mailOptions = {
						from: 'chetanppt1999@gmail.com',
						to: obj.email,
						subject: 'NextFlat Property alert',
						html: data

					};
					transporter.sendMail(mailOptions, (error, info) => {
						if (error) {
							console.log("error=", error);
						}
						if (info.messageId) {
							console.log("Successfull Template Send Your email")
						}
					});
				}
			})
		}
	}

	let primary_id = req.body.id;
	let lead_status = req.body.lead_status;
	let user_id = req.body.user_id;
	let message;

	let sql = "update lead_respones set lead_status='" + lead_status + "' where user_id ='" + primary_id + "' and property_id='" + req.body.property_id + "'"
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (item) {

		// console.log("test", item);
		if (item) {



			//view Property Template send Email 
			let sql = "select re_accounts.id,re_accounts.email,lead_respones.user_id,lead_respones.property_title,lead_respones.lead_status from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.user_id='" + req.body.id + "' and  property_id='" + req.body.property_id + "'";
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (user_data) {

				// console.log("user_data=",user_data[0])

				let email = user_data[0][0].email;
				let property_title = user_data[0][0].property_title


				if (req.body.lead_status == "new_request") {
					message = 'Thank you for Request,Welcome on visitng our side '
				}
				else if (req.body.lead_status == "member_gold_qualivited") {
					message = 'Thankyou for choosing new Premium plan .Your premium user for Nextflat'
				}
				else if (req.body.lead_status == "welcome_visiting") {
					message = 'welcome on visitng our side your expected time will be 11 to 1 pm'
				}
				else if (req.body.lead_status == "he_was_on_the_visiting") {
					message = 'Thankyou for Visting on site ,We hope your satified your property if you any quires let connect with us.'
				}
				else if (req.body.lead_status == "send_application") {
					message = 'We got your Application, Thank you!'
				}
				else if (req.body.lead_status == "contact") {
					message = 'Thank you for completing the process, team will contact you soon '
				}

				obj = { email, message, property_title }
				console.log("obj", obj)

				send_watch_template(obj);

			})


			res.json({
				statuscode: true,
				message: 'Your lead status sucessfully changed'

			});
		} else {
			res.json({
				statuscode: false,
				message: "Something went wrong please check..",
			});

		}

	})



}








exports.user_dashboard = (req, res) => {

	let user_id = req.body.user_id;
	console.log("user_id", user_id);
	let approved_count;
	let pending_count;
	let rejected_count;

	let approved = "select * from re_properties where moderation_status='approved' and user_id=" + user_id;
	let pending = "select * from re_properties where moderation_status='pending' and user_id=" + user_id;
	let rejected = "select * from re_properties where moderation_status='rejected' and user_id=" + user_id;

	db.sequelize.query(
		approved, null, { raw: true }).then(function (approved) {
			//console.log("pendingpending",pending);
			approved_count = approved[0].length;


			db.sequelize.query(
				pending, null, {
				raw: true
			}
			).then(function (pending) {
				//console.log("pendingpending",pending);
				pending_count = pending[0].length;
				db.sequelize.query(
					rejected, null, {
					raw: true
				}

				).then(function (rejected) {

					//console.log("rejectedrejected",rejected);
					rejected_count = rejected[0].length;
					return res.send({ status: true, message: "Get list count all", Approved: approved_count, Pending: pending_count, Rejected: rejected_count })

					//console.log("rejected_count",rejected_count);
				})





			})


		});

}




exports.get_propertyby_user_by_id = (req, res) => {

	let offset;
	if (!req.body.page) {
		offset = 0
	} else {
		offset = req.body.page
	}
	let limit;
	if (!req.body.limit) {
		limit = 0
	} else {
		limit = req.body.limit
	}

	if (req.body.filter == 'Max') {
		filter_param = 'order by re_properties.price  desc'
	}
	else if (req.body.filter == "Min") {
		filter_param = 'order by re_properties.price  asc'
	} else {
		filter_param = 'order by re_properties.id  desc';
	}

	let sql;
	if (req.body.lang == 'en') {
		sql = "select  re_properties.*,re_properties.id as property_id,re_accounts.*, GROUP_CONCAT(re_features.name SEPARATOR ',') AS attributes,cities.name as city_name ,countries.name as country_name,profile_pic,re_properties.id,re_properties.zip_code ,re_properties.created_at ,lead_respones.total_view from re_properties  left join re_account_details on re_account_details.account_id=re_properties.author_id  left join countries on re_properties.country_id=countries.id left join cities on re_properties.city_id=cities.id left join re_property_features on re_property_features.property_id=re_properties.id left join re_accounts on re_accounts.id = re_properties.id  left join re_features on re_property_features.feature_id=re_features.id left join lead_respones on re_properties.id=lead_respones.property_id where re_properties.user_id=" + req.body.user_id + " group by re_properties.id " + filter_param + "  LIMIT  " + limit + "  OFFSET " + offset + ""
	} else {

		sql = "select re_properties.id ,re_accounts.*,re_properties_translations.*,re_properties.number_bedroom ,re_properties.number_bathroom ,re_properties.number_floor ,re_properties.expire_date ,re_properties.author_id ,re_properties.author_type ,re_properties.created_at,re_properties.auto_renew ,re_properties.square ,re_properties.city_id ,re_properties.zip_code,re_properties.currency_id ,re_properties.country_id ,re_properties.state_id ,re_properties.price ,re_properties.period ,re_properties.category_id ,re_properties.moderation_status ,re_properties.never_expired ,re_properties.latitude ,re_properties.longitude ,re_properties.type_id ,re_properties.created_at,countries.name as country_name  ,re_properties.updated_at ,re_properties.subcategory_id,profile_pic, GROUP_CONCAT(re_features_translations.name SEPARATOR ',') AS attributes,cities.name as city_name,countries.name as country_name,re_properties.id ,lead_respones.total_view as total_view from re_properties  left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id left join re_property_features on re_property_features.property_id=re_properties.id  left join re_features_translations on re_property_features.feature_id=re_features_translations.re_features_id  left join re_accounts on re_accounts.id = re_properties.author_id   left join cities on re_properties.city_id=cities.id  left join countries on re_properties.country_id=countries.id  left join re_account_details on re_account_details.account_id=re_accounts.id left join lead_respones on re_properties.id=lead_respones.property_id  where moderation_status='approved' and re_properties.user_id=" + req.body.user_id + "   and re_properties_translations .lang_code ='" + req.body.lang + "' group by re_properties.id " + filter_param + " LIMIT  " + limit + "  OFFSET " + offset + ";"
	}

	console.log("sql", sql);
	//	let facilities_sql='select * from re_facilities_distances left join re_facilities on re_facilities.id=re_facilities_distances.facility_id  where reference_id='+req.body.id
	//let review = 'SELECT re_reviews.*,first_name,last_name,profile_pic FROM  `re_reviews` left join re_accounts on re_accounts.id=re_reviews.account_id left join re_account_details on re_account_details.account_id=re_accounts.id left join lead_respones on re_properties.id=lead_respones.property_id where reviewable_id=' + req.body.user_id

	let review = 'SELECT re_reviews.*,first_name,last_name,profile_pic FROM  `re_reviews` left join re_accounts on re_accounts.id=re_reviews.account_id left join re_account_details on re_account_details.account_id=re_accounts.id where reviewable_id=' + req.body.user_id

	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		console.log("myTableRowsmyTableRows", myTableRows);


		db.sequelize.query(
			review, null, {
			raw: true
		}
		).then(function (myTableRowreview) {
			return res.send({
				statuscode: true,
				data: myTableRows[0],
				//	 facities:myTableRow[0],
				reviews: myTableRowreview[0],
				count_review: myTableRowreview[0].length,
				message: "Property get successfully",
				token: 'token'
			});
		})
		//	 })
	})
}




/**************************************************************************************************/

exports.author_details = (req, res) => {

	if (!req.query.id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Id can not be empty!'
		});

	}

	let sql = "select * from re_properties left join re_accounts on re_accounts.id=re_properties.author_id where re_properties.id=" + req.query.id
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		return res.send({ status: "success", message: "Get Data Successfully", results: myTableRows[0] })

	})
}


//Property Transaction
exports.property_transaction = async  (req, res) => {

	const { credits, description, user_id, account_id, type, property_id, start_date, expire_date, packaged_id, payment_id, payment_for } = req.body;


	if (!req.body.user_id) {
		return res.send({ statuscode: false, message: 'User ID can not be empty!' });
	}
	if (!req.body.payment_id) {
		return res.send({ statuscode: false, message: 'Payment ID can not be empty!' });
	}
	if (!req.body.type) {
		return res.send({ statuscode: false, message: 'Payment Type can not be empty!' });
	}

	let check = "select * from re_transactions where user_id ='" + req.body.user_id + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {

		if (isEmpty(myTableRowss[0])) {
			let sql = "INSERT INTO re_transactions(credits, description, user_id, account_id, type, property_id, packaged_id, payment_id,payment_for,dossier_features) VALUES ('" + req.body.credits + "', '" + req.body.description + "','" + req.body.user_id + "', '" + req.body.user_id + "','" + req.body.type + "','" + req.body.property_id + "','" + req.body.packaged_id + "','" + req.body.payment_id + "','" + req.body.payment_for + "','" + req.body.dossier_features + "');"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {


				file_pdf_name=req.body.user_id+'_'+'NextFlat'+'.pdf';
			//	let result =  await easyinvoice.createInvoice(Invoicedata);
			//	await fs.writeFileSync("uploads/invoices/"+file_pdf_name, result.pdf, 'base64');

		



             // getPaymentdataSend(req);
				    res.send({
					statuscode: true,
					data: myTableRows[0],
					message: "Property Transaction Successfully",
					ViewInvoice:'demo.pdf'
				});




				// let lead_check_abavle = "select * from lead_respones where property_id ='" + req.body.user_id + "' and user_id='" + req.body.packaged_id + "' and property_owner_id  ='" + req.body.property_owner_id + "'"
				// db.sequelize.query(
				// 	lead_check_abavle, null, {
				// 	raw: true
				// }
				// ).then(function (myTableRowss) {
				// 	if(myTableRowss[0].length > 0){
				// 		sql = "INSERT INTO  lead_respones(property_owner_id,user_id,property_id,property_title ,lead_status,total_view) VALUES ('" + property_owner_id + "','" + user_id + "','" + property_id + "','" + property_title + "', '" + status + "', '1');"
				// 		db.sequelize.query(
				// 			sql, null, {
				// 			raw: true
				// 		}
				// 		).then(function (item) {

				// 	}

				// })







			})
		} else {

			// if(req.body.type!="FREE"){
			// 	let update_sql = "update lead_respones set lead_status = 'member_gold_qualivited'  where property_id='" + req.body.property_id+"' and  user_id='"+req.body.user_id+"'" 
			// 	db.sequelize.query(
			// 		update_sql, null, {
			// 		raw: true
			// 	})

			// }


			return res.send({
				statuscode: false,
				message: "This plan user already taken",
			});

		}

	})


}



        exports.store_invoice = async (req, res) => {
		
	    var data = {
		// Customize enables you to provide your own templates
		// Please review the documentation for instructions and examples
		"customize": {
			//  "template": fs.readFileSync('template.html', 'base64') // Must be base64 encoded html 
		},
		"images": {
			// The logo on top of your invoice
			"logo": "http://134.209.229.112:3007/static/media/new_logo.cdf3e315c6f8d518753b.png",
			// The invoice background
			"background": "http://134.209.229.112:3007/watermark.jpg"
		},
		// Your own data
		"sender": {
			"company": "NEXT FLAT",
			"address": "Switzerland",
			"zip": "1234",
			"city": "ZURICH",
			"country": "Switzerland"
		
		},
		// Your recipient
		"client": {
			"Customer": "Client Corp",
			"address": "Clientstreet 456",
			"zip": "4567 CD",
			"city": "Clientcity",
			"country": "Clientcountry"
			// "custom1": "custom value 1",
			// "custom2": "custom value 2",
			// "custom3": "custom value 3"
		},
		"information": {
			// Invoice number
			"number": "2021.0001",
			// Invoice data
			"date": "12-12-2021",
			// Invoice due date
			"due-date": "31-12-2021"
		},
		// The products you would like to see on your invoice
		// Total values are being calculated automatically
		"products": [
			{
				"quantity": 2,
				"description": "Product 1",
				"tax-rate": 6,
				"price": 33.87
			}
		],
		// The message you would like to display on the bottom of your invoice
		"bottom-notice": "Thankyou for payment.",
		// Settings to customize your invoice
		"settings": {
			"currency": "CHF", // See documentation 'Locales and Currency' for more info. Leave empty for no currency.
		
		},
		// Translate your invoice to your preferred language
		"translate": {
		
		},
	};
	const result = await easyinvoice.createInvoice(data);
	await fs.writeFileSync("invoice.pdf", result.pdf, 'base64');

}








exports.create_payment_intent = async (req, res) => {
	const { items } = req.body;
	console.log("items", req.body);
	//console.log("items",items.amount);
	//console.log("currency",items.currency);
	//calculateOrderAmount(items)
	// Create a PaymentIntent with the order amount and currency
	// const paymentIntent =  await stripe.paymentIntents.create({
	//     amount:  req.body.amount,
	//     currency: req.body.currency,
	// 	//customer:"test",
	// 	description: 'Software development services',
	// 	name:"rest",
	// 	//address:"test sfsdfsdfsdfsfdsdf",

	// 	//customer:req.body.customer,
	// //	description:req.body.description,
	//     automatic_payment_methods: {
	//         enabled: true,
	//     },
	// });


	const paymentIntent = await stripe.paymentIntents.create({
		description: req.body.description,
		shipping: {
			name: req.body.name,
			address: {
				line1: 'Swizerland',
				postal_code: '4000',
				city: 'Basel',
				state: 'Basel',
				country: 'Ch',
			},
		},
		amount: req.body.amount,
		currency: req.body.currency,
		payment_method_types: ['card'],
	});


	console.log(paymentIntent);

	res.send({
		clientSecret: paymentIntent.client_secret,
	});
}





exports.contact_seller = (req, res) => {
	console.log("test")
	const { user_id, first_name, last_name, email, phone_no, city, zip_code, property_name, message, property_owner_id,property_id} = req.body;

	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			message: "User ID can not be empty",
		});
	}
	if (!req.body.property_name) {
		return res.send({
			statuscode: false,
			message: "Property Name can not be empty",
		});
	}
	if (!req.body.email) {
		return res.send({
			statuscode: false,
			message: "Email can not be empty",
		});
	}
	let sql = "Insert into contact_to_seller(user_id, property_owner_id,property_id,first_name,last_name,email,phone_no,city,zip_code,property_name,message)VALUES('" + req.body.user_id + "','" + req.body.property_owner_id+"','" + req.body.property_id+"','" + req.body.first_name + "','" + req.body.last_name + "','" + req.body.email + "','" + req.body.phone_no + "','" + req.body.city + "','" + req.body.zip_code + "','" + req.body.property_name + "','" + req.body.message + "');"
	db.sequelize.query(sql, null, { raw: true }).then(function (myTableRows) {
		if (myTableRows) {
			return res.send({
				statuscode: true,
				data: myTableRows[0],
				message: "Property Contact Seller Successfully",
			});
		}
	})

	// 
}




exports.contact_page_user = (req, res) => {
	console.log("test")
	const { user_id, first_name, email, phone_no, subject, message } = req.body;

	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			message: "User ID can not be empty",
		});
	}

	if (!req.body.phone_no) {
		return res.send({
			statuscode: false,
			message: "Phone can not be empty",
		});
	}
	let sql = "Insert into  contacts(user_id,name,email,phone,subject,content)VALUES('" + req.body.user_id + "','" + req.body.first_name + "','" + req.body.email + "','" + req.body.phone_no + "','" + req.body.subject + "','" + req.body.message + "');"
	db.sequelize.query(sql, null, { raw: true }).then(function (myTableRows) {
		if (myTableRows) {
			return res.send({
				statuscode: true,
				data: myTableRows[0],
				message: "Property Contact Seller Successfully",
			});
		}
	})

	// 
}




//By CP 14/11/22



exports.get_pages_data = (req, res) => {

	if (!req.params.page_type) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Page Type can not be empty!'
		});

	}

	let sql = "select * from pages where name='" + req.params.page_type + "'"
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {

		if (myTableRows[0].length > 0) {
			return res.send({ statuscode: true, message: "Get Data Successfully", results: myTableRows[0] })
		} else {
			return res.send({ statuscode: false, message: "No Data Found" })
		}
	})
}


exports.get_approved_property = (req, res) => {

	let sql = "select * from re_properties where moderation_status='approved'"
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {

		if (myTableRows[0].length > 0) {
			return res.send({ statuscode: true, total_property: myTableRows[0].length, message: "Get Data Successfully", results: myTableRows[0] })
		} else {
			return res.send({ statuscode: false, message: "No Data Found" })
		}
	})
}

//By cp Setting Api



exports.get_all_setting_data = (req, res) => {

	let sql = "SELECT * FROM `settings` where  `key`='fb_link' or `key`='twitter_link' or  `key`='google_link' or `key`='admin_email' or `key`='admin_phone' or `key`='admin_address' or `key`='admin_map' or `key`='footer_description'";
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {

		if (myTableRows[0].length > 0) {
			return res.send({ statuscode: true, message: "Get Data Successfully", results: myTableRows[0] })
		} else {
			return res.send({ statuscode: false, message: "No Data Found" })
		}
	})
}



exports.property_alert_delete = (req, res) => {

	if (!req.body.id) {
		return res.send({
			statuscode: false,
			data: [],
			token: null,
			message: 'Id can not be empty'
		});

	}
	let sql = "select * from property_alert where id='" + req.body.id + "'";
	let delete_query = "delete  from property_alert where id='" + req.body.id + "'";
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {
		if (!isEmpty(myTableRows[0])) {

			db.sequelize.query(
				delete_query, null, {
				raw: true
			}
			).then(function (myTableRowsDel) {
				if (!isEmpty(myTableRowsDel[0])) {
					return res.send({
						statuscode: true,
						message: 'Deleted Property alert sucessfully'
					});
				}
				//res.send(myTableRows[0])
			})
		} else {
			return res.send({
				statuscode: false,
				message: 'Id does not found'
			});
		}


	})

}



//code by chetan 05-12

exports.create_property_appointment_calendar = (req, res) => {
	let property_owner__name = [], property_own_name;

	if (!req.body.user_id) {
		return res.send({
			statuscode: false,
			message: 'user id  can not be empty!'
		});

	}
	if (!req.body.property_id) {
		return res.send({
			statuscode: false,
			message: 'Property Id can not be empty!'
		});

	}
	if (!req.body.property_owner_id) {
		return res.send({
			statuscode: false,
			message: 'property owner id  can not be empty!'
		});

	}
	if (!req.body.appointment_date) {
		return res.send({
			statuscode: false,
			message: 'appointment date can not be empty!'
		});

	}
	if (!req.body.appointment_time) {
		return res.send({
			statuscode: false,
			message: 'appointment time can not be empty!'
		});

	}

	let property_id = req.body.property_id;
	let user_id = req.body.user_id; // get mail to send this 
	let property_owner_id = req.body.property_owner_id;  
	let appointment_date= req.body.appointment_date;
	let appointment_time= req.body.appointment_time;
	let meetup_location=req.body.meetup_location;

	//code by cp date:11-09-22

	send_watch_template = (obj) => {
		let transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'developerallthings@gmail.com',
				pass: 'jprrpwvxvsrkejph',

			},
		});
	if (transporter) {
			ejs.renderFile(path.join(__dirname, '/../../emailTemplate/propery_template.ejs'), { obj }, (err, data) => {
				
				if (err) {
					console.log(err);
				} else {
					mailOptions = {
						from: 'chetanppt1999@gmail.com',
						to: obj.email,
						subject: 'Thank you for Watch Properties',
						html: data

					};
					transporter.sendMail(mailOptions, (error, info) => {
						if (error) {
							console.log(error);
						}
						if (info.messageId) {
							console.log("Successfull Template Send Your email")
						}
					});
				}
			})
		}
	}

	let check = "select * from property_appointment_calendar where property_id ='" + req.body.property_id + "' and user_id='" + req.body.user_id + "' and  property_owner_id='" + req.body.property_owner_id + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {

		if (isEmpty(myTableRowss[0])) {

			sql = "INSERT INTO  property_appointment_calendar (property_owner_id,user_id,property_id,meetup_location,appointment_date,appointment_time) VALUES ('" + property_owner_id + "','" + user_id + "','" + property_id + "','" + meetup_location + "', '" + appointment_date + "','" + appointment_time + "');"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (item) {
				if (item) {
					// const date = new Date();
					// console.log(date.toUTCString());

					// //view Property Template send Email 
					// let sql = "select re_accounts.*,lead_respones.created_at,lead_respones.property_title,lead_respones.property_owner_id from lead_respones left join re_accounts on lead_respones.user_id=re_accounts.id WHERE lead_respones.property_id='" + req.body.property_id + "' and lead_respones.property_owner_id='" + req.body.property_owner_id + "'";
					// db.sequelize.query(
					// 	sql, null, {
					// 	raw: true
					// }
					// ).then(function (match_temp) {
					// 	console.log("data=", match_temp[0])
					// 	let property_owner_id = match_temp[0][0].property_owner_id
					// 	console.log("property_owner_id=", property_owner_id)

					// 	let sql = "select first_name,last_name from re_accounts where id='" + property_owner_id + "'";
					// 	db.sequelize.query(
					// 		sql, null, {
					// 		raw: true
					// 	}
					// 	).then(function (property_owner_id) {
					// 		if (property_owner_id[0]) {
					// 			console.log("property_owner_id[0] = first =", property_owner_id[0][0].first_name + " last name=" + property_owner_id[0][0].last_name)
					// 			property_own_name = property_owner__name.push(property_owner_id[0][0].first_name + " " + property_owner_id[0][0].last_name)





					// 			console.log("property_owner__name==", property_owner__name[0])
					// 			let address= match_temp[0][0].address
					// 			let pr_own_name = property_owner__name[0]
					// 			let name = match_temp[0][0].first_name + " " + match_temp[0][0].last_name;
					// 			const splitOnSpace = name.split(' ');
					// 			console.log(splitOnSpace);
					// 			const first = splitOnSpace[0][0];
					// 			const last = splitOnSpace[1][0];
					// 			let name_logo = first + "" + last
					// 			let username = match_temp[0][0].username;
					// 			let phone = match_temp[0][0].phone;
					// 			let email = match_temp[0][0].email;
					// 			var created_at = match_temp[0][0].created_at;
					// 			created_at = date.toUTCString(created_at);
					// 			let property_title = match_temp[0][0].property_title
					// 			if (match_temp[0][0] == 'NULL' || match_temp[0][0].username == 'NULL') {
					// 				phone = 'NA';
					// 				username = 'NA';
					// 			}

					// 			obj = { username, name, name_logo, pr_own_name, phone,address,email, created_at, property_title }
					// 			console.log("obj", obj)

					// 			send_watch_template(obj);
					// 		}
					// 	})

					// })

					res.json({

						statuscode: true,
						message: "Your property appointment create sucessfully",
						appointment_id: item[0]
					});
				} else {
					res.json({
						statuscode: false,
						message: "Something went wrong please check..",
					});

				}
			});


		} else {

			let update_sql = "update property_appointment_calendar set property_owner_id='" + property_owner_id + "',user_id='" + user_id + "',property_id='" + property_id + "',meetup_location='" + meetup_location + "',appointment_date='" + appointment_date + "',appointment_time='" + appointment_time + "'"
			db.sequelize.query(
				update_sql, null, {
				raw: true
			}
			).then(function (update_sqlRows) {
				return res.send({
					statuscode: true,
					message: 'Your property appointment updated sucessfully'
				});
			})
		}		
	})
}

//get property appointment calendar 

exports.get_property_appointment_calendar=(req,res)=>{

	let id=req.query.id
	let new_re_account_details = 'select * from new_re_account_details where id="'+id+'"'	
	let property_appointment_calendar = 'select * from property_appointment_calendar where user_id="'+id+'"'
	db.sequelize.query(
		new_re_account_details, null, {
		raw: true
	}
	).then(function (new_re_account_detailsRow) {
		db.sequelize.query(
			property_appointment_calendar, null, {
			raw: true
		}
		).then(function (property_appointment_calendar) {
		
	 let new_arr = { dossier_account_details: new_re_account_detailsRow[0], property_appointment_calendar: property_appointment_calendar[0] }
				return res.send({
					statuscode: true,
					message: 'get property appointment calendar details successfully',
					data:[new_arr],
				});	
		})
	})

}

//code by cp
//create_moving_items

exports.create_moving_items=(req,res)=>{

	const { user_id, service_type, current_address ,new_address,email_address} = req.body;


	if (!req.body.user_id) {
		return res.send({ statuscode: false, message: 'user id can not be empty!' });
	}
	if (!req.body.email_address) {
		return res.send({ statuscode: false, message: 'email address can not be empty!' });
	}
	if (!req.body.service_type) {
		return res.send({ statuscode: false, message: 'service type can not be empty!' });
	}

	let check = "select * from moving_items where user_id ='" + req.body.user_id + "' or email_address='" + req.body.email_address + "'"
	db.sequelize.query(
		check, null, {
		raw: true
	}
	).then(function (myTableRowss) {

		if (isEmpty(myTableRowss[0])) {
			let sql = "INSERT INTO moving_items(user_id, service_type, current_address ,new_address,email_address) VALUES ('" + req.body.user_id + "','" + req.body.service_type + "', '" + req.body.current_address + "','" + req.body.new_address + "', '" + req.body.email_address + "');"
			db.sequelize.query(
				sql, null, {
				raw: true
			}
			).then(function (myTableRows) {

				res.send({
					statuscode: true,
					data: myTableRows[0],
					message: "create moving items Successfully",
				});
			})
		} else {
			return res.send({
				statuscode: false,
				message: "This user already taken moving service",
			});

		}
	})
}


//get moving items 


exports.get_moving_item=(req,res)=>{
	
	let id=req.query.id
	let new_re_account_details = 'select * from new_re_account_details where id="'+id+'"'
	let moving_items = 'select * from moving_items where user_id="'+id+'"'
	db.sequelize.query(
		new_re_account_details, null, {
		raw: true
	}
	).then(function (new_re_account_detailsRow) {
		db.sequelize.query(
			moving_items, null, {
			raw: true
		}
		).then(function (moving_items) {
		
	 let new_arr = { dossier_account_details: new_re_account_detailsRow[0], moving_items: moving_items[0] }
				return res.send({
					statuscode: true,
					message: 'get moving items details successfully',
					data:[new_arr],
				});
			
		})
	})
}


exports.user_permission=(req,res)=>{
	
	if (!req.body.role_type) {
		return res.send({
			statuscode: false,
			message: 'role type can not be empty!'
		});

	}

	let sql = "select * from user_permission where role_type='" + req.body.role_type + "'"
	db.sequelize.query(
		sql, null, {
		raw: true
	}
	).then(function (myTableRows) {

		if (myTableRows[0].length > 0) {
			return res.send({ statuscode: true, message: "Get user permission Successfully", results: myTableRows[0] })
		} else {
			return res.send({ statuscode: false, message: "No Data Found" })
		}
	})

}





// apply_to_nextflat

exports.applied_to_nextflat_list=(req,res)=>{
	let param,msg;	
		if (req.body.user_id) {
	
			param= "where user_id='" + req.body.user_id + "'"
			msg= "Get applied to nextflat list Successfully"
		}else{
			param= " where property_owner_id='" + req.body.property_owner_id + "'"
			msg= "Get owner applied properties list Successfully"
		}
	
		let sql = "select * from contact_to_seller "+param+" "
		db.sequelize.query(
			sql, null, {
			raw: true
		}
		).then(function (myTableRows) {
	
			if (myTableRows[0].length > 0) {
				return res.send({ statuscode: true,message:msg,results: myTableRows[0] })
			} else {
				return res.send({ statuscode: false, message: "No Data Found" })
			}
		})
	
	}


//get_payment_sponsor
	
exports.get_payment_sponsor=(req,res)=>{
	
		let sql = "select * from  payment_sponsor "
		db.sequelize.query(
			sql, null, {
			raw: true
		}
		).then(function (myTableRows) {
	
			if (myTableRows[0].length > 0) {
				return res.send({ statuscode: true,message:"Get user payment responcer successfully",results: myTableRows[0] })
			} else {
				return res.send({ statuscode: false, message: "No Data Found" })
			}
		})
	
	}