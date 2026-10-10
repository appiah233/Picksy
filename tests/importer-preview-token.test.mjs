import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { generatePreviewToken, verifyPreviewToken } from '../src/lib/importer/auth.ts';

const secret = 'synthetic-preview-test-secret-at-least-32-bytes';
const sign = (payload) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${crypto.createHmac('sha256', secret).update(encoded).digest('base64url')}`;
};
test('preview signing and verification fail closed without a sufficiently long secret', () => {
  const previous = process.env.IMPORTER_PREVIEW_SECRET;
  try {
    for (const value of [undefined, '', 'short']) {
      if (value === undefined) delete process.env.IMPORTER_PREVIEW_SECRET;
      else process.env.IMPORTER_PREVIEW_SECRET = value;
      assert.throws(() => generatePreviewToken('impact', 'https://example.com/item'));
      assert.equal(verifyPreviewToken(sign({sourceId:'impact',canonicalUrl:'https://example.com/item',timestamp:Date.now()})).ok, false);
    }
  } finally {
    if (previous === undefined) delete process.env.IMPORTER_PREVIEW_SECRET;
    else process.env.IMPORTER_PREVIEW_SECRET = previous;
  }
});
test('preview tokens validate signed fields, timestamp, expiry and bounded input', () => {
  const previous = process.env.IMPORTER_PREVIEW_SECRET;
  process.env.IMPORTER_PREVIEW_SECRET = secret;
  try {
    const base = {sourceId:'impact',canonicalUrl:'https://example.com/item',timestamp:Date.now()};
    assert.equal(verifyPreviewToken(generatePreviewToken(base.sourceId,base.canonicalUrl)).ok,true);
    for (const payload of [null, [], {}, {...base,sourceId:''}, {...base,sourceId:42}, {...base,canonicalUrl:'http://example.com'}, {...base,canonicalUrl:'https://user:pass@example.com'}, {...base,timestamp:'today'}, {...base,timestamp:1.5}, {...base,timestamp:Date.now()+60_000}, {...base,timestamp:Date.now()-900_001}]) {
      assert.equal(verifyPreviewToken(sign(payload)).ok,false,JSON.stringify(payload));
    }
    assert.equal(verifyPreviewToken('x'.repeat(20_000)).ok,false);
    assert.throws(()=>generatePreviewToken('',base.canonicalUrl));
  } finally {
    if (previous === undefined) delete process.env.IMPORTER_PREVIEW_SECRET;
    else process.env.IMPORTER_PREVIEW_SECRET = previous;
  }
});
