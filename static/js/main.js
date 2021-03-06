/* ========================================================================
 * pollution main.js
 * ========================================================================
 *
   ======================================================================== */

var app;

require([
  // ArcGIS
  "esri/Map",
  "esri/Basemap",
  "esri/layers/VectorTileLayer",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/widgets/Search",
  "esri/widgets/Popup",
  "esri/widgets/Home",
  "esri/widgets/Legend",
  "esri/widgets/ColorPicker",
  "esri/core/watchUtils",
  "esri/layers/FeatureLayer",
  "esri/layers/MapImageLayer",
  "esri/layers/TileLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/tasks/QueryTask",
  "esri/tasks/support/Query",
  "esri/layers/GraphicsLayer",
  "esri/tasks/Geoprocessor",
  "esri/tasks/support/FeatureSet",
  "esri/layers/support/Field",
  "esri/PopupTemplate",

  "dojo/query",
  "dojo/dom-class",
  "dojo/dom",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/date",
  "dojo/date/locale",
  "dojo/request",
  "dojo/_base/declare",
  "dojo/dom-style",
  "dojo/_base/fx",
  "dojo/keys",
  "dojo/html",

  //cedar chart
  "cedar",

  // Calcite Maps
  "calcite-maps/calcitemaps-v0.3",

  // Boostrap
  "bootstrap/Collapse",
  "bootstrap/Dropdown",
  "bootstrap/Tab",
  "bootstrap/Carousel",
  "bootstrap/Tooltip",
  "bootstrap/Modal",

  // Dojo
  "dojo/domReady!"
], function (Map, Basemap, VectorTileLayer, MapView, SceneView, Search, Popup, Home, Legend, ColorPicker,
  watchUtils, FeatureLayer, MapImageLayer, TileLayer, PictureMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, QueryTask, Query, GraphicsLayer, Geoprocessor, FeatureSet, Field, PopupTemplate, query, domClass, dom, on, domConstruct, date, locale, request, declare, domStyle, fx, keys, html, Cedar, CalciteMapsSettings) {

    app = {
      scale: null,
      zoom: 1,
      lonlat: [122.08430074842634, 42.316065175469994],
      mapView: null,
      mapDiv: "mapViewDiv",
      mapFL: null,
      vectorLayer: null,
      sceneView: null,
      sceneDiv: "sceneViewDiv",
      sceneFL: null,
      activeView: null,
      searchWidgetNav: null,
      searchWidgetPanel: null,
      searchWidgetSettings: null,
      basemapSelected: "topo",
      basemapSelectedAlt: "topo",
      legendLayer: null,
      graphicsLayer: null,
      highlightGraphicsLayer: null,
      legend: null,
      padding: {
        top: 85,
        right: 0,
        bottom: 0,
        left: 0
      },
      uiPadding: {
        components: ["zoom", "attribution", "home", "compass"],
        padding: {
          top: 15,
          right: 15,
          bottom: 30,
          left: 15
        }
      },
      popupOptions: {
        autoPanEnabled: true,
        messageEnabled: false,
        spinnerEnabled: false,
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: true,
          breakpoint: 544 // default
        }
      },
      loading: null,
    }

    //----------------------------------
    // App
    //----------------------------------
    initializeLoadingOverlay();
    initializeMapViews();
    //initializeStationLayer();
    initializeAppUI();


    //----------------------------------
    // Loading Overlay
    //----------------------------------

    function initializeLoadingOverlay() {
      var Loading = declare(null, {
        overlayNode: null,
        indicatorNode: null,
        fadedout: null,
        constructor: function () {
          // save a reference to the overlay
          this.overlayNode = dom.byId("loadingOverlay");
          this.indicatorNode = dom.byId("loadingIndicator");
          this.fadedout = true;
        },
        // called to hide the loading overlay
        endLoading: function () {
          domStyle.set(this.overlayNode, 'display', 'none');
          fx.fadeOut({
            node: this.indicatorNode,
            onEnd: function (node) {
              domStyle.set(node, 'display', 'none');
            }
          }).play();
          this.fadedout = false;
        }
      });
      app.loading = new Loading();

      setTimeout(function () {
        if (app.loading.fadedout == true) {
          app.loading.endLoading();
        }
      }, 10000);
    }

    //----------------------------------
    // Map and Scene View
    //----------------------------------

    function initializeMapViews() {
      // define basemap
      var fuxinwaterBasemap = new TileLayer({
        url: "https://gis.xzdbd.com/arcgis/rest/services/dev/fuxinwater_geodatabase/MapServer"
      });

      app.mapView = new MapView({
        container: app.mapDiv,
        map: new Map({ layers: [fuxinwaterBasemap] }),
        zoom: app.zoom,
        center: app.lonlat,
        padding: app.padding,
        ui: app.uiPadding,
        popup: new Popup(app.popupOptions),
        visible: true
      })

      var homeWidget = new Home({
        view: app.mapView
      });

      // adds the home widget to the top left corner of the MapView
      app.mapView.ui.add(homeWidget, "top-left");

      var highlightGraphicsLayer = new GraphicsLayer();
      app.highlightGraphicsLayer = highlightGraphicsLayer;

      app.activeView = app.mapView;

      app.mapView.then(function () {
        app.loading.endLoading();
        // popup detail content
        app.mapView.popup.on("trigger-action", function (e) {
          if (e.action.id == "detail") {
            showPollutionDeatils();
          }
        });

        // update detail info
        app.mapView.on("click", function (e) {
          console.log("view click")
          var screenPoint = {
            x: e.x,
            y: e.y
          };

          //app.mapView.hitTest(screenPoint).then(updateDetailInfo);
        });
      });
    }

    //----------------------------------
    // Rain Station GraphicsLayer
    //----------------------------------

    function initializeStationLayer() {
      var rainDate = query("#waterStationDate")[0].value;
      var graphicsLayer = new GraphicsLayer();
      app.graphicsLayer = graphicsLayer;
      var highlightGraphicsLayer = new GraphicsLayer();
      app.highlightGraphicsLayer = highlightGraphicsLayer;
      var rainStationSymbol = new PictureMarkerSymbol({
        url: "./static/images/rain.png",
        width: "30px",
        height: "37.5px",
      });

      var template = {
        title: "<font color='#008000'>监测站：{站名}",

        content: [{
          type: "fields",
          fieldInfos: [{
            fieldName: "站码",
            visible: true,
            label: "站码",
          }, /*{
            fieldName: "JYL",
            visible: true,
            label: "雨量",
            format: {
              places: 2,
              digitSeparator: true
            }
          }, */{
            fieldName: "站名",
            visible: true,
            label: "站名",
          }, {
            fieldName: "乡镇",
            visible: true,
            label: "乡镇",
          }, {
            fieldName: "地点",
            visible: true,
            label: "地点",
          }],
        }],
        actions: [{
          title: "详情",
          id: "detail",
          className: "esri-icon-dashboard",
        }]
      };

      var layer = "https://gis.xzdbd.com/arcgis/rest/services/dev/fuxinwater_geodatabase/MapServer/0";
      var queryTask = new QueryTask({
        url: layer
      });
      var query1 = new Query();
      query1.returnGeometry = true;
      query1.outFields = ["*"];
      query1.where = "1=1";

      queryTask.execute(query1, { cacheBust: false }).then(function (result) {
        if (result.features.length > 0) {
          result.features.forEach(function (graphic) {
            graphic.symbol = rainStationSymbol;
            graphic.popupTemplate = template;
            graphicsLayer.add(graphic);
          });
          app.mapView.map.add(graphicsLayer);
          // remove loading
          app.loading.endLoading();
        }
      });
    }


    //----------------------------------
    // Pollution Details Handler
    //----------------------------------

    function showPollutionDeatils() {
      if (domClass.contains(query(".calcite-div-toggle")[0], "calcite-div-toggle-zero-bottom")) {
        zoomOutResultContent()
      }
    }

    //----------------------------------
    // App UI Handlers
    //----------------------------------

    function initializeAppUI() {
      // App UI
      setBasemapEvents();
      setSearchWidgets();
      setPopupPanelEvents();
      setPopupEvents();
      setResultContentEvents();
      setQueryEvents();
      setAnalysisEvents();
    }

    //----------------------------------
    // Basemaps
    //----------------------------------

    function setBasemapEvents() {

      // Sync basemaps for map and scene
      query("#selectBasemapPanel").on("change", function (e) {
        app.basemapSelected = e.target.options[e.target.selectedIndex].dataset.vector;
        setBasemaps();
      });

      function setBasemaps() {
        app.mapView.map.basemap = app.basemapSelected;
      }
    }

    //----------------------------------
    // Search Widgets
    //----------------------------------

    function setSearchWidgets() {

      //TODO - Search Nav + Panel (detach/attach)
      app.searchWidgetNav = createSearchWidget("searchNavDiv", true);
      app.searchWidgetPanel = createSearchWidget("searchPanelDiv", true);
      app.searchWidgetSettings = createSearchWidget("settingsSearchDiv", false);

      // Create widget
      function createSearchWidget(parentId, showPopup) {
        var search = new Search({
          viewModel: {
            view: app.activeView,
            popupOpenOnSelect: showPopup,
            highlightEnabled: false,
            maxSuggestions: 4
          },
        }, parentId);
        search.startup();
        return search;
      }
    }

    //----------------------------------
    // Popups and Panels
    //----------------------------------

    function setPopupPanelEvents() {

      // Views - Listen to view size changes to show/hide panels
      app.mapView.watch("size", viewSizeChange);

      function viewSizeChange(screenSize) {
        if (app.screenWidth !== screenSize[0]) {
          app.screenWidth = screenSize[0];
          setPanelVisibility();
        }
      }

      // Popups - Listen to popup changes to show/hide panels
      app.mapView.popup.watch(["visible", "currentDockPosition"], setPanelVisibility);

      // Panels - Show/hide the panel when popup is docked
      function setPanelVisibility() {
        var isMobileScreen = app.activeView.widthBreakpoint === "xsmall" || app.activeView.widthBreakpoint === "small",
          isDockedVisible = app.activeView.popup.visible && app.activeView.popup.currentDockPosition,
          isDockedBottom = app.activeView.popup.currentDockPosition && app.activeView.popup.currentDockPosition.indexOf("bottom") > -1;
        // Mobile (xsmall/small)
        if (isMobileScreen) {
          if (isDockedVisible && isDockedBottom) {
            query(".calcite-panels").addClass("invisible");
          } else {
            query(".calcite-panels").removeClass("invisible");
          }
        } else { // Desktop (medium+)
          if (isDockedVisible) {
            query(".calcite-panels").addClass("invisible");
          } else {
            query(".calcite-panels").removeClass("invisible");
          }
        }
      }

      // Panels - Dock popup when panels show (desktop or mobile)
      query(".calcite-panels .panel").on("show.bs.collapse", function (e) {
        if (app.activeView.popup.currentDockPosition || app.activeView.widthBreakpoint === "xsmall") {
          app.activeView.popup.dockEnabled = false;
        }
      });

      // Panels - Undock popup when panels hide (mobile only)
      query(".calcite-panels .panel").on("hide.bs.collapse", function (e) {
        if (app.activeView.widthBreakpoint === "xsmall") {
          app.activeView.popup.dockEnabled = true;
        }
      });
    }

    //----------------------------------
    // Popup collapse (optional)
    //----------------------------------

    function setPopupEvents() {
      query(".esri-popup__header-title").on("click", function (e) {
        query(".esri-popup__main-container").toggleClass("esri-popup-collapsed");
        app.activeView.popup.reposition();
      }.bind(this));
    }

    //----------------------------------
    // Result Content
    //----------------------------------
    function setResultContentEvents() {
      query(".calcite-div-toggle").on("click", function (e) {
        // open, to close
        if (domClass.contains(e.currentTarget, "calcite-div-toggle-bottom")) {
          zoomInResultContent();
        } else if (domClass.contains(e.currentTarget, "calcite-div-toggle-zero-bottom")) {
          zoomOutResultContent(e);
        }
      });
    }

    function zoomOutResultContent() {
      domClass.replace(query(".calcite-div-toggle")[0], "calcite-div-toggle-bottom", "calcite-div-toggle-zero-bottom");
      domClass.replace(query(".calcite-div-toggle .up-arrow")[0], "down-arrow", "up-arrow");
      domClass.replace(query(".calcite-div-content-info-collapse")[0], "calcite-div-content-info", "calcite-div-content-info-collapse");
      domStyle.set(query(".calcite-div-content-info")[0], 'display', '');
      domClass.add(query(".calcite-legend-box")[0], "calcite-legend-box-up");
    }

    function zoomInResultContent() {
      domClass.replace(query(".calcite-div-toggle")[0], "calcite-div-toggle-zero-bottom", "calcite-div-toggle-bottom");
      domClass.replace(query(".calcite-div-toggle .down-arrow")[0], "up-arrow", "down-arrow");
      domClass.replace(query(".calcite-div-content-info")[0], "calcite-div-content-info-collapse", "calcite-div-content-info");
      domStyle.set(query(".calcite-div-content-info-collapse")[0], 'display', 'none');
      domClass.remove(query(".calcite-legend-box")[0], "calcite-legend-box-up");
    }

    //----------------------------------
    // Legend events
    //----------------------------------
    function setLegendEvents() {
      app.legend.layerInfos[0].layer.then(function () {
        var legendContentNode = domConstruct.create("div", {
          className: "calcite-legend-content"
        }, query(".calcite-legend-container")[0]);

        app.legend.activeLayerInfos.items[0].legendElements.forEach(function (element) {
          if (element.type == "symbol-table") {
            var legendListNode = domConstruct.create("div", {
              className: "calcite-legend-list"
            }, legendContentNode);

            var legendNode = domConstruct.create("div", {
              className: "calcite-legend"
            }, legendListNode);
            var symbolNode = domConstruct.create("img", {
              src: element.infos[0].src,
              style: "width:" + element.infos[0].width + ";" + "height:" + element.infos[0].height
            }, legendNode);

            var labelNode = domConstruct.create("div", {
              className: "calcite-legend-label",
              innerHTML: element.title
            }, legendListNode);
          }
        }, this);
        //var symbolNode = domConstruct.create("img", {
        //    src: app.legend.activeLayerInfos.items[0].legendElements[0].infos[0].src,
        //    style: "width:" + app.legend.activeLayerInfos.items[0].legendElements[0].infos[0].width + ";" + "height:" + app.legend.activeLayerInfos.items[0].legendElements[0].infos[0].height
        //}, legendNode);
      });
    }

    //----------------------------------
    // Query events
    //----------------------------------
    function setQueryEvents() {
      // show feature layer when panel opens
      query(".calcite-panels #panelWaterStation").on("show.bs.collapse", function (e) {
        updateGraphicsLayer();

      });

      // show feature layer when panel opens Month
      query(".calcite-panels #panelWaterStationMonth").on("show.bs.collapse", function (e) {
        updateGraphicsLayerMonth();

      });

      // show feature layer when panel opens Month
      query(".calcite-panels #panelWaterStationYear").on("show.bs.collapse", function (e) {
        updateGraphicsLayerYear();

      });

      // hide feature layer when panel closes
      query(".calcite-panels .panel").on("hide.bs.collapse", function (e) {
        // TODO: switch case
        console.log(e.target.id);
        app.mapView.map.layers.remove(app.graphicsLayer);
        app.mapView.map.layers.remove(app.highlightGraphicsLayer);
      });

      // search input enter event, update graphicsLayer
      query("#waterStationSearchInput").on("keydown", function (event) {
        if (event.keyCode == keys.ENTER) {
          updateGraphicsLayer();
        }
      });

      // date control change event, update graphicsLayer
      query("#waterStationDate").on("change", function (event) {
        updateGraphicsLayer();
      });

      // search input enter event, update graphicsLayer
      query("#waterStationSearchInputMonth").on("keydown", function (event) {
        if (event.keyCode == keys.ENTER) {
          updateGraphicsLayerMonth();
        }
      });

      // date control change event, update graphicsLayer
      query("#waterStationMonth").on("change", function (event) {
        updateGraphicsLayerMonth();
      });

      // search input enter event, update graphicsLayer
      query("#waterStationSearchInputYear").on("keydown", function (event) {
        if (event.keyCode == keys.ENTER) {
          updateGraphicsLayerYear();
        }
      });

      // date control change event, update graphicsLayer
      query("#waterStationYear").on("change", function (event) {
        updateGraphicsLayerYear();
      });
    }

    function highlightSelectedGraphic(e) {
      highlightGraphicsLayer = app.highlightGraphicsLayer;
      highlightGraphicsLayer.removeAll();
      app.mapView.map.layers.remove(highlightGraphicsLayer);
      stationName = e.target.parentElement.firstElementChild.innerHTML;
      app.graphicsLayer.graphics.forEach(function (graphic) {
        if (graphic.attributes.站名 == stationName) {
          graphic.symbol = new PictureMarkerSymbol({
            url: "./static/images/rain-highlight2.png",
            width: "35px",
            height: "43.8px",
          });
          highlightGraphicsLayer.add(graphic);
          app.mapView.map.layers.add(highlightGraphicsLayer);
          app.mapView.goTo({
            target: graphic,
            zoom: 3
          });
          app.mapView.scale = 85598.60063542379;
        }
      });
    }

    function updateGraphicsLayer() {
      // remove graphics
      app.mapView.map.remove(app.graphicsLayer);
      app.mapView.map.layers.remove(app.highlightGraphicsLayer);

      var keywords = query("#waterStationSearchInput")[0].value;
      var rainDate = query("#waterStationDate")[0].value;

      var graphicsLayer = new GraphicsLayer();
      app.graphicsLayer = graphicsLayer;
      var rainStationSymbol = new PictureMarkerSymbol({
        url: "./static/images/rain.png",
        width: "30px",
        height: "37.5px",
      });

      var template = {
        title: "<font color='#008000'>监测站：{站名}",

        content: [{
          type: "fields",
          fieldInfos: [{
            fieldName: "站码",
            visible: true,
            label: "站码",
          }, /*{
            fieldName: "JYL",
            visible: true,
            label: "雨量",
            format: {
              places: 2,
              digitSeparator: true
            }
          }, */{
            fieldName: "站名",
            visible: true,
            label: "站名",
          }, {
            fieldName: "乡镇",
            visible: true,
            label: "乡镇",
          }, {
            fieldName: "地点",
            visible: true,
            label: "地点",
          }],
        }],
        actions: [{
          title: "详情",
          id: "detail",
          className: "esri-icon-dashboard",
        }]
      };

      var layer = "https://gis.xzdbd.com/arcgis/rest/services/dev/fuxinwater_geodatabase/MapServer/0";
      var queryTask = new QueryTask({
        url: layer
      });
      var query1 = new Query();
      query1.returnGeometry = true;
      query1.outFields = ["*"];

      if (keywords != "" && !isNaN(keywords)) {
        query1.where = "站码 = " + keywords + " OR 站名 like '%" + keywords + "%'";
      } else {
        query1.where = "站名 like '%" + keywords + "%'";
      }


      queryTask.execute(query1, { cacheBust: false }).then(function (result) {
        if (result.features.length > 0) {
          initResultGrid(result.features, rainDate);
          //html.set(query("#waterStation-info-table")[0], htmlTemplate);
          result.features.forEach(function (graphic) {
            graphic.symbol = rainStationSymbol;
            graphic.popupTemplate = template;
            graphicsLayer.add(graphic);
          });
          app.mapView.map.add(graphicsLayer);
          // remove loading
          app.loading.endLoading();
        } else {
          html.set(query("#waterStation-info-table")[0], "<p>未找到站点信息</p>");
        }
      });

    }

    function updateGraphicsLayerMonth() {
      // remove graphics
      app.mapView.map.remove(app.graphicsLayer);
      app.mapView.map.layers.remove(app.highlightGraphicsLayer);

      var keywords = query("#waterStationSearchInputMonth")[0].value;
      var rainMonth = query("#waterStationMonth")[0].value;
      var year = rainMonth.substring(0, rainMonth.indexOf("-"));
      var month = rainMonth.substring(rainMonth.indexOf("-") + 1, rainMonth.length);

      var graphicsLayer = new GraphicsLayer();
      app.graphicsLayer = graphicsLayer;
      var rainStationSymbol = new PictureMarkerSymbol({
        url: "./static/images/rain.png",
        width: "30px",
        height: "37.5px",
      });

      var template = {
        title: "<font color='#008000'>监测站：{站名}",

        content: [{
          type: "fields",
          fieldInfos: [{
            fieldName: "站码",
            visible: true,
            label: "站码",
          }, {
            fieldName: "站名",
            visible: true,
            label: "站名",
          }, {
            fieldName: "乡镇",
            visible: true,
            label: "乡镇",
          }, {
            fieldName: "地点",
            visible: true,
            label: "地点",
          }],
        }],
        actions: [{
          title: "详情",
          id: "detail",
          className: "esri-icon-dashboard",
        }]
      };

      var layer = "https://gis.xzdbd.com/arcgis/rest/services/dev/fuxinwater_geodatabase/MapServer/0";
      var queryTask = new QueryTask({
        url: layer
      });
      var query1 = new Query();
      query1.returnGeometry = true;
      query1.outFields = ["*"];

      if (keywords != "" && !isNaN(keywords)) {
        query1.where = "站码 = " + keywords + " OR 站名 like '%" + keywords + "%'";
      } else {
        query1.where = "站名 like '%" + keywords + "%'";
      }


      queryTask.execute(query1, { cacheBust: false }).then(function (result) {
        if (result.features.length > 0) {
          //initResultGrid(result.features, rainDate);
          //html.set(query("#waterStation-info-table")[0], htmlTemplate);
          result.features.forEach(function (graphic) {
            graphic.symbol = rainStationSymbol;
            graphic.popupTemplate = template;
            graphicsLayer.add(graphic);
          });
          app.mapView.map.add(graphicsLayer);
          // remove loading
          app.loading.endLoading();
        } else {
          html.set(query("#waterStation-info-table-month")[0], "<p>未找到站点信息</p>");
        }

        var stationIds = "";
        // get all stationIds
        result.features.forEach(function (feature) {
          stationIds += feature.attributes.站码 + ",";
        });
        stationIds = stationIds.substr(0, stationIds.length - 1);

        request.post("./index?year=" + year + "&month=" + month + "&stationIds=" + stationIds, {
          handleAs: "json"
        }).then(function (gridHtml) {
          html.set(query("#waterStation-info-table-month")[0], gridHtml);
          // table row click event, highlight the result
          query("#waterStation-info-table-month tr").on("click", function (e) {
            highlightSelectedGraphic(e)
          });
        });
      });

    }

    function updateGraphicsLayerYear() {
      // remove graphics
      app.mapView.map.remove(app.graphicsLayer);
      app.mapView.map.layers.remove(app.highlightGraphicsLayer);

      var keywords = query("#waterStationSearchInputYear")[0].value;
      var year = query("#waterStationYear")[0].value;

      var graphicsLayer = new GraphicsLayer();
      app.graphicsLayer = graphicsLayer;
      var rainStationSymbol = new PictureMarkerSymbol({
        url: "./static/images/rain.png",
        width: "30px",
        height: "37.5px",
      });

      var template = {
        title: "<font color='#008000'>监测站：{站名}",

        content: [{
          type: "fields",
          fieldInfos: [{
            fieldName: "站码",
            visible: true,
            label: "站码",
          }, {
            fieldName: "站名",
            visible: true,
            label: "站名",
          }, {
            fieldName: "乡镇",
            visible: true,
            label: "乡镇",
          }, {
            fieldName: "地点",
            visible: true,
            label: "地点",
          }],
        }],
        actions: [{
          title: "详情",
          id: "detail",
          className: "esri-icon-dashboard",
        }]
      };

      var layer = "https://gis.xzdbd.com/arcgis/rest/services/dev/fuxinwater_geodatabase/MapServer/0";
      var queryTask = new QueryTask({
        url: layer
      });
      var query1 = new Query();
      query1.returnGeometry = true;
      query1.outFields = ["*"];

      if (keywords != "" && !isNaN(keywords)) {
        query1.where = "站码 = " + keywords + " OR 站名 like '%" + keywords + "%'";
      } else {
        query1.where = "站名 like '%" + keywords + "%'";
      }


      queryTask.execute(query1, { cacheBust: false }).then(function (result) {
        if (result.features.length > 0) {
          //initResultGrid(result.features, rainDate);
          //html.set(query("#waterStation-info-table")[0], htmlTemplate);
          result.features.forEach(function (graphic) {
            graphic.symbol = rainStationSymbol;
            graphic.popupTemplate = template;
            graphicsLayer.add(graphic);
          });
          app.mapView.map.add(graphicsLayer);
          // remove loading
          app.loading.endLoading();
        } else {
          html.set(query("#waterStation-info-table-year")[0], "<p>未找到站点信息</p>");
        }

        var stationIds = "";
        // get all stationIds
        result.features.forEach(function (feature) {
          stationIds += feature.attributes.站码 + ",";
        });
        stationIds = stationIds.substr(0, stationIds.length - 1);

        request.post("./index?year=" + year + "&stationIds=" + stationIds, {
          handleAs: "json"
        }).then(function (gridHtml) {
          html.set(query("#waterStation-info-table-year")[0], gridHtml);
          // table row click event, highlight the result
          query("#waterStation-info-table-year tr").on("click", function (e) {
            highlightSelectedGraphic(e)
          });
        });
      });

    }

    function initResultGrid(features, rainDate) {
      var gridHtml = '<tbody>';
      gridHtml += '<tr>' +
        '<th class="success">站名</th>' +
        '<th class="success">雨量</th>' +
        '<th class="success">日期</th>' +
        '</tr>';

      var stationIds = "";
      // get all stationIds
      features.forEach(function (feature) {
        stationIds += feature.attributes.站码 + ",";
      });
      stationIds = stationIds.substr(0, stationIds.length - 1);

      //query rain info
      var layer = "https://gis.xzdbd.com/arcgis/rest/services/dev/fuxinwater_geodatabase/MapServer/8";
      var queryTask = new QueryTask({
        url: layer
      });
      var queryRain = new Query();
      queryRain.returnGeometry = false;
      queryRain.outFields = ["*"];
      queryRain.where = "站号 in (" + stationIds + ") and 日期 = timestamp '" + rainDate + "'";

      queryTask.execute(queryRain).then(function (result) {
        var totalRain = 0;
        if (result.features.length > 0) {
          result.features.forEach(function (feature) {
            totalRain += feature.attributes.雨量;
            gridHtml += '<tr>' +
              '<td>' + feature.attributes.站名 + '</td>' +
              '<td>' + feature.attributes.雨量 + '</td>' +
              '<td>' + rainDate + '</td>' +
              '</tr>';
          });
        } else {
          features.forEach(function (feature) {
            totalRain += feature.attributes.雨量;
            gridHtml += '<tr>' +
              '<td>' + feature.attributes.站名 + '</td>' +
              '<td>' + 0 + '</td>' +
              '<td>' + rainDate + '</td>' +
              '</tr>';
          });
        }
        gridHtml += '<tr><td colspan="3" style="text-align:right;">总计雨量:' + totalRain + '</td></tr>'
        gridHtml += '</tbody>';
        html.set(query("#waterStation-info-table")[0], gridHtml);
        // table row click event, highlight the result
        query("#waterStation-info-table tr").on("click", function (e) {
          highlightSelectedGraphic(e)
        });
      });
    }


    //----------------------------------
    // Analysis events
    //----------------------------------
    function setAnalysisEvents() {
      query("#submitGP").on("click", function (e) {
        var gpResultImageLayer;
        query('#gp-status-lable')[0].innerHTML = "计算年雨量中...";
        var year = query("#analysisYear")[0].value;
        request.post("./index?year=" + year + "&updateRain=true", {
          handleAs: "json"
        }).then(function (result) {
          console.log(result);

          var gp = new Geoprocessor("https://gis.xzdbd.com/arcgis/rest/services/dev/rain_analysis_geodatabase/GPServer/rain_idw");
          var params = {
            Output_cell_size: "200"
          };
          gp.submitJob(params).then(draw, errBack, progTest);

          function draw(result) {
            console.log(result);
            query('#gp-status-lable')[0].innerHTML = "分析任务执行完成";
            gpResultImageLayer = gp.getResultMapImageLayer(result.jobId);
            gpResultImageLayer.opacity = 0.8;
            app.mapView.map.layers.add(gpResultImageLayer);
          }

          function progTest(value) {
            console.log(value.jobStatus);
            query('#gp-status-lable')[0].innerHTML = "分析任务执行中...";
          }

          function errBack(err) {
            console.log("gp error: ", err);
          }
        });

        // hide feature layer when panel closes
        query(".calcite-panels #panelAnalysis").on("hide.bs.collapse", function (e) {
          // TODO: switch case
          app.mapView.map.layers.remove(gpResultImageLayer);
        });
      });
    }

  });