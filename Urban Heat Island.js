/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var urban = ee.FeatureCollection("projects/intense-jet-447317-c6/assets/Urbanlandsat9"),
    rural = ee.FeatureCollection("projects/intense-jet-447317-c6/assets/rural");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Replace these paths with your actual asset paths for urban and rural areas
var urban = ee.FeatureCollection('projects/intense-jet-447317-c6/assets/Urbanlandsat9');
var rural = ee.FeatureCollection('projects/intense-jet-447317-c6/assets/rural');

// First, print the urban and rural features to verify they loaded correctly
print('Urban areas:', urban);
print('Rural areas:', rural);

// Function to calculate LST and UHI
var calculateLSTandUHI = function(startDate, endDate, exportName, palette) {
  
  // Load Landsat 8 image collection
  var landsat8Image = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    .filterDate(startDate, endDate)
    .filterBounds(urban)  // Filter by urban area bounds
    .filter(ee.Filter.lt('CLOUD_COVER', 10))
    .median();

  // Calculate LST
  var lst = landsat8Image.select('ST_B10')
    .multiply(0.00341802)
    .add(149)
    .subtract(273.15)
    .rename('LST');

  // Clip to urban and rural areas
  var urbanLST = lst.clip(urban);
  var ruralLST = lst.clip(rural);

  // Calculate mean temperatures
  var urbanMean = urbanLST.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: urban.geometry(),  // Use the geometry of the urban feature collection
    scale: 30,
    bestEffort: true,
    maxPixels: 1e9
  }).get('LST');

  var ruralMean = ruralLST.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: rural.geometry(),  // Use the geometry of the rural feature collection
    scale: 30,
    bestEffort: true,
    maxPixels: 1e9
  }).get('LST');

  // Calculate UHI (Urban minus Rural temperature)
  var uhi = ee.Number(urbanMean).subtract(ee.Number(ruralMean));

  // Print results
  print('Statistics for ' + startDate.substring(0,4) + ':', {
    'Urban Mean LST (°C)': urbanMean,
    'Rural Mean LST (°C)': ruralMean,
    'UHI Intensity (°C)': uhi
  });

  // Display layers with different visualization for urban/rural
  Map.centerObject(urban, 11);
  Map.addLayer(urbanLST, {min: 25, max: 50, palette: ['yellow', 'red']}, 'Urban LST ' + exportName);
  Map.addLayer(ruralLST, {min: 20, max: 45, palette: ['green', 'yellow']}, 'Rural LST ' + exportName);

  // Export images
  Export.image.toDrive({
    image: urbanLST,
    description: 'Urban_' + exportName,
    region: urban.geometry(),
    scale: 30,
    maxPixels: 1e13
  });
  
  Export.image.toDrive({
    image: ruralLST,
    description: 'Rural_' + exportName,
    region: rural.geometry(),
    scale: 30,
    maxPixels: 1e13
  });
  
  // Return UHI value for time series
  return ee.Feature(null, {
    'year': startDate.substring(0,4),
    'urban_temp': urbanMean,
    'rural_temp': ruralMean,
    'UHI': uhi
  });
};

// Define color palette
var palette = ['blue', 'green', 'yellow', 'red'];

// Calculate for multiple years and collect UHI results
var uhiResults = ee.FeatureCollection([
  calculateLSTandUHI('2015-07-01', '2015-08-01', '2015', palette),
  calculateLSTandUHI('2020-07-01', '2020-08-01', '2020', palette),
  calculateLSTandUHI('2025-07-01', '2025-07-30', '2024', palette)
]);

// Chart UHI over time
var uhiChart = ui.Chart.feature.byFeature({
  features: uhiResults,
  xProperty: 'year',
  yProperties: ['UHI', 'urban_temp', 'rural_temp']
}).setChartType('LineChart')
  .setOptions({
    title: 'Urban Heat Island (UHI) Intensity Over Time',
    hAxis: {title: 'Year'},
    vAxis: {title: 'Temperature (°C)'},
    series: {
      0: {color: 'red', lineWidth: 3, targetAxisIndex: 0, labelInLegend: 'UHI Intensity'},
      1: {color: 'darkred', lineWidth: 2, targetAxisIndex: 0, labelInLegend: 'Urban Temp'},
      2: {color: 'green', lineWidth: 2, targetAxisIndex: 0, labelInLegend: 'Rural Temp'}
    },
    legend: {position: 'top'}
  });

print(uhiChart);

// Add title
var mapTitle = ui.Panel({
  style: {
    position: 'top-center',
    padding: '20px 20px'
  }
});
var mapTitleLabel = ui.Label({
  value: 'Urban vs Rural Land Surface Temperature Comparison of Ancona',
  style: {
    fontWeight: 'bold',
    fontSize: '30px',
    margin: '8px',
    padding: '0'
  }
});
mapTitle.add(mapTitleLabel);
Map.add(mapTitle);