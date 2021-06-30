module.exports.msToElapsed = (millis) => {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  //If seconds is less than 10 put a zero in front.
  return `${minutes}:${(seconds < 10 ? "0" : "")}${seconds}`;
}

module.exports.stringHash = (str) => {
  var hash = 0, i, chr
  if (str.length === 0) return hash
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }
  return (hash + 2147483647 + 1).toString(16)
}

module.exports.chunker = (items, chunkSize) => {
  var chunks = []
  var numChunks = Math.floor(items.length / chunkSize)

  for (let i = 0; i < numChunks; i++) {
    var chunk_start = i * chunkSize
    var chunk_end = chunk_start + chunkSize
    var chunk = items.slice(chunk_start, chunk_end)
    chunks.push(chunk)
  }

  var remainingForLastChunk = items.length - (numChunks * chunkSize)
  if (remainingForLastChunk > 0) {
    var chunk_start = numChunks * chunkSize
    var last_chunk = items.slice(chunk_start)
    chunks.push(last_chunk)
  }
  return chunks
}