import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('gym-recon-software.html','utf8');
const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for(const [,attributes,source] of blocks){if(attributes.includes('application/ld+json'))JSON.parse(source);else if(source.trim())new vm.Script(source);}
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(id),`Missing section ${id}`);
assert.match(html,/<a[^>]+id="purchaseButton"[^>]+href="https:\/\/gymrecon.enochmarketing.com\/start\/"/);
assert.match(html,/Purchases and live gym data uploads are not open yet/);
assert.match(html,/all 50 states and DC/);
assert.match(html,/fictional|illustrative/i);
assert.doesNotMatch(html,/Planned launch: September 2|Purchase Gym Recon|AI RECOMMENDATION BOT|GYM_RECON_CHECKOUT_URL|InitiateCheckout|begin_checkout/);
for(const page of ['subscription-terms','privacy-notice','billing-policy'])assert.ok(html.includes(`https://gymrecon.enochmarketing.com/legal/v1.1/${page}.html`));
assert.match(html,/og:image" content="https:\/\/www.enochmarketing.com\/enoch-logo.png/);
console.log(`Marketing release verified: ${blocks.length} script blocks, section links, enrollment route, scope, legal links, and honest conversion tracking.`);
