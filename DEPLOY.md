# Deploy to Render (site + chat)

This project runs as one Node.js Web Service:
- `server.js` serves the site files
- WebSocket chat is available at `/ws`

## 1) Required files in repo root

- `server.js`
- `package.json`
- `render.yaml`
- `index.html`
- `style.css`
- `admin-styles.css`
- `script.js`
- `config.js`

## 2) Render service settings

If creating manually:
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: empty

## 3) Environment variables (important)

Set these in Render -> Service -> `Environment`:

1. `STAFF_SECRET_CODE` = your private admin registration phrase  
   Example: `my-very-strong-secret-2026`
2. `AUTH_TOKEN_SECRET` = random long string for login session tokens  
   Example: `d7dc43eb5226bdb0f65ef7bc4683ff91`
3. `HOST` = `0.0.0.0` (optional, already defaulted in code)

`PORT` is provided by Render automatically.

## 4) Why this is safer now

- Secret phrase is no longer stored in frontend code.
- Accounts are stored server-side in `accounts.json` (not in browser localStorage).
- Frontend sends auth requests to server `/api/auth/*`.
- Server signs sessions with `AUTH_TOKEN_SECRET`.
- Staff actions are protected by `STAFF_SECRET_CODE`.

If `STAFF_SECRET_CODE` is empty, admin/staff registration is disabled.

## 5) How to rotate (change) admin secret phrase

1. Open Render -> your service -> `Environment`.
2. Edit `STAFF_SECRET_CODE`.
3. Save and redeploy (`Manual Deploy` -> `Deploy latest commit`).

You always know the current phrase because it exists only in Render environment.

## 6) Frontend config

For deployment on the same Render domain:

```js
window.CHAT_SERVER_URL = 'https://chat-b1nq.onrender.com';
window.CHAT_WS_PATH = '/ws';
```
