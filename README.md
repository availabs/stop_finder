# stop_finder

REQUIRES 'db_config.json' file in root of project, example is included

Default route ('/') is leaflet map with a default marker and the 10 closest stops to it. Moving the marker will query for the 10 closest stops to the marker. List on sidebar populates with new data. 

stop_id is freqently used in interactive features to select elements

public/index.html is where most of the magic happens, both the HTML and JS
public/stylesheets/style.css is the CSS

bus/stops/:lng/:lat is the actual API call to get the 10 closest bus stops. 


## NJDOT Traveller Information API

#### Nearest Bus Stops 
##### GET ___/bus/stops/:lng/:lat___
This api returns an array of the 15 closest bus stops from NJTRANSIT GTFS data.
##### Response  
__status__ _string_ - 'success' or 'error'.
__data__ _array_ - An array stop objects, each value representing a bus stop, sorted in order from closest to the lat/lng point provided in the request.

##### Transit Stop Object
The transit stop object includes data about the transit stop from NJTRANSIT GTFS. 
__stop_id__ _string_ - GTFS Stop Id
__stop_code__ _string_ - GTFS Stop Code 
__stop_name__ _string_ - GTFS Name of Stop,
__stop_lat__ _number_ - Stop Latitude 
__stop_lon__ _number_ - Stop Longitude
__distance__ _number_ - Distance between request location and stop location in meters.
__route_ids__ _array of strings_ - List of GTFS route ids for bus routes which service this stop 
__route_text_colors__ _array of strings_ (___optional___)-  List of route text colors with array index corresponding to index of route ID, is often blank, depends on GTFS Data.
__route_colors__  _array of strings_ (___optional___)-  List of route colors with array index corresponding to index of route ID, is often blank, depends on GTFS Data.
__route_names__  _array of strings_ (___optional___)-  List of route names with array index corresponding to index of route ID, is often blank, depends on GTFS Data.

___example request___
```https://transitfinder.availabs.org/bus/stops/-73.8238464/42.6795008```
___example response___
```json
{  
   "status":"success",
   "data":[  
      {  
         "stop_id":"28802",
         "stop_code":"26254",
         "stop_name":"RT-17A 223' N OF IRON FORGE RD.",
         "stop_lat":"41.250608000",
         "stop_lon":"-74.311112000",
         "distance":163769.31168766,
         "route_text_colors":[],
         "route_colors":[],
         "route_ids":[  
            "196",
            "197"
         ]
      },
      ...
   ]
}
```
#### Nearest Train Stops 
##### GET ___/train/stops/:lng/:lat___
This api returns an array of the 15 closest train stops from NJTRANSIT GTFS data.
##### Response  
__status__ _string_ - 'success' or 'error'.
__data__ _array_ - An array of tranist stop objects (see above), each value representing a train stop / station, sorted in order from closest to the lat/lng point provided in the request.

___example request___
```https://transitfinder.availabs.org/train/stops/-73.8238464/42.6795008```
___example response___
```json
{  
   "status":"success",
   "data":[  
      {  
         "stop_id":"32906",
         "stop_code":"95065",
         "stop_name":"JERSEY AVE.",
         "stop_lat":"40.476912000",
         "stop_lon":"-74.467363000",
         "distance":1635.923866087,
         "route_text_colors":[  
            null
         ],
         "route_colors":[  
            null
         ],
         "route_ids":[  
            "9"
         ],
         "route_names":[  
            "Northeast Corridor"
         ]
      },
      ...
   ]
}
```
#### Nearest Parking 
##### GET ___/parking/spots/:lng/:lat___
This endpoint returns an array of parking locations within 3 miles of requested location. It pulls  information from the ParkMoblile and ParkWhiz APIs and returns them in a unified parking spot data object. 
##### Response  
_array of parking objects_ - This route returns an array of parking objects

##### Parking Object
The parking object includes data about the location from both ParkWhiz and ParkMobile
__coordinates__ _object_ - contains lon, lat  as numbers.
__distance__ _number_ - Distance between parking and requested location in meters. 
__cost__ _number_ - Simple cost for parking in dollars.
__available__ _boolean_ (___optional___) - Indicating if there are available spots.
__name__ _string_ - Name of the parking location
__address__ _string_ - Street address of the parking location.
__city__ _string_ - City of parking location
__amenities__ _array of strings_ (___optional___) - A list of strings describing available ameneties are parking location. 
__id__  _string_ - Parking location ID from datasource
__img__  _string_ (___optional___) - URL string to image of parking location. 
__datasource__ _string_ - denotes if location came from parkwhiz of parkmobile api

___example request___
```https://transitfinder.availabs.org/parking/spots/-74.453/40.494```
```
[  
   {  
      "coordinates":{  
         "lon":-74.452203,
         "lat":40.49462
      },
      "distance":140,
      "cost":3.3,
      "available":true,
      "name":"Plum St Deck",
      "address":"20 Plum St",
      "city":"New Brunswick",
      "amenities":[  
         "ADA Parking",
         "Covered",
         "Elevator",
         "Height Clearance",
         "Mobile Pass Accepted",
         "Paved",
         "Self Park"
      ],
      "id":132659,
      "img":"https://cnp-assets-production.s3.amazonaws.com/assets/lots/3796/lot_entrance.png",
      "datasource":"parkmobile"
   },
   ...
]
