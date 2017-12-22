var promise = require('bluebird');
var cheerio = require('cheerio')
var Curl = require( 'node-libcurl' ).Curl;
var jsdom = require("jsdom/lib/old-api.js");
const { JSDOM } = jsdom;
var serializeDocument = require("jsdom/lib/old-api.js").serializeDocument;
var options = {
  // Initialization Options
  promiseLib: promise
};
var cn = require('./db_config.json')
var pgp = require('pg-promise')(options);
var db = pgp(cn);

function testParse(req,res,next){
  jsdom.env({
    url: "http://mybusnow.njtransit.com/bustime/wireless/html/home.jsp",
    features: {
        FetchExternalResources: ['script'],
        ProcessExternalResources: ['script']
    },
    scripts:[
    'http://mybusnow.njtransit.com/bustime/javascript/RtpiFeed.js',
    "http://mybusnow.njtransit.com/bustime/javascript/Utils.js",
    "http://mybusnow.njtransit.com/bustime/javascript/Trace.js",
    "http://mybusnow.njtransit.com/bustime/javascript/Route.js",
    "http://code.jquery.com/jquery.js"
    ],
    done: function (err, window) {
      console.log("done");
      window.addEventListener("error", function (event) {
        console.error("script error!!", event.error);
      });


      var stopArray = []
      /*
      *
      * USING VANILLA
      *
      */
      var listItems = window.document.getElementById("routeDiv").children[0].children
      Object.keys(listItems).forEach(listItemKey => {
        //console.log(listItems[listItemKey].textContent)
        stopArray.push(listItems[listItemKey].textContent)
      })

      /*
      *
      * USING JQUERY
      *
      */
      // var $ = window.$
      // $("ul").find('li').each((index,element) => {
      //  //console.log($(element).text())
      //  stopArray.push($(element).text())
      // })

      res.send(stopArray)
    }
  });

  /*
  * cURL section
  */

  // var curl = new Curl();

  // curl.setOpt( 'URL', "http://mybusnow.njtransit.com/bustime/wireless/html/home.jsp" );
  // curl.setOpt( 'FOLLOWLOCATION', true );

  // curl.on( 'end', function( statusCode, body, headers ) {

  /*
  *
  * cURL PLUS jsdom -- using jsdom.jsdom
  *
  */

  //   var doc = jsdom.jsdom(body, {
  //     scripts:[
  //     'http://mybusnow.njtransit.com/bustime/javascript/RtpiFeed.js',
  //     "http://mybusnow.njtransit.com/bustime/javascript/Utils.js",
  //     "http://mybusnow.njtransit.com/bustime/javascript/Trace.js",
  //     "http://mybusnow.njtransit.com/bustime/javascript/Route.js"
  //     ],
  //     onLoad:function(err,myWindow){
  //       console.log(err)
  //       console.log("ONLOAD")
  //     },
  //     done:function(err,doneWindow){
  //       console.log("DONE")
  //     },
  //     created:function(err,window){
  //       console.log(err)
  //       console.log("TESTING",window.document)
  //       window.addEventListener("error", function (event) {
  //   console.error("script error!!", event.error);
  // });
  //     },
  //   });
  //   //var window = doc.defaultView;
  //   console.log("FAkE",doc.defaultView)


  /*
  *
  * cURL PLUS cheerio
  * cheerio can't wait for scripts to load so it doesn't really work for us.
  *
  */

  //   // var $ = cheerio.load(body);


  //   // console.log($.html('ul'))
  //   // console.log($.html('head'))
  //   //   console.info( "ryan status from njstransit",statusCode );
  //     // console.info( '---' );
  //     // console.info( body );
  //     // console.info( '---' );
  //     // console.info( this.getInfo( 'TOTAL_TIME' ) );

  //     this.close();
  // });

  // curl.on( 'error', curl.close.bind( curl ) );
  // curl.perform();

}


// add query functions
function getNearbyStops(req, res, next) {
  var lng = req.params.lng
  var lat = req.params.lat

  var query = `
    SELECT 
      gtfs1.stops.stop_id,
      stop_code,
      stop_name,
      stop_lat,
      stop_lon,
      array_agg(route_id) as route_ids
    FROM 
      gtfs1.stops,
      gtfs1.route_stops
    WHERE 
      gtfs1.stops.stop_id = gtfs1.route_stops.stop_id
    GROUP BY
      gtfs1.stops.stop_id
    ORDER BY 
      geom <-> st_setsrid(st_makepoint(${ lng },${ lat }),4326)
    LIMIT 
      10;
  `

  db.any(query)
    .then(function (data) {
      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Your Lng/Lat was: '+ lng + ", " + lat
        });
    })
    .catch(function (err) {
      return next(err);
    });
}


module.exports = {
  getNearbyStops: getNearbyStops,
  testParse:testParse
};