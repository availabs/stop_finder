var promise = require('bluebird');

var options = {
  // Initialization Options
  promiseLib: promise
};
var cn = require('./db_config.json')
var pgp = require('pg-promise')(options);
var db = pgp(cn);

// add query functions
function getNearbyStops(req, res, next) {
  var lng = req.params.lng
  var lat = req.params.lat

  var query = `
    SELECT 
      stop_id,
      stop_code,
      stop_name,
      stop_lat,
      stop_lon
    FROM 
      public.stops
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
  getNearbyStops: getNearbyStops
};