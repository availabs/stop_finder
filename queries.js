var promise = require('bluebird');
var jsdom = require("jsdom/lib/old-api.js");
const { JSDOM } = jsdom;
var options = {
  // Initialization Options
  promiseLib: promise
};
var cn = require('./db_config.json')
var pgp = require('pg-promise')(options);
var db = pgp(cn);

function getRealtimeData(req,res,next){
  //console.log("getRealtimeData req params",req.query)

  var mode = req.query.mode != "undefined" ? req.query.mode : "bus"


  if(mode == "bus"){
    var routeId = req.query.routeId != "undefined" ? req.query.routeId : null,
      direction = req.query.direction != "undefined" ? req.query.direction : null,
      stopId = req.query.stopId != "undefined" ? req.query.stopId : null,
      showAllBusses = req.query.allBusses != "undefined" ? req.query.allBusses : null || "on";

    var url = `http://mybusnow.njtransit.com/bustime/wireless/html/eta.jsp?route=---&direction=---&displaydirection=---&stop=---&findstop=on&selectedRtpiFeeds=&id=${ stopId }`

    if(!routeId && !direction && !stopId){
      var scripts = [    
        'http://mybusnow.njtransit.com/bustime/javascript/RtpiFeed.js',
        "http://mybusnow.njtransit.com/bustime/javascript/Utils.js",
        "http://mybusnow.njtransit.com/bustime/javascript/Trace.js",
        "http://mybusnow.njtransit.com/bustime/javascript/Route.js"
      ]
    }
    else{
      var scripts = [
        
      ]
    }

    jsdom.env({
      url: url,
      features: {
          FetchExternalResources: ['script'],
          ProcessExternalResources: ['script']
      },
      scripts:scripts,
      done: function (err, window) {
        window.addEventListener("error", function (event) {
          console.error("script error!!", event.error);
        });

        var stopArray = []

        //If only a stopId is given, just looking for the 'font' tags
        //They display the nearby route + bus combinations
        if(stopId && !direction && !routeId){
          console.log("only stop ID")
          var listItems = window.document.body.childNodes
        }
        else{
          var listItems = window.document.getElementsByTagName("ul")[0].children
        }

        var reachedData = false
        var curRowIndex = 0
        var curRowObj = {}

        Object.keys(listItems).forEach((listItemKey,index) => {
          var curElement = listItems[listItemKey]
          var curNodeName = curElement.nodeName

          if(index == 5){
            stopArray.push({currentTime:curElement.textContent.replace(/(\n|\t|\(|\)|\#)/gm,"").trim().split('Currently: ')[1]})
          }

          if(curNodeName == "HR"){
            reachedData = true
            curRowIndex = 0;
            if(curRowObj["route"]){
              stopArray.push(curRowObj)
              curRowObj = {}
            }
          }

          if(curNodeName == "FONT" && curRowIndex > 1 || (curNodeName == "#text" && listItems[listItemKey].textContent.replace(/\s+/g,""))){
            var textContent = listItems[listItemKey].textContent.replace(/(\n|\t|\(|\)|\#)/gm,"").trim()

            if(curRowIndex == 3){
              curRowObj['description'] = textContent
            }
            if(curRowIndex == 4){
              curRowObj['time'] = textContent
            }
            if(curRowIndex == 2){
              curRowObj['route'] = textContent
            }
            if(curRowIndex == 6){
              curRowObj['bus'] = textContent.split('Vehicle ')[1]
            }
          }

          curRowIndex++;
        })

        res.send(stopArray)
      }
    });
  }
  else{
    var stopId = req.query.stopId != "undefined" ? req.query.stopId : null;

    if(stopId){
      var scripts = []
      var url = `http://dv.njtransit.com/mobile/tid-mobile.aspx?sid=${stopId}`

      jsdom.env({
        url: url,
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script']
        },
        scripts:scripts,
        done: function (err, window) {
          window.addEventListener("error", function (event) {
            console.error("script error!!", event.error);
          });


          var listItems = window.document.getElementsByTagName("tr")

          var serviceArray = []
          //TODO -- this is very ugly, but it gets the last updated time
          var updatedTime = {currentTime: listItems[0].textContent.replace(/(\n|\t|\(|\)|\#)/gm,"").split("Departures ")[1].split("Select")[0].trim()}
          serviceArray.push(updatedTime)
          var color;
          for(var i=2; i<listItems.length; i++){
            var curItems = listItems[i].textContent.split('\n')
                            .map(singleLine => singleLine.trim())
                            .filter(singleLine => singleLine != "")

            //No idea why every line is read twice... but mod 2 solves it.                           
            if(curItems.length == 6 && i%2 == 1){
              //TODO: some stops dont get colors... namely -- ones with routeIds 10 AND 11
              color = window.getComputedStyle(listItems[i], null)['background-color']
              var curService = {
                color:color,
                dep_time: curItems[0],
                to: curItems[1],
                track: curItems[2],
                line: curItems[3],
                train_no: curItems[4],
                status: curItems[5].replace("in ","")
              }    

              serviceArray.push(curService)      
            }

          }          
          res.send(serviceArray)

        }
      })      
    }
    else{
      res.send("No Stop ID Provided")
    }

  
  }


}

// add query functions
function getNearbyBusStops(req, res, next) {
  var lng = req.params.lng
  var lat = req.params.lat

  var query = `
    SELECT 
      gtfs1.stops.stop_id,
      stop_code,
      stop_name,
      stop_lat,
      stop_lon,
      ST_Distance(gtfs1.stops.geom::GEOGRAPHY,st_setsrid(st_makepoint(${ lng },${ lat }),4326)::GEOGRAPHY ) as distance,
      array_agg(DISTINCT route_text_color) as route_text_colors,
      array_agg(DISTINCT route_color) as route_colors,
      array_agg(DISTINCT route_short_name) as route_ids
    FROM 
      gtfs1.stops,
      gtfs1.route_stops,
      gtfs1.routes
    WHERE 
      gtfs1.stops.stop_id = gtfs1.route_stops.stop_id AND 
      gtfs1.routes.route_id = gtfs1.route_stops.route_id
    GROUP BY
      gtfs1.stops.stop_id
    ORDER BY 
      distance
    LIMIT 
      15;
  `

  db.any(query)
    .then(function (data) {
      console.log(data)
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

function getNearbyTrainStops(req, res, next){

  var lng = req.params.lng
  var lat = req.params.lat

  var query = `
    SELECT 
      gtfs_train.stops.stop_id,
      stop_code,
      stop_name,
      stop_lat,
      stop_lon,
      ST_Distance(gtfs_train.stops.geom::GEOGRAPHY,st_setsrid(st_makepoint(${ lng },${ lat }),4326)::GEOGRAPHY ) as distance,
      array_agg(DISTINCT route_text_color) as route_text_colors,
      array_agg(DISTINCT route_color) as route_colors,
      array_agg(DISTINCT route_stops.route_id) as route_ids,
      array_agg(DISTINCT route_long_name) as route_names
    FROM 
      gtfs_train.stops,
      gtfs_train.route_stops,
      gtfs_train.routes
    WHERE 
      gtfs_train.stops.stop_id = gtfs_train.route_stops.stop_id AND 
      gtfs_train.routes.route_id = gtfs_train.route_stops.route_id
    GROUP BY
      gtfs_train.stops.stop_id
    ORDER BY 
      distance
    LIMIT 
      15;
  `

  db.any(query)
    .then(function (data) {
      console.log(data)
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
  getNearbyBusStops: getNearbyBusStops,
  getRealtimeData:getRealtimeData,
  getNearbyTrainStops:getNearbyTrainStops
};