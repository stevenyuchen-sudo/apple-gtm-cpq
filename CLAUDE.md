# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Salesforce DX project for a B2B quote-to-cash demo: selling iPhone 18 Pro and Apple Watch Series 12 fleets to enterprises. It is built first on **Salesforce CPQ** (managed package, `SBQQ__` namespace), then rebuilt on **Revenue Cloud Advanced** to compare the two platforms. Independent demo, not affiliated with Apple; customers and some prices are fictional.

Demo customers (keep data consistent with these): Northstar Health (2,000 clinicians, iPhone + cellular Watch kits, AppleCare), Lone Star Logistics (600 drivers, trade-in of an older fleet), Brazos Financial (150 executives, negotiated pricing, strict approvals).

Roadmap phases (see README): 1) CPQ MVP: catalog, pricing table, bundle, rules, discount tiers, quote PDF; 2) approvals, guided selling, amendments, renewals; 3) MDQ ramp, QCP, AI deal desk, integration, scale test; 4) Revenue Cloud Advanced rebuild + migration map.

## Layout

- `force-app/` — the only package directory (no namespace, API version 67.0). Custom metadata: objects, fields, Apex, LWC.
- `data/` — CPQ configuration and demo records as JSON (CPQ config like price rules and products is data, not metadata, so it lives here and is loaded via scripts).
- `scripts/` — export, load and test scripts (`scripts/apex/*.apex` anonymous Apex, `scripts/soql/*.soql`).
- `docs/decisions/` — design decision log; record significant design choices here.
- `manifest/package.xml` — retrieve manifest.

## Org

Default target org alias is `apple-cpq` (set in `.sf/config.json`). The scratch def in `config/project-scratch-def.json` is the stock template and does not enable CPQ, so CPQ work targets the `apple-cpq` org rather than a fresh scratch org.

## Commands

```bash
# Deploy / retrieve
sf project deploy start --source-dir force-app
sf project retrieve start --manifest manifest/package.xml

# Apex tests
sf apex run test --test-level RunLocalTests --result-format human --wait 10
sf apex run test --class-names MyClassTest --result-format human --wait 10
sf apex run test --tests MyClassTest.myMethod --result-format human --wait 10

# Anonymous Apex / SOQL
sf apex run --file scripts/apex/hello.apex
sf data query --file scripts/soql/account.soql

# LWC unit tests (Jest)
npm test
npx sfdx-lwc-jest -- path/to/component.test.js

# Lint / format
npm run lint
npm run prettier
npm run prettier:verify
```

A Husky pre-commit hook runs lint-staged: Prettier (with Apex and XML plugins) on staged files, ESLint on Aura/LWC JS, and related LWC Jest tests.
