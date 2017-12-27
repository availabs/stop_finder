//Removes all old highlighted stops (in list-div)
//Highlights the corresponding "stop_id" 
function backgroundColorToggle(stop_id,stopSelectorString){
  var allStopDivs = d3.select("#stops").selectAll("div")
  allStopDivs.style("background-color","")
  var stopDiv = d3.select(stopSelectorString)

  stopDiv.style("background-color","white")  
}

//Takes stop_id (stop_code in DB) and selector string
//stop_id is used to get realtime data about that specific stop
//selector string is used to select parent div to display data on page
function getRealtimeData(stop_id,stopSelectorString){
  var url = `/testparse?routeId=${ params['routeId'] }&direction=${ params['direction'] }&stopId=${ stop_id }&allBusses=${ params['allBusses'] }`
  console.log(url)

  fetch(url).then(function(response) {
    return response.json();
  }).then(function(data) {

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
      .style('float','right')
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
      .attr('class','icon-collapse-top')
      .style("margin-right","18px")


    //1st element is always the timestamp, which we already used
    data = data.slice(1)

    //If there is no data, display a message
    if(data.length == 0){
      var realtimeContainerDiv = d3.select(stopSelectorString).select("div.realtimeDataContainer")
        .append('div')
        .attr('class',"realtimeData ")

      realtimeContainerDiv
        .append('div')
          .attr("class","element")
          .html("No service is scheduled for this stop at this time.")   
    }
    else{
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
    }


    //After 5 minutes, remove the data (as it is likely outdated)
    setTimeout(function(){
      d3.select(stopSelectorString).select("div.realtimeDataContainer").remove()
      console.log("REMOVING")
    },300000)
  })//fetch
}