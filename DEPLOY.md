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
2. `HOST` = `0.0.0.0` (optional, already defaulted in code)

`PORT` is provided by Render automatically.

## 4) Why this is safer now

- Secret phrase is no longer stored in frontend code.
- Frontend sends entered phrase to server endpoint `/api/verify-staff-secret`.
- Server compares it with `STAFF_SECRET_CODE` from Render environment.

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
