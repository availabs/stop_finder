# stop_finder

REQUIRES 'db_config.json' file in root of project, example is included

Default route ('/') is leaflet map with a default marker and the 10 closest stops to it. Moving the marker will query for the 10 closest stops to the marker. List on sidebar populates with new data. 

stop_id is freqently used in interactive features to select elements

public/index.html is where most of the magic happens, both the HTML and JS
public/stylesheets/style.css is the CSS

/stops/:lng/:lat is the actual API call to get the 10 closest stops. 