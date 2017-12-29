  /*
  *
  * LEAFLET TAKES COORDS AS: LAT/LNG
  * POSTGIS TAKES COORDS AS: LNG/LAT
  * Parameter is LAT/LNG in order to work with Leaflet
  * Function reverses it when creating URL to get data
  *
  */
  function getData (coords) {
    let newUrl = ((window.location.pathname == "/") ? "" : window.location.pathname) + `?lng=${ coords[1] }&lat=${ coords[0] }`
    window.history.pushState("", "", newUrl);
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

    var url = `/stops/${coords[1]}/${coords[0]}`

    console.log('url', url)

    fetch(url).then(function(response) {
      return response.json();
    }).then(function(data) {
      data['data'].forEach((busStop,i) => {
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

            getRealtimeData(busStop.stop_code, stopSelectorString)
          })

        //Add desired data to list
        Object.keys(busStop).forEach(dataKey => {
          if(displayedDataKeys.includes(dataKey)){
            parentDiv
              .append('div')
                .attr("class","stopListData")
                .html("<b>"+formattedDataKeys[dataKey] + ": </b>"+ busStop[dataKey])          
          }
        })//end iterating over stop properties

      });//end data loop
    });//end fetch
  }