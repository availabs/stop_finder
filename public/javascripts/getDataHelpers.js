/*
*
* LEAFLET TAKES COORDS AS: LAT/LNG
* POSTGIS TAKES COORDS AS: LNG/LAT
* Parameter is LAT/LNG in order to work with Leaflet
* Function reverses it when creating URL to get data
*
*/
function getStopData (coords, mode) {
  var url = `${ mode }/stops/${coords[1]}/${coords[0]}`

console.log('<getStopData> url', url)

  //Loading Indicator Card, gets removed when data is displayed
  var loadingIndicator = d3.select("#stops")
    .append('div')
    .attr('class','card stopListEntry loading')
    .attr('id','loading')
      .append('div')
      .attr('class','card-block')

  loadingIndicator
    .append('i')
    .attr("class","loading-icon icon-spinner icon-spin icon-large")

  loadingIndicator
    .append('text')
    .attr('class','loading-text')
    .text('Loading...')

  fetch(url).then(function(response) {
    if(response.ok){
      return response.json();
    }
    throw new Error(response.statusText);
  }).then(function(data) {

// console.log("<getStopData> RESPONSE:", data)
    //Async function for getting realtime data BEFORE displaying any static stop info
    //Need to know if any services are schedules BEFORE displaying that stop
    //This gets realtime data for ALL stops, then iterates through and displays each
    //Async allows us to preserve distance-sorting
    //https://medium.com/@antonioval/making-array-iteration-easy-when-using-async-await-6315c3225838
    async function handleStops (transitStops) {
      const pArray = transitStops.map(async transitStop => {
        var stop_code = ((mode == "bus") ? transitStop.stop_code : TRAIN_STOP_ABBR[format_train_stop_name(transitStop.stop_name)])
        var url = `/realtime?mode=${ mode }&routeId=${ params['routeId'] }&direction=${ params['direction'] }&stopId=${ stop_code }&allBusses=${ params['allBusses'] }`

        const response = await fetch(url);
        return response.json()
      });

      const realtimeStops = await Promise.all(pArray);

// console.log("<getStopData> realtimeStops:",realtimeStops)
      for(var i=0; i<realtimeStops.length; i++){
        // displayStopData(transitStop,realtime,mode, stopSelectorString = null)
        displayStopData(transitStops[i],realtimeStops[i],mode,null)
      }

      //Removes loading Indicator
      d3.select("#loading").remove()
      return realtimeStops;
    }//end async function

    handleStops(data['data'])

  }).catch(function(error) {
    console.log('There has been a problem with your fetch operation: ', "Location Outside of NJ");
  });//end fetch
}//end getData

function getParkingSpots(coords){
  var start_time = new Date()
  var end_time = new Date()
  end_time.setHours(end_time.getHours()+1)

  var startTimeString = start_time.toISOString().substr(0, 19);  
  var endTimeString = end_time.toISOString().substr(0, 19);
  var url = `/parking/spots?lat=${coords[0]}&lng=${coords[1]}`

  console.log('url', url)

  fetch(url).then(function(response) {
    return response.json();
  }).then(function(data) {

    data.map(parkingSpot => {
// console.log("parkingSpot:",parkingSpot);
      displayParkingData(parkingSpot)

      var pCoords =  parkingSpot.coordinates
      var pName = parkingSpot.name

      var pIcon =  L.icon({
            iconUrl: '/img/parking-sign.png',
            //shadowUrl: 'leaf-shadow.png',

            iconSize:     [30, 30], // size of the icon
            iconAnchor:   [15, 15], // point of the icon which will correspond to marker's location
            popupAnchor:  [15, 0] // point from which the popup should open relative to the iconAnchor
        });
      var pmarker = L.marker([pCoords.lat, pCoords.lon], {icon: pIcon,id:parkingSpot.id})
      parkingIcons.push(pmarker)
      pmarker.addTo(map)
    });//end map

    //https://stackoverflow.com/a/16845714
    var group = new L.featureGroup(parkingIcons);
    map.fitBounds(group.getBounds(),{padding:[0,0]}); //Going back and forth with adding some padding in
  });//end fetch 
}

/*
*
* Takes stop_id (stop_code in DB) and selector string
* stop_id is used to get realtime data about that specific stop
*
* cb changes what is done with data
* data is either used to filter out stops without service
* or data is displayed from an on-click 
*
* if data is displayed, selector string is used to select parent div to display data on page
* otherwise, selector string is not used
*
*/ 
function getRealtimeData(transitStop,stopSelectorString,cb,mode){
  if(typeof transitStop == "string"){
    var stop_code = transitStop
  }
  else{
    var stop_code = mode == "bus" ? transitStop.stop_code : TRAIN_STOP_ABBR[format_train_stop_name(transitStop.stop_name)]
  }

  var url = `/realtime?mode=${ mode }&routeId=${ params['routeId'] }&direction=${ params['direction'] }&stopId=${ stop_code }&allBusses=${ params['allBusses'] }`
  if(stopSelectorString){
    console.log(url)    
  }

  //displayStopData(transitStop,realtime,mode, stopSelectorString = null)
  //displayRealtimeData(transitStop,data,mode = null, stopSelectorString)

  fetch(url).then(function(response) {
    return response.json();
  }).then(function(data){
    return cb(transitStop,data,mode, stopSelectorString)
  })//fetch
}