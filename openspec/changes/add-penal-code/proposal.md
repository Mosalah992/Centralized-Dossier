# Penal Code of the Aldmeri Dominion

## Outcome

A public `/penalcode` page presents the Dominion's Criminal Code as a decree on
parchment: preamble and disclaimer, a table of contents, punishment guidelines
and charge modifiers, every article numbered with its charge class, and the
three signatories with their signatures beneath the Dominion eagle. The hall's
top bar gains a "Penal Code" entry that opens it.

## Scope and boundaries

- Browser-only. The Code is static, Embassy-kept text bundled in its own lazy
  chunk; it is in-world law, not member data.
- Does not touch Google Sheets, member data, the Chronicle or Reports gates,
  KV, D1, Pages Functions, or any public API. `VOLUMES` is unchanged: this is
  not a sheet-backed volume.
- Art (Dominion eagle, three signatures) is taken from the community's own Code
  document, kept as sources under `Assets/penal-code/` and converted to WebP by
  a committed script. The page does not link to the source document.

## Verification

Router test for `/penalcode`; `npm run typecheck`, `npm test`, `npm run build`;
check the page and its accessibility (axe) in the dev preview at desktop and
phone widths; deploy and verify on the `*.pages.dev` URL before the domain.
