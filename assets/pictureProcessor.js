

var processColour = function(binaryData, width, height, pixels, voronoiContainmentData, interCommContainmentData, 
                              voronoi_means, voronoi_counts , voronoi_hist, interComm_means, interComm_counts, interComm_hist, firstVoronoiByInterComm, bounds,
                              percentiles, colors){

  function getColour(d){
    if (d > 255){
      console.log("oops!")
    }
    var string = ""+colors[d]
    return string.substring(4, string.length-1)
         .replace(/ /g, '')
         .split(',');
  }
  const original_tl_lat = 49.2485668
  const original_tl_lng = 1.4403262

  const original_br_lat = 48.1108602
  const original_br_lng = 3.5496114

  const original_width = 1977
  const original_height = 1590

  var  voronoiInInterCommCount = []
  for (var i=0; i<width*height; i++) {

      var px = i%width
      var py = Math.floor(i/width)

      if(px >= 0 && px < width && py >= 0 && py < height){
          var pos = i*4

          var value = pixels[i]

          //careful here! our data is always between image_width and image_height (well, inside this rectangle), but the containment
          //data was always between default_tl and default_br, so we have to compute the location in this referential before sampling
          //the containment data!

          var current_tx = px / (width - 1) //between 0 and 1 included
          var current_ty = py / (height - 1)

          var current_lng = (1-current_tx) * bounds.tl_lng + current_tx * bounds.br_lng
          var current_lat = (1-current_ty) * bounds.tl_lat + current_ty * bounds.br_lat

          var original_tx = (current_lng - original_tl_lng) / (original_br_lng - original_tl_lng) //between 0 and 1, included (should anyway)
          var original_ty = (original_tl_lat - current_lat) / (original_tl_lat - original_br_lat)

          var original_px = Math.floor(original_tx * (original_width - 1))
          var original_py = Math.floor(original_ty * (original_height - 1)) //in the original image, the one that generated the containment data


          var voronoi_id = 0
          var interComm_id = 0

          if (original_px >= 0 && original_py >= 0 && original_px < original_width && original_py < original_width){ 
            var containment_index = original_px + original_py * original_width

            voronoi_id = voronoiContainmentData[containment_index]
            interComm_id = interCommContainmentData[containment_index]
          }// else, this image is bigger, this pixel is outside! so in no voronoi or interComm..
      
          if (value != null){
            if (voronoi_id != 0){
              voronoi_counts[voronoi_id-1] += 1
              voronoi_means[voronoi_id-1] += value
              voronoi_hist[voronoi_id-1][value] += 1
            }

            if (interComm_id != 0){
              interComm_counts[interComm_id-1] += 1
              interComm_means[interComm_id-1] += value
              interComm_hist[interComm_id-1][value] += 1
            }
          }
          

          if (voronoi_id != 0 && interComm_id != 0){ //voronoi inside an interComm, is it the first one?

            while (interComm_id - 1 >= voronoiInInterCommCount.length){
              voronoiInInterCommCount[voronoiInInterCommCount.length] = []
            }

            while (voronoi_id - 1 >= voronoiInInterCommCount[interComm_id-1].length){
              voronoiInInterCommCount[interComm_id - 1][voronoiInInterCommCount[interComm_id - 1].length] = 0
            }

            voronoiInInterCommCount[interComm_id - 1][voronoi_id - 1] += 1
          }

          var color = getColour(value)
          binaryData[pos+2]   = color[2]
          binaryData[pos+1]   = color[1]
          binaryData[pos]   = color[0]
          if (value == null){
              binaryData[pos+3]=0; // alpha (transparency)
          }
          else{
              binaryData[pos+3]=220;
          }
          
      }
  }
  //console.log(voronoi_means)

  voronoiInInterCommCount.forEach((p,i) => {
    var index = 100000
    p.forEach((d,j) => { //first index where greater than a given value
      if (d > 20 && j < index){
        index = j
      }
    })
    firstVoronoiByInterComm[i]=index
  })
}

self.addEventListener('message', function(e) {
  if (e.data.canvasData == null){
    return //it might be another type of message, don't handle it
  }
  var canvasData = e.data.canvasData;
  var binaryData = canvasData.data;
  var width = e.data.width;
  var height = e.data.height;
  var pixels = e.data.pixels;
  var voronoiContainmentData = e.data.voronoiContainmentData
  var interCommContainmentData = e.data.interCommContainmentData
  var numVoronois = e.data.numVoronois
  var numInterComms = e.data.numInterComms
  var tl_lat = e.data.tl_lat
  var tl_lng = e.data.tl_lng
  var br_lat = e.data.br_lat
  var br_lng = e.data.br_lng
  var percentiles = e.data.colorDomain
  var colors = e.data.colorRange

  //initalize means and counts arrays
  var voronoi_means = []
  var voronoi_counts = []
  var voronoi_hist = {}

  for (var i=0; i<numVoronois; ++i){
    voronoi_counts[i] = 0
    voronoi_means[i] = 0
    voronoi_hist[i] = []
    for (var j=0; j<256; ++j){
      voronoi_hist[i][j]=0
    }
  }

  var interComm_means = []
  var interComm_counts = []
  var interComm_hist = {}

  for (var i=0; i<numInterComms; ++i){
    interComm_counts[i] = 0
    interComm_means[i] = 0
    interComm_hist[i] = []
    for (var j=0; j<256; ++j){
      interComm_hist[i][j]=0
    }
  }

  var firstVoronoiByInterComm = []

  for (var i=0; i<numInterComms; ++i){
    firstVoronoiByInterComm[i]=10000 // bigger than the max, which is around 670
  }

  processColour(binaryData,width,height,pixels, voronoiContainmentData, interCommContainmentData, voronoi_means, voronoi_counts ,voronoi_hist,interComm_means, interComm_counts, interComm_hist, firstVoronoiByInterComm,
                {tl_lat:tl_lat,
                tl_lng:tl_lng,
                br_lat:br_lat,
                br_lng:br_lng,},
                percentiles,colors)

  self.postMessage({result: canvasData,
                    voronoi_means:voronoi_means,
                    voronoi_counts:voronoi_counts,
                    voronoi_hist:voronoi_hist,
                    interComm_means:interComm_means,
                    interComm_counts:interComm_counts,
                    interComm_hist:interComm_hist,
                    firstVoronoiByInterComm:firstVoronoiByInterComm });
}, false);
