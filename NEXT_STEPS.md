# NEXT STEPS — after ADR-049 (version label still 0.5.0)

All six chunks are written. **Nothing is released and no release gate is met** (KOS 11). Since chunk 6: ADR-046 (GitHub Pages build workflow), ADR-047 (separate CI workflow), ADR-048 (GPS retry and clearer messages), ADR-049 (iPhone Home Screen GPS wording).

## Where things stand (evidence-based)
| Item | State |
|---|---|
| Live site (GitHub Pages) | "Deploy to GitHub Pages" run #5 (commit be37c12) green by owner screenshot, 42 s. Log not seen. The workflow runs `npm run build` (= typecheck + vite build), so green means no step failed |
| ADR-049 wording (this change) | Written and tested on a stand-in runner only; **not yet committed/pushed by the owner** unless KOS 11 says otherwise; never seen on a phone |
| `CI checks` workflow (`ci.yml`) | Not seen in the owner's workflow list; whether it reached GitHub is UNKNOWN. `npm test` (expect **442**), e2e and `npm audit` are NOT RUN |
| Owner phone observation | GPS works in a browser tab; the app added to the Home Screen showed "Location is turned off for this app". Owner report + screenshots only; KOS 13 rows stay NOT RUN |
| Phone checklist KOS 13 | All rows NOT RUN (owner's earlier "all working" had no per-row detail) |

## Do next, in this order
1. **Publish the ADR-049 change.** Copy the changed files into the VS Code clone, commit, Sync Changes, then watch Actions → "Deploy to GitHub Pages" turn green. Red means a type error: send the red lines.
2. **Find the CI run.** Actions tab → left list → "CI checks". If missing, check that `.github/workflows/ci.yml` is in the repo (it is in this zip). Paste the log lines for typecheck, `npm test` (expect 442), `npm audit` and e2e into the chat; they are recorded in KOS 11 as the GitHub runner's result. The e2e specs have never run, so a first-run failure is a result, not a regression (R-041).
3. **Phone, iPhone.** After the new version loads (tap *Update and reload* if offered): open the Home Screen app, go to Plan → Browser live GPS, and report the exact words on the Dashboard. Do KOS 13 P-26…P-29, recording *browser tab* and *Home Screen icon* separately, with the browser used to add the icon and the iOS version (R-045, R-046).
4. Optional, on a PC with Node.js LTS: `npm install`, `npm run typecheck`, `npm test`, then record the output in KOS 11. A `.gitattributes` with `* text=auto eol=lf` would stop Windows line-ending noise in VS Code (not added yet; decide first).

## Open items (carried)
- 6 `npm audit` advisories (3 moderate, 1 high, 2 critical): not triaged (R-044). `@turf/turf` is declared but never imported by `src/` (R-043).
- `@playwright/test` is in `package.json` but not in `package-lock.json` (R-042); the workflows use `npm install` for that reason.
- Home Screen app on iPhone: may be refused GPS for good; whether the app recognises itself as a Home Screen app when added from Chrome is unchecked (R-046). Live GPS works only while the app is open and the screen is on (R-003); a web app cannot track in the background.
- Position ideas not chosen: keep-screen-awake (Wake Lock, needs a real iOS test), manual position entry (needs a decision about the 30 s stale limit), a feed from the ship's own navigation data (e.g. Signal K, needs `wss://` from an https page).
- Browser rendering on real devices, IndexedDB reload, offline reload, service-worker update, install prompt, notification delivery, file download: NOT RUN (KOS 13). Map tiles are never cached.
- Dataset status is metadata-based and uses the simulated clock while replaying (R-033). The skipped-alert list is session-only (R-038). The log is device-local (R-029).
- Unit/integration tests have only run on a stand-in for Vitest since chunk 4 (R-017); real `npm test` is NOT RUN.
- FOBAS method and benchmarks: UNKNOWN; duration stays manual-verified. All geography is synthetic. No vessel-profile screen was built.
- Release gates (none met): real-phone tests, real toolchain green, e2e executed, audit triaged, authorised FOBAS method or explicit manual-only policy, verified geometry with licence, qualified marine engineer review, risks triaged, KOS current.
