// Upserts the demo customers in data/demo/ into an org, matching on
// AGTM_External_Id__c: accounts, contacts, opportunities, opportunity contact
// roles, then quote headers.
//
// Usage: node scripts/load-demo.mjs [org alias]   (defaults to the project's target org)
//
// Records link to each other by external ID. Org-specific IDs are written as
// placeholders and resolved here:
//   {{StandardPricebookId}}  the org's Standard Price Book
//   {{UserId:<username>}}    that user's Id; if the user doesn't exist, the field
//                            is dropped and the record keeps its default owner/rep
//   {{Today+<days>}}         a date that many days from today, so close dates
//                            stay in the future however late the data is loaded

import { readFileSync } from "node:fs";
import {
  query,
  standardPricebookId,
  upsert,
  upsertByQuery
} from "./lib/salesforce.mjs";

const users = new Map();
function userId(username) {
  if (!users.has(username)) {
    const id = query(
      `SELECT Id FROM User WHERE Username = '${username}' AND IsActive = true`
    )[0]?.Id;
    if (!id)
      console.log(
        `  note: user ${username} not found; leaving that field unset`
      );
    users.set(username, id);
  }
  return users.get(username);
}

function daysFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const pricebookId = standardPricebookId();
// Returns the value with any placeholder resolved; undefined drops the field.
function resolveValue(value) {
  if (value === "{{StandardPricebookId}}") return pricebookId;
  const today = /^\{\{Today\+(\d+)\}\}$/.exec(value);
  if (today) return daysFromToday(Number(today[1]));
  const user = /^\{\{UserId:(.+)\}\}$/.exec(value);
  if (user) return userId(user[1]);
  return value;
}

function resolve(body) {
  for (const record of body.records) {
    for (const [field, value] of Object.entries(record)) {
      if (typeof value !== "string") continue;
      const resolved = resolveValue(value);
      if (resolved === undefined) delete record[field];
      else record[field] = resolved;
    }
  }
  return body;
}

const read = (file) =>
  resolve(JSON.parse(readFileSync(`data/demo/${file}`, "utf8")));
const load = (sobject, file) => upsert(sobject, read(file));

let failed = load("Account", "accounts.json");
if (!failed) failed = load("Contact", "contacts.json");
if (!failed) failed = load("Opportunity", "opportunities.json");
// Contact roles can't have an External ID field, so they match by query.
// The opportunity and contact of an existing role can't change; only these can.
if (!failed)
  failed = upsertByQuery("OpportunityContactRole", read("contact-roles.json"), [
    "Role",
    "IsPrimary"
  ]);
if (!failed) failed = load("SBQQ__Quote__c", "quotes.json");
process.exit(failed ? 1 : 0);
