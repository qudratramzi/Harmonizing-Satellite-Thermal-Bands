/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var Ancona = ee.FeatureCollection("projects/intense-jet-447317-c6/assets/AnconaProject");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Load the study area (Ancona)
var Ancona = ee.FeatureCollection('projects/intense-jet-447317-c6/assets/project');

// Function to calculate and export LST statistics
var calculateAndExportLST = function(startDate, endDate, exportName, palette) {
  
  // Load Landsat 8 image collection
  var landsatCollection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    .filterDate(startDate, endDate)
    .filterBounds(Ancona)
    .filter(ee.Filter.lt('CLOUD_COVER', 10));

  // Convert to LST for ALL images in the collection
  var lstCollection = landsatCollection.map(function(image) {
    return image.select('ST_B10')
      .multiply(0.00341802)
      .add(149)
      .subtract(273.15)
      .rename('LST')
      .clip(Ancona);
  });

  // Create median composite for visualization
  var visImage = lstCollection.median();

  // Calculate statistics across time (mean and stdDev)
  var statsImage = lstCollection.reduce(ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }));

  // Get region statistics
  var regionStats = statsImage.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: Ancona,
    scale: 30,
    bestEffort: true
  });

  // Print results
  print('Statistics for ' + startDate.substring(0,4) + ':', {
    'Mean LST (°C)': regionStats.get('LST_mean'),
    'StdDev LST (°C)': regionStats.get('LST_stdDev'),
    'Image Count': landsatCollection.size()
  });

  // Display the median LST on the map (updated max to 70)
  Map.centerObject(Ancona, 11);
  Map.addLayer(visImage, {min: 20, max: 60, palette: palette}, exportName);

  // Export statistics (contains both mean and stdDev bands)
  Export.image.toDrive({
    image: statsImage,
    description: 'STATS_' + exportName,
    region: Ancona,
    scale: 30,
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
  });
};

// Define a color palette
var ancona = ['blue', 'cyan', 'purple', 'green', 'yellow', 'red', 'darkred'];

// Process years
calculateAndExportLST('2025-06-15', '2025-06-20', 'LST_2025-06-19', ancona);
calculateAndExportLST('2025-06-22', '2025-06-30', 'LST_2025-06-26', ancona);
calculateAndExportLST('2025-07-01', '2025-07-07', 'LST_2025-07-05', ancona);

// ----------------------
// Legend and Title Setup
// ----------------------
var minLST = 20;
var maxLST = 60;  // Updated max for high temperature support

var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px',
    backgroundColor: 'white'
  }
});

var legendTitle = ui.Label({
  value: 'Land Surface Temperature (°C)',
  style: {
    fontWeight: 'bold',
    fontSize: '20px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

var palette = [
  '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
  '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
  '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
  'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
  'ff0000', 'de0101', 'c21301', 'a71001', '911003', '210300'
];

var step = (maxLST - minLST) / (palette.length - 1);

for (var i = 0; i < palette.length; i++) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + palette[i],
      padding: '8px',
      margin: '0 0 8px 0',
      width: '42px'
    }
  });
  
  var legendLabel = ui.Label({
    value: (minLST + i * step).toFixed(2),
    style: { margin: '0 0 10px 6px' }
  });
  
  var legendEntry = ui.Panel({
    widgets: [colorBox, legendLabel],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
  
  legend.add(legendEntry);
}

Map.add(legend);

var mapTitle = ui.Panel({
  style: {
    position: 'top-center',
    padding: '20px 20px'
  }
});
var mapTitleLabel = ui.Label({
  value: 'LST ANCONA (2025)',
  style: {
    fontWeight: 'bold',
    fontSize: '30px',
    margin: '8px',
    padding: '0'
  }
});
mapTitle.add(mapTitleLabel);
Map.add(mapTitle);
