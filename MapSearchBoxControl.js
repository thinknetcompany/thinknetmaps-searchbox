'use strict';

var axios = require('axios')
var Typeahead = require('suggestions');
var debounce = require('lodash.debounce');
var extend = require('xtend');
var subtag = require('subtag');
var resultList = require('./MapSearchBoxControlResult');

var placeholderText = {
  'th': 'ค้นหา', // thailand
  'en': 'Search', // english
  'th': 'ค้นหา' // thailand
}
var GATEWAY_URL = 'https://api-maps.thinknet.co.th'
var showresultText = {
  'th': 'แสดงผลลัพธ์ ', // thailand
  'en': 'Showing results ', // english
  'th': 'แสดงผลลัพธ์ ' // thailand
}

function MapSearchBox(options) {
  this.options = extend({}, this.options, options);
  this.inputString = '';
  this.fresh = true;
  this.lastSelected = null;

  this.searchtotal = 0;
  this.searchlimitperpage = 20;
  this.searchpage = 1;
  this.keyword = '';
  this.searchposition = null;
  this.searchresult = [];
}

MapSearchBox.prototype = {

  options: {
    zoom: 16,
    flyTo: true,
    trackProximity: true,
    minLength: 2,
    reverseGeocode: false,
    enterSearch: true,
    limit: 6,
    marker: true,
    mapboxgl: null,
    collapsed: false,
    clearAndBlurOnEsc: false,
    clearFocusOnEsc: true,
    clearOnBlur: false,
    getItemValue: function(item) {
      return item.place_name
    },
    render: function(item) {
      var placeName = item.place_name.split(' ');
      return '<nobr><span class="mapboxgl-ctrl-geocoder--suggestion-title">' + placeName[0] + '</span> <span class="mapboxgl-ctrl-geocoder--suggestion-adddress">' + placeName.splice(1, placeName.length).join(' ') + '</span></nobr>';
    }
  },

  onAdd: function(map) {
    if (map && typeof map != 'string'){
      this._map = map;
    }

    this.setLanguage(this.options.language);

    this._onChange = this._onChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onPaste = this._onPaste.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._showButton = this._showButton.bind(this);
    this._hideButton = this._hideButton.bind(this);
    this.clear = this.clear.bind(this);
    this._updateProximity = this._updateProximity.bind(this);
    this._collapse = this._collapse.bind(this);
    this._unCollapse = this._unCollapse.bind(this);
    this._clear = this._clear.bind(this);
    this._clearOnBlur = this._clearOnBlur.bind(this);

    var el = (this.container = document.createElement('div'));
    el.className = 'mapboxgl-ctrl-geocoder mapboxgl-ctrl';

    var searchIcon = this.createIcon('search', '<path d="M7.4 2.5c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c1 0 1.8-.2 2.5-.8l3.7 3.7c.2.2.4.3.8.3.7 0 1.1-.4 1.1-1.1 0-.3-.1-.5-.3-.8L11.4 10c.4-.8.8-1.6.8-2.5.1-2.8-2.1-5-4.8-5zm0 1.6c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2-3.3-1.3-3.3-3.1 1.4-3.3 3.3-3.3z"/>')

    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.className = 'mapboxgl-ctrl-geocoder--input';

    this.setPlaceholder();

    if (this.options.collapsed) {
      this._collapse();
      this.container.addEventListener('mouseenter', this._unCollapse);
      this.container.addEventListener('mouseleave', this._collapse);
      this._inputEl.addEventListener('focus', this._unCollapse);  
    }

    if (this.options.collapsed || this.options.clearOnBlur) {
      this._inputEl.addEventListener('blur', this._onBlur);
    }

    this._inputEl.addEventListener('keydown', debounce(this._onKeyDown, 200));
    this._inputEl.addEventListener('paste', this._onPaste);
    this._inputEl.addEventListener('change', this._onChange);
    this.container.addEventListener('mouseenter', this._showButton);
    this.container.addEventListener('mouseleave', this._hideButton);
    this._inputEl.addEventListener('keyup', function(e){
      // 
    }.bind(this));

    var actions = document.createElement('div');
    actions.classList.add('mapboxgl-ctrl-geocoder--pin-right');

    this._clearEl = document.createElement('button');
    this._clearEl.setAttribute('aria-label', 'Clear');
    this._clearEl.addEventListener('click', this.clear);
    this._clearEl.className = 'mapboxgl-ctrl-geocoder--button';

    var buttonIcon = this.createIcon('close', '<path d="M3.8 2.5c-.6 0-1.3.7-1.3 1.3 0 .3.2.7.5.8L7.2 9 3 13.2c-.3.3-.5.7-.5 1 0 .6.7 1.3 1.3 1.3.3 0 .7-.2 1-.5L9 10.8l4.2 4.2c.2.3.7.3 1 .3.6 0 1.3-.7 1.3-1.3 0-.3-.2-.7-.3-1l-4.4-4L15 4.6c.3-.2.5-.5.5-.8 0-.7-.7-1.3-1.3-1.3-.3 0-.7.2-1 .3L9 7.1 4.8 2.8c-.3-.1-.7-.3-1-.3z"/>')
    this._clearEl.appendChild(buttonIcon);

    this._loadingEl = this.createIcon('loading', '<path fill="#333" d="M4.4 4.4l.8.8c2.1-2.1 5.5-2.1 7.6 0l.8-.8c-2.5-2.5-6.7-2.5-9.2 0z"/><path opacity=".1" d="M12.8 12.9c-2.1 2.1-5.5 2.1-7.6 0-2.1-2.1-2.1-5.5 0-7.7l-.8-.8c-2.5 2.5-2.5 6.7 0 9.2s6.6 2.5 9.2 0 2.5-6.6 0-9.2l-.8.8c2.2 2.1 2.2 5.6 0 7.7z"/>');

    actions.appendChild(this._clearEl);
    actions.appendChild(this._loadingEl);

    el.appendChild(searchIcon);
    el.appendChild(this._inputEl);
    el.appendChild(actions);

    this._typeahead = new Typeahead(this._inputEl, [], {
      filter: false,
      minLength: this.options.minLength,
      limit: this.options.limit,
      hideOnBlur: true
    });

    this.setRenderFunction(this.options.render);
    this._typeahead.getItemValue = this.options.getItemValue;

    this.mapMarker = null;
    this._handleMarker = this._handleMarker.bind(this);
    if (this._map){
      if (this.options.trackProximity ) {
        this._updateProximity();
        this._map.on('moveend', this._updateProximity);
      }
      this._mapboxgl = this.options.mapboxgl;
      if (!this._mapboxgl && this.options.marker) {
        // eslint-disable-next-line no-console
        console.error("No mapboxgl detected in options. Map markers are disabled. Please set options.mapboxgl.");
        this.options.marker = false;
      }
    }

    this.searchMarkerIndex = -1;
    this.searchMarker = [];
    this._handleSearchMarker = this._handleSearchMarker.bind(this);
    this._searchresult = new resultList(this);
    this._searchresult.draw();

    return el;
  },

  createIcon: function(name, path) {
    var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'mapboxgl-ctrl-geocoder--icon mapboxgl-ctrl-geocoder--icon-' + name);
    icon.setAttribute('viewBox', '0 0 18 18');
    icon.setAttribute('xml:space','preserve');
    icon.setAttribute('width', 18);
    icon.setAttribute('height', 18);
    icon.innerHTML = path;
    return icon;
  },

  onRemove: function() {
    this.container.parentNode.removeChild(this.container);

    if (this.options.trackProximity && this._map) {
      this._map.off('moveend', this._updateProximity);
    }

    this._removeMarker();

    this._map = null;

    return this;
  },

  _onPaste: function(e){
    var value = (e.clipboardData || window.clipboardData).getData('text');
    if (value.length >= this.options.minLength) {
      this._suggest(value);
    }
  },

  _onKeyDown: function(e) {
    var ESC_KEY_CODE = 27,
      TAB_KEY_CODE = 9;

    if (e.keyCode === ESC_KEY_CODE && this.options.clearAndBlurOnEsc) {
      this._clear(e);
      return this._inputEl.blur();
    }

    // if target has shadowRoot, then get the actual active element inside the shadowRoot
    var target = e.target && e.target.shadowRoot
      ? e.target.shadowRoot.activeElement
      : e.target;
    var value = target ? target.value : '';

    if (!value) {
      this.fresh = true;
      // the user has removed all the text
      if (e.keyCode !== TAB_KEY_CODE) this.clear(e);
      return (this._clearEl.style.display = 'none');
    }

    // TAB, ESC, LEFT, RIGHT, ENTER, UP, DOWN
    if ((e.metaKey || [TAB_KEY_CODE, ESC_KEY_CODE, 37, 39, 13, 38, 40].indexOf(e.keyCode) !== -1)) {
      return;
    }

    if (target.value.length >= this.options.minLength) {
      this._suggest(target.value);
    }
  },

  _showButton: function() {
    if (this._typeahead.selected) this._clearEl.style.display = 'block';
  },

  _hideButton: function() {
    if (this._typeahead.selected) this._clearEl.style.display = 'none';
  },

  _onBlur: function(e) {
    if (this.options.clearOnBlur) {
      this._clearOnBlur(e);
    }
    if (this.options.collapsed) {
      this._collapse();
    }
  },
  _onChange: function() {
    var selected = this._typeahead.selected;

    if (selected && selected.place_type[0] == 'keyword') {

      this.searchlimitperpage = 20;
      this.searchpage = 1;
      this.searchposition = [this.options.proximity.latitude, this.options.proximity.longitude];
      this._search(selected.place_name);

    } else if (selected && JSON.stringify(selected) !== this.lastSelected) {

      this._clearEl.style.display = 'none';

      if (!this._searchresult.isEmpty()) {
        this._searchresult.clear();
        this._searchresult.draw();
      }

      if (this.options.flyTo) {
        var flyOptions;
        if (selected.properties && selected.bbox) {
          var bbox = selected.bbox;
          flyOptions = extend({}, this.options.flyTo);
          if (this._map){
            this._map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], flyOptions);
          }
        } else {
          var defaultFlyOptions = {
            zoom: this.options.zoom
          }
          flyOptions = extend({}, defaultFlyOptions, this.options.flyTo);
          //  ensure that center is not overriden by custom options
          flyOptions.center = selected.center;
          if (this._map){
            this._map.flyTo(flyOptions);
          }
        }
      }
      if (this.options.marker && this._mapboxgl){
        this._handleMarker(selected);
      }

      // After selecting a feature, re-focus the textarea and set
      // cursor at start.
      this._inputEl.focus();
      this._inputEl.scrollLeft = 0;
      this._inputEl.setSelectionRange(0, 0);
      this.lastSelected = JSON.stringify(selected);

    }
  },

  _search: function(keyword) {
    this.keyword = keyword;
    var request = axios.post(`${GATEWAY_URL}/v1/search/nearbysearch`, {
      "keyword": this.keyword,
      "origin": this.searchposition,
      "distance": "10km",
      "app_id": this.options.APP_ID,
      "api_key": this.options.API_KEY,
      "limit": this.searchlimitperpage,
      "page": this.searchpage
    })
    
    request.then (
      function(response) {

        this._inputEl.blur();

        if (!this._searchresult.isEmpty()) {
          this._searchresult.clear();
          this._searchresult.draw();
          this._removeSearchMarker();
        }

        if (this._inputEl.value != '') {
          this.searchresult = {
            type: 'FeatureCollection',
            features: []
          };

          var data;
          if (response && response.status == '200') {
            data = JSON.parse(response.request.response)
            this.searchtotal = data.total
            data = data.result
            console.log(data)
            this._fitbound(this._map, data)
            this.searchresult.request = response.request
            this.searchresult.headers = response.headers
          }

          var placename_, placename_th, placename_en, tambon_amphoe = '', province = '';
          for (var i = 0; i < data.length; i++) {
            placename_th = data[i].name.th
            placename_en = data[i].name.en
  
            placename_ = placename_th
            if (placename_ == '') {
              placename_ = placename_en
            }
  
            if (data[i].address) {
              tambon_amphoe = data[i].address.tambon.th
              if (tambon_amphoe != data[i].address.amphoe.th) {
                tambon_amphoe += ' ' + data[i].address.amphoe.th
              }
              province = data[i].address.province.th
            }

            var dataitem = {
              id: data[i].tn_id,
              type: 'Feature',
              place_type: ['poi'],
              properties: {
                landmark: true,
                address: `${tambon_amphoe} ${province}`,
                category: ''
              },
              text_en_US: data[i].name.en,
              place_name: `${placename_}<br /><span class='mapboxgl-ctrl-geocoder--searchresult-address'>${tambon_amphoe} ${province}</span>`,
              center: [data[i].coordinate.lng, data[i].coordinate.lat],
              geometry: {
                coordinates: [data[i].coordinate.lng, data[i].coordinate.lat],
                type: 'Point'
              },
              context: []
            }

            this.searchresult.features.push(dataitem)

            this._handleSearchMarker(dataitem)

            this._searchresult.add(`${placename_}<br /><span class='mapboxgl-ctrl-geocoder--searchresult-address'>${tambon_amphoe} ${province}</span>`);
          }

          this._searchresult.draw();

          var rowLeft = (this.searchpage * this.searchlimitperpage) - 19;
          var rowRight = (this.searchlimitperpage * this.searchpage);

          if (rowRight > this.searchtotal) {
            rowRight = rowLeft + (this.searchtotal % this.searchlimitperpage) - 1;
            this._searchresult.nextButtonActive(false)
          } else {
            this._searchresult.nextButtonActive(true)
          }

          if (this.searchpage == 1) {
            this._searchresult.backButtonActive(false)
          } else {
            this._searchresult.backButtonActive(true)
          }

          this._searchresult.updateShowResult(
            showresultText[this.options.language] + rowLeft + ' - ' + rowRight
          );
        }

      }.bind(this)
    );
  },

  _backPageSearchResult: function() {
    if (this.keyword != '' && this.searchpage > 1) {
      this.searchpage--;
      this._search(this.keyword);
    }
  },
  _nextPageSearchResult: function() {
    var maxPage = Math.ceil(this.searchtotal / this.searchlimitperpage)
    if (this.keyword != '' && this.searchpage < maxPage) {
      this.searchpage++;
      this._search(this.keyword);
    }
  },

  _suggest: function(searchInput) {
    this._loadingEl.style.display = 'block';
    this.inputString = searchInput;
    // Possible config proprerties to pass to client
    var keys = [
      'bbox',
      'limit',
      'proximity',
      'countries',
      'types',
      'language',
      'reverseMode',
      'mode'
    ];
    var self = this;
    // Create config object
    var config = keys.reduce(function(config, key) {
      if (self.options[key]) {
        ['countries', 'types', 'language'].indexOf(key) > -1
          ? (config[key] = self.options[key].split(/[\s,]+/))
          : (config[key] = self.options[key]);

        if (key === 'proximity' && self.options[key] && self.options[key].longitude && self.options[key].latitude) {
          config[key] = [self.options[key].longitude, self.options[key].latitude]
        }
      }
      return config;
    }, {});

    var request;
    if (this.options.reverseGeocode && /(-?\d+\.?\d*)[, ]+(-?\d+\.?\d*)[ ]*$/.test(searchInput)) {

      // parse coordinates
      var coords = searchInput.split(/[\s(,)?]+/).map(function(c) {
        return parseFloat(c, 10);
      }).reverse();

    } else {

      request = axios.get(`${GATEWAY_URL}/v1/suggest/${searchInput}/${config.proximity[1]}/${config.proximity[0]}/?api_key=${this.options.API_KEY}&app_id=${this.options.APP_ID}`)

    }

    if (!this._searchresult.isEmpty()) {
      this._searchresult.clear();
      this._searchresult.draw();
    }

    var localGeocoderRes = [];
    if (this.options.localGeocoder) {
      localGeocoderRes = this.options.localGeocoder(searchInput);
      if (!localGeocoderRes) {
        localGeocoderRes = [];
      }
    }

    request.then (
      function(response) {
        this._loadingEl.style.display = 'none';

        var res = {
          type: 'FeatureCollection',
          features: []
        };
        
        res.features.push({
          id: 0,
          type: 'Feature',
          place_type: ['keyword'],
          properties: {
            landmark: true,
            address: ``,
            category: ''
          },
          text_en_US: searchInput,
          place_name: searchInput,
          center: [0, 0],
          geometry: {
            coordinates: [0, 0],
            type: 'Point'
          },
          context: []
        })

        if (response && response.status == '200') {
          res.request = response.request
          res.headers = response.headers
        }

        var placename_, placename_th, placename_en
        for (var i = 0; i < response.data.length; i++) {
          placename_th = response.data[i].name.th
          placename_en = response.data[i].name.en

          placename_ = placename_th
          if (placename_ == '') {
            placename_ = placename_en
          }

          res.features.push({
            id: response.data[i].tn_id,
            type: 'Feature',
            place_type: ['poi'],
            properties: {
              landmark: true,
              address: `${response.data[i].tambon.th} ${response.data[i].amphoe.th} ${response.data[i].province.th}`,
              category: ''
            },
            text_en_US: response.data[i].name.en,
            place_name: `${placename_} ${response.data[i].tambon.th} ${response.data[i].amphoe.th} ${response.data[i].province.th}`,
            center: [response.data[i].coordinate.lon, response.data[i].coordinate.lat],
            geometry: {
              coordinates: [response.data[i].coordinate.lon, response.data[i].coordinate.lat],
              type: 'Point'
            },
            context: []
          })
        }

        res.config = config;
        if (this.fresh){
          this.fresh = false;
        }
        // supplement Mapbox Geocoding API results with locally populated results
        res.features = res.features
          ? localGeocoderRes.concat(res.features)
          : localGeocoderRes;

        // apply results filter if provided
        if (this.options.filter && res.features.length) {
          res.features = res.features.filter(this.options.filter);
        }

        if (res.features.length) {
          this._clearEl.style.display = 'block';
          this._typeahead.update(res.features);
        } else {
          this._clearEl.style.display = 'none';
          this._typeahead.selected = null;
          this._renderNoResults();
        }

      }.bind(this)
    );

    request.catch(
      function(err) {
        this._loadingEl.style.display = 'none';

        // in the event of an error in the Mapbox Geocoding API still display results from the localGeocoder
        if (localGeocoderRes.length && this.options.localGeocoder) {
          this._clearEl.style.display = 'block';
          this._typeahead.update(localGeocoderRes);
        } else {
          this._clearEl.style.display = 'none';
          this._typeahead.selected = null;
          this._renderError();
        }
      }.bind(this)
    );

    return request;
  },

  _clear: function(ev) {
    if (ev) ev.preventDefault();
    this._inputEl.value = '';
    this._typeahead.selected = null;
    this._typeahead.clear();
    this._onChange();
    this._clearEl.style.display = 'none';
    this._removeMarker();
    this.lastSelected = null;
    this.fresh = true;

    if (!this._searchresult.isEmpty()) {
      this._searchresult.clear();
      this._searchresult.draw();
    }

    this._removeSearchMarker();
  },

  clear: function(ev) {
    this._clear(ev);
    this._inputEl.focus();
  },

  _clearOnBlur: function(ev) {
    var ctx = this;

    if (ev.relatedTarget) {
      ctx._clear(ev);
    }
  },

  _updateProximity: function() {
    if (!this._map){
      return;
    }
    if (this._map.getZoom() > 9) {
      var center = this._map.getCenter().wrap();
      this.setProximity({ longitude: center.lng, latitude: center.lat });
    } else {
      this.setProximity(null);
    }
  },

  _collapse: function() {
    // do not collapse if input is in focus
    if (!this._inputEl.value && this._inputEl !== document.activeElement) this.container.classList.add('mapboxgl-ctrl-geocoder--collapsed');
  },

  _unCollapse: function() {
    this.container.classList.remove('mapboxgl-ctrl-geocoder--collapsed');
  },

  _renderError: function(){
    var errorMessage = "<div class='mapbox-gl-geocoder--error'>There was an error reaching the server</div>"
    this._renderMessage(errorMessage);
  },

  _renderNoResults: function(){
    var errorMessage = "<div class='mapbox-gl-geocoder--error mapbox-gl-geocoder--no-results'>No results found</div>";
    this._renderMessage(errorMessage);
  },

  _renderMessage: function(msg){
    this._typeahead.update([]);
    this._typeahead.selected = null;
    this._typeahead.clear();
    this._typeahead.renderError(msg);
  },

  _getPlaceholderText: function(){
    if (this.options.placeholder) return this.options.placeholder;
    if (this.options.language){
      var firstLanguage = this.options.language.split(",")[0];
      var language = subtag.language(firstLanguage);
      var localizedValue = placeholderText[language];
      if (localizedValue)  return localizedValue;
    }
    return 'Search';
  },

  setProximity: function(proximity) {
    this.options.proximity = proximity;
    return this;
  },

  getProximity: function() {
    return this.options.proximity;
  },

  setRenderFunction: function(fn){
    if (fn && typeof(fn) == "function"){
      this._typeahead.render = fn;
    }
    return this;
  },

  getRenderFunction: function(){
    return this._typeahead.render;
  },

  setLanguage: function(language){
    var browserLocale = navigator.language || navigator.userLanguage || navigator.browserLanguage;
    this.options.language = language || this.options.language || browserLocale;
    return this;
  },

  getLanguage: function(){
    return this.options.language;
  },

  getZoom: function(){
    return this.options.zoom;
  },

  setZoom: function(zoom){
    this.options.zoom = zoom;
    return this;
  },

  getFlyTo: function(){
    return this.options.flyTo;
  },

  setFlyTo: function(flyTo){
    this.options.flyTo = flyTo;
    return this;
  },

  getPlaceholder: function(){
    return this.options.placeholder;
  },

  setPlaceholder: function(placeholder){
    this.placeholder = (placeholder) ? placeholder : this._getPlaceholderText();
    this._inputEl.placeholder = this.placeholder;
    this._inputEl.setAttribute('aria-label', this.placeholder);
    return this
  },

  getBbox: function(){
    return this.options.bbox;
  },

  setBbox: function(bbox){
    this.options.bbox = bbox;
    return this;
  },

  getCountries: function(){
    return this.options.countries;
  },

  setCountries: function(countries){
    this.options.countries = countries;
    return this;
  },

  getTypes: function(){
    return this.options.types;
  },

  setTypes: function(types){
    this.options.types = types;
    return this;
  },

  getMinLength: function(){
    return this.options.minLength;
  },

  setMinLength: function(minLength){
    this.options.minLength = minLength;
    if (this._typeahead)  this._typeahead.minLength = minLength;
    return this;
  },

  getLimit: function(){
    return this.options.limit;
  },

  setLimit: function(limit){
    this.options.limit = limit;
    if (this._typeahead) this._typeahead.options.limit = limit;
    return this;
  },

  getFilter: function(){
    return this.options.filter;
  },

  setFilter: function(filter){
    this.options.filter = filter;
    return this;
  },

  _handleMarker: function(selected){
    if (!this._map){
      return;
    }
    this._removeMarker();
    var defaultMarkerOptions = {
      color: '#4668F2'
    }
    var markerOptions = extend({}, defaultMarkerOptions, this.options.marker)
    this.mapMarker = new this._mapboxgl.Marker(markerOptions);
    if (selected.center) {
      this.mapMarker
        .setLngLat(selected.center)
        .addTo(this._map);
    } else if (selected.geometry && selected.geometry.type && selected.geometry.type === 'Point' && selected.geometry.coordinates) {
      this.mapMarker
        .setLngLat(selected.geometry.coordinates)
        .addTo(this._map);
    }
    return this;
  },

  _removeMarker: function(){
    if (this.mapMarker){
      this.mapMarker.remove();
      this.mapMarker = null;
    }
  },

  _handleSearchMarker: function(selected, index, opt){
    if (!this._map){
      return;
    }

    if (!index && index != 0) {
      this.searchMarkerIndex++
      var index = this.searchMarkerIndex
    }

    var defaultMarkerOptions = {
      color: '#F08D33'
    }
    if (opt) {
      defaultMarkerOptions = opt
    }
    var markerOptions = extend({}, defaultMarkerOptions, this.options.marker)
    this.searchMarker[index] = new this._mapboxgl.Marker(markerOptions);
    this.searchMarker[index]
      .setLngLat(selected.center)
      .addTo(this._map);

    return this;
  },

  _removeSearchMarker: function(){
    if (this.searchMarkerIndex > -1){
      for (var i = 0; i <= this.searchMarkerIndex; i++) {
        if (this.searchMarker[i]) {
          this.searchMarker[i].remove()
          this.searchMarker[i] = null
        }
      }
      this.searchMarkerIndex = -1;
    }
  },

  _actionMarker: function(action, data) {
    // console.log(action + ' , ' + data)
    if (action == 'over') {
      this.searchMarker[data].remove()
      this.searchMarker[data] = null
      this._handleSearchMarker(this.searchresult.features[data], data, { color: '#3FB1CE' })
    } else if (action == 'out') {
      this.searchMarker[data].remove()
      this.searchMarker[data] = null
      this._handleSearchMarker(this.searchresult.features[data], data, { color: '#F08D33' })
    } else if (action == 'focus') {
      this._map.flyTo({center: this.searchresult.features[data].center, zoom: 17});
    }
  },

  _fitbound: function(map, list, paddingOption) {
    if (list.length > 0) {
      var maxlon = list[0].coordinate.lng
      var minlon = list[0].coordinate.lng
      var maxlat = list[0].coordinate.lat
      var minlat = list[0].coordinate.lat
  
      list.forEach((element) => {
        if (maxlon < element.coordinate.lng) {
          maxlon = element.coordinate.lng
        }
        if (minlon > element.coordinate.lng) {
          minlon = element.coordinate.lng
        }
        if (maxlat < element.coordinate.lat) {
          maxlat = element.coordinate.lat
        }
        if (minlat > element.coordinate.lat) {
          minlat = element.coordinate.lat
        }
      })
      map.fitBounds([[
        minlon,
        minlat,
      ], [
        maxlon,
        maxlat,
      ]], {
        padding: paddingOption || {
          top: 50, bottom: 100, left: 530, right: 50,
        },
      })
    }
  }
};

module.exports = MapSearchBox;
