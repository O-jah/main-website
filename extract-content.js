// Node.js built-ins only — extracts the embedded content arrays from the
// static HTML into content/*.json, adding `published` and `featured` booleans
// to every report and story record without renaming any existing field.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'content');

// Extract the JSON array literal that follows a `const NAME = ` declaration.
// Scans characters, respecting string boundaries and backslash escapes, and
// returns the balanced `[...]` substring.
function extractArrayLiteral(source, marker) {
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);
  const open = source.indexOf('[', idx);
  if (open < 0) throw new Error(`No '[' after marker: ${marker}`);

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = false; }
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '[') { depth++; continue; }
    if (c === ']') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`Unterminated array for marker: ${marker}`);
}

function readUtf8(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// Evaluate a JS array/object literal (the source embeds them as JS, so they
// may contain trailing commas that are invalid in strict JSON). Uses an
// isolated VM context so the literal is treated purely as data.
function parseJsLiteral(literal) {
  return vm.runInNewContext('(' + literal + ')', Object.create(null));
}

// ---- 1. Reports (reports.html) -------------------------------------------
const reportsHtml = readUtf8('reports.html');
const reports = parseJsLiteral(extractArrayLiteral(reportsHtml, 'const allReports = '));

// Every report is currently rendered, so all are published. The homepage's
// "Featured Publication" block corresponds to `stolen-broken-destroyed`,
// which the reports runtime also pins to the top with a `featured` card class.
const reportsOut = reports.map((r) => ({
  ...r,
  published: true,
  featured: r.id === 'stolen-broken-destroyed',
}));

// ---- 2. Stories (stories.html) -------------------------------------------
const storiesHtml = readUtf8('stories.html');
const stories = parseJsLiteral(extractArrayLiteral(storiesHtml, 'const storiesData = '));

const storiesOut = stories.map((s) => ({
  ...s,
  published: true,
  featured: false,
}));

// ---- 3. Featured publication (index.html, hardcoded section) --------------
const indexHtml = readUtf8('index.html');
const featStart = indexHtml.indexOf('class="featured-label"');
if (featStart < 0) throw new Error('Featured section not found in index.html');
const featChunk = indexHtml.slice(featStart, featStart + 6000);

function oneMatch(source, re, label) {
  const m = source.match(re);
  if (!m) throw new Error(`Could not extract ${label} from featured section`);
  return m[1];
}

const meta = oneMatch(
  featChunk,
  /<div style="font-size:13px;opacity:0\.6;margin-bottom:14px;">([\s\S]*?)<\/div>/,
  'meta'
);
const title = oneMatch(
  featChunk,
  /<h3 style="font-size:30px;font-weight:700;line-height:1\.3;margin:0 0 20px;">([\s\S]*?)<\/h3>/,
  'title'
);
const summary = oneMatch(
  featChunk,
  /<p style="font-size:15px;line-height:1\.7;opacity:0\.8;margin:0 0 28px;max-width:520px;">([\s\S]*?)<\/p>/,
  'summary'
);
const imgMatch = featChunk.match(
  /<img src="(assets\/reports\/stolen-broken-destroyed-cover\.png)" alt="([^"]*)"/
);
if (!imgMatch) throw new Error('Could not extract featured image');

const featured = {
  id: 'stolen-broken-destroyed',
  meta: meta.trim(),
  title: title.trim(),
  summary: summary.trim(),
  image: imgMatch[1],
  imageAlt: imgMatch[2],
  link: 'reports.html',
};

// ---- Write outputs --------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });

function writeJson(name, data) {
  const file = path.join(OUT_DIR, name);
  const text = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(file, text, 'utf8');
  // Round-trip check to guarantee the written file is valid UTF-8 JSON.
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return parsed;
}

const writtenReports = writeJson('reports.json', reportsOut);
const writtenStories = writeJson('stories.json', storiesOut);
const writtenFeatured = writeJson('featured.json', featured);

// ---- Validation / summary -------------------------------------------------
const reportNums = reportsOut.map((r) => r.num);
const missingNums = [];
for (let n = 1; n <= 25; n++) if (!reportNums.includes(n)) missingNums.push(n);

const downloadable = reportsOut.filter((r) => r.pdf).length;
const restricted = reportsOut.filter((r) => r.restricted).length;

console.log('=== EXTRACTION SUMMARY ===');
console.log('reports.json records :', writtenReports.length);
console.log('  - downloadable      :', downloadable);
console.log('  - restricted        :', restricted);
console.log('  - featured          :', reportsOut.filter((r) => r.featured).length);
console.log('  - report num gaps   :', missingNums.join(', ') || '(none)');
console.log('stories.json records :', writtenStories.length);
console.log('featured.json        :', writtenFeatured.title);
console.log('');
console.log('Report types:', [...new Set(reportsOut.map((r) => r.type))].join(' | '));
console.log('Report years:', [...new Set(reportsOut.map((r) => r.year))].sort().join(' | '));
console.log('');
console.log('Field names (reports):', Object.keys(reportsOut[0]).join(', '));
console.log('Field names (stories):', Object.keys(storiesOut[0]).join(', '));
console.log('Field names (featured):', Object.keys(writtenFeatured).join(', '));
