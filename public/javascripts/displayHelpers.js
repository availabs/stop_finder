const MAX_DISPLAYED_STOPS = 10 
const MIN_SCHEDULED_BUSSES = 1
const DATA_TIMEOUT_MINUTES = 5
const DATA_TIMEOUT_MS = 60 * 1000 * DATA_TIMEOUT_MINUTES

const SERVICE_STATUS_TRANSITION_MS = 250
const REFRESH_TRANSITION_MS = 500
const SERVICE_STATUS_HEIGHT = "11.8rem"

//Data from API that will be displayed (subset of those actually retreived)
const DISPLAYED_DATA_KEYS = ['route_ids']

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

  stopHeader.append("div")
    .attr("class","realtimeDataTimestamp")
    .style("float","right")

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
                        .html("<b>"+formattedDataKeys[dataKey]+ ": </b>")

        var svg = dataDiv.append("svg")
          .attr("width", "20rem")
          .attr("height", "1.75rem");

        var groups = svg.selectAll(".groups")
                                  .data(busStop[dataKey])
                                  .enter()
                                  .append("g")
                                  .attr("class", "gbar");

        groups.append('rect')
          .attr("x",function(d,i){return ((i*6) + "rem")})
          .attr("width", function (d) { return "1rem" })
          .attr("height", function (d) { return "2rem" })
          .style("fill", function(d) { return colorScale(d); })

        groups.append('text')
          .text(function(d){return d;})
          .attr("x",function(d,i){return ((i*6) + 1.25 + "rem")})
          .attr('y', "1.75rem")
          .attr("width","2rem")
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

  //Appending the toggle controls to header div
  var toggleCollapseDiv = realtimeContainerDiv
    .append('div')
    .attr("class","toggle_collapse")
    .on('click',() => {

      let currentHeight = d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").style("height")

      if(currentHeight != "2rem" && currentHeight != "1rem"){
        var nextHeight = "2rem"
        var nextVisibility = "hidden"
        var nextOverflowY = "hidden"
        var nextOpacity = "0"
      }
      else{
        var nextHeight = SERVICE_STATUS_HEIGHT
        var nextVisibility = "visible"
        var nextOverflowY = "auto"
        var nextOpacity = "1"
      }

      d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").transition()
        .duration(SERVICE_STATUS_TRANSITION_MS)
        .ease(d3.easeLinear)
        .style("height",nextHeight)
        .style("overflow-y",nextOverflowY)
        .style("overflow-x","hidden")
        .style("opacity",nextOpacity)

      toggleIcon.classed('icon-collapse-top',!toggleIcon.classed('icon-collapse-top'))
      toggleIcon.classed('icon-collapse',!toggleIcon.classed('icon-collapse'))
      d3.event.stopPropagation()
    })

  d3.select(stopSelectorString).select(".realtimeDataTimestamp")
    .text("Last Updated: "+data[0].currentTime)

  var toggleIcon = toggleCollapseDiv.append('i')
    .attr('class','icon-collapse-top toggleCollapseIcon')

  //1st element is always the timestamp, which we already used
  data = data.slice(1)

  data.forEach((row,index) => {
    var realtimeContainerDiv = d3.select(stopSelectorString).select("div.realtimeDataContainer")
      .append('div')
      .attr('class',"card-text realtimeData collapsed "+row['bus'])
      .style('height',"1rem")
      .style("overflow","hidden")
      .style("opacity","0")

    Object.keys(row).forEach(dataKey => {
      realtimeContainerDiv
        .append('p')
          .html("<b>"+formattedDataKeys[dataKey] + ": </b>"+ row[dataKey])             
    })//attribute display loop    
  })//all data loop      
  
  //After 5 minutes, remove the data (as it is likely outdated)
  setTimeout(function(){
    //Remove all realtime data
    realtimeContainerDiv.remove()
    //Reset section that displays timestamp or a button to get data
    d3.select(stopSelectorString).select(".realtimeDataTimestamp")
      .text("Get Service Status")

    d3.select(stopSelectorString).select(".toggleCollapseIcon")
      .attr("class", "icon-collapse toggleCollapseIcon")

  },DATA_TIMEOUT_MS)

  //Creates transition effect when getting new data
  d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").transition()
    .duration(SERVICE_STATUS_TRANSITION_MS)
    .ease(d3.easeLinear)
    .style("height",SERVICE_STATUS_HEIGHT)
    .style("overflow-y","auto")
    .style("overflow-x","hidden")
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