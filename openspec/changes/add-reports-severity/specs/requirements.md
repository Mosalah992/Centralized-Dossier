# Requirements

## Deterministic classification

The collector SHALL accept only a leading `Severity:` metadata line, normalize
the six supported severity values, and remove the accepted metadata line before
storing and serving the report body. A missing or invalid value SHALL be
`unassessed`.

## Protected filtering

`GET /api/reports` SHALL accept an optional valid severity alongside category,
apply both filters before pagination, and retain `Cache-Control: private,
no-store` and `Vary: Cookie` for every result.

## Reader

The reader SHALL expose a severity filter and render a severity label without
turning the archive into a modern dashboard. It SHALL explain the classification
standard and keep the existing Reports gate unchanged.
