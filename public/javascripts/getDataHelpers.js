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

  console.log('url', url)

  fetch(url).then(function(response) {
    if(response.ok){
      return response.json();
    }
    throw new Error(response.statusText);
  }).then(function(data) {

    //Async function for getting realtime data BEFORE displaying any static stop info
    //Need to know if any services are schedules BEFORE displaying that stop
    //This gets realtime data for ALL stops, then iterates through and displays each
    //Async allows us to preserve distance-sorting
    //https://medium.com/@antonioval/making-array-iteration-easy-when-using-async-await-6315c3225838
    async function handleStops (transitStops) {
      const pArray = transitStops.map(async transitStop => {
        var stop_code = mode == "bus" ? transitStop.stop_code : TRAIN_STOP_ABBR[format_train_stop_name(transitStop.stop_name)]
        var url = `/realtime?mode=${ mode }&routeId=${ params['routeId'] }&direction=${ params['direction'] }&stopId=${ stop_code }&allBusses=${ params['allBusses'] }`

        const response = await fetch(url);
        return response.json()
      });

      const realtimeStops = await Promise.all(pArray);

      for(var i=0; i<realtimeStops.length; i++){
        // displayStopData(transitStop,realtime,mode, stopSelectorString = null)
        displayStopData(transitStops[i],realtimeStops[i],mode,null)
      }
      return realtimeStops;
    }//end async function

    handleStops(data['data'])

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