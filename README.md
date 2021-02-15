# feedseeker

This is an experimental feed reader built as a browser extension.

As you browse, it attempts to discover feeds and automatically start following them. You can ignore the ones that aren't interesting.

## TODO

* dark mode
* record last update time for each feed
* gentler feed poll
  * make sure we're using etags and getting 304s
  * variable poll intervals based on last new item found
  * honor cache max ages
* manual feed follow
* find a better way to get site favicons
  * i.e. stop (ab)using "https://www.google.com/s2/favicons?domain=${feedHostname}"
* button to abort / pause queues
* regexps to auto-ignore feeds?
  * would be nice to exclude all those blog post comment feeds
* feed management panel
* OPML export of followed feeds
* configurable timespan for display
* threshold for number of visits to a site before following the feed
* lazy-load feed items on scroll so we don't load everything at once
* group items by feed, sort feeds by last update time
* algorithmic priority sort (optional)
  * number of recent visits to a site should score higher
  * infrequently-updated feeds should float higher
  * accept manual likes as signal to boost a feed
* mobile extension?
* make browser.storage.sync useful somehow?
* expire & remove defunct items from store after awhile
* limit the number of items processed in a feed
  * some feeds go back forever - e.g. https://airbagindustries.com/index.xml
* split thumbnail queue job up into individual thumbs rather than per-feed
* un-ignore feed that's been explicitly followed
* separate list of ignored vs failed feeds?
