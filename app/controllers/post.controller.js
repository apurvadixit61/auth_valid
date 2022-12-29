const db = require("../models");

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


const getPagination = (page, size) => {

	const limits = size ? +size : 3;
	const offsets = page ? page * limits : 0;
	return { limits, offsets };
};

function isEmpty(obj) {
	return !obj || Object.keys(obj).length === 0;
}

