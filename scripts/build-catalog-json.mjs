// Builds data/catalog/*.json from the Products table in data/catalog-products.md.
// The markdown table is the source of truth; run this after editing it, then
// load with scripts/load-catalog.mjs.
//
// Usage: node scripts/build-catalog-json.mjs

import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync("data/catalog-products.md", "utf8");
const section = md.split(/^## Products$/m)[1]?.split(/^## /m)[0];
if (!section)
  throw new Error('No "## Products" section in data/catalog-products.md');

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const rows = section.split("\n").filter((l) => l.startsWith("|"));
const header = cells(rows[0]);
const records = rows
  .slice(2)
  .map((l) => Object.fromEntries(cells(l).map((v, i) => [header[i], v])));

const blank = (v) => (v === "" ? null : v);
const products = records.map((r) => ({
  attributes: { type: "Product2" },
  AGTM_External_Id__c: r["External ID"],
  ProductCode: r["External ID"],
  Name: r["Product Name"],
  Family: r.Family,
  Description: r.Description,
  IsActive: true,
  SBQQ__ChargeType__c: blank(r["Charge Type"]),
  SBQQ__BillingType__c: blank(r["Billing Type"]),
  SBQQ__SubscriptionPricing__c: blank(r["Subscription Pricing"]),
  SBQQ__SubscriptionTerm__c: r["Subscription Term"]
    ? Number(r["Subscription Term"])
    : null,
  SBQQ__SubscriptionType__c: blank(r["Subscription Type"]),
  SBQQ__ConfigurationType__c: blank(r["Configuration Type"]),
  SBQQ__ConfigurationEvent__c: blank(r["Configuration Event"])
}));
// Price book entry keys are prefixed with the price book so a product can have
// entries in several price books without colliding.
const entries = records.map((r) => ({
  attributes: { type: "PricebookEntry" },
  AGTM_External_Id__c: `STD-${r["External ID"]}`,
  Product2: { AGTM_External_Id__c: r["External ID"] },
  UnitPrice: Number(r["List Price (USD)"]),
  IsActive: true,
  UseStandardPrice: false
}));

const write = (file, recs) => {
  writeFileSync(
    file,
    JSON.stringify({ allOrNone: true, records: recs }, null, 2) + "\n"
  );
  console.log(`${file}: ${recs.length} records`);
};
write("data/catalog/products.json", products);
write("data/catalog/standard-pricebook-entries.json", entries);
