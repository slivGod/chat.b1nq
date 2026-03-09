# Deploy: GitHub Pages + Online Chat


## 1) Deploy backend (WebSocket server)

This project needs a Node.js server for chat.  
Deploy `server.js` to any Node host (Render, Railway, Fly.io, VPS).

Environment:
- `PORT` is set by host automatically
- `HOST=0.0.0.0` (optional)

Start command:
```bash
npm install
npm start
```

After deploy, copy backend URL, for example:
- `https://my-chat-backend.onrender.com`

## 2) Configure frontend for GitHub Pages

Edit `config.js`:
```js
window.CHAT_SERVER_URL = 'https://my-chat-backend.onrender.com';
window.CHAT_WS_PATH = '/ws';
```

Then publish frontend files (`index.html`, `style.css`, `script.js`, `admin-styles.css`, `config.js`) to GitHub Pages.

## 3) Open site

Frontend (GitHub Pages):
- `https://<your-user>.github.io/<repo>/`

Chat will connect to backend URL from `config.js`.
