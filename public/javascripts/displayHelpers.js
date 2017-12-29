const MAX_DISPLAYED_STOPS = 10 
const MIN_SCHEDULED_BUSSES = 1

//Data from API that will be displayed (subset of those actually retreived)
const DISPLAYED_DATA_KEYS = ['stop_id','stop_code','route_ids']

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

  //Add stop to the list of stops
  var parentDiv = d3.select('#stops')
    .append('div')
    .attr('class',"stopListEntry stop_"+busStop.stop_id)
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

  //Add desired data to list
  Object.keys(busStop).forEach(dataKey => {
    if(DISPLAYED_DATA_KEYS.includes(dataKey)){
      parentDiv
        .append('div')
          .attr("class","stopListData")
          .html("<b>"+formattedDataKeys[dataKey] + ": </b>"+ busStop[dataKey])          
    }
  })//end iterating over stop properties
}//displayStopData

function displayRealtimeData(data,stopSelectorString){
  //Remove old real-time data
  d3.select(stopSelectorString).select("div.realtimeDataContainer").remove()

  var realtimeContainerDiv = d3.select(stopSelectorString)
    .append('div')
    .attr('class',"realtimeDataContainer")

  //Appending header div to conatiner
  var realtimeHeaderDiv = realtimeContainerDiv.append("div")
    .attr("class","realtimeDataHeader")

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
      .attr('class',"realtimeData "+row['bus'])

    Object.keys(row).forEach(dataKey => {
      realtimeContainerDiv
        .append('div')
          .attr("class","element")
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