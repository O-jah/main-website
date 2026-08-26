# Content Extraction Report

Extracted from the three static pages into `content/` using Node.js built-ins only.
No existing field was renamed; only `published` and `featured` were added to report
and story records, appended after the original fields.

## Record counts

| Source page | Extracted array/section | Output file | Records |
|---|---|---|---|
| `reports.html` | `allReports` | `content/reports.json` | **22** |
| `stories.html` | `storiesData` | `content/stories.json` | **2** |
| `index.html` | hardcoded "Featured Publication" | `content/featured.json` | **1** |

- Reports: 9 downloadable (`pdf` + `fileName`), 13 restricted (`restricted: true`).
- Featured report: `stolen-broken-destroyed` (1 of the 22 reports).
- `featured.json` is a single object, not an array — the homepage has exactly one
  hardcoded featured section.

## Ambiguous values / discrepancies

1. **Field names differ from the task brief** (preserved verbatim per the
   "do not rename any existing field" constraint):
   - Reports use `thumb` (brief said `thumbnail`) and additionally carry `id`,
     `num`, and `fileName`.
   - Stories use `img` (brief said `image`) and `visibleText` (brief said `body`),
     and additionally carry `slotId`, `findings` (`{label,text}[]`), and `footnote`.

2. **"PDF link or restricted flag" is asymmetric in the source.** Downloadable
   reports have `pdf` + `fileName` and no `restricted` key; restricted reports have
   `restricted: true` and no `pdf`/`fileName`. Left exactly as-is (no synthesized
   `restricted: false`).

3. **Gaps in report `num`.** Values run 1–17, then 19, 20, 21, 24, 25 — numbers
   18, 22, and 23 are absent. Preserved as-is; likely omitted/unpublished records.

4. **Featured type/label mismatch.** The homepage featured block reads
   "August 2026 · Research Brief · by OJAH and PHR", but the matching report
   (`stolen-broken-destroyed`) has `type: "CRSV"` and `year: "2026"`. "Research
   Brief" is not one of the report filter types (`Investigation Report`,
   `Monitoring Report`, `CRSV`). Both texts were kept unchanged.

5. **`featured.json` schema is synthesized** because the source is HTML, not a JS
   object. `id: "stolen-broken-destroyed"` is inferred (the block's title matches
   that report, which the runtime also pins with a `report-card-featured` class);
   `meta`, `title`, `summary`, `image`, `imageAlt`, and `link` are the literal
   HTML contents.

6. **`published` / `featured` defaults.** The source had no such flags. All
   records are currently rendered, so every report and story got `published: true`.
   `featured: true` only on `stolen-broken-destroyed`; everything else `featured: false`.

7. **Duplicate/partial copies in other pages.** `index.html` and `stories.html`
   embed an empty `allReports = []`, and `index.html` embeds a shortened
   `storiesData` (shorter `visibleText`, no `img`). The canonical full sources
   were used: `allReports` from `reports.html`, `storiesData` from `stories.html`.

8. **Parse note.** The embedded arrays are JavaScript literals (reports.html's
   `allReports` ends with a trailing comma, valid JS but not strict JSON), so they
   were evaluated as JS literals via Node's `vm` module. The written files are
   strict, valid UTF-8 JSON (re-serialized with `JSON.stringify`, then re-parsed
   to verify).
