var GeoRSSToGeoJSON = function (dom, options) {

    function get(x, y) { return x.getElementsByTagName(y); }
    function get1(x, y) { var n = get(x, y); return n.length ? n[0] : null; }
    function norm(el) { if (el.normalize) { el.normalize(); } return el; }
    function nodeVal(x) { if (x) {norm(x);} return x && x.firstChild && x.firstChild.nodeValue; }
    function attr(x, y) { return x.getAttribute(y); }

    var g = {
        type: 'FeatureCollection',
        features: []
    };

    function geom (node) {

        function p(c) {return parseFloat(c);}
        function r(c) {return c.reverse().map(p);}  // we have latlon we want lonlat
        function e(f) {var _=[]; for (var i=0; i<f.length; i+=2) {_.push(r(f.slice(i, i+2)));} return _;}

        var type, coordinates;

        NODE = node;
        if (get1(node, 'geo:long')) {
            type = 'Point';
            coordinates = [p(nodeVal(get1(node, 'geo:long'))), p(nodeVal(get1(node, 'geo:lat')))];
        } else if (get1(node, 'long')) {
            type = 'Point';
            coordinates = [p(nodeVal(get1(node, 'long'))), p(nodeVal(get1(node, 'lat')))];
        } else if (get1(node, 'georss:point')) {
            type = 'Point';
            coordinates = r(nodeVal(get1(node, 'georss:point')).split(' '));
        } else if (get1(node, 'point')) {
            type = 'Point';
            coordinates = r(nodeVal(get1(node, 'point')).split(' '));
        } else {
            var line = get1(node, 'georss:line'),
                poly = get1(node, 'georss:polygon');
            if (line || poly) {
                type = line ? 'LineString' : 'Polygon';
                var tag = line ? 'georss:line' : 'georss:polygon';
                coordinates = nodeVal(get1(node, tag)).split(' ');
                if (coordinates.length % 2 !== 0) return;
                coordinates = e(coordinates);
                if (poly) {
                    coordinates = [coordinates];
                }
            }
        }
        if (type && coordinates) {
            return {
                type: type,
                coordinates: coordinates
            };
        }
    }

    function processOne (node) {
        //console.log(node);
        
        // Create x2js instance with default config
        // xmlToJSON
        var x2js = new X2JS();
        var props = x2js.xml2json(node);
        
        var geometry = geom(node);
        // TODO collect and fire errors
        //console.log(options.layer,geometry);
        /*
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
        */
        var f;
        var _type={};
        if (!geometry){
            //if(!options.datagobbler.data_layers[options.layer].api_info.has_geospatial_data) options.datagobbler.data_layers[options.layer].api_info.has_geospatial_data = false;
            //console.log(options.datagobbler.data_layers[options.layer].api_info);
            //_type = options.datagobbler.getDataType("none");
            
            //console.log(_type.name);
            f = {
                properties: props
            };
            /*
            var _type = datagobbler.getDataType("none");
                _recordsObj[_type.name] = _type.type;
                 _arr[0] = _recordsObj;
             }
             //else, just set arr to the normal data (_arr = _data)
             //end if
            datagobbler.data_layers[layer].api_info['objects'] = _arr; //
            //console.log("decodeDataCSV",datagobbler.data_layers[layer].api_info.objects);
            datagobbler.checkGlobalDownloadStatus();
            */
            
        }else{
            //if(!options.datagobbler.data_layers[options.layer].api_info.has_geospatial_data) options.datagobbler.data_layers[options.layer].api_info.has_geospatial_data = true;
            //_type = options.datagobbler.getDataType("point");
            f = {
                type: "Feature",
                geometry: geometry,
                properties: props
            };
            var media = get1(node, 'media:content'), mime;
            if (!media) {
                media = get1(node, 'enclosure'), mime;
            }
            if (media) {
                mime = attr(media, 'type');
                if (mime.indexOf('image') !== -1) {
                    f.properties.img = attr(media, "url");  // How not to invent a key?
                }
            }
        }
        //console.log("   >>>TYPE>>>   ",_type);
        //g["has_geospatial_data"] = options.datagobbler.data_layers[options.layer].api_info.has_geospatial_data;
        //g[_type.name] = _type.type;
        g.features.push(f);
    }
    //console.log(options);
    var items = get(dom, 'item');
    if(items.length<=0){
        items = get(dom, 'entry');
    }
    //console.log("ITEMS:",items);
    
    for (var i = 0; i < items.length; i++) {
        processOne(items[i]);
    }
    return g;
};
if (typeof module !== 'undefined') module.exports = {GeoRSSToGeoJSON: GeoRSSToGeoJSON};
