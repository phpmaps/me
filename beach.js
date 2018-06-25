var map, graphicLayer, featureLayer, arcgisDomain, arcgisPortalUrl, appId, catalog, dataset;
catalog = "/arcgis/rest/services";
dataset = "/Hosted/USA_Boundaries_2015/FeatureServer/1";

require([
    "esri/map",
    "esri/layers/FeatureLayer",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Extent",
    "dojo/dom",
    "dojo/domReady!"
], function (
    Map,
    FeatureLayer,
    webMercatorUtils,
    Extent,
    dom
) {

        var whatmap;
        if (window.innerWidth <= 768) {
            whatmap = "map-small";
            zoommap = 14;
        } else {
            whatmap = "map-large";
            zoommap = 12;
        }

        var ext = {
            "xmin": -117.25,
            "ymin": 32.7,
            "xmax": -117.15,
            "ymax": 32.76,
            "spatialReference": {
                "wkid": 4326
            }
        };

        var extent = new Extent(ext);
        var geom = webMercatorUtils.geographicToWebMercator(extent);

        map = new Map(whatmap, {
            basemap: "gray-vector",
            extent: geom,
            zoom: zoommap,
            autoResize: true
        });

        map.on('load', function () {
            map.on("mouse-move", showCoordinates);
            map.on("mouse-drag", showCoordinates);
            addData();
        });

        function addData() {
            featureLayerLns = new FeatureLayer("https://services.arcgis.com/q7zPNeKmTWeh7Aor/arcgis/rest/services/convention_center_to_ocean_beach/FeatureServer/2");
            featureLayerLns.on('load', function () { console.log("loaded lns...") });
            featureLayerDts = new FeatureLayer("https://services.arcgis.com/q7zPNeKmTWeh7Aor/arcgis/rest/services/convention_center_to_ocean_beach/FeatureServer/0");
            featureLayerDts.on('load', function () { console.log("loaded dts...") });
            featureLayerEnds = new FeatureLayer("https://services.arcgis.com/q7zPNeKmTWeh7Aor/arcgis/rest/services/convention_center_to_ocean_beach/FeatureServer/1");
            featureLayerEnds.on('load', function () { console.log("loaded ends...") });

            map.addLayers([featureLayerLns, featureLayerDts, featureLayerEnds]);
        }

        function showCoordinates(evt) {
            var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
            dom.byId("info").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
        }
    });