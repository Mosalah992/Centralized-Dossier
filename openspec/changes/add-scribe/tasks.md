# Tasks

- [x] The filing model (`shared/filing.ts`) and the parchment, with a sample sheet the team approved (2026-11-02).
- [x] Codes: `/archives code`, the HMAC store and the Scribe Table's seal.
- [x] `/report`: the five-step wizard, drafts in D1, filing and posting with pings by level.
- [x] The web wizard at the Scribe Table, with a preview.
- [x] The board and the Cabinet read the Scribe's filings.
- [x] The Clerk Table in the Solar stamps Approved or Denied; the bot posts the verdict.
- [x] Local end-to-end run (Pages dev, the Scribe Worker, local D1, signed interactions).
- [x] Run on Archivist Ancarion (2026-11-03): the archive is Ancarion's endpoint and relays every other interaction to the quartermaster unchanged; Ancarion's posting permissions checked in all eleven channels.
- [x] Fill `config/scribe.json` and the Discord vars (Ancarion's public id and key).
- [x] Draw the parchment in the browser for the Workers Free plan (2026-11-03): the Worker dropped, `/filings/:id` added, Discord posts as embeds linking to it.
- [x] Set the secrets `DISCORD_BOT_TOKEN` (Ancarion's) and `CODE_PEPPER` (2026-11-03).
- [ ] Apply migration 0006 remotely; deploy the site and verify on pages.dev.
- [ ] With the team's leave: `discord-setup.mjs endpoint` (moves Ancarion off the quartermaster), then `register`; check /clockin still answers through the relay.
- [ ] Test the bot end to end in a private channel, then the archive channels and the domain.
