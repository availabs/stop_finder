var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('hello world');
});

router.get('/test', function(req, res, next) {
  res.send('testing');
});

router.get('/stops', function(req, res, next) {
  res.send('Your location was not provided.');
})

router.get('/stops/:latlng', function(req, res, next) {
  res.send('Your full lat/lng was not provided.');
})




router.get('/stops/:lat/:lng', function(req, res, next) {
  var lat = req.params.lat
  var lng = req.params.lng

  var nearbyStops = "Your lat/long is: " + lat + ", " + lng
  res.send(nearbyStops);
});

module.exports = router;
