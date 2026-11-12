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

    /** Tipo de lugar en palabras normales, con su emoji y un color, para distinguir dos lugares que se llaman igual. */
    typeInfo: function(r) {
        var c = r.class || '', t = r.type || '';
        var T = function(key, es, emoji, color) { return { label: window.mapText(key, es), emoji: emoji, color: color }; };
        if (c === 'boundary' || c === 'place') {
            if (/^(city|town|municipality)$/.test(t) || t === 'administrative') return T('map_type_city', 'City or town', '\ud83c\udfd9\ufe0f', '#4c9dff');
            if (/^(village|hamlet|isolated_dwelling)$/.test(t)) return T('map_type_village', 'Village', '\ud83c\udfd8\ufe0f', '#6fd36f');
            if (/^(suburb|neighbourhood|quarter|borough)$/.test(t)) return T('map_type_hood', 'Neighborhood', '\ud83c\udfe1', '#ffb547');
            if (/^(state|region|county|province)$/.test(t)) return T('map_type_region', 'Region', '\ud83d\uddfa\ufe0f', '#b47cff');
            if (t === 'country') return T('map_type_country', 'Country', '\ud83c\udf0e', '#ff6b8a');
            return T('map_type_place', 'Place', '\ud83d\udccd', '#9aa4c0');
        }
        if (c === 'shop' && t === 'mall') return T('map_type_mall', 'Shopping mall', '\ud83d\udecd\ufe0f', '#ff8a3d');
        if (c === 'tourism') return T('map_type_tourism', 'Tourist spot', '\ud83c\udfa1', '#ff6b8a');
        if (c === 'historic') return T('map_type_historic', 'Historic site', '\ud83c\udfdb\ufe0f', '#d9a84e');
        if (c === 'natural') return T(/peak|volcano|hill/.test(t) ? 'map_type_mountain' : 'map_type_natural', /peak|volcano|hill/.test(t) ? 'Mountain' : 'Nature', /peak|volcano|hill/.test(t) ? '\u26f0\ufe0f' : '\ud83c\udf3f', '#6fd36f');
        if (c === 'leisure') return T('map_type_park', 'Park', '\ud83c\udf33', '#6fd36f');
        if (c === 'building') return T('map_type_building', 'Building', '\ud83c\udfe2', '#4c9dff');
        if (c === 'amenity') return T('map_type_amenity', 'Service', '\ud83c\udfe5', '#5ef0c0');
        if (c === 'aeroway') return T('map_type_airport', 'Airport', '\u2708\ufe0f', '#36d1ff');
        if (c === 'railway') return T('map_type_station', 'Station', '\ud83d\ude89', '#b47cff');
        return T('map_type_place', 'Place', '\ud83d\udccd', '#9aa4c0');
    },

    thumbCache: {},

    /** Pide la foto del lugar a Wikipedia o Wikidata (gratis y sin cuenta). Si no hay, se queda el emoji. */
    loadThumb: function(result, $el) {
        var self = this, x = result.extratags || {};
        var put = function(url) {
            if (!url) return;
            // se carga primero para no dejar un cuadro roto si la imagen falla
            var img = new Image();
            img.onload = function() {
                $el.text('').css('background-image', 'url("' + url + '")').addClass('has-photo');
            };
            img.src = url;
        };
        var fromSummary = function(lang, title, done) {
            var key = lang + ':' + title;
            if (key in self.thumbCache) return done(self.thumbCache[key]);
            $.ajax({
                url: 'https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(String(title).replace(/ /g, '_')),
                dataType: 'json', timeout: 6000
            }).done(function(d) {
                self.thumbCache[key] = d && d.thumbnail ? d.thumbnail.source : null;
                done(self.thumbCache[key]);
            }).fail(function() { done(null); });
        };
        var m = x.wikipedia ? String(x.wikipedia).match(/^([a-z-]+):(.+)$/) : null;
        if (m) {
            fromSummary(m[1], m[2], put);
        } else if (x.wikidata && /^Q\d+$/.test(x.wikidata)) {
            $.ajax({
                url: 'https://www.wikidata.org/w/api.php',
                data: { action: 'wbgetentities', ids: x.wikidata, props: 'sitelinks|claims', sitefilter: 'eswiki|enwiki', format: 'json', origin: '*' },
                dataType: 'json', timeout: 6000
            }).done(function(d) {
                var e = d && d.entities && d.entities[x.wikidata];
                if (!e) return;
                var p18 = e.claims && e.claims.P18 && e.claims.P18[0] && e.claims.P18[0].mainsnak && e.claims.P18[0].mainsnak.datavalue;
                if (p18 && p18.value) {
                    put('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(p18.value) + '?width=120');
                } else if (e.sitelinks && e.sitelinks.eswiki) {
                    fromSummary('es', e.sitelinks.eswiki.title, put);
                } else if (e.sitelinks && e.sitelinks.enwiki) {
                    fromSummary('en', e.sitelinks.enwiki.title, put);
                }
            });
        }
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
        results.forEach(function(result, idx) {
            var displayName = result.display_name;
            var nameParts = displayName.split(',');
            var mainName = nameParts[0];
            var details = nameParts.slice(1, 3).join(',');
            
            var area = self.areaFor(result);
            var areaAttr = area ? ' data-area="' + area.join(',') + '"' : '';
            var autoTag = area ? ' \u00b7 ' + window.mapText('map_search_autoselect', 'selects the area') : '';
            var ti = self.typeInfo(result);
            html += '<div class="search-result-item" data-idx="' + idx + '" data-lat="' + result.lat + '" data-lon="' + result.lon + '"' + areaAttr + '>';
            html += '<div class="search-result-thumb" data-thumb="' + idx + '" aria-hidden="true">' + ti.emoji + '</div>';
            html += '<div class="search-result-body">';
            html += '<div class="search-result-name">' + self.escapeHtml(mainName) + '</div>';
            html += '<div class="search-result-details">' + self.escapeHtml(details + autoTag) + '</div>';
            html += '<span class="search-result-type" style="--tc:' + ti.color + '">' + self.escapeHtml(ti.label) + '</span>';
            html += '</div></div>';
        });
        
        $results.html(html).show();
        // las fotos llegan después, una por una: el resultado ya se puede tocar mientras tanto
        results.forEach(function(result, idx) {
            self.loadThumb(result, $results.find('[data-thumb="' + idx + '"]'));
        });
        
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
