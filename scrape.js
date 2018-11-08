const _ = require("lodash"),
	async = require("async"),
		config = require(__dirname + "/config.js"),
		lib = require(__dirname + "/lib/scraperLib.js"),
		Table = require(__dirname + "/models/base.js").Base,
		cheerio = require("cheerio");


/* BEGIN SCRAPER HERE */
const url = "https://www.seethroughny.net/tools/required/reports/payroll?action=get",
	wiki = new Table("wiki");

/**
 * Leverages the get method from the scraperLib.
 * The get method returns a Promise allowing for a semantically sensical approach for asynchronous logic.
 */
lib.get({
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
		PayYear: [2018, 2008],
		SortBy: "YTDPay DESC",
		current_page: 0,
		result_id: 0,
		url: "/tools/required/reports/payroll?action=get",
		nav_request: 0
	}
}).then((data) => {
	/** Fancy notation for extracting certain object properties as standalone variables */
	let { $, body, response } = data,
	scrape = false;

	if (response.headers["content-type"] && response.headers["content-type"].indexOf("json") > -1) {
		body = JSON.parse(body);
		scrape = true;
	}

	if (scrape) {
		$ = cheerio.load(body.html);
		$("[id^='resultRow']").each(function () {
			const $row = $(this),
				id = $row.attr("id").match(/([0-9]+)$/)[1],
				$expandedRow = $(`#expandRow${id}`),
				person = {
					name: $row.find("td").eq(1).text(),
					employer_agency: $row.find("td").eq(2).text(),
					total_pay: parseFloat($row.find("td").eq(3).text().replace(/[^0-9.]/g, "")),
					subagency_type: $row.find("td").eq(4).text(),
					title: $expandedRow.find(".row").eq(1).find(".col-xs-6").text(),
					rate_of_pay: parseFloat($expandedRow.find(".row").eq(2).find(".col-xs-6").text().replace(/[^0-9.]/g, "")),
					pay_year: $expandedRow.find(".row").eq(3).find(".col-xs-6").text(),
					pay_basis: $expandedRow.find(".row").eq(4).find(".col-xs-6").text(),
					branch_major_category: $expandedRow.find(".row").eq(5).find(".col-xs-6").text(),

				};

			console.log(person);

		});
	}
	// console.log(body);
	// console.log(response.statusCode);
	process.exit();
	return false;

	/* Regular ol' jQuery for getting things */
	const page_title = $("h1").text();

	/* Regular ol' console log for checking the work */
	console.log(page_title);

	const test = [
		{ header: "test1" },
		{ header: "test2" },
		{ header: "test3" },
		{ header: "test4" }
	];

	wiki.create(test).then((results) => {
		console.log(results);
	});
}).catch((err) => {
	/** This is where errors go -- if the get(url) method has an error, it will be handled here */
	console.log(err);
	process.exit();
});