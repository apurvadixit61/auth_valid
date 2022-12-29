const db = require("../models");

const Op = db.Sequelize.Op;
var bcrypt = require("bcryptjs");


const getPagingData = (data, page, limit) => {

	const { count: totalItems, rows: results } = data;
	const currentPage = page ? +page : 0;
	const totalPages = Math.ceil(totalItems / limit);
  if (results.length > 0) {
    return { totalItems, status: "success", message: "Get Data Successfully", image_url: process.env.IMAGE_URL, results, totalPages, currentPage };
  } else {
    return { status: "false", message: "No Data Found" }
  }

};
// Create and Save a new Driver
// Retrieve all Drivers from the database.
exports.findAll = (req, res) => {
  console.log('ok');
console.log(db);
};

function isEmpty(obj) {
    return !obj || Object.keys(obj).length === 0;
}


const getPagination = (page, size) => {

	const limits = size ? +size : 3;
	const offsets = page ? page * limits : 0;
	return { limits, offsets };
};

 exports.properties_location = (req, res) => {

   let offset ;
   if (!req.query.page) {
    offset=0
   }else{
    offset =req.query.page
   }
   let limit ;
   if (!req.query.limit) {
   limit=0
   }else{
   limit =req.query.limit
   }

   let tableName ;
   if (req.query.lang == 'en') {
     selectCol= ''
     langcode=''
   tableName=''
   }else{
   tableName =' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
    langcode= " and lang_code ='"+req.query.lang+"'"
   }

   const { limits, offsets } = getPagination(offset, limit);


   let m_sql="select count(*) as count from re_properties "+tableName+" where moderation_status='approved' " + langcode + " order by id LIMIT  "+limits +"  OFFSET "+ offsets
    let sql="select * from re_properties "+tableName+" where moderation_status='approved' " + langcode
     if(req.query.city_id)
     {

       m_sql="select count(*) as count from re_properties "+tableName+"  where  moderation_status='approved' and city_id= "+req.query.city_id + langcode
        sql="select * from re_properties "+tableName+"  where  moderation_status='approved' and city_id= "+req.query.city_id + langcode + " order by id LIMIT  "+limits +"  OFFSET "+ offsets
     }
     // if(req.body.city_id)
     // {
     //
     //    sql="select * from re_properties where city"
     // }

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

                          const data= { count: myTableRow[0][0].count, rows: myTableRows[0] } ;


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

}

exports.properties_type = (req, res) => {
  let offset ;
  if (!req.query.page) {
   offset=0
  }else{
   offset =req.query.page
  }
  let limit ;
  if (!req.query.limit) {
  limit=0
  }else{
  limit =req.query.limit
  }

  let tableName ;
  if (req.query.lang == 'en') {
    selectCol= ''
    langcode=''
  tableName=''
  }else{
  tableName =' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
  langcode= " where lang_code ='"+req.query.lang+"' "

  }
  const { limits, offsets } = getPagination(offset, limit);

  let m_sql="select count(*) as count from re_properties  "+tableName+ langcode+"  where   moderation_status='approved' and  type_id="+req.query.type
   let sql="select * from re_properties  "+tableName+ langcode+"  where   moderation_status='approved' and  type_id="+req.query.type+" order by id LIMIT  "+limits +"  OFFSET "+ offsets

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

                         const data= { count: myTableRow[0][0].count, rows: myTableRows[0] } ;


                         const results = getPagingData(data, offset, limit);
                         res.send(results);

                       })
                     })

}

 exports.properties = (req, res) => {
   let offset ;
   if (!req.query.page) {
    offset=0
 }else{
    offset =req.query.page
 }
 let limit ;
 if (!req.query.limit) {
  limit=0
}else{
  limit =req.query.limit
}
 console.log(req.query.page);
 let tableName ;
 if (req.query.lang == 'en') {
   selectCol= ''
   langcode=''
 tableName=''
 }else{
 tableName =' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
  langcode= " where lang_code ='"+req.query.lang+"' "
 }
 const { limits, offsets } = getPagination(offset, limit);

 let m_sql="select count(*) as count from re_properties  "+tableName+ langcode+" where   moderation_status='approved'  "
    let sql="select * from re_properties  "+tableName+ langcode+" where   moderation_status='approved'   order by id LIMIT "+limits+" OFFSET "+ offsets
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

                          const data= { count: myTableRow[0][0].count, rows: myTableRows[0] } ;


                          const results = getPagingData(data, offset, limit);
                          res.send(results);
                        })
                      })

}


exports.property_by_id = (req, res) => {
let sql;
console.log(req.body);
	if (req.body.lang == 'en') {
		 sql="select * from re_properties left join re_accounts on re_accounts.id=re_properties.author_id where   moderation_status='approved' and  re_properties.id="+req.body.id

	}else{
		 sql="select * from re_properties_translations left join re_accounts on re_accounts.id=re_properties.author_id where   moderation_status='approved' and  re_properties.id="+req.body.id

	}
  db.sequelize.query(
                               sql, null, {
                                       raw: true
                               }
                       ).then(function (myTableRows) {

                         return res.send({
                             statuscode: 200,
                             data: myTableRows[0],
                             message: "Property get successfully",
                             token: 'token'
                         });
                       })

}
exports.feature_property = (req, res) => {

  let offset ;
  if (!req.query.page) {
   offset=0
}else{
   offset =req.query.page
}
let limit ;
if (!req.query.limit) {
 limit=0
}else{
 limit =req.query.limit
}
console.log(req.query.page);
let tableName ;
if (req.query.lang == 'en') {
  selectCol= ''
  langcode=''
tableName=''
}else{
tableName =' left join re_properties_translations on re_properties.id=re_properties_translations.re_properties_id'
 langcode= " where lang_code ='"+req.query.lang+"' "
}
const { limits, offsets } = getPagination(offset, limit);

let m_sql="select count(*) as count from re_properties  "+tableName+ langcode+" where  is_featured=1 and moderation_status='approved'  "
   let sql="select * from re_properties  "+tableName+ langcode+" where  is_featured=1 and moderation_status='approved'   order by id LIMIT "+limits+" OFFSET "+ offsets
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

                         const data= { count: myTableRow[0][0].count, rows: myTableRows[0] } ;


                         const results = getPagingData(data, offset, limit);
                         res.send(results);

											 })
                       })

}

exports.locations = (req, res) => {

	let offset ;
	if (!req.query.page) {
	 offset=0
}else{
	 offset =req.query.page
}
let limit ;
if (!req.query.limit) {
 limit=0
}else{
 limit =req.query.limit
}
console.log(req.query.page);
let tableName ;
if (req.query.lang == 'en') {
	selectCol= ''
	langcode=''
tableName=' re_properties left join cities on re_properties.city_id=cities.id '
}else{
tableName ='  re_properties_translations left join cities on re_properties_translations.city_id=cities.id '
 langcode= " where lang_code ='"+req.query.lang+"' "
}
const { limits, offsets } = getPagination(offset, limit);

let m_sql="SELECT cities.*, COUNT(*) as property_count FROM  "+tableName+" GROUP BY city_id "+langcode+" order by cities.id "
let sql="SELECT cities.*, COUNT(*) as property_count FROM  "+tableName+" GROUP BY city_id "+langcode+" order by cities.id "
db.sequelize.query(
													 m_sql, null, {
																	 raw: true
													 }
									 ).then(function (myTableRows) {
										 return res.send({  status: "success", message: "Get Data Successfully", results:myTableRows[0]})

									 })
}
exports.author_details = (req, res) => {

	let sql="select * from re_properties left join re_accounts on re_accounts.id=re_properties.author_id where re_properties.id="+req.body.id
	db.sequelize.query(
														 sql, null, {
																		 raw: true
														 }
										 ).then(function (myTableRows) {
											 return res.send({  status: "success", message: "Get Data Successfully", results:myTableRows[0]})

										 })
}
