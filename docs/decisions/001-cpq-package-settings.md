# 001. Salesforce CPQ package settings

- **Status:** Accepted
- **Date:** 2026-10-08
- **Phase:** 1 (CPQ MVP)
- **Org:** `apple-cpq`

## Context

Salesforce CPQ stores its package settings in protected custom settings that belong to the managed package. They do not deploy with `sf project deploy start` and are not in `force-app/`. They are set by hand in **Setup > Installed Packages > Salesforce CPQ > Configure**.

This record holds the settings so the org can be rebuilt and each choice can be reviewed later. Several of these settings decide how later phases work: amendments and renewals (Phase 2), the Quote Calculator Plugin and the scale test (Phase 3), and the migration map to Revenue Cloud Advanced (Phase 4).

The demo customers below are named where a setting affects them: Northstar Health, Lone Star Logistics and Brazos Financial.

## Summary

| Setting                               | Choice              | Alternative                             |
| ------------------------------------- | ------------------- | --------------------------------------- |
| Use Integration User for Calculations | On                  | Off (run as the user who saved)         |
| Calculate Immediately                 | On                  | Off (recalculate with Calculate button) |
| Use Legacy Calculator                 | Off                 | On (Apex legacy calculator)             |
| Renewal Model                         | Contract Based      | Asset Based                             |
| Subscription Prorate Precision        | Monthly + Daily     | Monthly, or Daily                       |
| Line Editor field set                 | Trimmed to 7 fields | Package default                         |

## Decisions

### Use Integration User for Calculations: On

**Choice.** Background calculations run as the CPQ integration user.

**Alternative.** Off: background calculations run as the user whose save started them.

**Why.** Background calculations happen when quote lines change outside the Quote Line Editor, for example through the API, a data load, or Apex. Running them as one integration user means they don't fail because the user who saved lacks field access. This project loads quotes from `data/` with scripts, so that case comes up from the start.

**What it affects later.**

- Price rules or formulas that read the running user (for example `$User` or the user's profile) see the integration user during background calculations. Write rules that depend on the user's role, such as Brazos Financial approval thresholds, against quote fields like the owner, not the running user.
- Records changed by a background calculation show the integration user as last modified by. Keep this in mind when you audit records in Phase 2 approvals.
- The Phase 3 integration and scale test create quotes through the API, so all of their calculations run this way. The integration user needs a CPQ license and access to every field that pricing reads.

### Calculate Immediately: On

**Choice.** The Quote Line Editor recalculates as soon as a line changes.

**Alternative.** Off: totals update only when the user clicks **Calculate** or saves.

**Why.** The demo shows discount tiers and price rules responding live as quantities change, for example moving Northstar Health from 200 to 2,000 devices. With this off, the screen shows out-of-date totals until the user clicks Calculate, which is confusing to watch in a demo.

**What it affects later.**

- Every edit sends a call to the calculation service. On quotes with many lines, editing gets slower. The time depends on the number of lines, not on quantity.
- Measure this in the Phase 3 scale test. If editing large quotes is too slow, turn it off for that scenario and record the change here.

### Use Legacy Calculator: Off

**Choice.** Use the JavaScript Quote Calculator.

**Alternative.** On: the legacy Apex calculator.

**Why.** The legacy calculator is deprecated. The Quote Calculator Plugin (QCP), planned for Phase 3, runs only on the JavaScript calculator.

**What it affects later.**

- Phase 3 QCP code is written in JavaScript against the calculator's quote and line models, not in Apex.
- The QCP sees only the fields that the calculator loads. Fields it needs that aren't in a field set or used by a price rule must be listed in the Custom Script's quote and quote line field lists.
- Apex triggers on quote lines don't run during calculation in the Quote Line Editor; they run only when the lines are saved. Put pricing logic in price rules or the QCP, not in triggers.

### Renewal Model: Contract Based

**Choice.** Renewals are generated from the contract: one renewal opportunity and quote for each contract.

**Alternative.** Asset Based: renewals and amendments work from the account's assets and subscriptions, so lines from different contracts can be renewed together.

**Why.** Each demo deal is one fleet sale (iPhone, Watch and AppleCare) on one agreement, with one renewal date. Contract-based renewal fits that, is the most common CPQ setup, and matches the standard **Amend** and **Renew** flow on the contract that Phase 2 demonstrates.

**What it affects later.**

- Phase 2 amendments and renewals start from the Contract record. Lone Star Logistics trade-in credits and Northstar Health mid-term additions are amendments to one contract.
- Customers with several contracts that should renew on one date need co-terming handled on the contract, not on assets.
- Revenue Cloud Advanced works from assets. The Phase 4 migration map must convert contracts and subscriptions into assets and their lifecycle.
- Changing the renewal model after contracts exist is not supported in practice. Decide before any demo contracts are created.

### Subscription Prorate Precision: Monthly + Daily

**Choice.** Proration counts whole months and then adds the leftover days as a fraction of a month.

**Alternatives.** Monthly: rounds to whole months. Daily: counts only days.

**Why.** AppleCare and other subscriptions are priced per month, and amendments often start in the middle of a month. Monthly + Daily keeps whole months as round numbers and still charges partial months fairly. Monthly would round mid-month additions up or down. Daily makes a full year come out at an odd fraction of the annual price.

**What it affects later.**

- Phase 2 amendment pricing. For example, Northstar Health adding clinicians partway through a term is charged according to this rule.
- Phase 3 MDQ ramp segments that start or end mid-month are prorated the same way.
- The Phase 4 rebuild must reproduce the same proration so that the CPQ and Revenue Cloud Advanced quotes can be compared line by line.
- Changing the setting does not reprice quotes that were already calculated. Recalculate saved demo quotes after any change.

### Line Editor field set: trimmed to 7 fields

**Choice.** The `SBQQ__LineEditor` field set on `SBQQ__QuoteLine__c` shows only:

1. Product Code (`SBQQ__ProductCode__c`)
2. Product Name (`SBQQ__ProductName__c`)
3. Quantity (`SBQQ__Quantity__c`)
4. List Price (`SBQQ__ListPrice__c`)
5. Additional Discount (`SBQQ__AdditionalDiscount__c`)
6. Net Price (`SBQQ__NetPrice__c`)
7. Net Total (`SBQQ__NetTotal__c`)

**Alternative.** Keep the package default, which shows more pricing and subscription columns.

**Why.** The demo is about the path from list price to discount to net price. Fewer columns keep the Quote Line Editor readable on a screen share and in recordings, and leave out columns that aren't used yet, like partner and distributor discounts.

**What it affects later.**

- Hidden fields are still calculated and stored. They just aren't shown.
- Add fields to the field set as later phases need them: subscription term, start date and end date for Phase 2 amendments and renewals; segment columns for Phase 3 MDQ ramps; and any custom fields, such as a trade-in credit for Lone Star Logistics.
- Unlike the package settings, the field set is metadata and can be retrieved. Retrieve it into the repo if it becomes hard to track by hand.

## Rebuilding the org

To configure a new org, open **Setup > Installed Packages > Salesforce CPQ > Configure** and apply the summary table above. Then edit the `SBQQ__LineEditor` field set on Quote Line. If you change a setting, update this record or add a new record that replaces it.
