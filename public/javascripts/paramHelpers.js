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

function fixUrl(){
  //Means no mode is specified
  if(window.location.pathname.length == 1){
    var newPath = window.location.protocol + "//" + window.location.host + "/bus" + window.location.search
    history.pushState({}, null,newPath )
  }  
}

function getMode(){
  var mode = window.location.pathname.split("/")[1]

  //Default to bus
  return mode || 'bus'
}

function changeMode(mode){
  var newUrl = window.location.href.replace(/bus|train/,mode)
  window.location.href = newUrl
}

function format_train_stop_name(raw_stop_name){
  //replaces special characters (. and -)
  var formatted_stop_name = raw_stop_name.replace(/-|\./g," ").toLowerCase()
  //replaces ave with avenue
  formatted_stop_name = formatted_stop_name.replace(" ave"," avenue")
  //removes "station"
  formatted_stop_name = formatted_stop_name.replace("station","")
  //trim whitespace
  formatted_stop_name = formatted_stop_name.trim()

  return formatted_stop_name;
}