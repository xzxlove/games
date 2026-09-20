// Classic worker script: browsers may request a byte range when playing cached audio.
self.playroomRangeResponse = async function (response, range) {
  if (!range) return response;
  const bytes = await response.arrayBuffer(), size = bytes.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const invalid = () => new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  if (!match || (!match[1] && !match[2]) || !size) return invalid();
  const first = match[1] ? Number(match[1]) : Math.max(0,size-Number(match[2]));
  const last = match[1] && match[2] ? Math.min(Number(match[2]),size-1) : size-1;
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first<0 || first>last || first>=size) return invalid();
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Content-Range',`bytes ${first}-${last}/${size}`);
  headers.set('Content-Length',String(last-first+1));
  headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(first,last+1),{status:206,headers});
};
