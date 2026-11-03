# Requirements

## One model, one drawing

Both doors SHALL check a filing with `shared/filing.ts` `checkFiling`, and the
parchment SHALL be drawn only by `web/src/scribe/Parchment.tsx`, in the
reader's browser, from the stored fields, so the same filing always draws the
same parchment and a stamp appears wherever it is next drawn. No route SHALL
draw, and the bot SHALL post no image.

## Summons

A filing SHALL ping only the role ids `config/scribe.json` names for its level
(Strategic: `summons.command`; Cataclysm: `summons.all`). Mentions written by a
filer SHALL never ping. Applications and Public Requests SHALL NOT be marked
Strategic or Cataclysm.

## Identity

A member's kinds of filing SHALL need a personal code (website) or a mapped
role (Discord). A code SHALL be stored only as its HMAC under `CODE_PEPPER`,
and Discord SHALL be asked for its holder's roles on every use. A filer's
Discord id SHALL NOT be served by any route.

## Access

A Bulletin Post's fields MAY be public until Denied. A report's SHALL need the
Reports or Solar writ, and an Application's or Public Request's the Solar
writ; a sealed filing SHALL be answered as an unknown number, and never
cached. Every `/api/scribe`
and Clerk Table response SHALL be `private, no-store` with `Vary: Cookie`, and
every write SHALL be same-site JSON.
