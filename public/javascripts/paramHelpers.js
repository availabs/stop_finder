function getSearchParameters() {
  var prmstr = window.location.search.substr(1);
  return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray( prmstr ) {
  var params = {};
  var prmarr = prmstr.split("&");
  for ( var i = 0; i < prmarr.length; i++) {
      var tmparr = prmarr[i].split("=");
      params[tmparr[0]] = tmparr[1];
  }
  return params;
}

//Checks to make sure either bus or train is specified, and adds 'bus' if neither is specified
function fixUrlMode(){
  //Means no mode is specified
  if(window.location.pathname.length == 1){
    var newPath = window.location.protocol + "//" + window.location.host + "/bus" + window.location.search
    history.pushState({}, null,newPath )
  }  
}

//Sets lat/lng in URL 
function setUrlLocation(location){
  console.log("setUrlLocation",window.location)
  var newUrl = `${window.location.origin}${window.location.pathname}?lng=${location[1]}&lat=${location[0]}`
  console.log(newUrl)
    history.pushState({}, null,newUrl )
}

//Retreives transportation mode from URL
function getMode(){
  var mode = window.location.pathname.split("/")[1]

  //Default to bus
  return mode || 'bus'
}

//Changes mode, causes page refresh
function changeMode(mode){
  var newUrl = window.location.href.replace(/bus|train/,mode)
  window.location.href = newUrl
}

//Some hardcoded fixes to train station names to work with their API
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