'<!--'; jsonp(`-->
# <span class=accountnumber>2519219</span> BlueSky accounts as of <span class=timestamp>2023-12-12T20:43:06.131Z</span>

This repository contains basic account information for BlueSky accounts in JSON format.

The repository itself contains a set of 2+ million DIDs, i.e. unique fixed dentifier
of BlueSky accounts. These DIDs are split into a set of small-size buckets, each
one is a JSON file.

They are stored in /dids subdirectory, such as:

* [/dids/a/**ab**.json](./dids/a/ab.json)
* [/dids/a/**ac**.json](./dids/a/ac.json)
* [/dids/a/**ad**.json](./dids/a/ad.json)
* ...
* [/dids/z/**zz**.json](./dids/z/zz.json)

There is an [/index.js](./index.js) script to update the contents of those JSON files
to the latest from BlueSky servers (using atproto API).

Additionally, if you have accecss codes to this project's GitHub repositories, you
can run update from a web page.



<!-- `)// -->