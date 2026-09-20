import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const worker = {self:{},Response,Headers};
vm.runInNewContext(readFileSync(new URL('../dist/shared/media-range.js',import.meta.url),'utf8'),worker);
const slice = worker.self.playroomRangeResponse;
const media = () => new Response(Uint8Array.from([0,1,2,3,4,5,6,7,8,9]),{headers:{'Content-Type':'audio/mp4'}});

test('offline audio serves bounded, open-ended and suffix byte ranges',async()=>{
  for(const [range,expected,header]of [['bytes=2-5',[2,3,4,5],'bytes 2-5/10'],['bytes=7-',[7,8,9],'bytes 7-9/10'],['bytes=-3',[7,8,9],'bytes 7-9/10'],['bytes=8-30',[8,9],'bytes 8-9/10']]){
    const response=await slice(media(),range);
    assert.equal(response.status,206);assert.equal(response.headers.get('Content-Type'),'audio/mp4');
    assert.equal(response.headers.get('Content-Range'),header);
    assert.equal(response.headers.get('Content-Length'),String(expected.length));
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],expected);
  }
});
test('invalid media ranges return 416; normal requests retain the complete resource',async()=>{
  for(const range of ['bytes=10-','bytes=5-2','bytes=-0','bytes=-','bytes=0-1,5-6','other=1-2']) assert.equal((await slice(media(),range)).status,416);
  const original=media();assert.equal(await slice(original,null),original);
});
