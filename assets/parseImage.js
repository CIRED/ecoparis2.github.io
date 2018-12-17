function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

whenDocumentLoaded(() => {
	var urlDPT = "depts.geojson";
	var urlVoronoi = "sd-voronoi.json";

	// Load the JSON file(s)
	queue()
	    .defer(d3.json, urlDPT) // Load Watershed Shape
	    .defer(d3.json, urlVoronoi) // Load Voronoi Shape
	    .await(loadGeoJSON); // When the GeoJsons are fully loaded, call the function loadGeom


	function loadGeoJSON(error, dpt_shape, voronoi_shape){

	    //General Map
	    var basemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	        maxZoom: 19,
	        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	    });

	    var tl = new L.LatLng(49.2485668,1.4403262)
	    var br = new L.LatLng(48.1108602,3.5496114)

	    // Zoomed on Paris
	    var map = L.map('ParisMap', {zoomControl: true}).fitBounds(L.latLngBounds(tl,br));
	    basemap.addTo(map);

	    function style(feature) {
	        return {
	            opacity:0,
	            fillOpacity: 0
	        };
	    }

	    L.geoJson(dpt_shape,{style:style}).addTo(map);

	    var svg = d3.select("#ParisMap").select("svg")

	    var imgs = svg.selectAll("image").data([0,0]);
	    imgs.enter()
	        .append("svg:image")
	        .attr('x', 0)
	        .attr('y', 0)
	        .attr("xlink:href", "")

	    function projectPoint(x, y) {
	        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
	        this.stream.point(point.x, point.y);
	    }

	    transform = d3.geo.transform({point: projectPoint});
	    var path = d3.geo.path()
	        .projection(transform);

	    var watersheds = svg.append("g").selectAll("path")
	        .data(dpt_shape.features)
	        .enter().append('path')
	            .attr('d', path)
	            .attr('vector-effect', 'non-scaling-stroke')
	            .style('stroke', "#000")
	            .attr("fill","none")

	    var img = document.getElementById('my-image');
	    var image_width = img.width
	    var image_height = img.height

	    var canvas = document.createElement("canvas")
	        canvas.width=image_width//image_data.width
	        canvas.height=image_height//image_data.width

	    var paths = ['data/points_0_out.txt','data/points_1_out.txt',
            'data/points_2_out.txt','data/points_3_out.txt',
            'data/points_4_out.txt','data/points_5_out.txt',
            'data/points_6_out.txt','data/points_7_out.txt']

	    var polygons = []
	    for (var i=0; i<paths.length;++i){
	    	polygons[i] = svg.append("g").attr("class","polygons")
	    }
        
        map.on("viewreset", update);
	    update();
        
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
	        imgs.attr("xlink:href",value)
            
	        watersheds.attr("d",path)

            
            
            
            var fc = {'type': 'FeatureCollection','features': []}
            var poly = '{"type": "Feature","properties": {},"geometry": {"type": "Polygon","coordinates": []}}'
                
            for (i=0;i<paths.length;i++){
                dpt_index = i;
                data = loadFile(paths[i])
                data_splitted = data.split(",")
                data_real=[]
                for(j=0;j<data_splitted.length;j++){
                    if(j==0){
                        
                    }
                    else if(j%2==1){
                        data_real.push(parseFloat(""+data_splitted[j]))
                    }
                    else{
                        data_real.push(parseFloat(""+data_splitted[j].slice(0,7)))
                    }
                }

                var json_data = []
                for(k=0;k<data_real.length;k=k+2){
                    json_data.push({x:data_real[k], y:data_real[k+1]})
                }

                function imageToLatLng(x,y){
                    var tx = x/(image_width-1)
                    var ty = y/(image_height-1)
                    return L.latLng(tl.lat * (1-ty) + br.lat * ty, tl.lng * (1-tx) + br.lng * tx)
                }

                var voronoi = d3.voronoi()
                    .x(function(d) { return map.latLngToLayerPoint(imageToLatLng(d.x,d.y)).x; })
                    .y(function(d) { return map.latLngToLayerPoint(imageToLatLng(d.x,d.y)).y; })
                    .extent([[-100000, -100000], [100000,100000]]);//[canvas.width, canvas.height]]);
                    
                voronoi_clipped_data = voronoi(json_data).polygons().map(function(d) {
                        var mapped = dpt_shape.features[dpt_index].geometry.coordinates[0].map(function(p) {
                            projected_pt = map.latLngToLayerPoint(L.latLng(p[1],p[0]))
                            return [projected_pt.x,projected_pt.y]
                        });
                        var polygon_mask = d3.geom.polygon(mapped)
                        var polygon = d3.geom.polygon(d)
                        var clipped = polygon.clip(polygon_mask) 
                        return clipped
                    })
                    
                var voronoi_clipped = polygons[i]
                    .selectAll("path")
                    .data(voronoi_clipped_data)
                    .enter()
                    .append("path")
                    .attr("d",function(d){return ((d != null && d.length != 0) ? "M"+d.join("L")+"Z" : "") })
                    .style("stroke", function(d){  return "#000000"} )
                    .style("fill","none");

                polygons[i]
                    .selectAll("path")
                    .attr("d",function(d){return ((d != null && d.length != 0) ? "M"+d.join("L")+"Z" : "") })
                    
                voronoi_clipped_data.forEach(p => {
                    let feature = JSON.parse(poly)
                    p.reverse().push(p[0])
                    feature.geometry.coordinates.push(p)
                    fc.features.push(feature)
                })
            }
            //todo: map fc to latlng
            fc.features.forEach((feature,i) =>{
            	feature.geometry.coordinates.forEach((coordinates,j) => {
            		coordinates.forEach((point,k) => {
            			var latLng = map.layerPointToLatLng(L.point(point[0],point[1]))
            			fc.features[i].geometry.coordinates[j][k] = [latLng.lng,latLng.lat]
            		})
            	})
            })
        	download(JSON.stringify(fc, null, 2), 'sd-voronoi.json', "json", 8)
              
	    }
	    
	    function getColour(d){
	        return  d > 200 ? '1c1ae3':
	                d > 150 ? '2a4efc':
	                d > 100 ? '3c8dfd':
	                d > 50 ? '4cb2fe':
	                          'ccffff';
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

	    canvas.getContext('2d').drawImage(img, 0, 0, image_width, image_height);
	    var context = canvas.getContext('2d');

	    var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data

	    var imageData=context.createImageData(image_width, image_height);
	    // The property data will contain an array of int8
	    var data=imageData.data;

	    
		var myArray=[]
		var string=[]

		var voronoi_means = []
		var voronoi_count = []
		for (var i=0; i<8; ++i){
			string[i]=""
		}
		for (var i=0; i<voronoi_shape.features.length;++i){
			voronoi_count[i]=0
			voronoi_means[i]=0
		}
		console.log(dpt_shape.features)
	    for (var i=0; i<canvas.height*canvas.width; i++) {
	        var px = i%canvas.width
	        var py = Math.floor(i/canvas.width)
	        //var value = getRasterPixelValue(i%canvas.width,i/canvas.width)
	        if(px >= 0 && px < image_width && py >= 0 && py < image_height){
	            pos = i*4

	            var value = pixels[i*4]
	            //var v = (value - mean)/(std*2) + 0.5;
	            data[pos]   = parseInt(getColour(value),16) & 255
	            data[pos+1]   = (parseInt(getColour(value),16) >> 8) & 255
	            data[pos+2]   = (parseInt(getColour(value),16) >> 16) & 255
	            if (pixels[i*4]==0){
	                data[pos+3]=0; // alpha (transparency)
	            }
	            else{
	                data[pos+3]=180;
	            }
	        	myArray[i]=value;

	        	var tx = px/(canvas.width-1)
	        	var ty = py/(canvas.height-1)
	        	/*for (var k=0; k<1; ++k){
	        		if (d3.geoContains(dpt_shape.features[k],[tl.lng * (1-tx) + br.lng*tx,tl.lat * (1-ty) + br.lat*ty])){
		        		for (var j=0; j<value/51; ++j){
			        		string[k] += ""+px+","+py+"\n"
			        	}
		        	}
	        	}*/
        		/*for (var k=0; k<voronoi_shape.features.length; ++k){
					if (d3.geoContains(voronoi_shape.features[k],[tl.lng * (1-tx) + br.lng*tx,tl.lat * (1-ty) + br.lat*ty])){
		        		voronoi_count[k]=voronoi_count[k]+1
		        		voronoi_means[k]=voronoi_means[k]+value
		        	}
	        	}*/
	        	
	        	
	        	if (px == 0){
	        		console.log(py)
	        	}
	        	//console.log(i)
	        }
	        else{
	        	myArray[i]=0;
	        }
	    }
		var voronoi_string = ""
		for (var i=0; i<voronoi_shape.features.length;++i){
			if (voronoi_count[i] == 0){
				voronoi_means[i]=0
			}
			else{
				voronoi_means[i]=voronoi_means[i]/voronoi_count[i]
			}
			voronoi_string = voronoi_string+voronoi_means[i]+"\n"
		}
	    //console.log(JSON.stringify(myArray))
	    function download(text, name, type, id) {
	      d3.select(".container").append("a").attr("id","a"+id)
		  var a = document.getElementById("a"+id);
		  var file = new Blob([text], {type: type});
		  a.href = URL.createObjectURL(file);
		  a.innerHTML="Click here to download points_"+id+".txt"
	      d3.select(".container").append("br")
		  a.download = name;
		}
		console.log(img.width,img.height)
		/*download(JSON.stringify({"width":img.width,
								"height":img.height,
								"tl_lat":tl.lat,
								"tl_lng":tl.lng,
								"br_lat":br.lat,
								"br_lng":br.lng,
								"data":JSON.stringify(myArray)}),"p_export.json","json")*/
		for (var i=0; i<8; ++i){

			download(string[i],"points_"+i+".txt","txt",i)
		}
		download(voronoi_string,"voronoi_means_p.txt","txt",9)
	    // we put this random image in the context
	    context.putImageData(imageData, 0, 0); // at coords 0,0


	    var value=canvas.toDataURL("png");
	    document.getElementById("my-second-image").src=value

	    imgs.attr("xlink:href",value)
	    console.log("ok!")
	}
});

