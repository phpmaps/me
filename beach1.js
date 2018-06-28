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

        var mapDiv, zoommap;

        var mt = document.getElementsByClassName("main-table")[0];
        console.log(mt);

        var d = document.getElementsByClassName("design")[0];
        console.log(mc);

        var mc = document.getElementsByClassName("map-col")[0];
        console.log(mc);

        var m = document.getElementsByClassName("map")[0];
        console.log(mc);

        var t = document.getElementsByClassName("track")[0];
        console.log(t);

        var pc = document.getElementsByClassName("promo-col")[0];
        console.log(pc);

        if (window.innerWidth <= 768) {
            zoommap = 11;
            mt.classList.add("colDir");
            mt.insertBefore(pc,mc);
            m.classList.add("map-small");
            t.style.display = "block";
        } else {
            zoommap = 12;
            mt.classList.add("rowDir");
            mt.insertBefore(pc,d);
            m.classList.add("map-large");
            t.style.display = "none";
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

        map = new Map("map", {
            basemap: "gray-vector",
            extent: geom,
            zoom: zoommap
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