// City Search Functionality
var citySearch = {
    searchTimeout: null,
    activeRequest: null,
    
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        var self = this;
        
        // Search on button click
        $('#search-btn').on('click', function() {
            clearTimeout(self.searchTimeout);
            self.performSearch();
        });
        
        // Search on Enter key
        $('#city-search').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                clearTimeout(self.searchTimeout);
                self.performSearch();
            }
        });
        
        // Search as user types (debounced)
        $('#city-search').on('input', function() {
            clearTimeout(self.searchTimeout);
            var query = $(this).val().trim();
            
            if (query.length >= 3) {
                self.searchTimeout = setTimeout(function() {
                    self.performSearch(query);
                }, 500);
            } else {
                self.hideResults();
            }
        });
        
        // Hide results when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('#search-container').length) {
                self.hideResults();
            }
        });
    },
    
    performSearch: function(query) {
        var self = this;
        query = query || $('#city-search').val().trim();
        
        if (query.length < 2) {
            return;
        }
        
        // Abort any in-flight request so stale responses never overwrite fresh ones
        if (self.activeRequest) {
            self.activeRequest.abort();
            self.activeRequest = null;
        }
        
        this.showLoading();
        
        // Use Nominatim geocoding service
        var url = 'https://nominatim.openstreetmap.org/search';
        var params = {
            q: query,
            format: 'json',
            limit: 5,
            addressdetails: 1,
            extratags: 1,
            'accept-language': 'en'
        };
        
        var request = self.activeRequest = $.ajax({
            url: url,
            data: params,
            method: 'GET',
            timeout: 10000,
            success: function(data) {
                if (self.activeRequest !== request) return;
                self.activeRequest = null;
                self.displayResults(data);
            },
            error: function(jqXHR, textStatus) {
                if (self.activeRequest !== request) return;
                self.activeRequest = null;
                if (textStatus !== 'abort') {
                    // status 0 means the request never reached the host: DNS,
                    // TLS or a network-level block, not a geocoder error.
                    arnisLog('warn', 'Geocoding request to ' + url + ' failed (' +
                        textStatus + ', HTTP status ' + (jqXHR && jqXHR.status) + ').');
                    self.showError(window.mapText('map_search_failed', 'Search failed. Please try again.'));
                }
            }
        });
    },
    
    showLoading: function() {
        $('#search-results').html('<div class="search-loading"></div>').show();
        $('#search-results .search-loading').text(window.mapText('map_search_searching', 'Searching...'));
    },
    
    showError: function(message) {
        $('#search-results').html('<div class="search-no-results">' + message + '</div>').show();
    },
    
    hideResults: function() {
        // Abort any in-flight request so a stale response doesn't re-show results
        if (this.activeRequest) {
            this.activeRequest.abort();
            this.activeRequest = null;
        }
        $('#search-results').hide();
    },
    
    // Places this small are selected as a whole area when picked from the results
    // (a village, a plaza, a tower, the pyramids…); bigger ones just zoom the map.
    AUTO_SELECT_MAX_KM: 25,
    AUTO_SELECT_MIN_KM: 0.5,

    /** [south, west, north, east] to select for a Nominatim result, or null when it is too big or has no box. */
    areaFor: function(result) {
        var bb = result && result.boundingbox;
        if (!bb || bb.length !== 4) return null;
        var s = parseFloat(bb[0]), n = parseFloat(bb[1]), w = parseFloat(bb[2]), e = parseFloat(bb[3]);
        if (![s, n, w, e].every(isFinite) || n < s || e < w) return null;   // e < w: crosses the antimeridian, leave it
        var midLat = (s + n) / 2, kmLat = 111.32, kmLon = 111.32 * Math.cos(midLat * Math.PI / 180);
        var h = (n - s) * kmLat, wd = (e - w) * kmLon;
        if (Math.max(h, wd) > this.AUTO_SELECT_MAX_KM) return null;
        // a single building comes with a box of a few meters: give it some surroundings
        var min = this.AUTO_SELECT_MIN_KM;
        if (h < min) { var dl = (min - h) / 2 / kmLat; s -= dl; n += dl; }
        if (wd < min && kmLon > 0) { var dn = (min - wd) / 2 / kmLon; w -= dn; e += dn; }
        if (s < -90 || n > 90 || w < -180 || e > 180) return null;
        return [s, w, n, e];
    },

    displayResults: function(results) {
        var self = this;
        var $results = $('#search-results');
        
        if (results.length === 0) {
            $results.html('<div class="search-no-results"></div>').show();
            $results.find('.search-no-results').text(window.mapText('map_search_none', 'No cities found'));
            return;
        }
        
        var html = '';
        results.forEach(function(result) {
            var displayName = result.display_name;
            var nameParts = displayName.split(',');
            var mainName = nameParts[0];
            var details = nameParts.slice(1, 3).join(',');
            
            var area = self.areaFor(result);
            var areaAttr = area ? ' data-area="' + area.join(',') + '"' : '';
            var autoTag = area ? ' · ' + window.mapText('map_search_autoselect', 'selects the area') : '';
            html += '<div class="search-result-item" data-lat="' + result.lat + '" data-lon="' + result.lon + '"' + areaAttr + '>';
            html += '<div class="search-result-name">' + self.escapeHtml(mainName) + '</div>';
            html += '<div class="search-result-details">' + self.escapeHtml(details + autoTag) + '</div>';
            html += '</div>';
        });
        
        $results.html(html).show();
        
        // Bind click events to results
        $('.search-result-item').on('click', function() {
            var lat = parseFloat($(this).data('lat'));
            var lon = parseFloat($(this).data('lon'));
            var name = $(this).find('.search-result-name').text();
            
            var areaStr = $(this).attr('data-area');
            var area = areaStr ? areaStr.split(',').map(parseFloat) : null;
            self.goToLocation(lat, lon, name, area);
            self.hideResults();
        });
    },
    
    goToLocation: function(lat, lon, name, area) {
        if (typeof map !== 'undefined' && map) {
            // Clear existing bbox selection and spawn points
            if (typeof drawnItems !== 'undefined' && drawnItems) {
                drawnItems.clearLayers();
            }
            
            // Try to access bounds through the map layers or find the bounds rectangle
            var boundsLayer = null;
            map.eachLayer(function(layer) {
                if (layer instanceof L.Rectangle && layer.options.color === '#3778d4') {
                    boundsLayer = layer;
                }
            });
            
            if (boundsLayer) {
                boundsLayer.setBounds(new L.LatLngBounds([0.0, 0.0], [0.0, 0.0]));
                
                // Update the bbox display
                if (typeof formatBounds === 'function') {
                    $('#boxbounds').text(formatBounds(boundsLayer.getBounds(), '4326'));
                    
                    if (typeof currentproj !== 'undefined') {
                        $('#boxboundsmerc').text(formatBounds(boundsLayer.getBounds(), currentproj));
                    }
                }
                
                // Notify parent window of bbox update
                if (typeof notifyBboxUpdate === 'function') {
                    notifyBboxUpdate();
                }
            }
            
            if (area && area.length === 4 && area.every(isFinite)) {
                // A small place: select all of it. Same path as the bbox typed into the parent
                // window, which also frames the map on the area and tells the parent about it.
                var lyr = new L.Rectangle(new L.LatLngBounds([area[0], area[1]], [area[2], area[3]]));
                map.fire('draw:created', { layer: lyr, layerType: 'polygon' });
            } else {
                // Simply zoom to location without adding markers or popups
                map.setView([lat, lon], 12);
            }
            
            // Clear search box
            $('#city-search').val('');
        }
    },
    
    escapeHtml: function(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize search when document is ready
$(document).ready(function() {
    // Wait a bit for the map to be initialized
    setTimeout(function() {
        if (typeof map !== 'undefined') {
            citySearch.init();
        }
    }, 1000);
});
