function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

whenDocumentLoaded(() => {
	var urlDepartment = "depts.geojson";
	var urlWaterShed = "watershed.geojson";
	var urlVoronoi = "sd-voronoi.json";
	var urlAzote = "n_export.json";
	var urlPhosphore = "p_export.json";

	// Load the JSON file(s)
	queue()
	    .defer(d3.json, urlDepartment) // Load Departement Shape
	    .defer(d3.json, urlVoronoi) // Load Voronoi Shape
	    .await(loadGeoJSON); // When the GeoJsons are fully loaded, call the function loadGeom

    function loadFile(filePath) {
		var result = null;
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", filePath, false);
		xmlhttp.send();
		if (xmlhttp.status==200) {
			result = xmlhttp.responseText;
		}
		return result;
	}    
    
	function loadGeoJSON(error, department_shape, voronoi_shape){

	    var layersColorUrl = {} //placehoder for the layers, to compute them only once

	    //General Map
	    var basemap = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png', {
	        maxZoom: 14, //toner light won't go further than 14
	        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	    });

	    // Zoomed on Paris
	    var default_tl = new L.LatLng(49.2485668,1.4403262)
	    var default_br = new L.LatLng(48.1108602,3.5496114)
	    var defaultBounds = L.latLngBounds(default_tl,default_br)
	    var map = L.map('ParisMap', {zoomControl: true}).fitBounds(defaultBounds); //by default, zoom in on Paris
	    basemap.addTo(map);

	    function style(feature) {
	        return {
	            opacity:0,
	            fillOpacity: 0
	        };
	    }
	    L.geoJson(department_shape,{style:style}).addTo(map); //needed! otherwise a svg isn't generated, we use this one for practical purposes

	    var svg = d3.select("#ParisMap").select("svg")

	    function projectPoint(x, y) {
	        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
	        this.stream.point(point.x, point.y);
	    }
	    transform = d3.geo.transform({point: projectPoint});
        
	    var path = d3.geo.path()
	        .projection(transform);

		var defs = svg.append("defs");

		var defs_path = defs.append("path")
		    .attr("id", "clip_path")

		defs.append("clipPath")
		    .attr("id", "clip")
		    .append("use")
		    .attr("xlink:href", "#clip_path");

	    var imgs = svg.selectAll("image").data([0])
	    	.enter()
	        .append("svg:image")
	        .attr('x', 0)
	        .attr('y', 0)
	        .attr("xlink:href", "")
	        .attr("clip-path","url(#clip)")

        function update_clip(){
            
        	function clip_projectPoint(x, y) {
        	var width = (map.latLngToLayerPoint(default_br).x-map.latLngToLayerPoint(default_tl).x)
        	var height = (map.latLngToLayerPoint(default_br).y-map.latLngToLayerPoint(default_tl).y)
	        var tx = (x - default_tl.lng)/(default_br.lng - default_tl.lng) * (width-1)
	        var ty = (default_tl.lat+0.00314 - y)/(default_tl.lat - default_br.lat) * (height-1) //it is slightly offset, and I have no idea why
	        this.stream.point(tx, ty);
		    }
            
		    clip_transform = d3.geo.transform({point: clip_projectPoint});
            
		    var clip_path = d3.geo.path()
		        .projection(clip_transform);
	        defs_path.attr("d",clip_path)
            if(display_coord){
                L.marker([current_geoLat, current_geoLong], {icon: greenIcon}).addTo(map);
            }
        }
	    
	    function loadFile(filePath) {
			var result = null;
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("GET", filePath, false);
			xmlhttp.send();
			if (xmlhttp.status==200) {
				result = xmlhttp.responseText;
			}
			return result;
		}

		function paraseMeans(data){
            data_splitted = data.split("\n")
            data_splitted.pop()//last line does not contain a value!
            return data_splitted.map((d) => parseFloat(d))
		}

		var voronoi_means = {}
		voronoi_means[urlPhosphore] = paraseMeans(loadFile("data/voronoi_means_p.txt"))
		voronoi_means[urlAzote] = paraseMeans(loadFile("data/voronoi_means_n.txt"))

	    function getColour(d){
	        return  d > 200 ? 'e31a1c':
	                d > 150 ? 'fc4e2a':
	                d > 100 ? 'fd8d3c':
	                d > 50 ? 'feb24c':
	                          'ffffcc';
	    }
        
        var current_geoLat = 0.0;
        var current_geoLong = 0.0;
        var display_coord = 0; //Do not display the localisation marker
        var geomarker;
        
	    var voronoi = svg.append("g").selectAll("path")
	        .data(voronoi_shape.features)
	        .enter().append('path')
	            .attr('d', path)
	            .attr('vector-effect', 'non-scaling-stroke')
	            .style('stroke', "#000")
	            .style("fill-opacity",0.7)
	            .on("mouseover",function(d,i){
	            	d3.select(this).style('fill-opacity', 0);
	    			defs_path.datum(d.geometry)
	    			update_clip()
	            })
	            .on("mouseout",function(d,i){
	            	d3.select(this).style('fill-opacity', 0.7);
	    			defs_path.datum([])
	    			update_clip()
	            })
	            .on("click",function(d,i){
	            	departments.style("pointer-events","all")
	            	map.fitBounds(defaultBounds) // zoom back to paris
                    if(display_coord){
                        map.addLayer(geomarker);
                    }
	            })
                
	    var departments = svg.append("g").selectAll("path")
	        .data(department_shape.features)
	        .enter().append('path')
	            .attr('d', path)
	            .attr('vector-effect', 'non-scaling-stroke')
	            .style('stroke', "#000")
	            .attr("fill","#4444")
	            .attr("fill-opacity","0")
	            .style("stroke-width","2")
	            .style("pointer-events", "all")
	            .on("mouseover",function(d,i){
	            	d3.select(this).style('fill-opacity', 1);
	            })
	            .on("mouseout",function(d,i){
	            	d3.select(this).style('fill-opacity', 0);
	            })
	            .on("click",function(d,i){
	            	departments.style("pointer-events","all") // now we can click/hover on every department
	            	d3.select(this).style("pointer-events","none") // except the current one!
	            	var BBox = d3.select(this).node().getBBox()
	            	var neBound = map.layerPointToLatLng(L.point(BBox.x,BBox.y))
	            	var swBound = map.layerPointToLatLng(L.point(BBox.x+BBox.width,BBox.y+BBox.height))
                    map.fitBounds(L.latLngBounds(neBound,swBound)) // zoom to department
                    if(display_coord){
                        map.addLayer(geomarker);
                    }
                })

        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition) // call showPosition when finished
                
            } else {
                x.innerHTML = "Geolocation is not supported by this browser.";
            }
        }
        
        var greenIcon = L.icon({
            iconUrl: 'marker_azure.png',
            iconSize: [64, 64],
            iconAnchor: [32,64]
        });
    
        function showPosition(position) {
            current_geoLat = position.coords.latitude;
            current_geoLong = position.coords.longitude;
            current_geoLat = 48.864716;
            current_geoLong = 2.349014;
            for (var k=0; k<department_shape.features.length; ++k){
                if (d3.geoContains(department_shape.features[k],[current_geoLong,current_geoLat])){
                    display_coord = 1;
                    geomarker = L.marker([current_geoLat, current_geoLong], {icon: greenIcon});
                    map.addLayer(geomarker);
                }
		    }
        }
        
        getLocation();

	    var canvas = document.createElement("canvas")
	    var context = canvas.getContext('2d');
	    var currentUpdateFunction = getColour(0)//litteraly anything other than null

	    function setLayer(newLayerUrl){
	    	if (!layersColorUrl[newLayerUrl]){
				var json = loadFile(newLayerUrl)
				var image_data = JSON.parse(json)
				image_data.data=JSON.parse(image_data.data)

				image_width=image_data.width
				image_height=image_data.height
			    //var densityDataChosen = densityData["p"]; //phosphore for now

		        canvas.width=image_width//image_data.width
		        canvas.height=image_height//image_data.width

		        var img = document.getElementById("my-image")
		    	//canvas.getContext('2d').drawImage(img, 0, 0, image_width, image_height);

			    var context = canvas.getContext('2d');

			    var pixels = image_data.data//context.getImageData(0, 0, canvas.width, canvas.height).data

			    var imageData=context.createImageData(image_width, image_height);
			    // The property data will contain an array of int8
			    var data=imageData.data;

			    for (var i=0; i<canvas.height*canvas.width; i++) {
			        var px = i%canvas.width
			        var py = i/canvas.width
			        //var value = getRasterPixelValue(i%canvas.width,i/canvas.width)
			        if(px >= 0 && px < image_width && py >= 0 && py < image_height){
			            pos = i*4

			            var value = pixels[i]
			            //var v = (value - mean)/(std*2) + 0.5;
			            data[pos+2]   = parseInt(getColour(value),16) & 255
			            data[pos+1]   = (parseInt(getColour(value),16) >> 8) & 255
			            data[pos]   = (parseInt(getColour(value),16) >> 16) & 255
			            if (pixels[i]==0){
			                data[pos+3]=0; // alpha (transparency)
			            }
			            else{
			                data[pos+3]=220;
			            }
			        }
			    }
			    context.putImageData(imageData, 0, 0); // at coords 0,0

			    var value=canvas.toDataURL("png");

			    imgs.attr("xlink:href",value)
			    layersColorUrl[newLayerUrl]={"url":value,
											"tl_lat":image_data.tl_lat,
											"tl_lng":image_data.tl_lng,
											"br_lat":image_data.br_lat,
											"br_lng":image_data.br_lng,
											"width":image_width,
											"height":image_height,
											"layerUrl":newLayerUrl}
			}

			info = layersColorUrl[newLayerUrl]
			var colour_mean = d3.scale.linear() //change fill color according to current layer and means
	            .range(['#ffffcc','#e31a1c'])
	            .domain([Math.min(...voronoi_means[info.layerUrl]),Math.max(...voronoi_means[info.layerUrl])])

			voronoi.attr("fill",function(d,i){
            	return colour_mean(voronoi_means[info.layerUrl][i])
            })

			image_width=info.width
			image_height=info.height

	        canvas.width=image_width//image_data.width
	        canvas.height=image_height//image_data.width

		    var tl = new L.LatLng(info.tl_lat,info.tl_lng)
		    var br = new L.LatLng(info.br_lat,info.br_lng)

		    function update() {
		        var width = (map.latLngToLayerPoint(br).x-map.latLngToLayerPoint(tl).x)
		        var height = (map.latLngToLayerPoint(br).y-map.latLngToLayerPoint(tl).y)
		        imgs.attr("transform", 
		            function(d) { 
		                var point = map.latLngToLayerPoint(tl)
		                return "translate("+ 
		                    point.x +","+ 
		                    point.y +")";
		            }
		        )
		        imgs.attr("width", 
		            function(d) { 
		                return width;
		            }
		        )
		        imgs.attr("height", 
		            function(d) { 
		                return height;
		            }
		        )
		        departments.attr("d",path)
		        voronoi.attr("d",path)
		        update_clip()
                if(display_coord){
                    map.addLayer(geomarker);
                }

		    }
		    map.off("viewreset",currentUpdateFunction)
		    map.on("viewreset", update);
		    currentUpdateFunction = update
		    update();

		    document.getElementById("my-second-image").src=info.url
		    imgs.attr("xlink:href",info.url)
		}
		setLayer(urlPhosphore)
		document.getElementById("azoteLayer").addEventListener("click",function(){
			setLayer(urlAzote)
		})
		document.getElementById("phosphoreLayer").addEventListener("click",function(){
			setLayer(urlPhosphore)
		})
	}
});

