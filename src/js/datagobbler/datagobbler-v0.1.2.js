// ARC Service JSON
//Caution-sampleserver3.arcgisonline.com/ArcGIS/rest/services/Earthquakes/EarthquakesFromLastSevenDays/FeatureServer/0/query?objectIds=&where=magnitude+%3E+4.5&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&outSR=&returnCountOnly=false&returnIdsOnly=false&f=pjson

//XML Fomrats
//https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.quakeml
//https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.atom
//https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month_depth_link.kml

//DataGobbler version 0.1.2
//Last updated 05/05/2017

//load initial json config options

!function() {
    datagobbler = {};
    datagobbler.data_layers = {};
    datagobbler.version = '0.1.2';
    datagobbler.numOfDataFilesToLoad = 0;
    datagobbler.numOfDataFilesLoaded = 0;
    datagobbler.numOfDataFilesToFilter = 0;
    datagobbler.numOfDataFilesFiltered = 0;
    datagobbler.numRecords = 0;
    datagobbler.functions = {};
    datagobbler.data = {
        functions:{
            all_layers:{},
            by_layer_name:{}
        },
        data_layers:{},
        by_layer_name:{},
        api_help:{
            all_layers:{},
            by_layer_name:{}
        }
    };
    
    //load initial json config options
    datagobbler.getData = function(options){
        //console.log("datagobbler.getData",options);
        var _url    = options.configFile;
        var _cb     = options.callbackFunction;
        var _lcb    = options.loadingCallbackFunction;
        d3.json(_url, function(error,data) {
            if(error){
                console.log(error,"JSON error");
            }else{
                datagobbler.ondataLoaded = _cb;
                datagobbler.ondataLoading = _lcb;
                //console.log(data);
                //_cb(data);
                datagobbler.data_layers = data.data_layers;
                datagobbler.data_options = data.data_options;
                datagobbler.setInitialStartEndDates(data);
                
                //datagobbler.data_options.dates = datagobbler.setDefaultDates(data.data_options.default_dates);
                //datagobbler.setDataOptions();
            }
        });
    }
    
    datagobbler.setInitialStartEndDates = function(data){
        var promise = new Promise(function (resolve, reject) {
            var _dates = datagobbler.setDefaultDates(data.data_options.default_dates);
            var _valid = false;
            if(_dates.date_start._isValid && _dates.date_end._isValid){
                _valid = true;
            }
            if(_valid){
                resolve(_dates);
            }else{
                reject("sorry.");
            }
        })
        .then(function(result) {
            datagobbler.data_options.dates = result;
            datagobbler.setDataOptions(result);
            //console.log(datagobbler.data_options,this.data_options);
        });
    }

    datagobbler.setDataOptions = function(args){
        //console.log(this.data_options.dates);
        
        var promise = new Promise(function (resolve, reject) {
            var _dateStart = datagobbler.getCommonTime({
                time:datagobbler.data_options.dates.date_start,
                format:datagobbler.data_options.default_dates.date_format
            });
            var _dateEnd = datagobbler.getCommonTime({
                time:datagobbler.data_options.dates.date_end,
                format:datagobbler.data_options.default_dates.date_format
            });
            var _returnObj = {dateEnd:_dateEnd,dateStart:_dateStart};
            var _valid = false;
            
            if(_dateStart.date._isValid && _dateEnd.date._isValid){
                _valid = true;
            }
            
            
            if(_valid){
                resolve(_returnObj);
            }else{
                reject("sorry.");
            }
        })
        .then(function(result) {
            datagobbler.data_options.default_dates['idate_start'] = result.dateStart;
            datagobbler.data_options.default_dates['idate_end'] = result.dateEnd;
            //console.log("result setDataOptions: ",datagobbler.data_options.default_dates);
            datagobbler.startAndEndDatesReady();
        });

    }
    
    datagobbler.startAndEndDatesReady = function(){
        //console.log("datagobbler.startAndEndDatesReady",this);
       
        this.data['data_requests'] = {};
        this.data['proxy_requests'] = {};
        this.data_options.dates['currentDate'] = {
            'year':     this.data_options.dates.date_start.year(),
            'month':    this.data_options.dates.date_start.month()+1,
            'day':      this.data_options.dates.date_start.date(),
            'date': this.data_options.dates.date_start
        }
        var _cnt = 0;// Get quick count of how many data layers we have
        for(dl in datagobbler.data_layers){
            if(!datagobbler.data.by_layer_name[dl]){
                datagobbler.data.by_layer_name[dl] = {};
                datagobbler.data.data_layers[dl] = {};
                datagobbler.data.data_layers[dl].data_filtered = {};
                //.data_layers[layer].data_filtered
                //datagobbler.data.by_layer_name[dl]['all_data'] = {};//regular:[],geospatial:[],objects:[]};
                //datagobbler.data.by_layer_name[dl]['by_date'] = {};//{inside_range:{},outside_range:{}};
            
                datagobbler.data.by_layer_name[dl]['errors'] = {};
            }

            _cnt++;
        }
        //console.log(this);
        // Pass the number of data layers we have to datagobbler.numOfDataLayers datagobbler.numOfDataLayers = _cnt;
        datagobbler.createDataServiceUrls();
        datagobbler.loadAllDataLayers();
        
    }

    datagobbler.setDefaultDates = function(args){
        /*
        Gets sent an object like:
        {
            "date_format":"MM/DD/YYYY",
            "date_start":"01/01/2000",
            "date_end":"09/01/2016"
        }
        
        OR
        {
            "date_format":"MM/DD/YYYY",
            "date_start":-10,
            "date_end":-1
        }
        */
        var _obj = {};
        if(typeof args.date_end === 'string'){
            _obj.date_end = new moment(args.date_end).utc();
            _obj.date_start = new moment(args.date_end).utc();
        }else{
            _t = new moment();
            _obj.date_end = new moment().utc().add(args.date_end,'days');
            _obj.date_start = new moment().utc().add(args.date_end,'days');
        }

        if(typeof args.date_start === 'string'){
            _obj.date_start = new moment(args.date_start).utc();
        }else{
            _obj.date_start.utc().add(args.date_start,'days');
        }
        
        return _obj; //returns object like {date_start:{momentjs date},date_end:{momentjs date}}
    }

    datagobbler.createDataServiceUrls = function() {
        for(dl in datagobbler.data_layers){
            var _url = datagobbler.data_layers[dl].api_info.url;
            var _isOnline = (_url.indexOf("http")>=0);
            //console.log("datagobbler.createDataServiceUrls",_isOnline);
            if(_isOnline){
                _url = datagobbler.createOnlineUrl(_url);
            }else{
                var url = window.location.href;
                var loc = window.location.pathname;
                var dir = loc.substring(0, loc.lastIndexOf('/'));
                var url_end = url.lastIndexOf("/");
                var res = url.substring(0, url_end+1);
                _url = res + _url;
                //console.log("NOT http",_url);
            }
            _url = datagobbler.getProxyUrl(_url,datagobbler.data_layers[dl].api_info.proxy_url);
            // Create an object to track whether a layer has loaded of not.
            datagobbler.data_layers[dl].api_info.url = _url; datagobbler.data_layers[dl]['loadingStatus'] = {'mustDownload':false,'proxyLayer':false,'pendingDownload':false,'downloadCompleted':false,'downloadError':false,'isFiltered':false};
            _url = encodeURIComponent(_url);
            var _args = {'layer':dl,'url':_url};
            datagobbler.checkIfMustDownloadLayerData(_args);
        }
    }

    datagobbler.checkIfMustDownloadLayerData = function(args){
         // Create list of urls to load
        // Add the url and layer name to the datagobbler.data.data_requests object
        if(!datagobbler.data.data_requests[args.url]){
            datagobbler.data.data_requests[args.url] = args.layer;
            datagobbler.data_layers[args.layer]['loadingStatus'].mustDownload = true;
            // Keep track of the number of urls we're actually loading
            // versus the number of layers
            datagobbler.numOfDataFilesToLoad++;
        }else{
            datagobbler.data.proxy_requests[args.layer] = args.url;
            datagobbler.data_layers[args.layer]['loadingStatus'].proxyLayer = datagobbler.data.data_requests[args.url];
        }
    }

    datagobbler.createOnlineUrl = function(_url){
        var _ds = new moment(datagobbler.data_options.dates.date_start);//.format(datagobbler.data_layers[dl].api_info.date_info.date_format); // get date for this layer in a format the API will accept (eg. UNIX, YYYY-MM-DDZ, etc)
        var _de = new moment(datagobbler.data_options.dates.date_end);//.format(datagobbler.data_layers[dl].api_info.date_info.date_format); // get date for this layer in a format the API will accept (eg. UNIX, YYYY-MM-DDZ, etc)
        _ds = _ds.format(datagobbler.data_layers[dl].api_info.url_date_format);
        _de = _de.format(datagobbler.data_layers[dl].api_info.url_date_format);
        _url = _url.replace("{{west}}", datagobbler.data_options.dataBounds.west);
        _url = _url.replace("{{south}}", datagobbler.data_options.dataBounds.south);
        _url = _url.replace("{{east}}", datagobbler.data_options.dataBounds.east);
        _url = _url.replace("{{north}}", datagobbler.data_options.dataBounds.north);
        _url = _url.replace(/\{{date_field}}/g, datagobbler.data_layers[dl].api_info.date_info.date_field); // uses regular expression to replace ALL (the "g" is for global) matching instances of date_field
        _url = _url.replace("{{date_start}}",_ds); // replace start date with the start date we calculated earlier
        _url = _url.replace("{{date_end}}",_de); // replace end date with the end date we calculated earlier
        return _url;
    }

    datagobbler.getProxyUrl = function(_url,_proxyUrl){
        switch(_proxyUrl) {
            case null:
                _url = _url;
                break;
            case 'default':
                _url = datagobbler.data_options.default_proxy_url + _url;
                break;
            default: //custom url
                _url = _proxyUrl + _url;
        }
        return _url;
    }

    datagobbler.showLoadingStatus = function(evt){
        for(s in evt.loadingStatusObject){
            if(evt.loadingStatusObject[s].proxyLayer){
                _pl = evt.loadingStatusObject[s].proxyLayer;
                evt.loadingStatusObject[s].downloadCompleted = evt.loadingStatusObject[_pl].downloadCompleted;
            }
            var _obj = {"layer":s,"title":datagobbler.data_layers[s].title,"loadingStatus":evt.loadingStatusObject[s]};
            datagobbler.ondataLoading(_obj);
        }
    }

    datagobbler.layerHasGeospatialData = function(layer,isGeo){
        datagobbler.data_layers[layer].api_info.has_geospatial_data = isGeo;
    }
    
    datagobbler.layerHasTemporalData = function(layer,isTemporal){
        datagobbler.data_layers[layer].api_info.has_temporal_data = isTemporal;
    }

    datagobbler.loadAllDataLayers = function(){
        datagobbler['loader'] = document.createEvent("Event");
        datagobbler.loader.initEvent("loadingStatus",true,true);
        datagobbler.loader['loadingStatusObject'] = datagobbler.getLoadingStatusObject();
        document.addEventListener("loadingStatus",datagobbler.showLoadingStatus,false);
        for(dl in datagobbler.data_layers){
            var _mustDownload = datagobbler.data_layers[dl].loadingStatus.mustDownload;
            if(_mustDownload){
                var _filetype = datagobbler.data_layers[dl].api_info.file_type;
                switch(_filetype) {
                    case "topojson":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataTOPOJSON(dl);
                        break;
                    case "geojson":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataGEOJSON(dl);
                        break;
                    case "arcjson":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataARCJSON(dl);
                        break;
                    case "shp":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataSHP(dl);
                        break;
                    case "kml":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataKML(dl);
                        break;
                    case "atom":
                        datagobbler.layerHasGeospatialData(dl);
                        datagobbler.downloadDataATOM(dl);
                        break;
                    case "georss":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataGEORSS(dl);
                        break;
                    case "csv":
                        datagobbler.checkIfGeospatial(dl);
                        datagobbler.downloadDataCSV(dl);
                        break;
                    case "shp.zip":
                        datagobbler.layerHasGeospatialData(dl,true);
                        datagobbler.downloadDataSHPZIP(dl);
                        break;
                }
            }
            //console.log("========================");
        }
    }
    
    datagobbler.checkIfGeospatial = function(layer){
        var _hasLatLonInfo = (datagobbler.data_layers[layer].api_info.if_not_geospatial_file_type.field_to_use_for_latitude !=null && datagobbler.data_layers[layer].api_info.if_not_geospatial_file_type.field_to_use_for_longitude !=null);
        if(_hasLatLonInfo){;
            datagobbler.layerHasGeospatialData(layer,true);
        }else{
            datagobbler.layerHasGeospatialData(layer,false);
        }
    }

    datagobbler.loadAllProxyDataLayers = function(){
        //console.log('NOW LOAD PROXIES...');//,datagobbler.data_layers);//,datagobbler.data.proxy_requests);
        for(p in datagobbler.data.proxy_requests){

            var _proxyUrl = datagobbler.data.proxy_requests[p];
            var _targLayer = datagobbler.data.data_requests[_proxyUrl];

            datagobbler.data_layers[p].api_info.data = $.extend(true,{},datagobbler.data_layers[_targLayer].api_info.data);
            datagobbler.data_layers[p].api_info.objects = $.extend(true,[],datagobbler.data_layers[_targLayer].api_info.objects);

            if(datagobbler.data_layers[_targLayer].layerOkToFilter){
                datagobbler.layerOkToFilter(p);
            }else{
                datagobbler.layerNotOkToFilter(p);
                console.log("DON'T DO ANYTHING WITH " + p +", because " + _targLayer + " did not download!");
                var _error = {'notes':'This is a proxy layer that pulls from a golden copy. The gold copy did not download, which means the derrivative/proxy copy could not be created.','proxyLayer':p,'targetLayer':_targLayer};
                datagobbler.logSystemErrorForLayer({'layer':p,'errorEvent':_error});
            }
        }

    }

    datagobbler.getDataType = function(type){
        // accepts type as a string
        var _type = type.toLowerCase();
        var _geom_type;
        //console.log("datagobbler.getDataType: ",_type);

        switch(_type) {
            case "point":
                _geom_type = "point";
                break;
            case "linestring":
                _geom_type = "linestring";
                break;
            case "multilinestring":
                _geom_type = "multilinestring";
                break;
            case "polygon":
                _geom_type = "polygon";
                break;
            case "multipolygon":
                _geom_type = "multipolygon";
                break;
            default:
                _geom_type = null;
                break;
        }
        return {"name":"geometry_type","type":_geom_type};

    }
    
    datagobbler.downloadDataJSONP = function(layer){
        //console.log("datagobbler.downloadDataJSONP",layer);
        var _url = layer.api_info.url;
        var _loadingStatus = layer.loadingStatus;
        
        _loadingStatus.pendingDownload = true;
        //console.log('datagobbler.downloadDataARCJSON',_url);
        
         var errorJSONP = function(error){
            _loadingStatus.downloadCompleted = false;
            _loadingStatus.downloadError = true;
            //datagobbler.data_layers[layer].api_info['data'] = null;
            //datagobbler.DownloadError(layer,error);
            //console.log(layer,"==== >> JSON error <<====");
        }
        var successJSONP = function(data){
            _loadingStatus.downloadCompleted = true;
            //var _esri = esriConverter();
            //var _geojson = _esri.toGeoJson(data);
            //datagobbler.data_layers[layer].api_info['data'] = _geojson;
            //datagobbler.DownloadSuccess(layer);
            //datagobbler.decodeDataGEOJSON(layer);
        }
         // Use jQuery ajax method for jsonp since many rest services like ESRI have
         // cross-domain restrictions in place.
         
         $.ajax({
            url: _url,
            data: null,
            type: "POST",
            dataType: 'jsonp',
            xhrFields: {
                withCredentials: true,
                'Access-Control-Allow-Origin':'*'
            },
            success: function(response) {
                response.jquery = true;
                _loadingStatus.downloadCompleted = true;
                layer.api_info['data'] = response;
                //datagobbler.DownloadSuccess(layer);
                console.log("SUCCESS!",response,layer);
                //successJSONP(response);
            },
            error: function(error) {
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.downloadError = true;
                layer.api_info['data'] = null;
            }
        });
            
    }

    datagobbler.downloadDataTOPOJSON = function(layer){
        //console.log('datagobbler.downloadDataJSON');
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        //console.log(_url);
        _loadingStatus.pendingDownload = true;
        d3.json(_url, function(error,data) { //console.log('JSON done.',data,_url);
            _loadingStatus.pendingDownload = false;
            if(error){
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.DownloadError(layer,error);
                console.log("downloadDataTOPOJSON BAD");
            }else{
                _loadingStatus.downloadCompleted = true;
                datagobbler.data_layers[layer].api_info['data'] = data;
                datagobbler.DownloadSuccess(layer);
                datagobbler.decodeDataTOPOJSON(layer);
                console.log("downloadDataTOPOJSON OK");
            }
        });

    }

    datagobbler.decodeDataTOPOJSON = function(layer){
        var _data = datagobbler.data_layers[layer].api_info.data;
        var _arr = [];
        var _filetype = datagobbler.data_layers[dl].api_info.file_type;
        for(k in _data.objects){
            var _obj = topojson.feature(_data, _data.objects[k]);
            _obj.has_geospatial_data = datagobbler.data_layers[layer].api_info.has_geospatial_data;
            var _type = datagobbler.getDataType(_data.objects[k].geometries[0].type);
            _obj[_type.name] = _type.type;
            _obj.name = k;
            _arr.push(_obj);
        }
        //console.log("downloadDataTOPOJSON OK",_arr);
        datagobbler.data_layers[layer].api_info['objects'] = _arr;
        datagobbler.checkGlobalDownloadStatus();
    }

    datagobbler.downloadDataGEOJSON = function(layer){
        
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        //console.log('datagobbler.downloadDataGEOJSON',_url);
        
         var errorGeoJson = function(error){
            _loadingStatus.downloadCompleted = false;
            _loadingStatus.downloadError = true;
            datagobbler.data_layers[layer].api_info['data'] = null;
            datagobbler.DownloadError(layer,error);
            console.log("downloadDataGEOJSON BAD");
        }
        var successGeoJson = function(data){
            _loadingStatus.downloadCompleted = true;
            datagobbler.data_layers[layer].api_info['data'] = data;
            datagobbler.DownloadSuccess(layer);
            datagobbler.decodeDataGEOJSON(layer);
            console.log("downloadDataGEOJSON OK");
        }
            
        _loadingStatus.pendingDownload = true;
         
         d3.json(_url, function(error,data) { //console.log('JSON done.',data,_url);
            _loadingStatus.pendingDownload = false;
            if(error){
                errorGeoJson(error);
            }else{
                successGeoJson(data);
            }
        });
    }
    
    datagobbler.downloadDataGEOJSONP = function(layer){
        
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        
        var errorGeoJson = function(error){
            _loadingStatus.downloadCompleted = false;
            _loadingStatus.downloadError = true;
            datagobbler.data_layers[layer].api_info['data'] = null;
            datagobbler.DownloadError(layer,error);
            console.log("downloadDataGEOJSONP BAD");
        }
        var successGeoJson = function(data){
            _loadingStatus.downloadCompleted = true;
            datagobbler.data_layers[layer].api_info['data'] = data;
            datagobbler.DownloadSuccess(layer);
            datagobbler.decodeDataGEOJSON(layer);
            console.log("downloadDataGEOJSONP OK");
        }
            
        _loadingStatus.pendingDownload = true;
         
         // Use jQuery ajax method for jsonp since many rest services like ESRI have
         // cross-domain restrictions in place.
         
         $.ajax({
            url: _url,
            data: null,
            type: "POST",
            dataType: 'jsonp',
            xhrFields: {
                withCredentials: true,
                'Access-Control-Allow-Origin':'*'
            },
            success: function(response) {
                response.jquery = true;
                successGeoJson(response);
            },
            error: function(error) {
                //console.log('ERROR:', error);
                errorGeoJson(error);
            }
        });
        
    }

    datagobbler.decodeDataGEOJSON = function(layer){
        var _data = datagobbler.data_layers[layer].api_info.data;
        var _arr = [];
        var _filetype = datagobbler.data_layers[dl].api_info.file_type;
        //_arr[] = _data;
        //for (i = 0; i < _data.length; i++) {
        
        var _type = datagobbler.getDataType(_data.features[0].geometry.type);
        _data[_type.name] = _type.type;
        _data.has_geospatial_data = datagobbler.data_layers[layer].api_info.has_geospatial_data;
        _data.name = layer;
        _arr.push(_data);
        datagobbler.data_layers[layer].api_info['objects'] = _arr;
        //console.log("decodeDataGEOJSON-objects: ",_data,datagobbler.data_layers[layer].api_info.objects);
        datagobbler.checkGlobalDownloadStatus();
        //console.log(datagobbler.data_layers,"datagobbler.decodeDataJSON",_arr);
    }

     datagobbler.downloadDataARCJSON = function(layer){
        
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        //console.log('datagobbler.downloadDataARCJSON',_url);
        
        var errorArcJson = function(error){
            _loadingStatus.downloadCompleted = false;
            _loadingStatus.pendingDownload = false;
            _loadingStatus.downloadError = true;
            datagobbler.data_layers[layer].api_info['data'] = null;
            datagobbler.DownloadError(layer,error);
            console.log("downloadDataARCJSON BAD");
        }
        var successArcJson = function(data){
            _loadingStatus.downloadCompleted = true;
            _loadingStatus.pendingDownload = false;
            var _esri = esriConverter();
            var _geojson = _esri.toGeoJson(data);
            datagobbler.data_layers[layer].api_info['data'] = _geojson;
            datagobbler.DownloadSuccess(layer);
            datagobbler.decodeDataGEOJSON(layer);
            console.log("downloadDataARCJSON OK");
        }
            
        _loadingStatus.pendingDownload = true;
         
         // Use jQuery ajax method for jsonp since many rest services like ESRI have
         // cross-domain restrictions in place.
         
         $.ajax({
            url: _url,
            data: null,
            type: "POST",
            dataType: 'jsonp',
            xhrFields: {
                withCredentials: true,
                'Access-Control-Allow-Origin':'*'
            },
            success: function(response) {
                response.jquery = true;
                successArcJson(response);
            },
            error: function(error) {
                //console.log('ERROR:', error);
                errorArcJson(error);
            }
        });
            
    }


    datagobbler.downloadDataSHP = function(layer){
        //console.log("datagobbler.downloadDataSHP",layer);
        //var _data = datagobbler.data_layers[layer].api_info.data;
        var _arr = [];
        var _filetype = datagobbler.data_layers[dl].api_info.file_type;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        var _url = datagobbler.data_layers[layer].api_info.url;
            _url = _url.substring(0,_url.lastIndexOf("."));
        //console.log("_url:",_url);
        var _shpLoader = shp(_url).then(
            function(data){ //If successful loading
                //console.log("Loaded Shapefile!",data);
                _loadingStatus.downloadCompleted = true;
                _loadingStatus.pendingDownload = false;
                var _arr = [];
                _arr[0] = data;
                datagobbler.data_layers[layer].api_info['data'] = _arr;
                //datagobbler.data_layers[layer].api_info['objects'] = data;
                datagobbler.DownloadSuccess(layer);
                datagobbler.decodeDataSHPGEOJSON(layer); //TODO make sure we get geojson into an array format like the others
                console.log("downloadDataSHP OK");
            },
            function(event){ //If fails to load
                //console.log("Sorry, could not load Shapefile.");
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.pendingDownload = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.data_layers[layer].api_info['objects'] = null;
                datagobbler.DownloadError(layer,event);
                console.log("downloadDataSHP BAD");
            }
        );
    _shpLoader['layer'] = layer;
    }

    datagobbler.downloadDataSHPZIP = function(layer){
        //console.log(shp,"datagobbler.downloadDataZIP called",layer,datagobbler.data_layers[layer]);
        var _arr = [];
        var _filetype = datagobbler.data_layers[dl].api_info.file_type;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        var _url = datagobbler.data_layers[layer].api_info.url;
            _url = _url.substring(0,_url.lastIndexOf("."));
            _url=_url+".zip";
        //console.log(_url);
        var _shpLoader = shp(_url).then(
            function(data){ //If successful loading
                //console.log("downloadDataSHPZIP",data);
                //console.log("downloadDataSHPZIP OK",data);
                _arr.push(data);
                _loadingStatus.downloadCompleted = true;
                _loadingStatus.pendingDownload = false;
                datagobbler.data_layers[layer].api_info['data'] = _arr;
                datagobbler.DownloadSuccess(layer);
                datagobbler.decodeDataSHPGEOJSON(layer); //TODO make sure we get geojson into an array format like the others
                console.log("downloadDataSHPZIP OK");
            },
            function(event){ //If fails to load
                //console.log("Sorry, could not load Shapefile.",event);
                datagobbler.logSystemErrorForLayer({'layer':layer,'errorEvent':event});
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.pendingDownload = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.data_layers[layer].api_info['objects'] = null;
                datagobbler.DownloadError(layer,event);
                console.log("downloadDataSHPZIP BAD");
            }
        );
    }

    datagobbler.decodeDataSHPGEOJSON = function(layer){
        var _data = datagobbler.data_layers[layer].api_info.data;
        for(d in _data){
            var _type = datagobbler.getDataType(_data[d].features[0].geometry.type);
            _data[d][_type.name] = _type.type;
            if(_data[d].fileName){
                _data[d]['name'] = _data[d].fileName;
            }else{
                _data[d]['name'] = "default";
            }
            _data[d].has_geospatial_data = datagobbler.data_layers[layer].api_info.has_geospatial_data;
        }
        datagobbler.data_layers[layer].api_info['objects'] = _data;
        datagobbler.checkGlobalDownloadStatus();
    }

    datagobbler.downloadDataCSV = function(layer){

        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        var _url = datagobbler.data_layers[layer].api_info.url;
        datagobbler.data_layers[layer].api_info['fileName'] = ( _url.substring(_url.lastIndexOf("/")+1,_url.lastIndexOf(".")) + "." + datagobbler.data_layers[dl].api_info.file_type);
        _loadingStatus.pendingDownload = true;
        d3.csv(_url, function(error,data) { //console.log('JSON done.',data,_url);
            _loadingStatus.pendingDownload = false;
            if(error){
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.DownloadError(layer,error);
                console.log("downloadDataCSV BAD");
            }else{
                _loadingStatus.downloadCompleted = true;
                //console.log("CSV", data);
                datagobbler.data_layers[layer].api_info['data'] = data;
                datagobbler.DownloadSuccess(layer);
                datagobbler.decodeDataCSV(layer);
                console.log("downloadDataCSV OK");
            }
        });
    }

     datagobbler.decodeDataCSV = function(layer){
         var _data  = datagobbler.data_layers[layer].api_info.data;//$.extend(true,[],datagobbler.data_layers[layer].api_info.data);
         var _arr   = [];
         /*
         If it's not geospatial, then don't build-out object records as geojson
         If it's geospatial, build-out objects as geojson
         Each object has an array of objects that contains all the data objects for that sub-layer (or default layer)
         */
         //if geospatial, then... has_geospatial_data
         if(Boolean(datagobbler.data_layers[layer].api_info.has_geospatial_data) == true){
             //console.log("=> IS geospatial data.");
            var _geomType   = datagobbler.data_layers[layer].api_info.if_not_geospatial_file_type.geometry_type;
            var _latStr     = datagobbler.data_layers[layer].api_info.if_not_geospatial_file_type.field_to_use_for_latitude;
            var _lonStr     = datagobbler.data_layers[layer].api_info.if_not_geospatial_file_type.field_to_use_for_longitude;
            var _features = [];
            var _geojsonObj = {"type":"FeatureCollection","fileName":datagobbler.data_layers[layer].api_info['fileName']};
            for (i = 0; i < _data.length; i++) {
                var _do = _data[i];
                var _lat = Number(_do[_latStr]);
                var _lon = Number(_do[_lonStr]);

                var _featureObj = {
                    "geometry":{
                            "type":"Point",
                            "coordinates":[_lon,_lat]
                    },
                    "properties":_do,
                    "type":"Feature"
                };
                _features.push(_featureObj);
            }
            _geojsonObj.features = _features;
            var _type = datagobbler.getDataType(_features[0].geometry.type);
            _geojsonObj[_type.name] = _type.type;
            _geojsonObj.has_geospatial_data = datagobbler.data_layers[layer].api_info.has_geospatial_data;
            _arr.push(_geojsonObj);
         }else{
             //console.log("=> IS NOT geospatial data.");
             for (i = 0; i < _data.length; i++) {
                _data[i] = {"properties":_data[i]};
             }
             var _recordsObj = {
                 "has_geospatial_data":datagobbler.data_layers[layer].api_info.has_geospatial_data,
                 "features":_data
             };
             var _type = datagobbler.getDataType("none");
             _recordsObj[_type.name] = _type.type;
             _arr[0] = _recordsObj;
         }
         //else, just set arr to the normal data (_arr = _data)
         //end if
        datagobbler.data_layers[layer].api_info['objects'] = _arr; //
        //console.log("decodeDataCSV",datagobbler.data_layers[layer].api_info.objects);
        datagobbler.checkGlobalDownloadStatus();
    }
     
    datagobbler.downloadDataATOM = function(layer){
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        _loadingStatus.pendingDownload = true;
        var _arr = [];
        d3.xml(_url, function(error, data) {
            if(error){
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.pendingDownload = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.DownloadError(layer,error);
                console.log("downloadDataATOM BAD");
            }else{
                var _geojson = GeoRSSToGeoJSON(data,{layer:layer,datagobbler:datagobbler});
                _loadingStatus.downloadCompleted = true;
                _loadingStatus.pendingDownload = false;
                datagobbler.DownloadSuccess(layer);
                
                datagobbler.data_layers[layer].api_info['data'] = _geojson;
                if(_geojson.features[0].geometry){
                    datagobbler.data_layers[layer].api_info.has_geospatial_data = _geojson.has_geospatial_data = true;
                    var _type = datagobbler.getDataType("point");
                    _geojson[_type.name] = _type.type;
                    datagobbler.decodeDataGEOJSON(layer);
                    console.log("downloadDataATOM-GEO OK");
                }else{
                    datagobbler.data_layers[layer].api_info.has_geospatial_data = _geojson.has_geospatial_data = false;
                    var _type = datagobbler.getDataType("none");
                    _geojson[_type.name] = _type.type;
                    _arr[0] = _geojson;
                    datagobbler.data_layers[layer].api_info['objects'] = _arr;
                    console.log("downloadDataATOM OK");
                }
                
            }
        });
    }
     
    datagobbler.downloadDataGEORSS = function(layer){
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        _loadingStatus.pendingDownload = true;
        d3.xml(_url, function(error, data) {
            if(error){
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.pendingDownload = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.DownloadError(layer,error);
                console.log("downloadDataGEORSS BAD");
            }else{
                var _geojson = GeoRSSToGeoJSON(data,{layer:layer,datagobbler:datagobbler});
                _loadingStatus.downloadCompleted = true;
                _loadingStatus.pendingDownload = false;
                datagobbler.data_layers[layer].api_info['data'] = _geojson;
                datagobbler.DownloadSuccess(layer);
                datagobbler.decodeDataGEOJSON(layer);
                console.log("downloadDataGEORSS OK");
            }
        });
    }
    
    datagobbler.downloadDataKML = function(layer){
        //console.log('datagobbler.downloadDataKML',toGeoJSON);
        var _url = datagobbler.data_layers[layer].api_info.url;
        var _loadingStatus = datagobbler.data_layers[layer].loadingStatus;
        //console.log(_url);
        _loadingStatus.pendingDownload = true;
        d3.xml(_url, function(error, data) {
            if(error){
                _loadingStatus.downloadCompleted = false;
                _loadingStatus.pendingDownload = false;
                _loadingStatus.downloadError = true;
                datagobbler.data_layers[layer].api_info['data'] = null;
                datagobbler.DownloadError(layer,error);
                console.log("downloadDataKML BAD");
            }else{
                var _geojson = toGeoJSON.kml(data);
                _loadingStatus.downloadCompleted = true;
                _loadingStatus.pendingDownload = false;
                datagobbler.data_layers[layer].api_info['data'] = _geojson;
                datagobbler.DownloadSuccess(layer);
                datagobbler.decodeDataGEOJSON(layer);
                console.log("downloadDataKML OK");
            }
        });
    }

    datagobbler.logSystemErrorForLayer = function(args){
        datagobbler.data.by_layer_name[args.layer].errors['systemError'] = args.errorEvent;
    }

    datagobbler.DownloadSuccess = function(layer){
        //console.log(layer,"datagobbler.DownloadSuccess");
        document.dispatchEvent(datagobbler.loader);
        datagobbler.layerOkToFilter(layer);
        datagobbler.numOfDataFilesLoaded++;
        //datagobbler.numOfDataFilesToFilter++;
         //console.log("-------------------------------");
    }

    datagobbler.DownloadError = function(layer,errorEvent){
        //console.log(layer,"datagobbler.DownloadError");
        datagobbler.logSystemErrorForLayer({'layer':layer,'errorEvent':errorEvent});
        datagobbler.layerNotOkToFilter(layer);
        datagobbler.numOfDataFilesToLoad--;
        //datagobbler.data.databy_layer_name[layer].errors.push("Error downloading data.");
        //datagobbler.numOfDataFilesToFilter--;
    }

    datagobbler.getDownloadErrorObject = function(){
        var _tempObj = {};
        for(dl in datagobbler.data_layers){
            if(datagobbler.data_layers[dl].loadingStatus.downloadError){
                _tempObj[dl] = datagobbler.data_layers[dl];
            }
        }
        return _tempObj;
    }

    datagobbler.getDownloadSuccessObject = function(){
        var _tempObj = {};
        for(dl in datagobbler.data_layers){
            if(datagobbler.data_layers[dl].loadingStatus.downloadCompleted){
                _tempObj[dl] = datagobbler.data_layers[dl];
            }
        }
        return _tempObj;
    }

    datagobbler.getLoadingStatusObject = function(){
        //datagobbler.data_layers[dl].loadingStatus, for(dl in datagobbler.data_layers){
        var _tempObj = {};
        for(dl in datagobbler.data_layers){
            _tempObj[dl] = datagobbler.data_layers[dl].loadingStatus;
        }
        return _tempObj;
    }

    datagobbler.layerOkToFilter = function(layer){
        datagobbler.numOfDataFilesToFilter++;
       datagobbler.data_layers[layer]['layerOkToFilter'] = true;
    }

    datagobbler.layerNotOkToFilter = function(layer){
       datagobbler.data_layers[layer]['layerOkToFilter'] = false;
    }

    datagobbler.filterSuccess = function(layer){
        datagobbler.data_layers[layer].loadingStatus.isFiltered = true;
        document.dispatchEvent(datagobbler.loader);
    }

    /*
    Checks to see if the number of files to be downloaded matches the number already downloaded. If so, then create the proxy layers- "proxy" layers are layers that copy & reuse data from previously downloaded layers so we're not downloading the same data multiple times.
    */
    datagobbler.checkGlobalDownloadStatus = function(){
        if(datagobbler.numOfDataFilesToLoad == datagobbler.numOfDataFilesLoaded){
            datagobbler.loadAllProxyDataLayers();
            datagobbler.allDataLayersAreReadyToFilter();
        }
    }

    datagobbler.allDataLayersAreReadyToFilter = function(){
        /*
        If there was no download error (it's still false), then set
        the downloadCompleted property to true
        */
        for(dl in datagobbler.data_layers){
            if(!datagobbler.data_layers[dl].loadingStatus.downloadError){
                datagobbler.data_layers[dl].loadingStatus.downloadCompleted = true;
            }
        }
        datagobbler.filterAllLayers();
    }

    datagobbler.filterAllLayers = function(){
        var _tempObj = {};
        //console.log("datagobbler.filterAllLayers",datagobbler.data_layers);
        datagobbler.addGlobalFunctions();
        for(dl in datagobbler.data_layers){
            if(datagobbler.data_layers[dl].layerOkToFilter){
                
                //datagobbler.data_layers[dl].api_info.objects = datagobbler.filterDataLayer3(dl);
                datagobbler.data_layers[dl].api_info["data_filtered"] = datagobbler.filterDataLayer(dl);
                
                datagobbler.addByLayerNameFunctions(dl);
            }
            _tempObj[dl]=datagobbler.data_layers[dl].api_info.data_filtered;
        }
        datagobbler.addAllLayersFunctions();
        //datagobbler.addByDateFunctions();
        //DataGobbler is finished!
        console.log(datagobbler.data);
        datagobbler.ondataLoaded(datagobbler.data);
    }
    
    /*datagobbler.addByDateFunctions = function(){
        datagobbler.data.by_date.functions = {
            getAllFilteredData: function(){ //datagobbler.data.by_layer_name.atom.functions.getAllFilteredData()
                var _allFilteredData = [];
                for(layer in datagobbler.data_layers){
                    
                    for(p in datagobbler.data_layers[layer].api_info.data_filtered){
                        
                        var _featuresKept = datagobbler.data_layers[layer].api_info.data_filtered[p].features_kept;
                        //_allFilteredData.concat(datagobbler.data_layers[layer].api_info.data_filtered[p].features_kept);
                        //_allFilteredData.push(_featuresKept);
                        console.log(layer,p,_featuresKept);
                        //console.log(_featuresKept);
                    }
                }
                //console.log(_allFilteredData);
                //return _filteredData;
                //datagobbler.data.by_date.functions.getAllFilteredData()
            }
        }
    }*/
    
    datagobbler.addGlobalFunctions = function(){
        
        datagobbler.data.functions.global = {
            getAllFilteredData:         function(){
                
            },
            getAllFilteredDataByGroup:  function(args){ //args = {layers:this.layersArray,group:group}
                var _retObj = {};
                for(layer in args.layers){
                    var _layer = args.layers[layer];
                    for(p in datagobbler.data.data_layers[_layer].data_filtered){
                        var _featuresKept = datagobbler.data.data_layers[_layer].data_filtered[p].features_kept;
                        if(_featuresKept[0].properties[args.group]){ //if the layer has the property
                            for(f in _featuresKept){
                                var _prop = _featuresKept[f].properties[args.group];
                                if(_prop){ //double-check that the property exists
                                    if(!_retObj[_prop]){
                                        _retObj[_prop] = [];
                                    }
                                    _retObj[_prop].push(_featuresKept[f]);
                                }
                            }
                        }
                    }
                }
                return _retObj;
            }
        }
        
    }
    
    datagobbler.addAllLayersFunctions = function(){
        
        datagobbler.data.api_help.all_layers.getAllFilteredDataByGroup = {};
        datagobbler.addApiHelp.allLayers();
        
        datagobbler.data.functions.all_layers = {
            
            layersArray: function(){
                var _arr = [];
                for(layer in datagobbler.data.data_layers){
                    _arr.push(layer);
                }
                return _arr;
            }(),
            getAllFilteredDataByGroup: function(group){
                return datagobbler.data.functions.global.getAllFilteredDataByGroup({layers:this.layersArray,group:group});
            },
            
            
            
            
            
            getAllFilteredData: function(){ //datagobbler.data.by_layer_name.atom.functions.getAllFilteredData()
                var _filteredData = [];
                for(layer in datagobbler.data.data_layers){
                    for(p in datagobbler.data.data_layers[layer].data_filtered){
                        var _featuresKept = datagobbler.data.data_layers[layer].data_filtered[p].features_kept;
                        _filteredData = _filteredData.concat(_featuresKept);
                    }
                }
                return _filteredData;
                //datagobbler.data.functions.all_layers.getAllFilteredData()
            },
            getAllFilteredDataByMonth: function(month){
                var _arrFiltered = this.getAllFilteredData().filter(function(value){
                    if(value.is_temporal){
                       return value.properties.itime.month == month;
                    }
                });
                return _arrFiltered;
                //datagobbler.data.functions.all_layers.getAllFilteredDataByMonth(4)
            },
            getAllFilteredDataByDayOfMonth: function(day){
                var _arrFiltered = this.getAllFilteredData().filter(function(value){
                    if(value.is_temporal){
                       return value.properties.itime.day == day;
                    }
                });
                return _arrFiltered;
                //datagobbler.data.functions.all_layers.getAllFilteredDataByDayOfMonth(9)
            }
        }
        
        
    }
    
    datagobbler.addByLayerNameFunctions = function(layer){
        
        datagobbler.data.data_layers[layer].data_filtered = datagobbler.data_layers[layer].api_info.data_filtered;
        datagobbler.addApiHelp.byLayerName(layer);
                            
        datagobbler.data.functions.by_layer_name[layer] = {
            
            layersArray: function(){
                var _arr = [layer];
                return _arr;
            }(), 
            getAllFilteredDataByGroup: function(group){
                return datagobbler.data.functions.global.getAllFilteredDataByGroup({layers:this.layersArray,group:group});
            },
            
            
            
            
            
            
            
            
            
            getAllFilteredData: function(){ //datagobbler.data.by_layer_name.atom.functions.getAllFilteredData()
                var _filteredData = [];
                for(p in datagobbler.data.data_layers[layer].data_filtered){
                    var _featuresKept = datagobbler.data.data_layers[layer].data_filtered[p].features_kept;
                    _filteredData = _filteredData.concat(_featuresKept);
                    //console.log(_filteredData,_featuresKept);
                }
                return _filteredData;
                //datagobbler.data.functions.by_layer_name.topojson.getAllFilteredData()
            },
            getAllFilteredDataByMonth: function(month){
                //var _arr = this.getAllFilteredData();
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        return value.properties.itime.month == month;
                        //console.log(value);
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByMonth(4)
            },
            getAllFilteredDataByDayOfMonth: function(day){
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        return value.properties.itime.day == day;
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByDayOfMonth(9)
            },
            getAllFilteredDataByDayOfWeek: function(day){ 
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        return value.properties.itime.dayOfWeekNum == day;
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByDayOfWeek([0-6])
            },
            getAllFilteredDataByDaysOfWeek: function(days){ 
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        var _isInDays = false;
                        for(day in days){
                            if(value.properties.itime.dayOfWeekNum == days[day]){
                                _isInDays = true;
                            }
                        }
                        return _isInDays;
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByDaysOfWeek([0,3,5])
            },
            getAllFilteredDataByDaysOfMonth: function(days){ 
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        var _isInDays = false;
                        for(day in days){
                            if(value.properties.itime.day == days[day]){
                                _isInDays = true;
                            }
                        }
                        return _isInDays;
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByDaysOfMonth([0,3,5])
            },
            getAllFilteredDataByMonthsOfYear: function(months){ 
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        var _isInMonths = false;
                        for(month in months){
                            if(value.properties.itime.month == months[month]){
                                _isInMonths = true;
                            }
                        }
                        return _isInMonths;
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByMonthsOfYear([2,5,11])
            },
            getAllFilteredDataByYear: function(year){ 
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        return value.properties.itime.year == year;
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.atom.getAllFilteredDataByYear([YYYY])
            },
            getAllFilteredDataByYearMonth: function(args){ //args: {year:2012,month:3}
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        return (value.properties.itime.year == args.year && value.properties.itime.month == args.month);
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.csvgeo.getAllFilteredDataByYearMonth({year:2012,month:3})
            },
            getAllFilteredDataByYearMonthDay: function(args){ //args: {year:2012,month:3,day:22}
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        return (value.properties.itime.year==args.year && value.properties.itime.month==args.month && value.properties.itime.day==args.day);
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.csvgeo.getAllFilteredDataByYearMonthDay({year:2012,month:3,day:22})
            },
            getAllFilteredDataByYearMonthDayRange: function(args){ //args: {date_start:{year:2012,month:3,day:22},date_end:{year:2012,month:6,day:14}}
                var _is_temporal = this.getAllFilteredData()[0].is_temporal;
                if(_is_temporal){
                    var _arrFiltered = this.getAllFilteredData().filter(function(value){
                        //var _isOnOrAfterDateStart = (value.properties.itime.date>=args.date_start.year && value.properties.itime.month>=args.date_start.month && value.properties.itime.day>=args.date_start.day);
                        
                        //var _isOnOrBeforeDateEnd = (value.properties.itime.year<=args.date_end.year && value.properties.itime.month<=args.date_end.month && value.properties.itime.day<=args.date_end.day);
                        var _testDate = value.properties.itime.date;
                        var _startDate = moment((args.date_start.month+"/"+args.date_start.day+"/"+args.date_start.year)).utc();
                        var _endDate = moment((args.date_end.month+"/"+args.date_end.day+"/"+args.date_end.year)).utc();
                        
                        //if(_startDate <= _testDate && _testDate <=_endDate){
                            //_isInRange = true;
                            //console.log(value.properties.itime.date,_startDate,_endDate);
                        //}
                        
                        return (_startDate <= _testDate && _testDate <=_endDate);
                    });
                    return _arrFiltered;
                }else{
                    return [];
                }
                //datagobbler.data.functions.by_layer_name.csvgeo.getAllFilteredDataByYearMonthDayRange({date_start:{year:2012,month:3,day:22},date_end:{year:2012,month:6,day:14}})
            }
        }
        
        /*
        Create functions that provide access to features/records by property categories listed under "group_by"
        in config.json file
        
        for example, if an Earthquake layer has a property called "mag" for magnitude, you would list "mag" inside
        the "group_by":["mag"] portion of the data service definition. To access an object with lists/arrays of features/records
        listed by magnitude would be as follows:
        datagobbler.data.by_layer_name.csvgeo.functions.getAllFilteredDataByGroup("status")
        */
        //datagobbler.data.by_layer_name[layer].functions.
        //datagobbler.data.by_layer_name[layer].HELP.getAllFilteredDataByGroup[_group]={
            //'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByGroup."+_group+"()"),
            //'Returns':("Returns an array of all filtered items in the " + layer + " layer as a series of objects that group all the records/features by individual categories found //within the " + _group + " property/group. Only properties/groups provided in the config.json file in the 'group_by:[]' listing will be pre-created for use.")
        //}
        
    }
    
    datagobbler.addApiHelp = {
        
        allLayers: function(){
            for(layer in datagobbler.data.data_layers){
                for(p in datagobbler.data.data_layers[layer].data_filtered){
                    var _featuresKept = datagobbler.data.data_layers[layer].data_filtered[p].features_kept;
                    for(group in _featuresKept[0].properties){
                        datagobbler.data.api_help.all_layers.getAllFilteredDataByGroup[group] = {
                            'Usage':("datagobbler.data.functions.all_layers.getAllFilteredDataByGroup('"+group+"')"),
                            'Returns':"Returns all filtered items from the all layers grouped/categorized by the "+group+" property."
                        }
                    }
                }
            }
            
            datagobbler.data.api_help.all_layers.getAllFilteredData = {
                'Usage':("datagobbler.data.functions.all_layers.getAllFilteredData()"),
                'Returns':"Returns an array of all filtered items from all layers."
            }
            
            datagobbler.data.api_help.all_layers.getAllFilteredDataByMonth = {
                'Usage':("datagobbler.data.functions.all_layers.getAllFilteredDataByMonth(5)"),
                'Returns':"Returns an array of all filtered items from all layers in the month number provided (1-12)."
            };
            
            datagobbler.data.api_help.all_layers.getAllFilteredDataByDayOfMonth = {
                'Usage':("datagobbler.data.functions.all_layers.getAllFilteredDataByDayOfMonth(15)"),
                'Returns':"Returns an array of all filtered items from all layers that occurred on the day of the month provided (1-31)."
            };
            
        },
        
        byLayerName: function(layer){
            datagobbler.data.api_help.by_layer_name[layer] = {
                getAllFilteredData:{
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredData()"),
                    'Returns':"Returns an array of all filtered items from the " + layer + " layer."
                },
                getAllFilteredDataByGroup:{}
            }
            if(!datagobbler.data_layers[layer].api_info.has_temporal_data){
                datagobbler.data.api_help.by_layer_name[layer]["(No temporal data is available in the "+layer+" layer)"]={};
            }
            if(datagobbler.data_layers[layer].api_info.has_temporal_data){

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByDayOfWeek = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByDayOfWeek(3)"),
                    'Returns':"Returns an array of all filtered items from the " + layer + " layer that occurred on the day of the week provided (0-6). Sunday is 0 and Saturday is 6"
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByDaysOfWeek = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByDaysOfWeek([0,3,5])"),
                    'Returns':"Returns an array of all filtered items from the " + layer + " layer that occurred on the days of the week provided (0-6) in the array-based argument. Sunday is 0 and Saturday is 6. Argument passed must be in the form of an array of numbers 0-6, eg. [0,1,2,3,4,5,6] would result in records for every day of the week being returned."
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByDayOfMonth = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByDayOfMonth(15)"),
                    'Returns':"Returns an array of all filtered items from the " + layer + " layer that occurred on the day of the month provided (1-31)."
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByDaysOfMonth = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByDaysOfMonth([1,2,3,4,5])"),
                    'Returns':"Returns an array of all filtered items across all months and years from the " + layer + " layer that occurred on the days provided (1-31) in the array-based argument. Argument passed must be in the form of an array of numbers 1-31, eg. [1,2,3,4,5...31]."
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByMonth = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByMonth(5)"),
                    'Returns':"Returns an array of all filtered items from the " + layer + " layer in the month number provided (1-12)."
                };
                
                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByMonthsOfYear = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByMonthsOfYear([3,5,10])"),
                    'Returns':"Returns an array of all filtered items from all years in the " + layer + " layer that occurred in the months provided (1-12) in the array-based argument. Argument passed must be in the form of an array of numbers 1-12, eg. [1,2,3,4,5...12]."
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByYear = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByYear(2011)"),
                    'Returns':"Returns an array of all filtered items in the " + layer + " layer during the 4-digit year provided (YYYY format, ex. 2010, 1985, etc.)."
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByYearMonth = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByYearMonth({year:2012,month:3})"),
                    'Returns':"Returns an array of all filtered items in the " + layer + " layer during the 4-digit year and month provided (YYYY format, ex. 2010, 1985, etc. and month in numerical form: 1-12). The year and month must be provided as an object: {year:2012,month:3}"
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByYearMonthDay = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByYearMonthDay({year:2012,month:3,day:22})"),
                    'Returns':"Returns an array of all filtered items in the " + layer + " layer during the 4-digit year and month provided (YYYY format, ex. 2010, 1985, etc.; month in numerical form: 1-12, and day in numerical form: 1-31). The year, month, and day must be provided as an object: {year:2012,month:3,day:22}"
                };

                datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByYearMonthDayRange = {
                    'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByYearMonthDayRange({date_start:{year:2011,month:3,day:22},date_end:{year:2013,month:6,day:14}})"),
                    'Returns':"Returns an array of all filtered items in the " + layer + " layer during the 4-digit year and month provided (YYYY format, ex. 2010, 1985, etc.; month in numerical form: 1-12, and day in numerical form: 1-31). The year, month, and day must be provided as both 'start' and 'end' date objects: {date_start:{year:2012,month:3,day:22},date_end:{year:2012,month:6,day:14}}"
                };

            }

            for(p in datagobbler.data.data_layers[layer].data_filtered){
                var _featuresKept = datagobbler.data.data_layers[layer].data_filtered[p].features_kept;
                for(group in _featuresKept[0].properties){
                    datagobbler.data.api_help.by_layer_name[layer].getAllFilteredDataByGroup[group] = {
                        'Usage':("datagobbler.data.functions.by_layer_name."+layer+".getAllFilteredDataByGroup('"+group+"')"),
                        'Returns':"Returns all filtered items from the "+layer+" layer grouped/categorized by the "+group+" property."
                    }
                }
            }
        }
    }
                
    
    datagobbler.filterDataLayer = function(layer){

        var _objects        = $.extend(true,{},datagobbler.data_layers[layer].api_info.objects);
        var _dateField      = datagobbler.data_layers[layer].api_info.date_info.date_field;
        var _filterOutArr   = datagobbler.data_layers[layer].api_info.filter_out;
        var _dateFormat     = datagobbler.data_layers[layer].api_info.date_info.date_format;
        
        for(k in _objects){
            _objects[k]['data_layer'] = layer;
            _objects[k].features_kept = [];
            _objects[k].features_outside_date_range = [];
            _objects[k].features_filtered_out = [];
            
            var _features = _objects[k].features;
            var _temp_features = [];
            var _is_temporal;
            
            if(_features[0].properties[_dateField]){
                _is_temporal = true;
            }else{
                _is_temporal = false;
            }
            datagobbler.layerHasTemporalData(layer,_is_temporal);
            
            _objects[k].is_temporal = _is_temporal;
            _objects[k].is_geospatial = datagobbler.data_layers[layer].api_info.has_geospatial_data;
            
            datagobbler.data_layers[layer].api_info.objects[k].is_temporal = _is_temporal;
            
            for(f in _features){
                var _keepFeature = true;
                var _outsideTimeRange = false;
                _features[f].id = datagobbler.numRecords;
                _features[f].is_temporal = _is_temporal;
                _features[f].is_geospatial = datagobbler.data_layers[layer].api_info.has_geospatial_data;
                _features[f].data_layer = layer;
                
                if(_is_temporal){
                    
                    var _time;
                    // verify whether the time/date field is meant to be
                    // text or a number
                    if(isNaN(Number(_features[f].properties[_dateField]))){
                        _time = _features[f].properties[_dateField]; //treat as text
                    }else{
                        _time = Number(_features[f].properties[_dateField]); //treat as a number (eg. UNIX)
                    }
                    //console.log(_features[f].properties.Victim);
                    _features[f].properties["idate"] = _time;
                    _features[f].properties["itime"] = datagobbler.getCommonTime({time:_time,format:_dateFormat,props:_features});
                    _features[f].properties["prettytime"] = datagobbler.getCommonTime({time:_time,format:_dateFormat}).prettytime;
                    _features[f].properties["numbertime"] = datagobbler.getCommonTime({time:_time,format:_dateFormat}).numbertime;
                    
                    if(_features[f].properties["itime"].isInGlobalDateRange){
                        _keepFeature = true;
                    }else{
                        _keepFeature = false;
                        _outsideTimeRange = true;
                        _objects[k].features_outside_date_range.push(_features[f]);
                    }
                    
                    //console.log("filterDataLayer: ",_features[f].properties.itime.isInGlobalDateRange);
                }else{
                    //console.log("no time",_features[f].properties);
                }
                
                var _removeFeature = {doRemove:false};
                if(_keepFeature && _filterOutArr.length>0){
                    for(fo in _filterOutArr){
                        _filterOutArgs = {
                            'property':_filterOutArr[fo].property,
                            'operator':_filterOutArr[fo].operator,
                            'val1':_features[f].properties[_filterOutArr[fo].property],
                            'val2':_filterOutArr[fo].value
                        };
                        if(datagobbler.getFilter(_filterOutArgs)){
                            _keepFeature = false;
                            _removeFeature.doRemove = true;
                            //console.log(_removeFeature,_filterOutArgs,_features[f].properties);
                       }
                        //console.log(fo,_filterOutArgs,datagobbler.getFilter(_filterOutArgs));
                    }
                }
                
                if(_removeFeature.doRemove && !_keepFeature){
                    _objects[k].features_filtered_out.push(_features[f]);
                }
                if(!_removeFeature.doRemove && _keepFeature){
                    _objects[k].features_kept.push(_features[f]);
                }
                if(!_outsideTimeRange){
                    //console.log(_removeFeature.doRemove,_features[f].properties);
                }
                
                var _args = {
                    feature:_features[f],
                    keep_feature:_keepFeature,
                    has_geospatial_data:_objects[k].has_geospatial_data,
                    geometry_type:_objects[k].geometry_type,
                    name:_objects[k].name,
                    layer:layer,
                    is_temporal:_is_temporal
                };  
                datagobbler.numRecords++;
            
            }
            delete _objects[k].features;
            //delete _objects[k].objects;
            //$.extend(true,{},datagobbler.data_layers[_targLayer].api_info.data);
            //_objects[k].features = $.extend(true,[],_objects[k].featuresFiltered);
            
        }
        //datagobbler.data_layers[dl].api_info
        delete datagobbler.data_layers[layer].api_info.objects;
        console.log(datagobbler.data_layers[layer]);
        datagobbler.filterSuccess(layer);
        datagobbler.numOfDataFilesFiltered++;
        return _objects;
    }
    
    datagobbler.createInsideRanges = function(args){
        
        //console.log("datagobbler.addFeatureToInsideRanges", args);
        
        var _yyyy = args.itime.year;
        var _mm = args.itime.month;
        var _dd = args.itime.day;
        var _numbertime = args.itime.numbertime;
        
        if(!datagobbler.data.by_date.inside_range[_yyyy]){
            datagobbler.data.by_date.inside_range[_yyyy] = {};
        }
        if(!datagobbler.data.by_date.inside_range[_yyyy][_mm]){
            datagobbler.data.by_date.inside_range[_yyyy][_mm] = {};
        }
        if(!datagobbler.data.by_date.inside_range[_yyyy][_mm][_dd]){
            datagobbler.data.by_date.inside_range[_yyyy][_mm][_dd] = [];
            //datagobbler.data.all_dates.byArray.inside_range[_numbertime] = args.itime;
            //datagobbler.data.all_dates.byObject.inside_range[_numbertime] = args.itime;
        }
        
        if(!datagobbler.data.by_layer_name[args.layer].by_date.inside_range[_yyyy]){
            datagobbler.data.by_layer_name[args.layer].by_date.inside_range[_yyyy] = {};
        }
        if(!datagobbler.data.by_layer_name[args.layer].by_date.inside_range[_yyyy][_mm]){
            datagobbler.data.by_layer_name[args.layer].by_date.inside_range[_yyyy][_mm] = {};
        }
        if(!datagobbler.data.by_layer_name[args.layer].by_date.inside_range[_yyyy][_mm][_dd]){
            datagobbler.data.by_layer_name[args.layer].by_date.inside_range[_yyyy][_mm][_dd] = [];
            //datagobbler.data.by_layer_name[args.layer].all_dates.byArray.inside_range[_numbertime] = args.itime;
            //datagobbler.data.by_layer_name[args.layer].all_dates.byObject.inside_range[_numbertime] = args.itime;
        }
        
    }
    
    datagobbler.createOutsideRanges = function(args){
        
        var _yyyy = args.itime.year;
        var _mm = args.itime.month;
        var _dd = args.itime.day;
        var _numbertime = args.itime.numbertime;
        
        //console.log(_numbertime);
        
        if(!datagobbler.data.by_date.outside_range[_yyyy]){
            //datagobbler.data.by_date.outside_range[_yyyy] = {};
        }
        if(!datagobbler.data.by_date.outside_range[_yyyy][_mm]){
            //datagobbler.data.by_date.outside_range[_yyyy][_mm] = {};
        }
        if(!datagobbler.data.by_date.outside_range[_yyyy][_mm][_dd]){
            //datagobbler.data.by_date.outside_range[_yyyy][_mm][_dd] = [];
            //datagobbler.data.all_dates.byArray.outside_range[_numbertime] = args.itime;
            //datagobbler.data.all_dates.byObject.outside_range[_numbertime] = args.itime;
        }
        
        if(!datagobbler.data.by_layer_name[args.layer].by_date.outside_range[_yyyy]){
            datagobbler.data.by_layer_name[args.layer].by_date.outside_range[_yyyy] = {};
        }
        if(!datagobbler.data.by_layer_name[args.layer].by_date.outside_range[_yyyy][_mm]){
            datagobbler.data.by_layer_name[args.layer].by_date.outside_range[_yyyy][_mm] = {};
        }
        if(!datagobbler.data.by_layer_name[args.layer].by_date.outside_range[_yyyy][_mm][_dd]){
            datagobbler.data.by_layer_name[args.layer].by_date.outside_range[_yyyy][_mm][_dd] = [];
            //datagobbler.data.by_layer_name[args.layer].all_dates.byArray.outside_range[_numbertime] = args.itime;
            //datagobbler.data.by_layer_name[args.layer].all_dates.byObject.outside_range[_numbertime] = args.itime;
        }
        /**/
        //['all_dates'] = { byArray:{inside_range:[],outside_range:[]}, byObject:{inside_range:{},outside_range:{}} };
        
    }

    datagobbler.getCommonTime = function(args) {
        
        // Create MomentJS time object
        // Use MomentJS to create a more feature-rich date object that can read multuiple date/time formats automatically
        // This reduces the amount of custom parsing we need to perform for various dates
        
        // passing timestamp, format, and "true" to denote strict mode
        var _time = moment(args.time,args.format,true).utc(); //147377631516
        var _event;
        
    
        if(!_time._isValid){
           //console.log(args.props,args.time, "<- Format given does not match time stamp. Trying to fix...");
            _time = moment(args.time).utc();
            args.format = _time._f;  
        }
        
        //console.log(this);
        this.getCommonTime.dateInGlobalDateRange = function(date) {
            var _isInRange = false;
            if(datagobbler.data_options.default_dates.idate_start && datagobbler.data_options.default_dates.idate_end){
                var _rsd = datagobbler.data_options.default_dates.idate_start.date;
                var _red = datagobbler.data_options.default_dates.idate_end.date;
                //console.log(_rsd,date,_red);
                if(_rsd <= date && date <=_red){
                    _isInRange = true;
                }
            }
            //console.log("dateInGlobalDateRange: ",_isInRange);
            //console.log("===============");
            return _isInRange;
            //console.log(datagobbler.data_options.default_dates);
            //console.log("dateInGlobalDateRange: ",date);
            
        }
        
        var _yyyy = String(_time.year());
        var _mm = String(_time.get('month')+1);
        var _dd = String(_time.get('date'));
        var _dow = _time.day();
        var _isInGlobalDateRange = this.getCommonTime.dateInGlobalDateRange(_time);
        var _numbertime = (Number(_yyyy+getDouble(_mm)+getDouble(_dd)));
        
        function getDouble(num){ //returns a number like 6 or 7 as "06" or "07"
            num = Number(num);
            return num > 9 ? "" + num: "0" + num;
        }
        
        function getDayOfWeekString(num){
            switch(num) {
                case 0:
                    return "Sunday";
                case 1:
                    return "Monday";
                case 2:
                    return "Tuesday";
                case 3:
                    return "Wednesday";
                case 4:
                    return "Thursday";
                case 5:
                    return "Friday";
                case 6:
                    return "Saturday";
            }
        }

        /*
        Create an object to pass basic year/month/day info to any script calling this function
        */
        var _timeObj = {
            //'time':_time,
            //'time_utc':_time_utc,
            'year':_yyyy,
            'month':_mm,
            'day':_dd,
            'date':_time,
            'dayOfWeekNum':_dow,
            'dayOfWeek':getDayOfWeekString(_dow),
            'prettytime':(_mm+"/"+_dd+"/"+_yyyy),
            'numbertime':_numbertime,
            'isInGlobalDateRange':_isInGlobalDateRange,
            'format':args.format
        }
       
        return _timeObj;
    }

    datagobbler.dateIsInGlobalDateRange = function(date) {
        var _rsd = datagobbler.data_options.default_dates.idate_start.date;
        var _red = datagobbler.data_options.default_dates.idate_end.date;
        var _isInRange = false;
        //console.log(_rsd,date,_red);
        if(_rsd <= date && date <=_red){
            _isInRange = true;
        }
        //console.log(_isInRange);
        return _isInRange;
    }


    datagobbler.getFilter = function(args){
        
        // Check to see if value can be converted to 
        // a valid number
        var _val1IsNumber = !isNaN(Number(args.val1));
        var _val2IsNumber = !isNaN(Number(args.val2));

        if(_val1IsNumber && _val2IsNumber){ // if yes to both, force both to number
            args.val1 = Number(args.val1);
            args.val2 = Number(args.val2); 
        }else{ //if no, then force both to string
            args.val1 = String(args.val1);
            args.val2 = String(args.val2); 
        }
        
        //Check if we are passing a number as text
        //If so, change it to a number
        //console.log(args);
        switch(args.operator) {
            case "!=":
                return args.val1 != args.val2;
            case "=="||"=":
                return args.val1 == args.val2;
            case "+":
                return args.val1 + args.val2;
            case "-":
                return args.val1 - args.val2;
            case "*":
                return args.val1 * args.val2;
            case "/":
                return args.val1 / args.val2;
            case "<":
                return args.val1 < args.val2;
            case ">":
                return args.val1 > args.val2;
            case "<=":
                return args.val1 <= args.val2;
            case ">=":
                return args.val1 >= args.val2;
            case "LIKE"||"like"||"IS LIKE"||"is like":
                return (String(args.val1).indexOf(String(args.val2))>=0);
            case "NOT LIKE"||"not like"||"!LIKE"||"!like":
                return (String(args.val1).indexOf(String(args.val2))<0);
        }
    }

    datagobbler.addPropertyObjects = function(feature){

    }

    
    datagobbler.addObjectToData = function(obj) {
        datagobbler.data.all_data.objects.push(obj);
        datagobbler.data.by_layer_name[obj.data_layer].all_data.objects.push(obj);
    }

}();