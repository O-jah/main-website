#!/usr/bin/env node
// build.js — data-driven static build for the OJAH site (Node.js 20 LTS).
// Zero dependencies, no framework.
//
// Reads content/{reports,stories,featured}.json, drops records where
// `published === false`, and injects the survivors into the app/ HTML
// templates under the variable names the rendering runtime already expects:
//
//   app/reports.html  -> `allReports`   (from content/reports.json)
//   app/stories.html  -> `storiesData`  (from content/stories.json)
//   app/index.html    -> `featured`     (from content/featured.json)
//
// Writes dist/index.html, dist/reports.html, dist/stories.html and copies the
// static assets directory so the output is self-contained.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const TEMPLATE_DIR = path.join(ROOT, 'app');
const DIST_DIR = path.join(ROOT, 'dist');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
}

function readTemplate(file) {
  return fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
}

// A record is published unless it carries an explicit `published: false`.
function keepPublished(records) {
  return records.filter((r) => r.published !== false);
}

// Strip build-time metadata so the injected arrays keep the exact field shape
// the runtime already reads (no `published`/`featured` keys leak through).
function stripMeta(records) {
  return records.map(({ published, featured, ...rest }) => rest);
}

// Serialize a value as a JS literal safe to embed inside a <script> element.
function toJsLiteral(value) {
  return JSON.stringify(value, null, 2)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/<\/script/gi, '<\\/script');
}

function inject(template, tokens) {
  let out = template;
  for (const [token, value] of Object.entries(tokens)) {
    if (!out.includes(token)) {
      throw new Error(`Template is missing injection token: ${token}`);
    }
    out = out.split(token).join(value);
  }
  return out;
}

function writeDist(file, content) {
  const target = path.join(DIST_DIR, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

// ---- Load content ---------------------------------------------------------
const reportsRaw = readJson('reports.json');
const storiesRaw = readJson('stories.json');
const featuredRaw = readJson('featured.json');

const reports = stripMeta(keepPublished(reportsRaw));
const stories = stripMeta(keepPublished(storiesRaw));

// featured.json is a single curated object (not an array). A missing flag
// counts as published; an explicit false drops the block to an empty object.
const featured = featuredRaw && featuredRaw.published === false ? null : featuredRaw;

// ---- Inject + write -------------------------------------------------------
writeDist('reports.html', inject(readTemplate('reports.html'), {
  __ALL_REPORTS__: toJsLiteral(reports),
}));

writeDist('stories.html', inject(readTemplate('stories.html'), {
  __STORIES_DATA__: toJsLiteral(stories),
}));

writeDist('index.html', inject(readTemplate('index.html'), {
  __FEATURED__: toJsLiteral(featured ?? {}),
}));

// ---- Static assets --------------------------------------------------------
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST_DIR, 'assets'), { recursive: true });

// ---- Summary --------------------------------------------------------------
console.log('build complete ->', path.relative(ROOT, DIST_DIR));
console.log('  reports :', reports.length, 'injected,', reportsRaw.length - reports.length, 'dropped (published: false)');
console.log('  stories :', stories.length, 'injected,', storiesRaw.length - stories.length, 'dropped (published: false)');
console.log('  featured:', featured ? featured.title : '(none — published: false)');
