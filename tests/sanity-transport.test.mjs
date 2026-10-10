import assert from "node:assert/strict";
import test from "node:test";
import { SanityClient, SanityHttpError } from "../src/lib/sanity-client.ts";

test("Sanity rejects unsafe configuration", () => {
  for (const config of [{projectId:"evil.example/path"},{dataset:"../private"},{apiVersion:"v2024-01-01?x=1"},{timeoutMs:0}]) assert.throws(() => new SanityClient(config), /configuration/);
});
test("Sanity forbids redirects and caching with a deadline", async () => {
  const client = new SanityClient({fetchFn:async (_url, options) => {
    assert.equal(options.redirect,"error"); assert.equal(options.cache,"no-store"); assert.ok(options.signal instanceof AbortSignal);
    return {ok:true,json:async()=>({result:null})};
  }});
  assert.equal(await client.query("*[0]"),null);
});
test("Sanity errors expose status without remote details",async()=>{
  const client=new SanityClient({fetchFn:async()=>({ok:false,status:409,text:async()=>{assert.fail("must not read body");}})});
  await assert.rejects(client.query("*"), e=>e instanceof SanityHttpError && e.status===409 && e.message==="Sanity request failed (409).");
  const failed=new SanityClient({fetchFn:async()=>{throw new Error("sensitive");}});
  await assert.rejects(failed.query("*"),/^Error: Sanity request could not be completed\.$/);
});
test("Sanity rejects malformed response envelopes",async()=>{
  for(const body of [null,[],{},{result:undefined}]) {
    const client=new SanityClient({fetchFn:async()=>({ok:true,json:async()=>body})});
    await assert.rejects(client.query("*"),/invalid query response/);
  }
  for(const body of [null,{},{results:[]},{results:[{id:"",operation:"create"}]},{results:[{id:"x",operation:"unknown"}]}]) {
    const client=new SanityClient({token:"synthetic",fetchFn:async()=>({ok:true,json:async()=>body})});
    await assert.rejects(client.mutate([{create:{_type:"importDraft"}}]),/invalid mutation response/);
  }
});
test("Sanity requires credential before write network work",async()=>{
  const client=new SanityClient({token:undefined,fetchFn:async()=>assert.fail("network")});
  await assert.rejects(client.mutate([{delete:{id:"x"}}]),/required/);
});
test("Sanity deadline aborts pending requests with sanitized error",async()=>{
  const client=new SanityClient({timeoutMs:10,fetchFn:async(_url,options)=>new Promise((_resolve,reject)=>{
    options.signal.addEventListener("abort",()=>reject(new Error("private detail")),{once:true});
  })});
  await assert.rejects(client.query("*"),/Sanity request could not be completed/);
});
