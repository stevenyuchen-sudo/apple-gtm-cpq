// Shared helpers for the data load scripts: run the Salesforce CLI and upsert
// sObject Collections bodies on AGTM_External_Id__c.

import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = "v67.0";
const org = process.argv[2] ? ` --target-org ${process.argv[2]}` : "";
const tmp = mkdtempSync(join(tmpdir(), "sf-load-"));

// The CLI can abort on exit on Windows after printing a valid result, so read
// stdout even when the exit code is non-zero.
export function sf(args) {
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

export function query(soql) {
  return JSON.parse(sf(`data query --query "${soql}" --json`)).result.records;
}

export function standardPricebookId() {
  const id = query("SELECT Id FROM Pricebook2 WHERE IsStandard = true")[0]?.Id;
  if (!id) throw new Error("Standard Price Book not found");
  return id;
}

// Upserts body.records on AGTM_External_Id__c and prints one line per record.
// Returns the number of failed records.
export function upsert(sobject, body) {
  return send(
    sobject,
    `composite/sobjects/${sobject}/AGTM_External_Id__c`,
    "PATCH",
    body
  );
}

// For objects that can't have an External ID field (OpportunityContactRole):
// finds existing records by their AGTM_External_Id__c text value, updates those
// with only the fields in `updatable`, and creates the rest.
export function upsertByQuery(sobject, body, updatable) {
  const keys = body.records.map((r) => `'${r.AGTM_External_Id__c}'`).join(",");
  const existing = new Map(
    query(
      `SELECT Id, AGTM_External_Id__c FROM ${sobject} WHERE AGTM_External_Id__c IN (${keys})`
    ).map((r) => [r.AGTM_External_Id__c, r.Id])
  );
  const inserts = body.records.filter(
    (r) => !existing.has(r.AGTM_External_Id__c)
  );
  const updates = body.records
    .filter((r) => existing.has(r.AGTM_External_Id__c))
    .map((r) => ({
      attributes: r.attributes,
      Id: existing.get(r.AGTM_External_Id__c),
      AGTM_External_Id__c: r.AGTM_External_Id__c,
      ...Object.fromEntries(updatable.map((f) => [f, r[f]]))
    }));
  let failed = 0;
  if (inserts.length)
    failed += send(sobject, "composite/sobjects", "POST", {
      allOrNone: body.allOrNone,
      records: inserts
    });
  if (updates.length)
    failed += send(sobject, "composite/sobjects", "PATCH", {
      allOrNone: body.allOrNone,
      records: updates
    });
  return failed;
}

function send(sobject, path, method, body) {
  const file = join(tmp, `${sobject}-${method}.json`);
  writeFileSync(file, JSON.stringify(body));
  const out = sf(
    `api request rest services/data/${API}/${path} --method ${method} --body @${file}`
  );
  const results = JSON.parse(out);
  if (!Array.isArray(results))
    throw new Error(`${sobject}: unexpected response ${out}`);
  let failed = 0;
  results.forEach((r, i) => {
    const key = body.records[i].AGTM_External_Id__c;
    if (r.success) {
      const action = method === "POST" || r.created ? "created" : "updated";
      console.log(`  ${action}  ${key}  ${r.id}`);
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
