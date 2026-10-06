## ADDED Requirements

### Requirement: Dossier presentation
The Reports reader SHALL present filings as pages of a sealed ledger in the archive's established material (parchment pages, gilt rules, the display and serif faces already in use), consistent with the Chronicles book and the home hero, and SHALL NOT introduce cards, glass, glowing buttons or a dashboard grid. Filings SHALL be grouped under month headings, newest first.

#### Scenario: Index of filings
- **WHEN** an admitted reader opens `/reports`
- **THEN** filings are grouped under month headings, newest first, each entry showing category, subcategory, date, title, excerpt and a classification stamp

### Requirement: Filing shown as a record
Opening a filing SHALL show it as a full dossier page. Line breaks SHALL be preserved. Standalone `Label: value` lines SHALL render as a labelled record and all other text as prose. Parsing SHALL be presentational only and SHALL NOT drop or reorder text.

#### Scenario: Template filing
- **WHEN** a body contains `Location: Solitude` on its own line
- **THEN** it renders as a field labelled "Location" with value "Solitude"

#### Scenario: Nothing lost
- **WHEN** any body is parsed into fields and prose
- **THEN** joining the parsed blocks in order reproduces every line of the original text

### Requirement: Classification stamp
Each filing SHALL carry a classification mark styled as a wax seal or stamp, one per severity level, legible in text as well as colour.

#### Scenario: Colour-independent
- **WHEN** a filing is classified High
- **THEN** its stamp shows the word "High" in addition to its colour

### Requirement: Awaiting assessment
The reader SHALL offer an "Awaiting assessment" view of unassessed filings and SHALL label them as awaiting assessment rather than as a lowest severity.

#### Scenario: Unassessed queue
- **WHEN** the reader selects "Awaiting assessment"
- **THEN** only filings with severity `unassessed` are listed, each labelled "Awaiting assessment"

### Requirement: Search and filters
`GET /api/reports` SHALL accept, in addition to `category`, `severity` and `cursor`: `q` (1–80 characters, matched case-insensitively against title and body with `%` and `_` escaped), `subcategory`, `from` and `to` (inclusive ISO dates). Invalid values SHALL be ignored. Filters SHALL apply before pagination.

#### Scenario: Search
- **WHEN** an admitted reader requests `/api/reports?q=Markarth`
- **THEN** only filings whose title or body contains "markarth" are returned, 30 per page, with a cursor when more exist

#### Scenario: Wildcards are literal
- **WHEN** `q` is `100%`
- **THEN** only filings containing the literal text "100%" match

### Requirement: Filter state in the URL
The reader SHALL hold category, subcategory, severity, search and date range in the URL query.

#### Scenario: Shared view
- **WHEN** an admitted reader opens `/reports?category=Military&severity=high`
- **THEN** the dossier opens with those filters applied

### Requirement: Single filing address
`GET /api/reports/:id` SHALL return one filing or 404 behind the Reports writ, and `/reports/:id` SHALL open that filing once the gate is passed.

#### Scenario: Deep link
- **WHEN** an admitted reader opens `/reports/<id>`
- **THEN** that filing's dossier page is shown

#### Scenario: Unknown filing
- **WHEN** the id does not exist
- **THEN** the API returns 404 with no filing data

### Requirement: Summary and lagging desks
`GET /api/reports/summary` SHALL return counts by category × severity for all time and the last 7 days, and per category and subcategory (channel name only) the number of filings in the last 30 days and how many were unassessed. The reader SHALL show a restrained summary line and list desks with unassessed filings.

#### Scenario: Desk without classification
- **WHEN** Military filed 11 reports in the last 30 days, all unassessed
- **THEN** the summary lists Military with 11 of 11 awaiting assessment

### Requirement: Private responses
Every response from the Reports routes, including 401, 404 and empty results, SHALL carry `Cache-Control: private, no-store` and `Vary: Cookie`, and a request without a valid Reports writ SHALL receive 401 and no filing data.

#### Scenario: No writ
- **WHEN** a request without the Reports cookie hits `/api/reports/summary` or `/api/reports/<id>`
- **THEN** the response is 401, carries no filing data, and has `Cache-Control: private, no-store` and `Vary: Cookie`

### Requirement: In-world attribution
On each run the reporter SHALL fetch the roster from the archive's public roster endpoint and resolve each filer by matching the author's Discord `username` or `global_name`, case-insensitively, against members' recorded handles, storing the member's in-world name in `author_name` when exactly one member matches and `NULL` otherwise. When the roster cannot be loaded, existing `author_name` values SHALL be left unchanged.

#### Scenario: Unique match
- **WHEN** a filer's username matches exactly one member's handle
- **THEN** the filing's `author_name` is that member's in-world name

#### Scenario: Ambiguous handle
- **WHEN** two members list the same handle
- **THEN** the filing's `author_name` is `NULL`

#### Scenario: Roster unavailable
- **WHEN** the roster endpoint fails during a run
- **THEN** existing `author_name` values are unchanged

### Requirement: No identity leaves the Worker
The reporter SHALL NOT write any Discord handle, username, global name or user ID to D1, logs or any response, and SHALL make only read requests to Discord. The reader SHALL show "Filed by <name>" only for attributed filings.

#### Scenario: Stored values
- **WHEN** a run completes
- **THEN** every non-null `author_name` in D1 equals a roster in-world name and no Discord identifier appears in any stored column
