const { allShortDIDs } = require('./utils');

function noCollision() {
  process.stdout.write('Loading all DIDs...');
  const shortDIDs = allShortDIDs();
  console.log(' total ' + shortDIDs.length + '.');

  for (let len = 3; len < shortDIDs[0].length; len++) {
    process.stdout.write(' Length ' + len);

    const buckets = {};
    let maxCount = 0;
    for (const shortDID of shortDIDs) {
      const bucketKey = shortDID.substr(0, len);
      const bucket = buckets[bucketKey] || (buckets[bucketKey] = []);
      bucket.push(shortDID);
      if (bucket.length > maxCount)
        maxCount = bucket.length;

      if (maxCount > 100) {
        console.log(' >100');
        break;
      }
    }

    if (maxCount < 100) {
      if (maxCount === 1) {
        console.log(' no collisions');
        break;
      }

      const collisionBucketCounts = {};
      const collisionBuckets = {};
      for (const bucketKey in buckets) {
        const bucket = buckets[bucketKey];
        if (bucket.length === 1) continue;

        collisionBucketCounts[bucket.length] = (collisionBucketCounts[bucket.length] || 0) + 1;
        let sameCountBuckets = collisionBuckets[bucket.length];
        if (sameCountBuckets) sameCountBuckets.push(bucket);
        else collisionBuckets[bucket.length] = [bucket];
      }

      console.log(collisionBucketCounts);
    }
  }
}

module.exports = {
  noCollision
};