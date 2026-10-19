// Upserts the catalog in data/catalog/ into an org, matching on AGTM_External_Id__c,
// so reloading never creates duplicates.
//
// Usage: node scripts/load-catalog.mjs [org alias]   (defaults to the project's target org)
//
// The JSON files are sObject Collections upsert bodies. Price book entries reference
// their product by external ID; the Standard Price Book Id differs per org, so it is
// looked up here and added to each entry before loading.

import { readFileSync } from "node:fs";
import { standardPricebookId, upsert } from "./lib/salesforce.mjs";

const standardId = standardPricebookId();
const products = JSON.parse(readFileSync("data/catalog/products.json", "utf8"));
const entries = JSON.parse(
  readFileSync("data/catalog/standard-pricebook-entries.json", "utf8")
);
entries.records.forEach((r) => (r.Pricebook2Id = standardId));

let failed = upsert("Product2", products);
if (!failed) failed = upsert("PricebookEntry", entries);
process.exit(failed ? 1 : 0);
