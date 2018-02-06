const MAX_DISPLAYED_STOPS = 10 
const MIN_SCHEDULED_BUSSES = 1
const DATA_TIMEOUT_MINUTES = 5
const DATA_TIMEOUT_MS = 60 * 1000 * DATA_TIMEOUT_MINUTES

const SERVICE_STATUS_TRANSITION_MS = 250
const REFRESH_TRANSITION_MS = 500
const SERVICE_STATUS_HEIGHT = "15rem"

//Data from API that will be displayed (subset of those actually retreived)
const DISPLAYED_DATA_KEYS = ['route_ids', 'distance']

const DISPLAYED_REALTIME_KEYS = ['description','time','bus']

const DISTANCE_FORMAT = d3.format(".2r")

function displayStopData(busStop,realtime){
  //MIN_SCHEDULED_BUSSES check is less OR EQUAL TO because first data element is ALWAYS timestamp
  if(realtime.length <= MIN_SCHEDULED_BUSSES || d3.selectAll("div.stopListEntry").size() >= MAX_DISPLAYED_STOPS){
    return;
  }

  if(typeof map !== 'undefined'){
    //Creates Icon
    var scoords =[busStop['stop_lat'],busStop['stop_lon']]     
    var sIcon = L.divIcon({ 
      className:'stopIcon ' + busStop.stop_id
    });
    var sMarker = L.marker([scoords[0], scoords[1]], {icon: sIcon,stop_id:busStop.stop_id})

    //Creates Popup
    var popupContent = `${busStop.stop_name}`
    sMarker.bindPopup(popupContent)

    //Onclick function for markers
    sMarker.on('click', e => {
      backgroundColorToggle(busStop.stop_id)
    })

    //Add marker to array of markers and map
    stopIcons.push(sMarker)
    sMarker.addTo(map)
  }

  //If GTFS data does not include colors, we gotta make our own
  if(
    (busStop['route_text_colors'].length == 1 && busStop['route_text_colors'][0] == null) &&
    (busStop['route_colors'].length == 1 && busStop['route_colors'][0] == null)
    ){

    //BASIC COLOR SCALE
    var colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([1,1000]);
  }


  //Add stop to the list of stops
  var parentDiv = d3.select('#stops')
    .append('div')
    .attr('class',"card stopListEntry stop_"+busStop.stop_id)
      .append('div')
      .attr('class',"card-block")


  //Header/Title that has name of stop and stop #
  var stopHeader = parentDiv
                    .append('div')
                    .attr("class","card-title")
                    .style("font-weight", "bold")

  var stopSelectorString  = "div.stop_"+busStop.stop_id
  //Stop Name
  stopHeader
    .append('div')
    .attr("class","stopName")
    .text(busStop.stop_name)
    .on('click',() => {
      if(typeof map !== 'undefined'){
        var clickedStop = stopIcons.filter(stop => stop['options']['stop_id'] == busStop.stop_id)[0]
        clickedStop.openPopup()              
      }

    backgroundColorToggle(busStop.stop_id,stopSelectorString)
    getRealtimeData(busStop.stop_code, stopSelectorString, displayRealtimeData)
  }) 

  //Gets realtime data
  var toggleCollapseDiv = parentDiv
    .append('div')
    .attr("class", "pull-right")
    .attr("class","toggle_collapse")
    .on('click',() => {
      if(!d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData")['_groups'].length){
        backgroundColorToggle(busStop.stop_id,stopSelectorString)
        getRealtimeData(busStop.stop_code, stopSelectorString, displayRealtimeData)
      }

      toggleIcon
        .attr('class','icon-refresh toggleCollapseIcon')
        .on('click',() => {
          d3.event.stopPropagation()

          let currentTransition = d3.select(stopSelectorString).select("div.toggle_collapse").selectAll(".toggleCollapseIcon").style("transform")

          if(currentTransition == "none"){
            var nextTransform = "translate(0, 0)rotate(180deg)"
          }
          else{
            var nextTransform = "translate(0, 0)rotate("+(+currentTransition.split("rotate(")[1].replace(/\D/g, '') + 180) + "deg)"
          }
        
          d3.select(stopSelectorString).select("div.toggle_collapse").selectAll(".toggleCollapseIcon").transition()
            .duration(REFRESH_TRANSITION_MS)
            .ease(d3.easeLinear)
            .style("transform",nextTransform)
          backgroundColorToggle(busStop.stop_id,stopSelectorString)
          getRealtimeData(busStop.stop_code, stopSelectorString, displayRealtimeData)
        })

      d3.event.stopPropagation()
    })


  toggleCollapseDiv.append("div")
    .attr("class","realtimeDataTimestamp")
    .style("height","2.25rem")

  toggleCollapseDiv.append("text")
    .attr("class","realtimeDataTimestamp")
    .text("Get Service Status")

  var toggleIcon = toggleCollapseDiv.append('i')
    .attr('class','icon-collapse toggleCollapseIcon')

  //Add desired data to list
  Object.keys(busStop).forEach(dataKey => {
    if(DISPLAYED_DATA_KEYS.includes(dataKey)){
      //Special stuff for route Ids, since we are adding colors and have to iterate over the data
      if(dataKey == "route_ids"){
        var dataDiv = parentDiv
                        .append('div')
                        .attr("class","card-block stopListData")

        /*
         * Get color (black/white) depending on bgColor so it would be clearly seen.
         * @param bgColor
         * @returns {string}
         * https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
         */
        function getColorByBgColor(bgColor) {
            if (!bgColor) { return ''; }
            return (parseInt(bgColor.replace('#', ''), 16) > 0xffffff / 2) ? '#000' : '#fff';
        }

        busStop[dataKey].forEach(routeId => {
          dataDiv
            .append('span')
            .attr("class", "route-number")
            .style("background-color",colorScale(routeId) )
            .style("color",getColorByBgColor(colorScale(routeId)))
            .text(routeId)

        })
      }
      else if(dataKey == "distance"){
        //Converts from meters (from DB) to miles
        var displayedDistance = busStop[dataKey] / 1609
        var unit = " mi"

        //If somehow they are 100 miles away from a stop, this deal with rounding/number formatting issues
        if(displayedDistance >= 100){
          var unit = "+ mi"
        }
        //If under 1/3 mile, display in feet
        if(displayedDistance < .33){
          var displayedDistance = displayedDistance * 5280
          var unit = " ft"
        }

        parentDiv
          .append('text')
            .attr("class","card-block stopListData distance")
            .text(DISTANCE_FORMAT(displayedDistance) + unit)  
      }
      else{
        parentDiv
          .append('div')
            .attr("class","card-block stopListData")
            .html("<b>"+formattedDataKeys[dataKey] + ": </b>"+ busStop[dataKey])           
      }
    }
  })//end iterating over stop properties
}//displayStopData

function displayRealtimeData(data,stopSelectorString){
  //Remove old real-time data
  d3.select(stopSelectorString).select("div.realtimeDataContainer").remove()

  var realtimeContainerDiv = d3.select(stopSelectorString)
    .append('div')
    .attr('class',"realtimeDataContainer card-block")
    .style("max-height", SERVICE_STATUS_HEIGHT)
    .style("overflow","auto")

  //Appending the toggle controls to header div
  var toggleCollapseDiv = realtimeContainerDiv
    .append('div')
    .attr("class","toggle_collapse")
    .on('click',() => {
      let currentHeight = d3.select(stopSelectorString).select("div.realtimeDataContainer").style("max-height")

      if(currentHeight != "3rem" && currentHeight != "1rem"){
        var nextHeight = "3rem"
        var nextOpacity = "0"
        var nextOverflow = "hidden"

        var nextDataHeight = "0"
        var nextDataWidth = "0"
      }
      else{
        var nextHeight = SERVICE_STATUS_HEIGHT

        var nextOpacity = "1"
        var nextOverflow = "auto"
      
        var nextDataHeight = SERVICE_STATUS_HEIGHT
        var nextDataWidth = ""
      }

      d3.select(stopSelectorString).select("div.realtimeDataContainer").transition()
        .duration(SERVICE_STATUS_TRANSITION_MS)
        .ease(d3.easeLinear)
        .style("max-height",nextHeight)
        .style("overflow",nextOverflow)

      d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").transition()
        .duration(SERVICE_STATUS_TRANSITION_MS)
        .ease(d3.easeLinear)
        .style("opacity",nextOpacity)
        .style("width",nextDataWidth)

      toggleIcon.classed('icon-collapse-top',!toggleIcon.classed('icon-collapse-top'))
      toggleIcon.classed('icon-collapse',!toggleIcon.classed('icon-collapse'))
      d3.event.stopPropagation()
    })

  d3.select(stopSelectorString).select(".realtimeDataTimestamp")
    .html("<b>Last Updated: "+data[0].currentTime+"</b>")

  /*
  * 
  * Parses last-updated time to use when displaying ETA
  *
  */
  var updatedTime = data[0].currentTime.split(" ")[0]
  var amPmTag = data[0].currentTime.split(" ")[1]
  if(amPmTag == "PM"){
    updatedTime = (+updatedTime.split(":")[0] + 12) +":"+ updatedTime.split(":")[1]
  }


  var toggleIcon = toggleCollapseDiv.append('i')
    .attr('class','icon-collapse-top toggleCollapseIcon')

  //1st element is always the timestamp, which we already used
  data = data.slice(1)

  data.forEach((row,index) => {
    var realtimeContainerDiv = d3.select(stopSelectorString).select("div.realtimeDataContainer")
      .append('div')
      .attr('class',"card-text realtimeData "+row['bus'])
      .style('max-height',"1rem")
      .style("opacity","0")

    Object.keys(row).forEach(dataKey => {
      if(DISPLAYED_REALTIME_KEYS.includes(dataKey)){
        if(dataKey == "time"){
          var parseHour = d3.timeParse("%I:%M")

          if(row[dataKey] == "DELAYED"){
            realtimeContainerDiv
              .append('p')
                .attr("class","shrink")
                .html(row[dataKey])  
          }
          else{
            //Means that the ETA is listed as "< 1 min"
            if(row[dataKey].indexOf("<") != -1){
              var timeEtaString = updatedTime
            }
            else{
              //Otherwise, get the minutes from ETA, add to last updated time
              var minutesEta = row[dataKey].split("MIN")[0]

              var timeEta = d3.timeMinute.offset(parseHour(updatedTime), minutesEta)  

              var etaMinutes = timeEta.getMinutes() < 10 ? "0" + timeEta.getMinutes() : timeEta.getMinutes()          
              var etaHours = timeEta.getHours() == 0 ? "12" : timeEta.getHours()
              var timeEtaString = etaHours + ":" + etaMinutes
            }

            realtimeContainerDiv
              .append('p')
                .attr("class","shrink")
                .html(timeEtaString + " " + amPmTag + " ("+row[dataKey]+")")               
          }


        }
        else if(dataKey == "description"){
          realtimeContainerDiv
            .append('p')
              .html(row[dataKey])         
        }
        else{
          realtimeContainerDiv
            .append('p')
              .attr("class","shrink")
              .html(formattedDataKeys[dataKey] + "" + row[dataKey])            
        }
      }//check for which data keys to display    
    })//attribute display loop    
  })//all data loop      

  //Creates transition effect when getting new data
  d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").transition()
    .duration(SERVICE_STATUS_TRANSITION_MS)
    .ease(d3.easeLinear)
    .style("max-height",SERVICE_STATUS_HEIGHT)
    .style("opacity","1")
}//end displayRealtimeData

//Removes all old highlighted stops (in list-div)
//Highlights the corresponding "stop_id" 
function backgroundColorToggle(stop_id,stopSelectorString){
  d3.select("#stops").selectAll("div.stopListEntry").transition()
    .duration(REFRESH_TRANSITION_MS)
    .ease(d3.easeLinear)
    .style("background-color","#efefef")

  d3.select(stopSelectorString).transition()
    .duration(REFRESH_TRANSITION_MS)
    .ease(d3.easeLinear)
    .style("background-color","white")  
}