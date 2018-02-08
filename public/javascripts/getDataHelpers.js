/*
*
* LEAFLET TAKES COORDS AS: LAT/LNG
* POSTGIS TAKES COORDS AS: LNG/LAT
* Parameter is LAT/LNG in order to work with Leaflet
* Function reverses it when creating URL to get data
*
*/
function getBusStopData (coords) {
  //Closes any open popups
  //Removes old icons
  //Removes list of stops
  //var map = map || null
  if(typeof map !== 'undefined'){
    map.closePopup()
    stopIcons.forEach(icon => {
      map.getPanes().markerPane.removeChild(icon['_icon'])

    })
    d3.select("#stops").selectAll("div").remove()
    stopIcons = []
  }

  var url = `bus/stops/${coords[1]}/${coords[0]}`

  console.log('url', url)

  fetch(url).then(function(response) {
    if(response.ok){
      return response.json();
    }
    throw new Error(response.statusText);
  }).then(function(data) {

    data['data'].forEach((busStop,i) => {

      //displayStopData will also filter out stops that do not have service
      getRealtimeData(busStop.stop_code, null, displayStopData.bind(null,busStop))

    });//end data loop
  }).catch(function(error) {
    console.log('There has been a problem with your fetch operation: ', "Location Outside of NJ");
  });//end fetch
}//end getData


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
function getRealtimeData(stop_id,stopSelectorString,cb){
  var url = `/realtime?routeId=${ params['routeId'] }&direction=${ params['direction'] }&stopId=${ stop_id }&allBusses=${ params['allBusses'] }`
  if(stopSelectorString){
    console.log(url)    
  }

  fetch(url).then(function(response) {
    return response.json();
  }).then(function(data){
    return cb(data,stopSelectorString)
  })//fetch
}