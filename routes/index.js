var express = require('express');
var router = express.Router();

var db = require('../queries');

/* GET home page. */
router.get('/bus', function(req, res, next) {
  res.sendfile('./public/index.html');
});

router.get('/train', function(req, res, next) {
  res.sendfile('./public/index.html');
});

router.get('/map',function(req, res, next) {
  res.sendfile('./public/map.html');
})

router.get('/parking',function(req,res,next) {
  res.sendfile('./public/parking.html')
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

router.all('/realtime/bus/position', db.getBusPosition);

router.all('/parking/spots',db.getNearbyParking);

router.all('/parking/spots/:lng/:lat',db.getNearbyParking);

module.exports = router;


/*
http://webservices.nextbus.com/service/publicXMLFeed?command=agencyList
<body copyright="All data copyright agencies listed below and NextBus Inc 2018.">
	...
	<agency tag="rutgers-newark" title="Rutgers Univ. Newark College Town Shuttle" shortTitle="Rutgers Newark Shuttle" regionTitle="New Jersey"/>
	<agency tag="rutgers" title="Rutgers University" shortTitle="Rutgers" regionTitle="New Jersey"/>
</body>

http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=rutgers-newark
<body copyright="All data copyright Rutgers Univ. Newark College Town Shuttle 2018.">
	<route tag="kearney" title="Kearney/Harrison"/>
	<route tag="penn" title="Penn Station Local" shortTitle="Penn Sta Local"/>
	<route tag="pennexpr" title="Penn Station Express" shortTitle="Penn Sta Express"/>
	<route tag="mdntpenn" title="Midnight Express Penn Station" shortTitle="Midnight Express"/>
	<route tag="connect" title="Campus Connect"/>
</body>

http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=rutgers
<body copyright="All data copyright Rutgers University 2018.">
	<route tag="kearney" title="Kearney/Harrison"/>
	<route tag="penn" title="Penn Station Local" shortTitle="Penn Sta Local"/>
	<route tag="pennexpr" title="Penn Station Express" shortTitle="Penn Sta Express"/>
	<route tag="mdntpenn" title="Midnight Express Penn Station" shortTitle="Midnight Express"/>
	<route tag="connect" title="Campus Connect"/>
	<route tag="a" title="A"/>
	<route tag="b" title="B"/>
	<route tag="c" title="C"/>
	<route tag="ee" title="EE"/>
	<route tag="f" title="F"/>
	<route tag="h" title="H"/>
	<route tag="lx" title="LX"/>
	<route tag="rexb" title="REX B"/>
	<route tag="rexl" title="REX L"/>
	<route tag="s" title="All Campuses"/>
	<route tag="w1" title="New Brunsquick 1 Shuttle" shortTitle="NB 1 Shuttle"/>
	<route tag="w2" title="New Brunsquick 2 Shuttle" shortTitle="NB 2 Shuttle"/>
	<route tag="wknd1" title="Weekend 1"/>
	<route tag="wknd2" title="Weekend 2"/>
	<route tag="rbhs" title="RBHS/Hospital"/>
	<route tag="housing" title="Housing Shopping Shuttle" shortTitle="Housing Shopping"/>
	<route tag="ccexp" title="Campus Connect Express"/>
</body>

http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=<agency_tag>&r=<route tag>

http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=<agency_tag>&stopId=<stop id>
*/
