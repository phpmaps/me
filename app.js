var map, graphicLayer, featureLayer, arcgisDomain, arcgisPortalUrl, appId, catalog, dataset;
catalog = "/arcgis/rest/services";
dataset = "/Hosted/USA_Boundaries_2015/FeatureServer/1";

require([
    "esri/map",
    "esri/layers/FeatureLayer",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "esri/geometry/Extent",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/arcgis/Portal",
    "esri/arcgis/OAuthInfo",
    "esri/IdentityManager",
    "esri/request",
    "esri/geometry/geometryEngine",
    "esri/geometry/projection",
    "esri/geometry/webMercatorUtils",
    "dojo/dom",
    "esri/SpatialReference",
    "dojo/domReady!"
], function (
    Map,
    FeatureLayer,
    Point,
    Polygon,
    Extent,
    Graphic,
    GraphicsLayer,
    SimpleMarkerSymbol,
    SimpleFillSymbol,
    SimpleLineSymbol,
    Color,
    arcgisPortal,
    OAuthInfo,
    esriId,
    esriRequest,
    geometryEngine,
    projection,
    webMercatorUtils,
    dom,
    SpatialReference
) {
        useCrystalBugger();

        function useBankBeetle() {
            arcgisDomain = "https://bankbeetle.esri.com";
            arcgisPortalUrl = arcgisDomain + '/portal';
            appId = "r39INBsvcaokxCns";
        }

        function useCrystalBugger() {
            arcgisDomain = "https://crystalbugger.esri.com";
            arcgisPortalUrl = arcgisDomain + '/arcgis';
            appId = "vVlLOA5bg05fnt9d";
        }

        esri.config.defaults.io.corsEnabledServers.push(arcgisDomain);

        var info = new OAuthInfo({
            appId: appId,
            popup: false,
            portalUrl: arcgisPortalUrl
        });
        esriId.registerOAuthInfos([info]);
        esriId.checkSignInStatus(info.portalUrl + "/sharing").then(
            function () {
                new arcgisPortal.Portal(info.portalUrl).signIn()
            });

        map = new Map("map", {
            basemap: "gray-vector",
            center: [-74, 40],
            zoom: 4,
            autoResize: true
        });

        map.on('load', function () {
            map.on("mouse-move", showCoordinates);
            map.on("mouse-drag", showCoordinates);
            addData();
            projectThis();
        });

        function addData() {
            addGraphicsLayer();
            featureLayer = new FeatureLayer(arcgisDomain + catalog + dataset);
            featureLayer.on('load', async function () {
                var extent = await getExtent();
                map.setExtent(extent);
                drawPoly(extent);
                console.log("extent:", extent);
            });
        }

        async function getExtent() {
            var oids = await getOids();
            var fs = await sampleData(oids);
            var centerPoints = getCenterPoints(fs);
            var hull = geometryEngine.convexHull(centerPoints, true);
            var newExtent = await webAssemblyProjection(hull[0], map.spatialReference)
            return newExtent.getExtent();
        }

        async function getOids() {
            return new Promise(function (resolve, reject) {
                var params = {
                    where: "1=1",
                    returnIdsOnly: true,
                    f: "json"
                };
                return esriRequest({
                    url: featureLayer.url + '/query',
                    content: params,
                    handleAs: "json",
                }, { usePost: false }).then(function (resp) {
                    resolve(resp.objectIds);
                }, function (err) {
                    reject(err);
                });
            });
        }

        function getCenterPoints(fs) {
            var centerPoints = [];
            for (var i = 0; i < fs.features.length; i++) {
                var feat = fs.features[i];
                //we should first check if it's polygon or polyline
                //in case of polyline - since it does not have getCentroid() we would need to maybe find center vertex 
                //or perhaps get extent using line.getExtent(), then find center of the rect, like below.  Nonetheless, a single solution
                //which handles  points and polygons would be valuable in itself, as it gets users to their data without distracting pans and zooms

                /*
                var getCenter = function (geoExtent) {
                    var xMid = (geoExtent.xmin + geoExtent.xmax) / 2;
                    var yMid = (geoExtent.ymin + geoExtent.ymax) / 2;
                    var point = new Point();
                    point.x = xMid;
                    point.y = yMid;
                    point.spatialReference = geoExtent.spatialReference;
                    return point;
                }
                */

                var geo = new Polygon(feat.geometry); // not checking if polyline, for brevity
                console.log(feat.attributes["st_abbrev"], geo);
                centerPoints.push(geo.getCentroid());
            }
            drawPoints(centerPoints);
            return centerPoints;
        }

        async function sampleData(oids) {
            return new Promise(function (resolve, reject) {
                var sampleOids = [];
                var params = {
                    outFields: ["st_abbrev"],
                    returnGeometry: true,
                    maxAllowableOffset: 1,
                    f: "json"
                };
                if (oids.length > featureLayer.maxRecordCount) {
                    for (var i = 0; i < featureLayer.maxRecordCount; i++) {
                        sampleOids.push(oids[getRandom(oids.length)]);
                    }
                } else {
                    sampleOids = oids;
                }
                params.objectIds = sampleOids.join();
                return esriRequest({
                    url: featureLayer.url + '/query',
                    content: params,
                    handleAs: "json",
                }, { usePost: false }).then(function (resp) {
                    for (var i = 0; i < resp.features.length; i++) {
                        var feat = resp.features[i];
                        //Should first check if polygon or line, but doing that now
                        var geo = new Polygon(feat.geometry);
                        drawPoly(geo);
                    }
                    resolve(resp);
                }, function (err) {
                    reject(err);
                });
            });
        }

        async function webAssemblyProjection(geom, outSpat) {
            return new Promise(function (resolve, reject) {
                if (!projection.isSupported()) {
                    console.log("Web Assembly not supported in browser (<=IE11), use geometry service");
                }
                projection.load().then(function () {
                    var newGeom = projection.project(geom, outSpat);
                    resolve(newGeom);
                });
            });
        }

        function getFillSymbol() {
            var r = Math.floor(Math.random() * 250);
            var g = Math.floor(Math.random() * 100);
            var b = Math.floor(Math.random() * 100);
            return new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([r, g, b]), 1), new Color([r, g, b, 0.25])
            );
        }

        function getMarkerSymbol() {
            var r = Math.floor(Math.random() * 250);
            var g = Math.floor(Math.random() * 100);
            var b = Math.floor(Math.random() * 100);
            return new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([r, g, b]), 1), new Color([r, g, b, 0.25])
            );
        }

        function drawPoints(points) {
            for (i = 0; i < points.length; i++) {
                var point = points[i];
                var sms = getMarkerSymbol();
                var graphic = new Graphic(point, sms);
                graphicLayer.add(graphic);
            }
        }

        function drawPoly(poly) {
            var sfs = getFillSymbol();
            var graphic = new Graphic(poly, sfs);
            graphicLayer.add(graphic);
        }

        function addGraphicsLayer() {
            graphicLayer = new GraphicsLayer();
            map.addLayer(graphicLayer);
        }

        function showCoordinates(evt) {
            //the map is in web mercator but display coordinates in geographic (lat, long)
            var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
            //display mouse coordinates
            dom.byId("info").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
        }

        async function projectThis() {
            //It appears a map services full extent and initial extent may be different from the item's extent
            //Sudo code to confirm.  Clearly spatial refs are different.
            // ie. item https://lacs.maps.arcgis.com/sharing/rest/content/items/99fd67933e754a1181cc755146be21ca?f=pjson
            /*

            "extent": [
                [
                -178.21759839999993,
                18.921786299999976
                ],
                [
                -66.96927099999998,
                71.40623540871195
                ]
            ]

            */
            var ext = {
                "xmin": -19839092.304288119,
                "ymin": 2145729.6799177886,
                "xmax": -7454985.1465167394,
                "ymax": 11542624.916041069,
                "spatialReference": {
                    "wkid": 102100,
                    "latestWkid": 3857
                }
            };
            var extent = new Extent(ext);
            newGeom = await webAssemblyProjection(extent, new SpatialReference({ "wkid": 4326 }));
            console.log(newGeom);

        }
    });