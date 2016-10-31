"use strict";
var map;

/**
 * Name: initMap
 * Description: Initialize Map
 */
var initMap = function() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {"lat": 40.543160, "lng": -74.363205}, // Metuchen, NJ, USA
        zoom: 13
    });
    ko.applyBindings(new viewModel());
}

/**
 * Name: googleError
 * Description: This function prints error when Google Maps Unable to load
 */
var googleError = function() {
    $('body').prepend('<h5 class="alert alert-danger">Google Maps unable to load. Please try again!</h5>');
}

/**
 * Name: getData
 * @param place
 * Description: This function retrieves data for the 'place' from the Yelp API
 */
var getData = function(place) {
    /**
     * Begin OAuth signature generation
     */

    function nonce_generate() {
        return (Math.floor(Math.random() * 1e12).toString());
    }

    var yelp_url = 'https://api.yelp.com/v2/business/' + place.placeID();
    var YELP_KEY = "L3XxOdBKm-eE4APxDEFocw";
    var YELP_TOKEN = "V-TwTSTGOVqUAWsTL4iEyG0WxCxtbpwS";
    var YELP_KEY_SECRET = "mmoVfufpNvkrizh95TFQKpfxAdY";
    var YELP_TOKEN_SECRET = "164Cz9dbsDNgZBP2w0q-ia_bYqA";

    var oauth_parameters = {
        oauth_consumer_key: YELP_KEY,
        oauth_token: YELP_TOKEN,
        oauth_nonce: nonce_generate(),
        oauth_timestamp: Math.floor(Date.now()/1000),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_version : '1.0',
        callback: 'cb' // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
    };

    var encodedSignature = oauthSignature.generate('GET',yelp_url, oauth_parameters, YELP_KEY_SECRET, YELP_TOKEN_SECRET);
    oauth_parameters.oauth_signature = encodedSignature;

    /**
     * End OAuth signature generation
     */

    var ajax_parameters = {
        url: yelp_url,
        data: oauth_parameters,
        cache: true, // Prevent jQuery from adding on a cache-buster parameter "_=23489489749837", thus invalidating the oauth-signature
        dataType: 'JSONP',
        success: function(data) {
            // Populate the info window with data from the Yelp API
            $('#' + place.placeID() + '-img').attr('src', data['image_url']).attr('alt', data['name']);
            $('#' + place.placeID() + '-title').text(data['name']);
            $('#' + place.placeID() + '-address').text(data['location']['address']);
            $('#' + place.placeID() + '-rating').attr('src', data['rating_img_url_small']).attr('alt', 'Rating: ' + data['rating']);
            $('#' + place.placeID() + '-description').text(data['snippet_text']);
            $('#' + place.placeID() + '-link').attr('href', data['url']).removeClass('hidden');
        },
        error: function() {
            // In case there is an error with the request to Yelp API, display this meesage
            $('#' + place.placeID() + '-description').text('Could not Load Yelp data. Please try again.').addClass("alert-danger");
        }
    };

    $.ajax(ajax_parameters);
};


/**
 * Name: openInfoWindow
 * @param place
 * Description: This function opens a popup which displays details
 *              related to the marker on the Map
 */
var openInfoWindow = function(place){
    place.infowindow().open(map, place.marker());
    place.marker().setAnimation(google.maps.Animation.BOUNCE);
    window.setTimeout(function() {
        place.marker().setAnimation(null);
    }, 2000);
    getData(place);
};

/**
 * Name: Place
 * @param data
 * Description: This the Place object where the data is loaded from places.js file
 */
var Place = function(data) {
    var self = this;
    self.name = ko.observable(data.name);
    self.placeID = ko.observable(data.placeID);
    self.lat = ko.observable(data.lat);
    self.lng = ko.observable(data.lng);

    // This boolean determines if the restaurant is visible when we filter the list
    self.visible = ko.observable(true);

    // Initialize the map marker
    self.marker = ko.observable(
        new google.maps.Marker({
            position: {lat: self.lat(), lng: self.lng()},
            map: map,
            title: self.name(),
            animation: google.maps.Animation.DROP
        })
    );

    // Initialize the map infowindow that will display the Yelp data
    self.infowindow = ko.observable(
        new google.maps.InfoWindow({
            content:
            '<div class="media">' +
            '  <div class="media-left"><img id="' + self.placeID() + '-img" class="media-object, image" src="" alt=""></div>' +
            '  <div class="media-body">' +
            '    <h4 id="' + self.placeID() + '-title" class="media-heading">' + self.name() + '</h4>' +
            '    <p id="' + self.placeID() + '-address"></p>' +
            '    <img id="' + self.placeID() + '-rating" src="" alt=""><br>' +
            '    <span id="' + self.placeID() + '-description">Loading Yelp data ... please wait.</span><br>' +
            '    <a id="' + self.placeID() + '-link" href="" class="hidden" target="_blank">Read more on <b>Yelp</b></a>' +
            '  </div>' +
            '</div>'
        })
    );
};

var viewModel = function() {
    var self = this;

    self.places = ko.observableArray([]);
    self.selectedPlace = ko.observable();
    self.filtertext = ko.observable("");

    self.filtertext.extend({
        rateLimit: {
            timeout: 500,
            method: "notifyWhenChangesStop"
        }
    });

    /**
     * Name: handleInfoWindow
     * Description: This method handles the selected item from the places list.
     */
    self.handleInfoWindow = function(placeObj){
        if (self.selectedPlace()){
            self.selectedPlace().infowindow().close();
        }
        self.selectedPlace(placeObj);
        openInfoWindow(placeObj);
    };

    /**
     * Populate the places array[] with places objects from places.js file
     * Sort the places array[]
     * Sets the click event on the marker
     */
    placesInfo.sort(function(a, b) { return a.name > b.name;});
    placesInfo.forEach(function(item){
        var placeObj = new Place(item);
        self.places.push(placeObj);

        placeObj.marker().addListener('click', function() {
            self.handleInfoWindow(placeObj);
        });
    });

    /**
     * Name: displayPlace
     * Description: This method will hide the already opened infoWindow.
     *              Then, display the infoWindow for corresponding place.
     */
    self.displayPlace = function(placeObj){
        self.handleInfoWindow(placeObj);
    };

    /**
     * Name: filterPlaces
     * Description: This method filters the user input from the Places List.
     */
    self.filterPlaces = function(){
        self.places().forEach(function (item) {
            var name = item.name();
            var ft = self.filtertext();
            if ( name.toLowerCase().search(ft.toLowerCase()) == -1 ){
                item.visible(false);
                item.infowindow().close();
                item.marker().setVisible(false);
            } else {
                item.visible(true);
                item.marker().setVisible(true);
            }
        });
    };

    /**
     * This tells KO to call filterPlaces each time filtertext is changed
     */
    self.filtertext.subscribe(self.filterPlaces);
};