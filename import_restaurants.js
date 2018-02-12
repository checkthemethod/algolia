/*** Script to Import and Merge Restaurant Json and CSV files ***/


/* helper files */
const http = require('http');
const _ = require('lodash');
const algoliasearch = require('algoliasearch');
const fs = require('fs');

/* to be put in ENV config */
const applicationID = '4BB8J2WCVT'
const apiKey = '0a764b569cdc82fb15451153fe7a43b9';
const indexName = 'restaurants';


var client = algoliasearch(applicationID, apiKey);
var index = client.initIndex(indexName);

var restaurantFile = 'resources/dataset/restaurants_list.json';
var restaurantFile2 = "resources/dataset/restaurants_info.csv";
var dictionary, dictionary2 =  [];


/* load original restaurants list */
var promise = new Promise(function(resolve, reject) {
  fs.readFile(restaurantFile, 'utf8', function (err, data) {
    if (err) reject(err);
    dictionary = JSON.parse(data);
    resolve(dictionary);
  });
});



promise.then(function(result) {
  /* load csv file with extra data */
  return new Promise((resolve, reject) => { 
      fs.readFile(restaurantFile2, 'utf8', function (err, data) {
        if(err) reject(err);
        resolve(data);
      })
  })
}).then(function(result,err) {
   return processData(result); //process the data from the supplemental restaurant information
}).then(function(result) {
  return mergeDictionaryItems(); //merge the information together
}).then(function(result) {
  pushToAlgolia(); //push to algolia index
});


/* process the datafile into readable json objects */
function processData(allText) {
  var allTextLines = allText.split(/\r\n|\n/);
  var headers = allTextLines[0].split(';');
  var lines = [];

  for (var i=1; i<allTextLines.length; i++) {
      var data = allTextLines[i].split(';');
      if (data.length == headers.length) {
          var tarr = [];
          for (var j=0; j<headers.length; j++) {
              tarr.push(headers[j]+":"+data[j]);
          }
          lines.push(tarr);
      }
  }

  for(var j=0; j< lines.length; j++) {
  	var obj = {};
  	for(var i=0; i<lines[j].length; i++) {
  	    var attributeString = lines[j][i];
  	    var splitAttr = attributeString.split(':');
  	    if (splitAttr[0] == 'objectID' || splitAttr[0] == "stars_count" || splitAttr[0] == "reviews_count" ) {
  	    	obj[splitAttr[0]] = Number(splitAttr[1]);
  	    } else {
  	    	obj[splitAttr[0]] = splitAttr[1];
  	    }
  	}
  	dictionary2.push(obj);
  }

  return new Promise((resolve, reject) => {
    resolve(dictionary2);
  });
  
}

/* merge restaurant list with additional restaurant items */
function mergeDictionaryItems() {
  for(var i in dictionary){
    var tester = dictionary[i].objectID;
    var dictionary2Index = _.findIndex(dictionary2, function(o) { return o.objectID == tester; });
    for (var attrname in dictionary2[dictionary2Index]) { dictionary[i][attrname] = dictionary2[dictionary2Index][attrname]; }
	}

  return new Promise((resolve, reject) => {
    resolve(dictionary);
  });

}

/* add objects to algolia index */
function pushToAlgolia() {
  index.addObjects(dictionary, function(err, content) {
    console.log(content);
  });
}

