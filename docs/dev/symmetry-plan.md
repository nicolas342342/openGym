# Symmetry Gym: plan

Symmetry Gym is a personal, non-commercial fork of openGym for one lifter (Nico, Tauro Gym, Cali).
It adds the features of his single-file app "Symmetry Tauro" on top of openGym. The fork stays
under AGPL-3.0-or-later with its source public; NOTICE.md, the Gym visual media notice and the
MuscleMap (MIT) credit stay as they are.

Branch: `symmetry`. Upstream: `https://github.com/DuarteSantos8/openGym` (remote `upstream`).

## Licence rules we keep

- AGPL: the fork's code stays public on GitHub under the same licence. No closed builds.
- Exercise media (`catalogue/media`, Gym visual): only the 180 px files, unmodified, in a
  non-commercial fork, with their notice. Never sold, never fed to an AI tool, never used to
  generate images. Nothing larger than 180 px is committed, uploaded to CI or served.
- The AI coach needs a paid API key: it stays optional and off. Nothing in the fork costs money.

## Where things live

| Piece | Code | Tests |
|---|---|---|
| Food, water, activity, balance, weight trend, dynamic TDEE | `frontend/src/lib/nutrition.js` | `nutrition.test.js` |
| Strength ranks, athlete level, rank-ups | `frontend/src/lib/ranks.js` | `ranks.test.js` |
| Nico's 5-day routine + Tauro machines | `frontend/src/lib/symmetry-plan.js`, `PLANS.symmetry` in `lib/starter.js` | `symmetry-plan.test.js`, `starter.test.js` |
| Food tab | `frontend/src/views/Food.jsx` (route `/food`, tab in `components/TabBar.jsx`) | |
| Ranks screen, level card on Home, rank-up toast | `frontend/src/views/Ranks.jsx` (route `/ranks`, `RankWatcher` in `App.jsx`) | |
| UI strings | `frontend/scripts/symmetry-locales.mjs` writes them into every locale pack | `check-locales.mjs`, `check-source-strings.mjs` |
| Styles | `frontend/src/symmetry.css` | |

State added to the profile: `S.food = { [iso]: { meals: [{ id, name, kcal, p, c, f, at }], water, act: { steps, km, kcalAct } } }`.
Weigh-ins reuse openGym's `S.bodyweight`, so the check-in, the weigh-in sheet and Stats keep working.

## Phases

### 1. Nutrition (done)

- Food tab: meals with kcal / protein / carbs / fat, quick adds (`QUICK_MEALS`, `SNACKS` from the
  artifact) and a custom entry; water (+250 / +500 ml); Samsung Health activity (steps, km, active kcal).
- Goals: 2,550 kcal, 150 g P, 341 g C, 65 g F, 3.3 L water, 8,000 steps.
- Balance of the day: eaten vs ~1,870 kcal resting + active kcal (Samsung, else steps × 0.028) +
  training (session minutes × 5 kcal, capped at 90 min; 15 kcal a set without a duration) +
  treadmill sets by the ACSM equations at the latest body weight.
- Weekly balance with bars per day and averages.
- Weight trend: EWMA, α 0.12. Dynamic TDEE over the last 14 days once there are 8 weigh-ins over
  10+ days and 10 days with meals; then it replaces the estimate (Samsung is not added on top).

### 2. Strength ranks (done)

- `STD` tables, `RANK_MUSCLE` and the `ISO` anti-momentum filter (isolation: only sets of 8+ reps,
  no jump over 25% on the set before) ported to openGym exercise ids.
- Weights: openGym logs kg (lb profiles converted). Plate-stack tables read kg ÷ 10 (1 plate ≈ 10 kg,
  the same rule the artifact's export used); per-side tables read kg ÷ 2; dumbbell RDL × 2.
- Bronze → Diamond with I / II / III, athlete level 1-99 with XP, best lift of the last 60 days.
- Ranks screen (`/ranks`), level card on Home, toast "Rank up!" when a finished workout moves a
  muscle into the next rank.

### 3. Nico's routine (done)

- "Symmetry 5 days" in the starter-plan chooser: Push, Pull, Legs, Upper, Lower on Mon-Fri, with
  the rep range (`repsMin`/`reps`), rest (`restSec`) and RIR (note) of `RUTINA_V2`.
- Machines the catalogue lacks become custom exercises: Cybex Dual Axis Chest Press, gym80 Lat
  Pulldown, gym80 Chest Supported Row (`sym-*` ids). Everything else maps to the catalogue:

| Artifact | openGym | | Artifact | openGym |
|---|---|---|---|---|
| press_inc_manc | 0314 | | jalon_ancho | 2291 |
| press_plano_conv | 0576 | | jalon_neutro | 7583 |
| press_militar_manc | 0405 | | remo_polea_v | 0861 |
| pec_deck | 1030 | | remo_t | 0606 |
| elev_lat_maq | 0584 | | face_pull | 11060 |
| elev_lat_polea | 0178 | | curl_inclinado | 0318 |
| ext_overhead | 0194 | | curl_predicador_manc | 3084 |
| ext_triceps_triangulo | 0241 | | curl_martillo | 0313 |
| ext_triceps_cuerda | 0200 | | curl_polea | 0868 |
| seated_dip | 1451 | | ab_crunch_maq | 1452 |
| hack_squat | 0743 | | prensa_45 / prensa_gluteo | 0739 |
| ext_cuad | 0585 | | curl_femoral_sentado | 0599 |
| curl_femoral | 0586 | | elev_talones_prensa | 1391 |
| elev_talones_pie | 0605 | | elev_talones_sentado | 0594 |
| pmr | 1459 | | pmr_barra | 0085 |
| cybex_chest | sym-cybex-chest | | jalon_gym80 | sym-gym80-pulldown |
| remo_pecho_gym80 | sym-gym80-chest-row | | | |

### 4. Import the artifact's backup (next)

- Settings → "Import Symmetry Tauro backup": reads the JSON from the artifact's "Exportar copia"
  (state v4: `sessions[].entries[].sets`, `days{ meals, water, act }`, `weights`).
- Sessions → `S.workouts` with the id map above; weights through the artifact's `ogWeight()`
  (pl × 10 kg, lado × 2 (+20 kg bar on barbells), mc as is, lb kept as lb, pc → 0 with a note).
  Warm-ups (`t: 'w'`) → `warmup: true`; failure (`t: 'f'`) → `failure: true`. Cardio → treadmill sets.
- `days` → `S.food`; `weights` → `S.bodyweight`. Pure in `lib/import-symmetry.js` with a test on a
  fixture backup; importing twice must not duplicate anything.

### 5. Android APK (next)

No Android Studio on the PC, so the APK is built by GitHub Actions in Nico's fork:

1. Give the fork its own app id (`applicationId` in `frontend/android/app/build.gradle`, e.g.
   `io.github.<user>.symmetrygym`) and name ("Symmetry Gym"), so it installs next to openGym
   instead of clashing with it.
2. Point the in-app updater (`frontend/src/lib/update.js`, `REPO`) at the fork, or switch it off,
   so it never offers the official openGym APK.
3. Add `.github/workflows/symmetry-apk.yml`: `npm ci`, `npm run build:mobile` (180 px media only,
   which the licence allows in CI), `./gradlew assembleSideloadRelease`, sign with a keystore from
   repository secrets, upload the APK as a workflow artifact.
4. One-time: make a keystore and store it as secrets (`ANDROID_KEYSTORE_B64`, password, alias).
   Every update must be signed with the same key or Android refuses to install it over the old one.
5. Install: download the APK from the Actions run on the phone, allow "install unknown apps" for
   the browser once, open it. Before any reinstall, export a backup from Settings.

## Notes

- `S.food` merges as one whole setting on a sync conflict (newest copy wins). Fine for one phone
  in local mode; for server sync, add it to `STAMPED_MAPS` in `lib/sync-merge.js` and
  `api/sync-stamps.js` together.
- The Symmetry strings are English in every language except Spanish (`symmetry-locales.mjs`).
- On Windows, 9 upstream tests fail before any change (CRLF checkouts and shell-script tests:
  `app-icons`, `check-mobile-bundle`, `csp`, pack tests). They pass on Linux CI.
