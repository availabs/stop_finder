const MAX_DISPLAYED_STOPS = 10 
const MIN_SCHEDULED_BUSSES = 1

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


  //Stop Name
  stopHeader
    .append('span')
    .text(busStop.stop_name)
    .on('click',() => {
      if(typeof map !== 'undefined'){
        var clickedStop = stopIcons.filter(stop => stop['options']['stop_id'] == busStop.stop_id)[0]
        clickedStop.openPopup()              
      }

    var stopSelectorString  = "div.stop_"+busStop.stop_id
    backgroundColorToggle(busStop.stop_id,stopSelectorString)

    getRealtimeData(busStop.stop_code, stopSelectorString, displayRealtimeData)
  })

  //Stop Code
  stopHeader
    .append('span')
    .attr("class", "pull-right")
    .html("<b>Stop #:</b>"+ busStop["stop_code"])    

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
          .attr("x",function(d,i){return ((i*4.5) + "rem")})

          .attr('y', ".5rem")
          .attr("width", function (d) { return "1rem" })
          .attr("height", function (d) { return "1.25rem" })
          .style("fill", function(d) { return colorScale(d); })

        groups.append('text')
          .text(function(d){return d;})
          .attr("x",function(d,i){return ((i*4.5) + 1.1 + "rem")})
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

  //Appending header div to conatiner
  var realtimeHeaderDiv = realtimeContainerDiv.append("div")
    .attr("class","card-title realtimeDataHeader")

  realtimeHeaderDiv.append('text')
    .text('Service Status')

  //Appending the toggle controls to header div
  var toggleCollapseDiv = realtimeHeaderDiv
    .append('div')
    .attr("class","toggle_collapse")
    .on('click',() => {
      d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData")
        .classed("collapse",function(d,i){
          return !d3.select(this).classed("collapse")
        })

        toggleIcon.classed('icon-collapse-top',!toggleIcon.classed('icon-collapse-top'))
        toggleIcon.classed('icon-collapse',!toggleIcon.classed('icon-collapse'))
        d3.event.stopPropagation()
    })

  toggleCollapseDiv.append("text")
    .attr("class","realtimeDataTimestamp")
    .text(data[0].currentTime)

  var toggleIcon = toggleCollapseDiv.append('i')
    .attr('class','icon-collapse-top toggleCollapseIcon')

  //1st element is always the timestamp, which we already used
  data = data.slice(1)

  data.forEach((row,index) => {
    var realtimeContainerDiv = d3.select(stopSelectorString).select("div.realtimeDataContainer")
      .append('div')
      .attr('class',"card-text realtimeData "+row['bus'])

    Object.keys(row).forEach(dataKey => {
      realtimeContainerDiv
        .append('p')
          .html("<b>"+formattedDataKeys[dataKey] + ": </b>"+ row[dataKey])             
    })//attribute display loop    
  })//all data loop      
  
  //After 5 minutes, remove the data (as it is likely outdated)
  setTimeout(function(){
    d3.select(stopSelectorString).select("div.realtimeDataContainer").remove()
    console.log("REMOVING")
  },300000)
}//end displayRealtimeData

//Removes all old highlighted stops (in list-div)
//Highlights the corresponding "stop_id" 
function backgroundColorToggle(stop_id,stopSelectorString){
  var allStopDivs = d3.select("#stops").selectAll("div")
  allStopDivs.style("background-color","")
  var stopDiv = d3.select(stopSelectorString)

  stopDiv.style("background-color","white")  
}