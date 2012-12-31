var postmap = {
    // Set these variables before loading the feed
    feedUrl: null,
    labelUrl: null,
    mapdiv: null,
    
    // Optionally override this:
    mapOptions: {
        center: new google.maps.LatLng(0, 0),
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
};

/** Load google feeds functionality */
google.load("feeds", "1");

/** The info window for when a marker is clicked */
postmap.infowindow = new google.maps.InfoWindow();

/** Starts loading the feed.
 */
postmap.load_feed = function() {
    var feed = new google.feeds.Feed(postmap.feedUrl);
    feed.setResultFormat(google.feeds.Feed.XML_FORMAT);
    feed.includeHistoricalEntries();
    feed.setNumEntries(250); // we want a maximum of 250 entries, if they exist
    feed.load(postmap.process_feed);
}

/** Analyzes the feed and adds a marker for each post that has a location.
 */
postmap.process_feed = function(result) {
    if (!result.error) {
    
      // Create the map
      var map = new google.maps.Map(postmap.mapdiv, postmap.mapOptions);
      
      // Not sure why there is no georss:point available, put it seems
      // that it corresponds to the center of the georss:box.
      var data = result.xmlDocument;
      var points = data.getElementsByTagName('georss:box');
      // We weren't able to get any georss:point nodes, this might be a
      // Webkit browser and just wants "point" as the tag name.
      if (points.length == 0) {
        points = data.getElementsByTagName('box');
      }

      for (var i = 0; i < points.length; i++) {
        var latlngPair = points[i].firstChild.nodeValue.split(' ');
        var lat = 0.5 * (parseFloat(latlngPair[0]) + parseFloat(latlngPair[2]));
        var lon = 0.5 * (parseFloat(latlngPair[1]) + parseFloat(latlngPair[3]));
        
        var node = points[i].parentNode;
        var title = node.getElementsByTagName('title')[0].firstChild.nodeValue;
        var date;
        var link;
        var pubDate = node.getElementsByTagName('pubDate');
        if (pubDate.length > 0) {
          // This is an RSS feed.
          var tempDate = new Date();
          tempDate.setTime(Date.parse(pubDate[0].firstChild.nodeValue));
          date = tempDate.toLocaleDateString();
          link = node.getElementsByTagName('link')[0]
              .firstChild.nodeValue;
        } else {
          // This is an Atom feed.
          date = node.getElementsByTagName('published')[0] //or 'updated'
              .firstChild.nodeValue.substring(0, 10);
          var links = node.getElementsByTagName('link');
          for (var n = 0; n < links.length; n++) {
            if (links[n].getAttribute('rel') == 'alternate') {
              link = links[n].getAttribute('href');
              break;
            }
          }
        }
        var labels = [];
        var subjectNodes = node.getElementsByTagName('subject'); // dc:subject
        for (var k=0; k<subjectNodes.length; k++) {
            var descrNode = subjectNodes[k].childNodes[0]; // rdf:description
            var valueNode = descrNode.childNodes[1]; // rdf:value
            labels.push(valueNode.textContent);
        }
        
        postmap.procesGeoDatum(map, {
          'title': title,
          'point': new google.maps.LatLng(lat, lon),
          'date': date,
          'link': link,
          'labels': labels
        });
      }
    }
}

/** Sets up a marker, info text and adds an event for a marker click.
 */
postmap.procesGeoDatum = function(map, geodatum) {

    // Set up marker
    var marker = new google.maps.Marker({
        position: geodatum.point,
        map: map,
        title: geodatum.title
    });

    // Set up info text
    var infoHtml =
        '<div>' +
        '<a href="' + geodatum.link + '"><b>' + geodatum.title + '</b></a>' +
        '<div style="color: #666;">Datum: ' + geodatum.date + '</div>'
    for (var i=0; i<geodatum.labels.length; i++) {
        var label = geodatum.labels[i];
        infoHtml += '<div><a href="' + postmap.labelUrl +
                label + '">' + label + '</a></div>';
    }
    infoHtml += '</div>';
        
    // Add click listener
    google.maps.event.addListener(marker, 'click', function() {
        postmap.infowindow.close();
        postmap.infowindow.setContent(infoHtml);
        postmap.infowindow.open(map,marker);
    });
}