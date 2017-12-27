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

router.get('/stops', function(req, res, next) {
  res.send('Your location was not provided.');
})

router.get('/stops/:lnglat', function(req, res, next) {
  res.send('Your full lng/lat was not provided.');
})

router.get('/stops/:lng/:lat',db.getNearbyStops);

router.get('/realtime',function(req,res,next){
  res.sendfile('./public/realtime.html');
})

router.all('/testparse',db.testParse);

module.exports = router;
