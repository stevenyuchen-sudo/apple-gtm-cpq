// Upserts the catalog in data/catalog/ into an org, matching on AGTM_External_Id__c,
// so reloading never creates duplicates.
//
// Usage: node scripts/load-catalog.mjs [org alias]   (defaults to the project's target org)
//
// The JSON files are sObject Collections upsert bodies. Price book entries reference
// their product by external ID; the Standard Price Book Id differs per org, so it is
// looked up here and added to each entry before loading.

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = "v67.0";
const org = process.argv[2] ? ` --target-org ${process.argv[2]}` : "";
const tmp = mkdtempSync(join(tmpdir(), "catalog-"));

// The CLI can abort on exit on Windows after printing a valid result, so read
// stdout even when the exit code is non-zero.
function sf(args) {
  try {
    return execSync(`sf ${args}${org}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch (err) {
    if (err.stdout) return err.stdout;
    throw err;
  }
}

function upsert(sobject, body) {
  const file = join(tmp, `${sobject}.json`);
  writeFileSync(file, JSON.stringify(body));
  const out = sf(
    `api request rest /services/data/${API}/composite/sobjects/${sobject}/AGTM_External_Id__c --method PATCH --body @${file}`
  );
  const results = JSON.parse(out);
  if (!Array.isArray(results))
    throw new Error(`${sobject}: unexpected response ${out}`);
  let failed = 0;
  results.forEach((r, i) => {
    const key = body.records[i].AGTM_External_Id__c;
    if (r.success) {
      console.log(`  ${r.created ? "created" : "updated"}  ${key}  ${r.id}`);
    } else {
      failed++;
      console.log(
        `  FAILED   ${key}  ${r.errors.map((e) => e.message).join("; ")}`
      );
    }
  });
  console.log(`${sobject}: ${results.length - failed} ok, ${failed} failed`);
  return failed;
}

const query = JSON.parse(
  sf(
    'data query --query "SELECT Id FROM Pricebook2 WHERE IsStandard = true" --json'
  )
);
const standardId = query.result.records[0]?.Id;
if (!standardId) throw new Error("Standard Price Book not found");

const products = JSON.parse(readFileSync("data/catalog/products.json", "utf8"));
const entries = JSON.parse(
  readFileSync("data/catalog/standard-pricebook-entries.json", "utf8")
);
entries.records.forEach((r) => (r.Pricebook2Id = standardId));

let failed = upsert("Product2", products);
if (!failed) failed = upsert("PricebookEntry", entries);
process.exit(failed ? 1 : 0);
