const MAX_DISPLAYED_STOPS = 10 
const MIN_SCHEDULED_SERVICES = 1
const DATA_TIMEOUT_MINUTES = 5
const DATA_TIMEOUT_MS = 60 * 1000 * DATA_TIMEOUT_MINUTES

const SERVICE_STATUS_TRANSITION_MS = 250
const REFRESH_TRANSITION_MS = 500
const SERVICE_STATUS_HEIGHT = "15rem"

//Data from API that will be displayed (subset of those actually retreived)
const DISPLAYED_DATA_KEYS = ['route_ids', 'distance']
                                  
const DISPLAYED_REALTIME_KEYS = [
                                  'description','time','bus', //Bus
                                  'to','track','train_no','status' //Train
                                ]

const DISTANCE_FORMAT = d3.format(".2r")

function displayStopData(transitStop,realtime,mode){
// console.log("<displayStopData>",transitStop,realtime,mode,realtime.length)
  //MIN_SCHEDULED_SERVICES check is less OR EQUAL TO because first data element is ALWAYS timestamp
  if((realtime.length <= MIN_SCHEDULED_SERVICES) || (d3.selectAll("div.stopListEntry").size() >= MAX_DISPLAYED_STOPS)){
    return;
  }
  //If GTFS data AND the realtime data does not include colors, we gotta make our own
  //If there is no realtime data OR the realtime data has no color
  //Use premade colors
  if(realtime && realtime.length > 1 && realtime[1].color){
    var routeBgColor = realtime[1].color
  }
  //If the DB has no colors
  //Use premade colors
  else if(transitStop['route_text_colors'].length > 1 && transitStop['route_text_colors'][0] != null){
    //TODO -- implement colors from DB if they exists 
  }
  else if(transitStop['route_colors'].length > 1 && transitStop['route_colors'][0] != null){
    //TODO -- implement colors from DB if they exists 
  }
  else{
    var colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([1,1000]);
  }

  //Add stop to the list of stops
  var parentDiv = d3.select('#stops')
    .append('div')
    .attr('class',"card stopListEntry stop_"+transitStop.stop_id)
      .append('div')
      .attr('class',"card-block")


  //Header/Title that has name of stop and stop #
  var stopHeader = parentDiv
                    .append('div')
                    .attr("class","card-title")
                    .style("font-weight", "bold")

  var stopSelectorString  = "div.stop_"+transitStop.stop_id
  //Stop Name
  stopHeader
    .append('div')
    .attr("class","stopName")
    .text(transitStop.stop_name)
    .on('click',() => {
      backgroundColorToggle(transitStop.stop_id,stopSelectorString)

      //Bus and train requires different keys to get realtime data
      var stopKey = mode == "bus" ? transitStop.stop_code : TRAIN_STOP_ABBR[format_train_stop_name(transitStop.stop_name)]
      getRealtimeData(transitStop, stopSelectorString, displayRealtimeData, mode)
  }) 

  //Gets realtime data
  var toggleCollapseDiv = parentDiv
    .append('div')
    .attr("class", "pull-right")
    .attr("class","toggle_collapse")
    .on('click',() => {
      if(!d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData")['_groups'].length){
        backgroundColorToggle(transitStop.stop_id,stopSelectorString)

        //Bus and train requires different keys to get realtime data
        var stopKey = mode == "bus" ? transitStop.stop_code : TRAIN_STOP_ABBR[format_train_stop_name(transitStop.stop_name)]
        getRealtimeData(transitStop, stopSelectorString, displayRealtimeData, mode)
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

          backgroundColorToggle(transitStop.stop_id,stopSelectorString)

          //Bus and train requires different keys to get realtime data
          var stopKey = mode == "bus" ? transitStop.stop_code : TRAIN_STOP_ABBR[format_train_stop_name(transitStop.stop_name)]
          getRealtimeData(transitStop, stopSelectorString, displayRealtimeData, mode)
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
  Object.keys(transitStop).forEach(dataKey => {
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

        transitStop[dataKey].forEach(routeId => {
          if(mode == "bus" || !routeBgColor){
            console.log("fake color",transitStop)
            routeBgColor = colorScale(routeId)
          }

          dataDiv
            .append('span')
            .attr("class", "route-number")
            .style("background-color",routeBgColor )
            .style("color",getColorByBgColor(routeBgColor))
            .text(routeId)

        })
      }
      else if(dataKey == "distance"){
        //Converts from meters (from DB) to miles
        var displayedDistance = (transitStop[dataKey] / 1609).toFixed(1)
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
            .html("<b>"+formattedDataKeys[dataKey] + ": </b>"+ transitStop[dataKey])           
      }
    }
  })//end iterating over stop properties
}//displayStopData

function displayRealtimeData(transitStop,data,mode,stopSelectorString){
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
      }
      else{
        var nextHeight = SERVICE_STATUS_HEIGHT

        var nextOpacity = "1"
        var nextOverflow = "auto"
      
        var nextDataHeight = SERVICE_STATUS_HEIGHT
      }

      d3.select(stopSelectorString).select("div.realtimeDataContainer").transition()
        .duration(SERVICE_STATUS_TRANSITION_MS)
        .ease(d3.easeLinear)
        .style("max-height",nextHeight)
        .style("overflow",nextOverflow)

      d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").transition()
        .duration(SERVICE_STATUS_TRANSITION_MS)
        .ease(d3.easeCircle)
        .style("opacity",nextOpacity)

      toggleIcon.classed('icon-collapse-top',!toggleIcon.classed('icon-collapse-top'))
      toggleIcon.classed('icon-collapse',!toggleIcon.classed('icon-collapse'))
      d3.event.stopPropagation()
    })

  d3.select(stopSelectorString).select(".realtimeDataTimestamp")
    .html("<b>Last Updated: "+data[0].currentTime+"</b>")

  var toggleIcon = toggleCollapseDiv.append('i')
    .attr('class','icon-collapse-top toggleCollapseIcon')

  if(mode == "bus"){
    //Parses last-updated time to use when displaying ETA
    var updatedTime = data[0].currentTime.split(" ")[0]
    var amPmTag = data[0].currentTime.split(" ")[1]

    //Converts to military time -- unneeded if at 12pm, otherwise converts 1pm -> 13:00, etc.
    if(amPmTag == "PM" && updatedTime.split(":")[0] != "12"){
      updatedTime = (+updatedTime.split(":")[0] + 12) +":"+ updatedTime.split(":")[1]
    }    
  }

  //1st element is always the timestamp, which we already used
  data = data.slice(1)

  data.forEach((row,index) => {
    var rowKey = mode == "bus" ? row['bus'] : row['train_no']
    var realtimeContainerDiv = d3.select(stopSelectorString).select("div.realtimeDataContainer")
      .append('div')
      .attr('class',"card-text realtimeData "+rowKey)
      .style('max-height',"1rem")
      .style("opacity","0")


    if(mode == "bus"){
      //Modal Bus Stuff
      realtimeContainerDiv
        .attr("data-toggle","modal")
        .attr("data-target","#exampleModal")
        .on('click', function(){
          d3.select(".modal-header").selectAll("p").remove();
          //Modal Purposes
          d3.select(".modal-header")
            .append('p')
              .attr("class", "firstRow")
              .html(row['description']) 

          var secondRow = d3.select(".modal-header")
            .append('p')
              .attr("class", "secondRow")
              .html(formattedDataKeys['bus'] + "" + row['bus'])                   

          var stationStartPosition = new L.LatLng(transitStop['stop_lat'], transitStop['stop_lon'])  
          var stationMarker = new L.marker(stationStartPosition);
          map.addLayer(stationMarker);

          //Default because in updateMap, we update the latlng
          var busStartPosition = new L.LatLng(transitStop['stop_lat'], transitStop['stop_lon'])  

          // var busIcon = L.divIcon({ 
          //   className:'stopIcon',
          //   iconSize:[20,20]
          // });
         var busIcon =  L.icon({
            iconUrl: '/img/buspin.png',
            //shadowUrl: 'leaf-shadow.png',

            iconSize:     [32, 50], // size of the icon
            iconAnchor:   [16, 0], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
        });
          var busMarker = L.marker(busStartPosition, {icon: busIcon, draggable:false})
          map.addLayer(busMarker);

          updateMap(row,busMarker,stationMarker)

          var intervalUpdateKey = setInterval(updateMap,30000,row,busMarker,stationMarker)

          $('#exampleModal').on('hide.bs.modal', function () { 
            resetMap(busMarker,stationMarker,intervalUpdateKey)
          });  

          $("#exampleModal").on("shown.bs.modal", function() {
              map.invalidateSize(false);
          });
        })// onclick CB

      //For the dropdown portion, in main section
      var columnOne = realtimeContainerDiv
        .append('div')
          .attr('class','busCol')

      columnOne
        .append('p')
          .attr("class", "firstRow")
          .html(row['description']) 

      columnOne
        .append('p')
          .attr("class", "secondRow")
          .html(formattedDataKeys['bus'] + "" + row['bus']) 

      var columnTwo = realtimeContainerDiv
        .append('div')
          .attr('class','busCol')

      if(row['time'] == "DELAYED"){
        columnTwo
          .append('p')
            .attr("class", "firstRow")
            .html(row['time'])  
      }//End of delayed check
      else{
        //Means that the ETA is listed as "< 1 min"
        if(row['time'].indexOf("<") != -1){
          var timeEtaString = updatedTime
        }
        else{
          var parseHour = d3.timeParse("%I:%M")
          //Otherwise, get the minutes from ETA, add to last updated time
          var minutesEta = row['time'].split("MIN")[0]

          var timeEta = d3.timeMinute.offset(parseHour(updatedTime), minutesEta)  

          var etaMinutes = timeEta.getMinutes() < 10 ? "0" + timeEta.getMinutes() : timeEta.getMinutes()          
          var etaHours = timeEta.getHours() == 0 ? "12" : timeEta.getHours()
          var timeEtaString = etaHours + ":" + etaMinutes                
        }

        columnTwo
          .append('p')
            .attr("class", "firstRow")
            .html(timeEtaString + " " + amPmTag)

        columnTwo
          .append('p')
            .attr("class", "secondRow")
            .html(row['time'])
      }//End of time conditional                    
    
    }//end of bus mode check
    else{
      Object.keys(row).forEach(dataKey => {
        if(DISPLAYED_REALTIME_KEYS.includes(dataKey)){
          if(dataKey == "description" || dataKey == "to"){
            realtimeContainerDiv
              .append('p')
                .attr("class","train")
                .html(row[dataKey])        
          }
          else if(dataKey == "status"){
            realtimeContainerDiv
              .append('p')
                .attr("class","train")
                .html(row['dep_time'] + " ("+row['status']+")" )            
          }
          else{
            realtimeContainerDiv
              .append('p')
                .attr("class","train")
                .html(formattedDataKeys[dataKey] + "" + row[dataKey])            
          }
        }//check for which data keys to display    
      })//attribute display loop      
    }//end mode train check
  })//all data loop      

  //Creates transition effect when getting new data
  d3.select(stopSelectorString).select("div.realtimeDataContainer").selectAll(".realtimeData").transition()
    .duration(SERVICE_STATUS_TRANSITION_MS)
    .ease(d3.easeLinear)
    .style("max-height",SERVICE_STATUS_HEIGHT)
    .style("opacity","1")
}//end displayRealtimeData

function displayParkingData(parkingSpot){
  const pName = parkingSpot.name
  // const stopLocation = parkingSpot._embedded['pw:location']
  const stopAddress = parkingSpot.address + ", " + parkingSpot['city']


  //Add stop to the list of stops
  var cardDiv = d3.select('#parkingSpots')
    .append('div')
    .attr('class',"card stopListEntry stop_"+parkingSpot.id)

  var parentDiv = cardDiv.append('div')
      .attr('class',"card-block")
      .on('click',function(){
        var desiredIcon = parkingIcons.filter(singleIcon => singleIcon.options.id == parkingSpot.id)[0]

        desiredIcon.bindPopup('<p>'+pName+'</p><p>'+parkingSpot['address']+'</p>').openPopup();

        d3.select("#amenities-card").remove();
        let amenitiesCard = cardDiv.append("div").attr("id", "amenities-card").attr("class", "card")
          .on("click", function(e) {
            d3.select("#amenities-card").remove();
          });


        let aCardBlock = amenitiesCard.append("div").attr("class", "card-block")

        let picBlock = aCardBlock.append("div").style("max-width", "60%")
          .style("float", "left").style("display", "inline-block")
          .append("img").style("max-width", "100%").attr("src", parkingSpot.img);

        const infoBlock = aCardBlock.append("div")
          .style("float", "right")
          .style("display", "inline-block")
          .style("padding", "10px")

console.log("PARKING SPOT:",parkingSpot)
        if (parkingSpot.heightRestriction) {
          infoBlock.append("div")
            .text(`Height Clearance: ${ Math.floor(parkingSpot.heightRestriction / 12) }' ${ parkingSpot.heightRestriction % 12 }"`)
        }

        if (parkingSpot.heightRestriction && parkingSpot.amenities.length) {
          infoBlock.append("div")
            .style("height", "10px")
        }

        infoBlock.append("div")
          .selectAll(".amenity")
          .data(parkingSpot.amenities)
          .enter().append("div").text(t => t);
      })

  var lotInfo = parentDiv
                  .append('div')
                  .attr('class','lotInfo')

  var stopHeader = lotInfo
                    .append('div')
                    .attr("class","card-title parkingTitle")
                    .style("font-weight", "bold")
                    .text(pName)

  var stopSelectorString  = "div.stop_"+parkingSpot.id

  lotInfo
    .append('div')
      .attr("class","card-block stopListData distance")
      .text(stopAddress)
    
  var priceDiv = parentDiv
    .append('div')
    .attr("class", "pull-right")
    .attr("class","toggle_collapse")

  priceDiv
    .append('div')
      .attr("class","card-block stopListData distance")
      .text((parkingSpot['distance'] * 0.000621371).toFixed(1) + " mi")  

    priceDiv
      .append('div')
      .attr("class", "realtimeDataTimestamp")
      .text("Cost: $" + parkingSpot.cost)
}


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

//Is async function, uses "Fetch"
function updateMap(data,busMarker,stationMarker){
  var url = `/realtime/bus/position?bus=${ data.bus }&route=${ data.route  }`

// console.log("UPDATE MAP, URL:", url)
  fetch(url).then(function(response) {
    if(response.ok){
      return response.json();
    }
    throw new Error(response.statusText);
  }).then(function(posData) {
    console.log("new bus position data", posData)
    var updatedBusPos = new L.LatLng(posData['lat'], posData['lng'])  
    busMarker.setLatLng(updatedBusPos) 
    busMarker.update()

    stationMarker.update();

    //https://stackoverflow.com/a/16845714
    var group = new L.featureGroup([stationMarker,busMarker]);
    map.fitBounds(group.getBounds(),{padding:[25,25]}); //Going back and forth with adding some padding in
  })//fetch callback  
}

function resetMap(busMarker,stationMarker,intervalUpdateKey){
  busMarker.removeFrom(map)
  stationMarker.removeFrom(map)

  clearInterval(intervalUpdateKey)
}