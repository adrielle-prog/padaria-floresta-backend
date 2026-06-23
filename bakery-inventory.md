# Plan: Bakery Inventory System (`bakery-inventory.md`)

## Overview
A web-based bakery inventory management system accessible via both a fixed cashier desktop computer and a mobile phone connected to the same local Wi-Fi. Features registration, updates, stock depletion upon sales, and sales history.

## Project Type
WEB / BACKEND (Full-stack Local Server)

---

## Tech Stack & Rationale
- **Frontend**: React + Vite (Fast SPA, lightweight, modular, and highly interactive).
- **Styling**: Vanilla CSS (Premium warm slate/amber bakery theme, card glassmorphism, responsive grids).
- **Backend**: Node.js + Express (Fast, lightweight, allows local server hosting on all interfaces `0.0.0.0` for local Wi-Fi sharing).
- **Database**: SQLite via `sqlite3` driver (Lightweight, single-file database that runs serverless on the server machine, ensuring durability).

---

## File Structure
```plaintext
/ (project root)
├── server/
│   ├── package.json
│   ├── server.js           # Server application
│   ├── db.js               # Database schema and helpers
│   └── sales.db            # SQLite database file (runtime generated)
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css       # Core styling & warm palette design tokens
│   │   └── components/
│   │       ├── Dashboard.jsx
│   │       ├── ProductList.jsx
│   │       ├── ProductForm.jsx
│   │       ├── SaleForm.jsx
│   │       └── HistoryList.jsx
```

---

## Success Criteria
1. Products can be created, updated, and listed with validation (price/quantity must be positive numbers).
2. Registering a sale decrements stock immediately and fails gracefully with an alert if requested quantity exceeds current stock.
3. Every sale is saved in the database with timestamps.
4. Mobile phones on the same Wi-Fi network can access the server using the desktop's local IP address.
5. The UI is responsive on both mobile screens and desktop monitors.

---

## Task Breakdown

### Task 1: Initialize Backend Node.js Environment
- **Agent**: `devops-engineer`
- **Skills**: `server-management`
- **Priority**: High (P0)
- **Dependencies**: None
- **INPUT**: Empty project directory.
- **OUTPUT**: `server/package.json` with dependencies `express`, `cors`, `sqlite3`, `dotenv` and developer dependency `nodemon`.
- **VERIFY**: Run `npm install` inside the `server/` directory without error.

### Task 2: Configure SQLite Database Schema (`server/db.js`)
- **Agent**: `database-architect`
- **Skills**: `database-design`
- **Priority**: High (P0)
- **Dependencies**: Task 1
- **INPUT**: Installed `sqlite3` dependency.
- **OUTPUT**: `server/db.js` initializing tables `products` and `sales` if they do not exist.
- **VERIFY**: Verify the SQLite connection and schema creation by executing a simple initialization check script with Node.

### Task 3: Develop Express API Endpoints (`server/server.js`)
- **Agent**: `backend-specialist`
- **Skills**: `api-patterns`, `nodejs-best-practices`
- **Priority**: High (P0)
- **Dependencies**: Task 2
- **INPUT**: Initialized database module.
- **OUTPUT**: Express API listening on port `5000` (on all network interfaces `0.0.0.0`) offering endpoints:
  - `GET /api/products` (list all products)
  - `POST /api/products` (create product)
  - `PUT /api/products/:id` (edit product info)
  - `POST /api/sales` (decrement product stock and insert sale log within a database transaction)
  - `GET /api/sales` (retrieve sale history logs)
  - `GET /api/network-ip` (retrieve machine's local IP address)
- **VERIFY**: Start server and call endpoints via Curl to verify successful responses.

### Task 4: Initialize React Frontend (`client/`)
- **Agent**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`
- **Priority**: Medium (P1)
- **Dependencies**: None
- **INPUT**: Empty root workspace folder.
- **OUTPUT**: Vite scaffolded project in `client/` directory with package.json ready.
- **VERIFY**: Execute client scaffolding and run client production build successfully.

### Task 5: Premium CSS Design System (`client/src/index.css`)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: Medium (P1)
- **Dependencies**: Task 4
- **INPUT**: Default Vite template.
- **OUTPUT**: Modern, custom warm palette styling (warm slate, amber, sand, brown, cream), typography definitions, glassmorphic container classes, input states, validation notifications. NO purple/violet.
- **VERIFY**: Visually verify standard layout and color palette in developer mode.

### Task 6: Implement Frontend Components
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `nextjs-react-expert`
- **Priority**: Medium (P1)
- **Dependencies**: Task 5
- **INPUT**: Configured design tokens and layouts.
- **OUTPUT**: Components `Dashboard`, `ProductList`, `ProductForm`, `SaleForm`, and `HistoryList` built in React.
- **VERIFY**: Verify that components render correctly, modals show up and close, and input validation messages fire on wrong entries.

### Task 7: Integrate Frontend with Backend APIs
- **Agent**: `frontend-specialist` + `backend-specialist`
- **Skills**: `api-patterns`
- **Priority**: High (P0)
- **Dependencies**: Task 3, Task 6
- **INPUT**: Working frontend components and backend REST API.
- **OUTPUT**: API services in client utilizing `fetch` to load/update data on the server dynamically.
- **VERIFY**: Register, update, and sell a product from the UI, and verify SQLite changes reflect immediately.

### Task 8: QR Code for Mobile Sync
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: Low (P2)
- **Dependencies**: Task 7
- **INPUT**: Completed frontend client and active IP endpoint.
- **OUTPUT**: Dashboard component dynamically fetches desktop local IP, builds client URL, and displays a scanable QR code (using client-side canvas rendering library or API) so users can scan it on their phone to connect.
- **VERIFY**: Scan code with phone on same Wi-Fi, open client, and execute inventory transactions.

### Task 9: Runs Audits & Validations
- **Agent**: `test-engineer`
- **Skills**: `testing-patterns`, `vulnerability-scanner`, `web-design-guidelines`
- **Priority**: Medium (P1)
- **Dependencies**: Task 8
- **INPUT**: Whole codebase.
- **OUTPUT**: Finished inventory control application.
- **VERIFY**: Run `python .agents/scripts/checklist.py .` and ensure all security, lint, and accessibility checks pass.

---

## Phase X: Final Verification

### Automated Verifications
```bash
# Verify formatting, security, and project status
python .agents/scripts/checklist.py .
```

### Manual Checklist
- [x] No purple/violet color hex values used.
- [x] All inputs validated against negative/empty values.
- [x] Sales fail dynamically with clean modal errors if quantity exceeds current stock.
- [x] Stock updates reactively on screen without reload after transactions.
- [x] QR code shows correct local IP address (`192.168.x.x`).

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-22
