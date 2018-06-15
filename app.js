var map, graphicLayer, featureLayer, arcgisDomain, arcgisPortalUrl, appId, catalog, dataset;
catalog = "/arcgis/rest/services";
dataset = "/Hosted/USA_Boundaries_2015/FeatureServer/1";

require([
    "esri/map",
    "esri/layers/FeatureLayer",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
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
    "dojo/domReady!"
], function (
    Map,
    FeatureLayer,
    Point,
    Polygon,
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
    webMercatorUtils
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
            var getCenter = function (geoExtent) {
                var xMid = (geoExtent.xmin + geoExtent.xmax) / 2;
                var yMid = (geoExtent.ymin + geoExtent.ymax) / 2;
                var point = new Point();
                point.x = xMid;
                point.y = yMid;
                point.spatialReference = geoExtent.spatialReference;
                return point;
            }
            for (var i = 0; i < fs.features.length; i++) {
                var feat = fs.features[i];
                //Should first check if polygon or line, but doing that now
                var geo = new Polygon(feat.geometry);
                console.log(feat.attributes["st_abbrev"], geo.getExtent().normalize().length);
                var p = getCenter(geo.getExtent());
                centerPoints.push(p);
            }
            drawPoints(centerPoints);
            return centerPoints;
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
    });