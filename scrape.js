const _ = require("lodash"),
	async = require("async"),
		config = require(__dirname + "/config.js"),
		lib = require(__dirname + "/lib/scraperLib.js"),
		ProgressBar = require("progress"),
		Table = require(__dirname + "/models/base.js").Base,
		cheerio = require("cheerio"),
		moment = require("moment"),
		now = moment();


Number.prototype.zeroPad = function (places) {
	const num = this,
		zero = places - num.toString().length + 1;
	return Array(+(zero > 0 && zero)).join("0") + num;
};


/* BEGIN SCRAPER HERE */
const url = "https://www.seethroughny.net/tools/required/reports/payroll?action=get",
	payroll = new Table("payroll");

let page = 0,
	total_pages = 0,
	records = 0,
	year = 2008,
	max_year = 2018,
	bar = false;

/**
 * Leverages the get method from the scraperLib.
 * The get method returns a Promise allowing for a semantically sensical approach for asynchronous logic.
 */

const scrapePage = (year, page) => {
	return lib.get({
		url: url,
		method: "POST",
		referer: "https://www.seethroughny.net/payrolls",
		headers: {
			// "Host": "www.seethroughny.net",
			// "Connection": "keep-alive",
			// "Content-Length": "137",
			// "Pragma": "no-cache",
			// "Cache-Control": "no-cache",
			// "Accept": "application/json, text/javascript, */*; q=0.01",
			// "Origin": "https://www.seethroughny.net",
			// "X-Requested-With": "XMLHttpRequest",
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.81 Safari/537.36",
			// "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
			"Referer": "https://www.seethroughny.net/payrolls",
			// "Accept-Encoding": "gzip, deflate, br",
			// "Accept-Language": "en-US,en;q=0.9",
			// "Cookie": "_ga=GA1.2.1321475791.1541693273; _gid=GA1.2.1053430368.1541693273; CONCRETE5=e8f7d1e4fef058ee29d0713edc757f58"
		},
		form: {
			PayYear: [year],
			SortBy: "YTDPay DESC",
			current_page: page,
			result_id: 0,
			url: "/tools/required/reports/payroll?action=get",
			nav_request: 0
		}
	});
};

const getPageCount = (year) => {
	return new Promise((resolve, reject) => {
		scrapePage(year, 0).then(({ $, body, response }) => {
			if (response.headers["content-type"] && response.headers["content-type"].indexOf("json") > -1) {
				body = JSON.parse(body);
				resolve(body.total_pages);
			} else {
				reject({ err: "Not JSON" })
			}
		}).catch((err) => {
			reject(err);;
		});
	});
};

const processPage = (year, page) => {
	return scrapePage(year, page).then((data) => {
		/** Fancy notation for extracting certain object properties as standalone variables */
		let { $, body, response } = data,
		scrape = (response.headers["content-type"] && response.headers["content-type"].indexOf("json") > -1),
			people = [];

		if (scrape) {
			body = JSON.parse(body);
			$ = cheerio.load(body.html);
			$("[id^='resultRow']").each(function () {
				const $row = $(this),
					id = $row.attr("id").match(/([0-9]+)$/)[1],
					$expandedRow = $(`#expandRow${id}`),
					name = $row.find("td").eq(1).text().match(/([^,]+),(.+)$/),
					person = {
						first_name: name[2].trim(),
						last_name: name[1].trim(),
						employer_agency: $row.find("td").eq(2).text(),
						total_pay: parseFloat($row.find("td").eq(3).text().replace(/[^0-9.]/g, "")),
						subagency_type: $row.find("td").eq(4).text(),
						title: $expandedRow.find(".row").eq(1).find(".col-xs-6").text(),
						rate_of_pay: parseFloat($expandedRow.find(".row").eq(2).find(".col-xs-6").text().replace(/[^0-9.]/g, "")),
						pay_year: $expandedRow.find(".row").eq(3).find(".col-xs-6").text(),
						pay_basis: $expandedRow.find(".row").eq(4).find(".col-xs-6").text(),
						branch_major_category: $expandedRow.find(".row").eq(5).find(".col-xs-6").text(),
						year: year
					};

				people.push(person);
			});
		}

		records += people.length;
		return payroll.upsert(people);
	});
};

const go = async (year) => {
	const total_pages = await getPageCount(year),
		bar = new ProgressBar(':year | :time | :current of :total pages | :bar :percent', { total: total_pages });

	async.eachLimit(range_array(0, total_pages), 10, (page, nextPage) => {
		processPage(year, page).then((results) => {
			records += results.success.length;
			const diff = moment().diff(now),
				hours = moment.duration(diff).hours().zeroPad(2),
				minutes = moment.duration(diff).minutes().zeroPad(2),
				seconds = moment.duration(diff).seconds().zeroPad(2),
				diffDisplay = `${hours}:${minutes}:${seconds}`;
			bar.tick({
				year: year,
				records: records,
				time: diffDisplay
			});
			nextPage();
		}).catch((err) => {
			/** This is where errors go -- if the get(url) method has an error, it will be handled here */
			console.log(err);
			process.exit();
		});
	}, (err) => {
		if (year < max_year) {
			year++;
			go(year);
		} else {
			console.log("Done!");
			process.exit();
		}
	});
};

const range_array = (min, max) => {
	const list = [];
	for (var i = min; i <= max; i++) {
		list.push(i);
	}

	return list;
};

go(year);