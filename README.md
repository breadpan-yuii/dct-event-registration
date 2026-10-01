# DCT Event Registration System

An **Event Registration System** for the **Dominican College of Tarlac, Inc. (DCT)** built entirely in the **JavaScript ecosystem** — **Node.js + Express + EJS** — with a clean **Model–View–Controller (MVC)** architecture and a faithful reproduction of DCT's official web theme.

The theme (colors, fonts, logo and icon) was fetched live from the official site **https://dct.edu.ph/**.

---

## ✨ What was fetched from dct.edu.ph

| Asset | File | Source |
|---|---|---|
| Horizontal wordmark (light variant) | `public/assets/img/logo.png` | `.../img/DCT-long.png` |
| Horizontal wordmark (dark variant) | `public/assets/img/logo-alt.png` | `.../img/DCT-long-alt.png` |
| Seal / favicon | `public/assets/img/icon.png` | `.../img/dctLogo.png` |
| Full seal/crest | `public/assets/img/logo-seal.png` | `.../wp-content/uploads/2024/11/DCT-Logo-alt.png` |
| Hero background | `public/assets/img/hero-bg3.png` | `.../img/bg3.png` |

**Theme tokens extracted from the site's stylesheet (`style.css`):**

- ✏️ Pink (primary): `#eb58b5` — main buttons, links, title underline, focus ring
- 🌑 Dark: `#1C1D21` — hero overlay + footer
- ⚫ Ink: `#252525` · Grey text: `#494949` · Light grey bg: `#FAFAFA`
- 🔤 Fonts: **Montserrat** (400/700) + **Varela Round** (Google Fonts)
- 🎯 Mottos: *Patria, Fides, Sapientia* (Faith, Country, Wisdom)

---

## 🏛 Architecture — Separation of Concerns (MVC)

```
dct-event-registration/
├── server.js                  # bootstrap: express, view engine, routes, helpers
├── config/constants.js        # DCT brand + app configuration
│
├── models/                    # ── MODEL  (data + business rules) ──
│   ├── db.js                  #   JSON-file store (atomic writes)
│   ├── Event.js               #   event shape, validation, capacity rules
│   ├── Registration.js        #   registration shape, ref codes, dedupe
│   ├── index.js               #   shared composition of models
│   └── seed.js                #   sample data (npm run seed)
│
├── controllers/               # ── CONTROLLER (HTTP choreography) ──
│   ├── homeController.js
│   ├── eventController.js
│   ├── registrationController.js
│   └── adminController.js
│
├── views/                     # ── VIEW (presentation only, EJS) ──
│   ├── layout.ejs + partials/ #   shared chrome (head, header, footer…)
│   ├── index.ejs              #   home w/ hero + event grid
│   ├── events/                #   list, detail, register form
│   ├── registrations/         #   receipt, lookup
│   ├── admin/                 #   login, dashboard, event CRUD, CSV export
│   └── errors/
│
├── routes/                    # URL → controller mapping
│   ├── index.js  events.js  registrations.js  admin.js
├── middleware/                # flash messages + admin passcode gate
└── public/                    # theme CSS, JS, downloaded DCT assets
```

Each layer has a single responsibility:

- **Models** never touch `req`/`res` or HTML — they own validation, reference-code generation, capacity/dedupe business rules, and persistence.
- **Controllers** are thin: parse input → ask a model → pick a view. No business logic, no SQL.
- **Views** (EJS) only render data handed to them — they never import models or query storage.

---

## 🚀 Quick start

```bash
cd dct-event-registration
npm install --no-bin-links     # (--no-bin-links needed on Android/FUSE mounts)
npm run seed                   # load 7 DCT events + sample registrations
npm start                      # → http://localhost:3000
```

> Note: if `npm install` complains about symlinks (common on Android sdcard mounts), keep the `--no-bin-links` flag — this app only needs `require()`.

### Defaults

- **App:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin — passcode `dct@2026` (override with env var `DCT_ADMIN_PASSCODE`)
- **Lookup own registration:** http://localhost:3000/registrations/lookup

---

## ✍️ Features

**Public**
- Home page with DCT hero (seal, motto, official hero background), upcoming events, vision & mission
- Event list (upcoming + past) and event detail pages with live seat availability
- One-page registration form with server + client validation
- Instant confirmation **receipt with reference code** (e.g. `DCT-INTRAMR26-0005`), printable
- "Find my registration" by email / reference, and one-click cancellation

**Business rules (in the Model layer)**
- One active registration per person per event (email-based dedupe)
- Capacity check before booking (fully-booked events reject new registrations)
- Registration window enforced (past dates and closed events reject)
- Reference codes are unique and human-readable

**Admin (passcode-gated)**
- Dashboard: totals, per-event capacity bars, recent registrations
- Full event CRUD (create / edit / delete — delete blocked while registrations exist)
- Per-event registration management: view, cancel (soft), delete (hard)
- **CSV export** of registrations (`?export=csv`)

**Data layer**
- JSON-file persistence in `data/` with atomic writes (rename-based), no database needed
- `npm run reset` reseeds everything

---

## 🧪 Scripts

| Command | Purpose |
|---|---|
| `npm start` | Run the server (port 3000) |
| `npm run dev` | Run with `node --watch` auto-restart |
| `npm run seed` | Seed sample data (skips if already present) |
| `npm run reset` | Force re-seed |

---

## 🔍 Folder cheat-sheet

- `config/constants.js` — change port, passcode, school details, theme tokens
- `data/events.json`, `data/registrations.json` — the "database"
- `public/css/theme.css` — DCT branding (colors, type, components)
- `public/assets/img/` — logo / seal / icon / hero (from dct.edu.ph)

Built with ❤️ for the DCT community. *Patria · Fides · Sapientia.*