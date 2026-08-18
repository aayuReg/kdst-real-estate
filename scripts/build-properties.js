#!/usr/bin/env node
// ============================================================
// Build step: combines data/properties/*.json (one file per
// property, edited individually via the CMS folder collection)
// into a single data/properties.json ({ "listings": [...] })
// that the frontend fetches (script/properties-render.js).
//
// Runs on every Netlify deploy (see netlify.toml [build].command).
// No dependencies — uses only Node's built-in fs/path so this
// project keeps its zero-install philosophy.
//
// Fails the build (non-zero exit) on any malformed or duplicate
// property file, rather than silently dropping/skipping it —
// a bad file should show up loudly in the Netlify deploy log,
// not as a mysteriously missing listing on the live site.
// ============================================================

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'data', 'properties');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'properties.json');

const REQUIRED_FIELDS = [
  'id',
  'title',
  'type',
  'location',
  'locationLabel',
  'image',
  'priceLabel',
  'priceValue',
];

function fail(message) {
  console.error(`\n[build-properties] ERROR: ${message}\n`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    fail(`Source directory not found: ${SOURCE_DIR}`);
  }

  const allEntries = fs.readdirSync(SOURCE_DIR);
  const files = allEntries.filter((name) => name.toLowerCase().endsWith('.json'));

  // A non-JSON file in this folder (e.g. a .md the CMS saved because of
  // a config mismatch) previously failed silently: it was just skipped,
  // so a property could go missing from the live site with no error
  // anywhere. Fail loudly instead, the same way we already do for
  // malformed JSON below, so this can't happen unnoticed again.
  const unexpectedFiles = allEntries.filter(
    (name) => !name.startsWith('.') && !name.toLowerCase().endsWith('.json')
  );
  if (unexpectedFiles.length > 0) {
    fail(
      `Found non-JSON file(s) in ${SOURCE_DIR}: ${unexpectedFiles.join(', ')}. ` +
        `Every property must be a .json file — check admin/config.yml has ` +
        `"extension: json" and "format: json" set on the properties collection, ` +
        `and remove or convert the file(s) listed above.`
    );
  }

  if (files.length === 0) {
    fail(`No property files found in ${SOURCE_DIR}`);
  }

  const seenIds = new Map(); // id -> source filename, to catch duplicates
  const listings = [];

  for (const filename of files) {
    const fullPath = path.join(SOURCE_DIR, filename);
    const raw = fs.readFileSync(fullPath, 'utf8');

    let property;
    try {
      property = JSON.parse(raw);
    } catch (err) {
      fail(`${filename} is not valid JSON: ${err.message}`);
    }

    for (const field of REQUIRED_FIELDS) {
      if (
        property[field] === undefined ||
        property[field] === null ||
        property[field] === ''
      ) {
        fail(`${filename} is missing required field "${field}"`);
      }
    }

    if (seenIds.has(property.id)) {
      fail(
        `Duplicate property id "${property.id}" in ${filename} — ` +
          `already used by ${seenIds.get(property.id)}. ` +
          `The "id" field must be unique across all listings.`
      );
    }
    seenIds.set(property.id, filename);

    listings.push(property);
  }

  // Sort by explicit "order" field (lower = earlier). Properties
  // without an "order" field sort after ones that have it, in
  // filename order, so a missing order never silently reorders
  // the rest of the list.
  listings.sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : Infinity;
    const orderB = typeof b.order === 'number' ? b.order : Infinity;
    return orderA - orderB;
  });

  const output = { listings };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  console.log(
    `[build-properties] Wrote ${listings.length} propert${listings.length === 1 ? 'y' : 'ies'} to ${path.relative(process.cwd(), OUTPUT_FILE)}`
  );
}

main();
