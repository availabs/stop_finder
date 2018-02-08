var express = require('express');
var router = express.Router();

var db = require('../queries');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('hello world');
});

router.get('/map',function(req, res, next) {
  res.sendfile('./public/map.html');
})

router.get('/bus/stops', function(req, res, next) {
  res.send('Your location was not provided.');
})

router.get('/bus/stops/:lnglat', function(req, res, next) {
  res.send('Your full lng/lat was not provided.');
})

router.get('/bus/stops/:lng/:lat',db.getNearbyBusStops);

router.get('/train/stops/:lng/:lat',db.getNearbyTrainStops);

router.all('/realtime',db.getRealtimeData);

module.exports = router;
