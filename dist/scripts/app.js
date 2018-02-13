
$(document).ready(function() {


// TODO - add query caching

// TODO - separate environmental info to separate config file
const applicationID = '4BB8J2WCVT'
const apiKey = '0a764b569cdc82fb15451153fe7a43b9';
const indexName = 'restaurants';


//initialize algoliasearch
var client = algoliasearch(applicationID, apiKey);
var indexMaster = client.initIndex(indexName);


//  node elements
var $facetsFood = $('#facet-list-food-type');
var $facetsPayment = $('#facet-list-payment');
var $facetsRating = $('#facet-list-rating');
var $searchBox = $('#search-box');
var $moreBtn = $('.more-btn');
var $filterBtn = $('.filter-btn');
var $resultsSection = $('.results');
var $resultsComponents = $('aside, section');
var $fetchBtn = $('#fetch-hits-btn');
var $closeBtn = $('.close-btn');
var $clearBtn = $('.clear-btn');
var $topBtn = $('#top-btn');
var $numResults = $('.num-results');
var $processingTime = $('.num-time');
var $window = $(window);
var $header = $('header');
var $loadingScreen = $('.loading');

// variables
var currentIndex = 0;
var fetching = false;


//initialize algoliahelper 
var algoliaHelper = algoliasearchHelper(client, indexName, {
	facets: ['payment_options','stars_count'],
	disjunctiveFacets: ['food_type']
});

//exclude facets we do not want in search results
algoliaHelper.addFacetExclusion('payment_options', 'Cash Only');
algoliaHelper.addFacetExclusion('payment_options', 'Pay with OpenTable');
algoliaHelper.addFacetExclusion('payment_options', 'JCB');


//init category filters on left sidebar
initFilters($facetsFood, 'food_type');
initFilters($facetsPayment, 'payment_options');
initRatings();


// get user location via browser
retrieveBrowserLocation();





// Event Handlers

// Algolia listener
algoliaHelper.on('result', function(content) {
	$resultsComponents.removeClass('hidden');
	$loadingScreen.addClass('hidden');
	fetching = false;

	$fetchBtn.html('Show more');
	var numResults = content.hits.length;

	if(numResults < content.nbHits) {
		$fetchBtn.show();
	} else {
		$fetchBtn.hide();
	}

  $numResults.html(numResults);
  $processingTime.html((content.processingTimeMS/1000).toFixed(4));
  	renderFacetList(content);
  	renderHits(content);

});


$window.on('scroll', onHandleScroll);
$fetchBtn.on('click', onFetchHits);

$clearBtn.on('click', function() {
	$('fieldset input').prop('checked', false);
	algoliaHelper.clearRefinements('stars_count');
	algoliaHelper.setQueryParameter('hitsPerPage', 20).search();
	$(this).addClass('hidden');
});

$topBtn.on('click', function(e) {
	e.preventDefault();

    $('html, body, #main').animate({ scrollTop: 0 }, 'slow');
    return false; 


});

$searchBox.on('keyup', function() {
  algoliaHelper.setQuery($(this).val())
        .search();
});

$filterBtn.on('click', function(e) {
	e.preventDefault();
	$resultsComponents.addClass('slide-in');

});

$closeBtn.on('click', function(e) {
	e.preventDefault();
	$resultsComponents.removeClass('slide-in')

});

$moreBtn.on('click', function(e) {
	e.preventDefault();
	$facetsFood.toggleClass('collapse')
});


/* Event Handlers */
function onHandleScroll() {
	var scrollTop = $(document).scrollTop();
	var windowHeight = $(window).height();
	var bodyHeight = $(document).height() - windowHeight;
	var scrollPercentage = (scrollTop / bodyHeight);

	// if the scroll is more than 90% from the top, load more content.
	if(scrollPercentage > 0.04) {
		$header.addClass('fixed');
		$topBtn.removeClass('hidden');
		$resultsSection.addClass('fixed-offset')
	} else {
		$header.removeClass('fixed');
		$topBtn.addClass('hidden');
		$resultsSection.removeClass('fixed-offset')
	}
	if(scrollPercentage > 0.999999 && $fetchBtn.is(':visible')) {
		
		// Load content
		if(!fetching) {
			fetchMoreContent();
		}
	} 
}

function onFetchHits(e) {
	e.preventDefault();
	fetchMoreContent();
}




/* METHODS */

function initFilters($facets, category) {
	$facets.on('click', 'li', function(e) {
		var facetValue = $(this).find('a').data('facet');
		algoliaHelper.toggleFacetRefinement(category, facetValue).setQueryParameter('hitsPerPage', 20)
			  .search();
	});
}

function initRatings() {
	$facetsRating.on('click', 'input[type=radio]', function(e) {
			var facetValue = $(this).val();
			$clearBtn.removeClass('hidden');
			//clear rating refinements
			algoliaHelper.clearRefinements('stars_count');

			//set new rating refinements between star range
			algoliaHelper.addNumericRefinement('stars_count', '>=', Number(facetValue));
			algoliaHelper.addNumericRefinement('stars_count', '<', Number(facetValue) + 1);
			algoliaHelper.setQueryParameter('hitsPerPage', 20).search();
	});

}




//method to get location via browser
function retrieveBrowserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(setGeolocation, showError);

	} else {
		// alert user if browser cannot retrieve latlog
		alert("Geolocation is not supported by this browser.");
    }
}
// if browser location is found, set algolia query parameter for latlong
function setGeolocation(position) {
    algoliaHelper.setQueryParameter('aroundLatLng', String(position.coords.latitude) + ', '+ String(position.coords.longitude));
    algoliaHelper.search(); 
}

//if error occurs, show error and fallback to IP LatLong
function showError(error) {
  var message = '';
  switch(error.code) {
    case error.PERMISSION_DENIED:
      message = "User denied the request for Geolocation."
      break;
    case error.POSITION_UNAVAILABLE:
      message = "Location information is unavailable."
      break;
    case error.TIMEOUT:
      message = "The request to get user location timed out."
      break;
    case error.UNKNOWN_ERROR:
      message = "An unknown error occurred."
      break;
  }
  	alert(message);
  	fallbackToIPLatLong();
}

// sets IP latlong if browser can't be found
function fallbackToIPLatLong() {
  	$.getJSON('//freegeoip.net/json/?callback=?', function(data) {
		ip = data.ip;
		client.setExtraHeader('X-Forwarded-For', data.ip);
		algoliaHelper.setQueryParameter('aroundLatLngViaIP', true);
		algoliaHelper.setPage(currentIndex).setQueryParameter('hitsPerPage', 20).search();
		
	});
}

// render Facet List Items on Sidebar
function renderFacetList(content) {
	$facetsFood.html(function() {
		return $.map(content.getFacetValues('food_type'), function(facet) {
			var aTag = $('<a>')
				.attr('data-facet', facet.name)
				.attr('id', 'fl-' + facet.name);
			var facetValueClass = facet.isRefined ? 'refined'  : '';
			var label = aTag.html(facet.name + '<span class="count pull-right">' + facet.count + '</span>');
			return $('<li class="'+ facetValueClass +'" >').append(label);

		});
	});

	$facetsPayment.html(function() {
		var paymentTypes = content.getFacetValues('payment_options');
		
		return $.map(content.getFacetValues('payment_options'), function(facet) {

			if(!facet.isExcluded && facet.name != 'Diners Club' && facet.name != 'Carte Blanche') {

				var aTag = $('<a>')
					.attr('data-facet', facet.name)
					.attr('id', 'fl-' + facet.name);

				var facetValueClass = facet.isRefined ? 'refined'  : '';
				var label = aTag.html(facet.name + '<span class="count pull-right">' + facet.count + '</span>');
				return $('<li class="'+ facetValueClass +'" >').append(label);
			}
		});
	});
}


// render Hit Results
function renderHits(content) {
	$('#container').html(function() {
			return $.map(content.hits, function(hit) {
				return '<div class="media-object"><img src="' + hit.image_url + '" alt="" width="100" height="100" /><div><h2>'+ hit._highlightResult.name.value +'</h2><p><span class="num-rating">'+ hit.stars_count +'</span><span class="star-default"><span class="star-highlight" style="width:'+ ((hit.stars_count/5) * 100 )+'%"></span></span><span>('+ hit.reviews_count +' reviews)</span></p><p><span class="category">'+ hit._highlightResult.food_type.value +'</span> | <span class="neighborhood">'+ hit._highlightResult.neighborhood.value +'</span> | <span class="price">'+ hit.price_range +'</span></p></div></div>';
		});
	});
}


// retrieve more results on infinite scroll or show more press
function fetchMoreContent() {
	$fetchBtn.html('<i class="fas fa-spinner fa-spin"></i> Loading more results');
	$loadingScreen.removeClass('hidden');
	fetching = true;
	currentIndex += 1;
	algoliaHelper.setPage(currentIndex).setQueryParameter('hitsPerPage', 20* (currentIndex+1)).search();
}


});
