var promise = require('bluebird');
var jsdom = require("jsdom/lib/old-api.js");
const fetch = require('node-fetch');

var train_stop_abbr = require('./train_stop_abbr')




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

// console.log("\n<getRealtimeData> START:", req.query, "\n");
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

        var curRowIndex = 0
        var curRowObj = {}

// console.log("<getRealtimeData> url:",url)

        Object.keys(listItems).forEach((listItemKey,index) => {
          var curElement = listItems[listItemKey]
          var curNodeName = curElement.nodeName

          if(index == 5){
            stopArray.push({currentTime:curElement.textContent.replace(/(\n|\t|\(|\)|\#)/gm,"").trim().split('Currently: ')[1]})
          }

          if(curNodeName == "HR"){
// console.log("\nHR\n")
            curRowIndex = 0;
            if(curRowObj["route"]){
              stopArray.push(curRowObj)
              curRowObj = {}
            }
          }

          // if(curNodeName == "FONT" && curRowIndex > 1 || (curNodeName == "#text" && curElement.textContent.replace(/\s+/g,""))){
            var textContent = curElement.textContent.trim().replace(/\s+/g, " ")

// console.log("WTF???",curRowIndex, textContent)
            if (/^[#](\d+)$/.test(textContent)) {
              const match = /^[#](\d+)$/.exec(textContent);
              curRowObj['route'] = match[1];
            }
            if (/^To \d+ .+$/.test(textContent)) {
              curRowObj['description'] = textContent;
            }
            if (/^\d+ MIN/.test(textContent)) {
              curRowObj['time'] = textContent;
            }
            if (/^[(]Vehicle (\d+)[)]$/.test(textContent)) {
              const match = /^[(]Vehicle (\d+)[)]$/.exec(textContent)
              curRowObj['bus'] = match[1];
            }
            // if(curRowIndex == 2){
            //   curRowObj['route'] = textContent
            // }
            // if(curRowIndex == 3){
            //   curRowObj['description'] = textContent
            // }
            // if(curRowIndex == 4){
            //   curRowObj['time'] = textContent
            // }
            // if(curRowIndex == 6){
            //   curRowObj['bus'] = textContent.split('Vehicle ')[1]
            // }
          // }

          curRowIndex++;
        })

console.log("<getRealtimeData> DONE: stopArray:",stopArray)
        res.send(stopArray)
      }
    });
  }
  else{
    var stopId = req.query.stopId != "undefined" ? req.query.stopId : null;

    if(stopId){
      var scripts = []
      var url = `http://dv.njtransit.com/mobile/tid-mobile.aspx?sid=${stopId}`
      console.log('realtime url', url)
      jsdom.env({
        url: url,
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script']
        },
        scripts:scripts,
        done: function (err, window) {
          //console.log('err',err,window.document.getElementsByTagName('div') )
          
          var serviceArray = []
          if (err) {  
            return res.send(serviceArray)
          } else {
            var listItems = window.document.getElementsByTagName("tr")
            if(listItems.length > 0){

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
                  //console.log("?????????",req.query,curService);
                  serviceArray.push(curService)      
                }//End of mod 2 conditional that pushes data to result array
              }//End of for loop that iterates over table rows
            }
            res.send(serviceArray)
          }
        }//End of callback for jsdom
      })//Closes jsdom call
    }//end of stopid conditional
    else{
      res.send("No Stop ID Provided")
    }
  }
}//end of getRealtimeData

function getBusPosition(req,res,next){

  var routeId = req.query.route,
      busId = req.query.bus

      var scripts = []

  var url = `http://mybusnow.njtransit.com/bustime/map/getBusesForRoute.jsp?route=${ routeId }`

  jsdom.env({
    url: url,
    features: {
        FetchExternalResources: ['script'],
        ProcessExternalResources: ['script']
    },
    scripts:scripts,
    done: function (err, window) {
      var allStops = window.document.children

      for(var i=0;i<allStops.length;i++){

        for(var j=0;j<allStops[i].children.length;j++){
          let grandChild = allStops[i].children[j].innerHTML
          let grandChildId = grandChild.substring(grandChild.lastIndexOf("<id>")+4,grandChild.lastIndexOf("</id>"))

          if(grandChildId == busId){
            var lat = grandChild.substring(grandChild.lastIndexOf("<lat>")+5,grandChild.lastIndexOf("</lat>"))
            var lon = grandChild.substring(grandChild.lastIndexOf("<lon>")+5,grandChild.lastIndexOf("</lon>"))
          }
          else{
            console.log("YOU ARE NOT THE BUS",grandChildId)
          }
        }
      }
      var busLatLon = {lat:lat,lng:lon}
      res.send(busLatLon)
    }//end of 'done'
  })
}

function getPwCoordinates(data) {
  const loc = data._embedded["pw:location"].entrances[0].coordinates
  return {
    lat: loc[0],
    lon: loc[1]
  }
}
function getPwDistance(data) {
  return data.distance.straight_line.meters;
}
function getPwCost(data) {
  return +data.price.USD;
}
function getPwAvailability(data) {
console.log("<getPwAvailability>",data.space_availability.status)
  const status = data.space_availability.status;
  return (status === "available") || (status === "limited");
}
function getPwName(data) {
  return data._embedded["pw:location"].name;
}
function getPwAddress(data) {
  return data._embedded["pw:location"].address1;
}
function getPwCity(data) {
  return data._embedded["pw:location"].city;
}
function getPwAmenities(data) {
  let amenities = data.amenities,
    services = [];

  amenities && amenities.forEach(a => {
    if (a.enabled || a.visible) {
      services.push(a.name);
    }
  })
  return services;
}
function getPwId(data) {
  return data.location_id;
}
function getPwImage(data) {
  const photos = data._embedded["pw:location"].photos;
// console.log("PHOTOS:",photos)
  let url = photos.length ? photos[0].sizes.original.URL : null;
  if (/placeholder/.test(url)) {
    url = null;
  }
  return url;
}
function processParkwhizData(data) {
// console.log("parkwhizData")
// console.log(JSON.stringify(data, null, 3));

  const returnData = [],
    baseObj = {};

  baseObj.coordinates = getPwCoordinates(data);
  baseObj.distance = getPwDistance(data);
  baseObj.name = getPwName(data);
  baseObj.address = getPwAddress(data);
  baseObj.city = getPwCity(data);
  baseObj.id = getPwId(data);
  baseObj.img = getPwImage(data);
  baseObj.heightRestriction = false;
  baseObj.datasource = 'parkwhiz'

  data.purchase_options && data.purchase_options.forEach(po => {
    let obj = {};

    obj.bookable = true;
    obj.cost = getPwCost(po);
    obj.amenities = getPwAmenities(po);
    obj.available = getPwAvailability(po);

    returnData.push({ ...baseObj, ...obj });
  })

  data.non_bookable_options && data.non_bookable_options.forEach(nbo => {
    let obj = {};

    obj.bookable = false;
    obj.cost = getPwCost(nbo);
    obj.amenities = [];
    obj.available = true;

    returnData.push({ ...baseObj, ...obj });
  })
  return returnData;
}
function processParkWhizEntrances(processedData, res) {
  if (res.status !== 404) {
    let height = processedData.heightRestriction || -Infinity
    res.entrances.forEach(entrance => {
      if (entrance.max_dimensions) {
        height = Math.max(height, +entrance.max_dimensions.inches.height);
      }
    })
    processedData.heightRestriction = (height > -Infinity) ? height : false;
  }
  return processedData;
}

function getPmCoordinates(data) {
  return {
    lon: data.gpsPoints[0].longitude,
    lat: data.gpsPoints[0].latitude
  }
}
function calcPmDistance(location, lat2, lng2) {
  let TO_RAD = Math.PI / 180.0,
      EARTH_MEAN_RADIUS = 6371000.0;

  let lat1 = location.lat, lng1 = location.lon;

  let theta1 = lat1 * TO_RAD,
      theta2 = lat2 * TO_RAD,
      deltaTheta = (lat2 - lat1) * TO_RAD,
      delatLambda = (lng2 - lng1) * TO_RAD,

      a = Math.sin(deltaTheta * 0.5) * Math.sin(deltaTheta * 0.5) +
        Math.cos(theta1) * Math.cos(theta2) *
        Math.sin(delatLambda * 0.5) * Math.sin(delatLambda * 0.5),

      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),

      d = EARTH_MEAN_RADIUS * c;

    return Math.round(d);
}
function getPmCost(data) {
  return +data.zoneInfo.lotQuote.totalCost;
}
function getPmAvailability(data) {
  return data.zoneInfo.lotQuote.available;
}
function getPmName(data) {
  return data.locationName;
}
function getPmAddress(data) {
  return data.zoneInfo.street;
}
function getPmCity(data) {
  return data.zoneInfo.city;
}
function getPmAmenities(data) {
  return data.zoneServices.filter(s => s.code !== "HEIGHT").map(s => s.name);
}
function getPmId(data) {
  return data.zoneId;
}
function getPmImage(data) {
  let photos = data.zoneCustomImages;
  return photos.length ? photos[0].s3Url : null;
}
function getPmHeightRestriction(data) {
  let hc = false;
  const heightClearance = data.zoneServices.reduce((a, c) => c.code === "HEIGHT" ? c : a, null);
  if (heightClearance) {
    const regex = /^(\d+)['](\d*)["]*$/,
      match = regex.exec(heightClearance.value);
    if (match) {
      const feet = match[1],
        inches = match[2];
      hc = +feet * 12;
      if (inches) {
        hc += +inches;
      }
    }
  }
  return hc;
}
function processParkmobileData(data, lat, lon) {
// console.log("<processParkmobileData>")
// console.log(JSON.stringify(data, null, 3));
  let obj = {};
  obj.coordinates = getPmCoordinates(data)
  obj.distance = calcPmDistance(obj.coordinates, lat, lon);
  obj.cost = getPmCost(data);
  obj.available = getPmAvailability(data);
  obj.name = getPmName(data);
  obj.address = getPmAddress(data);
  obj.city = getPmCity(data);
  obj.amenities = getPmAmenities(data);
  obj.id = getPmId(data);
  obj.img = getPmImage(data);
  obj.datasource = 'parkmobile'
  obj.bookable = false;
  obj.heightRestriction = getPmHeightRestriction(data);
  return obj;
}

function getNearbyParking(req, res, next){
  var lat = req.query.lat || req.params.lat,
      lng = req.query.lng || req.params.lng

console.log("<getNearbyParking> lat / lng", lat, lng);

//   getNearbyParkWhiz(lat,lng)
//     .then(function(parkWhizData) {
//       let processedData = [];
//       parkWhizData.forEach(pwData => {
//         processedData = processedData.concat(processParkwhizData(pwData))
//       })
//       processedData = processedData.sort((a, b) => a.distance - b.distance).slice(0, 10)
//       const promises = processedData.map(d => {
// /*
//   The multiple URLs are required because the location_ids returned by ParkWhiz are
//   not correct. Sometimes, a location_id is returned in the following form: \d+_\d+,
//   where \d+ denotes a string of variable length digits. The actual location_id can
//   reside on EITHER side of the underscore...
// */
//         let urls = [`https://api.parkwhiz.com/v4/locations/${ d.id }?fields=id,entrances`];
//         const regex = /^(\d+)[_](\d+)$/;
//         if (regex.test(d.id)) {
//           const match = regex.exec(d.id)
//           urls.push(
//             `https://api.parkwhiz.com/v4/locations/${ match[1] }?fields=id,entrances`,
//             `https://api.parkwhiz.com/v4/locations/${ match[2] }?fields=id,entrances`
//           )
//         }
//         return Promise.all(urls.map(url => {
//           return fetch(url)
//             .then(res => res.json())
//             .then(res => {
//               processParkWhizEntrances(d, res);
//             })
//         }))
//       })
//       Promise.all(promises)
//         .then(() => {
          getNearyParkMobile(lat, lng)
            .then(function(parkMobileData) {
              let pmZones = parkMobileData.zones,
                promises = pmZones.map(z => getDetailedParkMobile(z.internalZoneCode))
              Promise.all(promises)
                .then(values => {
                  const processedData = [];
                  values.forEach(v => {
                    v.zones.forEach(z => processedData.push(processParkmobileData(z, lat, lng)));
                  })
                  res.send(processedData
                            .filter(d => d.address)
                            .sort((a, b) => a.distance - b.distance)
                            .slice(0, 10)
                  )
                });
            });
    //     })
    // })
}

function getNearbyParkWhiz(lat, lng) {
  const DISTANCE_THRESHOLD = 10 //In miles
  const MAX_NUM_PARKING = 10 // return a max of N places to park

  var start_time = new Date()
  var end_time = new Date()
  end_time.setHours(end_time.getHours()+1)

  var startTimeString = start_time.toISOString().substr(0, 19);  
  var endTimeString = end_time.toISOString().substr(0, 19);

  var url = `https://api.parkwhiz.com/v4/quotes/?q=coordinates:${lat},${lng} distance:${DISTANCE_THRESHOLD}&start_time=${startTimeString}&end_time=${endTimeString}&sort=distance:asc&option_types=all&api_key=62d882d8cfe5680004fa849286b6ce20`
// console.log("<getNearbyParkWhiz>",url)

  return fetch(url)
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      return data//.slice(0, MAX_NUM_PARKING);
    });//end fetch
}
function getNearyParkMobile(lat, lon) {
  var upper = getUpper(lat, lon),
    lower = getLower(lat, lon),

    startDate = new Date(),
    endDate = new Date();
  endDate.setHours(endDate.getHours()+1);

  var startDateStr = startDate.toISOString().slice(0, 16),
    endDateStr = endDate.toISOString().slice(0, 16);

  var url = `https://app.parkmobile.io/api/search/zones/reservation?maxResults=20&upperPoint=%7BLat:${ upper.lat },Lon:${ upper.lon }%7D&centerPoint=%7BLat:${ lat },Lon:${ lon }%7D&lowerPoint=%7BLat:${ lower.lat },Lon:${ lower.lon }%7D&StartDate=${ startDateStr }&EndDate=${ endDateStr }&includeServices=true`
console.log("<getNearyParkMobile> url:",url)
  return fetch(url).then(function(response) { return response.json(); })
}
function getDetailedParkMobile(internalZoneCode) {
  var startDate = new Date(),
    endDate = new Date();
  endDate.setHours(endDate.getHours()+1);

  var startDateStr = startDate.toISOString().slice(0, 16),
    endDateStr = endDate.toISOString().slice(0, 16);

  var url = `https://app.parkmobile.io/api/zone/${ internalZoneCode }?ParkingActionType=2&StartDate=${ startDateStr }&EndDate=${ endDateStr }`;
// console.log("<getDetailedParkMobile> url:",url);
  return fetch(url).then(function(response) { return response.json(); })
}
function getUpper(lat, lon) {
  return {
    lat: +lat + (0.2),
    lon: +lon + (0.2)
  }
}
function getLower(lat, lon) {
  return {
    lat: +lat - (0.2),
    lon: +lon - (0.2)
  }
}
// upperPoint= Lat:40.50393676481472,Lon:-74.43124089243776
// centerPoint=Lat:40.49388561191413,Lon:-74.44875035288698
// lowerPoint=Lat:40.48383295317215,Lon:-74.4662598133362


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
      console.log(train_stop_abbr)
      data = data.map(d => {
        console.log('d.stop_name.toLowerCase()', d.stop_name.toLowerCase(), train_stop_abbr[d.stop_name.toLowerCase()])
        d.stop_abbr = train_stop_abbr[format_train_stop_name(d.stop_name)] || '';
        return d
      })
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
  getNearbyTrainStops:getNearbyTrainStops,
  getBusPosition:getBusPosition,
  getNearbyParking:getNearbyParking
};


function format_train_stop_name(raw_stop_name){
  //replaces special characters (. and -)
  var formatted_stop_name = raw_stop_name.replace(/-|\./g," ").toLowerCase()
  //replaces ave with avenue
  formatted_stop_name = formatted_stop_name.replace(" ave"," avenue")
  //removes "station"
  formatted_stop_name = formatted_stop_name.replace("station","")
  //Changes 'ny' to 'new york'
  formatted_stop_name = formatted_stop_name.replace("ny","new york")
  //Changes 'nj' to new york
  formatted_stop_name = formatted_stop_name.replace("nj","new jersey")
  //trim whitespace
  formatted_stop_name = formatted_stop_name.trim()

  return formatted_stop_name;
}