# Icon Asset Sources

The archive currently uses custom inline SVG marks in `web/src/components/Insignia.tsx`.
If those marks are replaced with external assets, prefer sources with clear reuse
terms and SVG delivery.

## Recommended Sources

| Source | License | Fit | Notes |
|---|---|---|---|
| Tabler Icons | MIT | Clear administrative symbols | Best for ledger, chart, award, calendar and utility icons. More modern than fantasy, but legally simple. |
| Fantasy Icons by Markus Oelhafen | MIT | Small fantasy set | Useful for a few marks such as pen, crown, bag, key or shield, but not broad enough to cover every register by itself. |
| Game-icons.net | CC BY 3.0 | Strongest fantasy/RPG vocabulary | Excellent visual fit, but any use must preserve attribution to the icon authors. |

## Recommendation

Use custom in-world SVGs for Thalmor-specific marks, and borrow only individual
MIT icons when a symbol must be more immediately legible. If Game-icons.net is
used, add a visible or bundled attribution notice before shipping.
