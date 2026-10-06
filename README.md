# Apple at Work: GTM & CPQ Demo

A B2B quote-to-cash build that sells iPhone 18 Pro and Apple Watch Series 12
fleets to enterprises. Built first on Salesforce CPQ, then rebuilt on
Revenue Cloud Advanced to compare the two platforms.

> Independent demo, not affiliated with Apple Inc. Customers and some
> prices are fictional.

## Scenario

- **Northstar Health:** 2,000 clinicians, iPhone + cellular Watch kits, AppleCare
- **Lone Star Logistics:** 600 drivers, trade-in of an older fleet
- **Brazos Financial:** 150 executives, negotiated pricing, strict approvals

## Roadmap

- [ ] Phase 1: CPQ MVP (catalog, pricing table, bundle, rules, discount tiers, quote PDF)
- [ ] Phase 2: Industry-standard CPQ (approvals, guided selling, amendments, renewals)
- [ ] Phase 3: Advanced CPQ (MDQ ramp, QCP, AI deal desk, integration, scale test)
- [ ] Phase 4: Rebuild in Revenue Cloud Advanced + migration map

## Tech

Salesforce CPQ · Revenue Cloud Advanced · Salesforce CLI · Claude Code ·
Salesforce DX MCP Server · GitHub Actions

## Repo layout

- `force-app/`: custom metadata (objects, fields, Apex)
- `data/`: CPQ configuration and demo records as JSON
- `scripts/`: export, load and test scripts
- `docs/decisions/`: design decision log
