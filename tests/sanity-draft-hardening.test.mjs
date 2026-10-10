import assert from 'node:assert/strict';
import test from 'node:test';
import { SanityClient } from '../src/lib/sanity-client.ts';
import { SanityDraftStore } from '../src/lib/sanity-draft-store.ts';
import { normalizeCandidate } from '../src/lib/importer/normalizer.ts';

const candidate = normalizeCandidate({sourceId:'impact', sourceUrl:'https://example.com/item', name:'Synthetic test item'});
const document = () => ({_id:'generated-test', _rev:'rev-1', _type:'importDraft', _createdAt:'2026-10-10T00:00:00Z', _updatedAt:'2026-10-10T00:00:00Z', sourceId:candidate.sourceId, canonicalUrl:candidate.canonicalUrl, externalProductId:null, candidateJson:JSON.stringify(candidate), editedCandidateJson:'{}', importStatus:'draft', version:1});
function harness(doc, mutationResult = {results:[{id:'generated-test',operation:'update'}]}) {
  let mutations = 0;
  const store = new SanityDraftStore(new SanityClient({token:'synthetic-token', fetchFn: async (_url, options) => {
    if (options.method === 'POST') { mutations++; return {ok:true,json:async()=>mutationResult}; }
    return {ok:true,json:async()=>({result:doc})};
  }}));
  return {store, count:()=>mutations};
}

test('invalid persisted metadata and payloads cannot trigger a patch', async () => {
  for (const patch of [{_rev:undefined},{_rev:''},{_id:''},{version:0},{version:1.5},{version:Number.MAX_SAFE_INTEGER},{candidateJson:'{'},{candidateJson:'null'},{candidateJson:'{}'},{editedCandidateJson:'[]'},{editedCandidateJson:'{'},{editedCandidateJson:'{"name":12}'},{sourceId:'different'}]) {
    const h = harness({...document(),...patch});
    await assert.rejects(h.store.updateDraft('generated-test', {name:'edit'}, 1));
    assert.equal(h.count(),0,JSON.stringify(patch));
  }
});

test('invalid mutation acknowledgement cannot report update success', async () => {
  for (const result of [{results:[]},{results:[{id:'other',operation:'update'}]},{results:[{id:'generated-test',operation:'create'}]}]) {
    const h = harness(document(),result);
    await assert.rejects(h.store.updateDraft('generated-test',{name:'edit'},1));
    assert.equal(h.count(),1);
  }
});

test('two simultaneous updates read one revision; exactly one CAS mutation succeeds', async () => {
  let doc = document(); let reads = 0; let release; let writes=0; let accepted=0;
  const barrier = new Promise(resolve => {release=resolve;});
  const client = new SanityClient({token:'synthetic-token', fetchFn:async (_url,options)=>{
    if(options.method==='GET') {
      const snapshot = structuredClone(doc); reads++; if(reads===2) release(); await barrier;
      return {ok:true,json:async()=>({result:snapshot})};
    }
    writes++;
    const patch=JSON.parse(options.body).mutations[0].patch;
    if(patch.ifRevisionID!==doc._rev) return {ok:false,status:409,text:async()=> 'conflict'};
    accepted++; doc={...doc,...patch.set,_rev:'rev-2'};
    return {ok:true,json:async()=>({results:[{id:doc._id,operation:'update'}]})};
  }});
  const store = new SanityDraftStore(client);
  const results=await Promise.all([store.updateDraft(doc._id,{name:'first'},1),store.updateDraft(doc._id,{name:'second'},1)]);
  assert.equal(results.filter(r=>r.ok).length,1);
  assert.equal(results.filter(r=>r.code==='CONFLICT').length,1);
  assert.equal(writes,2); assert.equal(accepted,1); assert.equal(doc.version,2);
});

test('delete does not swallow unavailable Content Lake or rejected mutation', async () => {
  for(const status of [403,500,503]) {
    const store=new SanityDraftStore(new SanityClient({token:'synthetic-token',fetchFn:async()=>({ok:false,status,text:async()=> 'private upstream detail'})}));
    await assert.rejects(store.deleteDraft('generated-test'));
  }
});
