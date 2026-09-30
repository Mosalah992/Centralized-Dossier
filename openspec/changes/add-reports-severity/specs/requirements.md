# Requirements

## Deterministic classification

The collector SHALL accept only a standalone `Severity:` metadata field in the
official Military or Informants template. The label MAY use Discord bold
Markdown, and a supported value MAY appear inline or on the following non-empty
line. The collector SHALL normalize the six supported values and remove the
field, plus a consumed following-line value, before storing and serving the
report body. A blank, missing, or invalid value SHALL be `unassessed`.
Narrative mentions of severity SHALL NOT classify a report.

## Protected filtering

`GET /api/reports` SHALL accept an optional valid severity alongside category,
apply both filters before pagination, and retain `Cache-Control: private,
no-store` and `Vary: Cookie` for every result.

## Reader

The reader SHALL expose a severity filter and render a severity label without
turning the archive into a modern dashboard. It SHALL explain the classification
standard and keep the existing Reports gate unchanged.
