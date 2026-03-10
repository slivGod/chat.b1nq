const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const STAFF_SECRET_CODE = String(process.env.STAFF_SECRET_CODE || '').trim();
const STAFF_TOKEN_SECRET = String(process.env.STAFF_TOKEN_SECRET || STAFF_SECRET_CODE || '').trim();
const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const AUTH_TOKEN_SECRET = String(process.env.AUTH_TOKEN_SECRET || STAFF_TOKEN_SECRET || STAFF_SECRET_CODE || '').trim();
const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const clients = new Map();
const chatHistory = [];
const MAX_HISTORY = 100;
const rateLimits = new Map();
const moderationByNick = new Map();
const moderationByIp = new Map();
const accountsStore = {
    users: {},
    staff: {}
};
let isSavingAccounts = false;
let pendingAccountsSave = false;

const SPAM_POLICY = {
    burstWindowMs: 6000,
    burstLimit: 6,
    hardBurstLimit: 12,
    minMessageIntervalMs: 350,
    duplicateWindowMs: 20000,
    duplicateLimit: 3,
    linkWindowMs: 15000,
    linkLimit: 3,
    strikeDecayMs: 8 * 60 * 1000,
    muteDurationsMs: [15000, 60000, 180000, 600000, 1800000],
    banDurationsMs: [1800000, 21600000, 86400000],
    banAfterStrikes: 10
};

function send(ws, payload) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(payload));
}

function broadcast(payload, exceptWs = null) {
    for (const client of clients.keys()) {
        if (client !== exceptWs) {
            send(client, payload);
        }
    }
}

function nowTime() {
    return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function safePathFromUrl(urlPath) {
    const raw = decodeURIComponent(urlPath.split('?')[0]);
    const normalized = path
        .normalize(raw)
        .replace(/^([/\\])+/, '')
        .replace(/^(\.\.[/\\])+/, '');
    return normalized || 'index.html';
}

function getClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').trim();
    if (forwarded) return forwarded.split(',')[0].trim();
    return String(req.socket?.remoteAddress || 'unknown');
}

function isRateLimited(bucketKey, limit, windowMs) {
    const now = Date.now();
    const bucket = rateLimits.get(bucketKey) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
        bucket.count = 0;
        bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    rateLimits.set(bucketKey, bucket);
    return bucket.count > limit;
}

function setDefaultSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

function getOrCreateModerationState(store, key) {
    const safeKey = String(key || '').trim().toLowerCase();
    if (!safeKey) return null;
    if (!store.has(safeKey)) {
        store.set(safeKey, {
            strikes: 0,
            lastStrikeAt: 0,
            muteUntil: 0,
            banUntil: 0,
            muteLevel: 0,
            banLevel: 0,
            windowStart: 0,
            windowCount: 0,
            lastMessageAt: 0,
            lastText: '',
            duplicateCount: 0,
            duplicateWindowStart: 0,
            linkWindowStart: 0,
            linkCount: 0
        });
    }
    return store.get(safeKey);
}

function formatDurationMs(ms) {
    const sec = Math.max(1, Math.ceil(ms / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.ceil(sec / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.ceil(min / 60);
    return `${hrs}h`;
}

function base64UrlEncode(input) {
    return Buffer.from(input).toString('base64url');
}

function createStaffSessionToken({ nickname, role }) {
    if (!STAFF_TOKEN_SECRET) return null;
    const payload = {
        nickname: String(nickname || '').trim().toLowerCase(),
        role,
        exp: Date.now() + STAFF_SESSION_TTL_MS
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
        .createHmac('sha256', STAFF_TOKEN_SECRET)
        .update(encodedPayload)
        .digest('base64url');
    return `${encodedPayload}.${signature}`;
}

function verifyStaffSessionToken(token) {
    if (!STAFF_TOKEN_SECRET || !token || typeof token !== 'string') return null;
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
        .createHmac('sha256', STAFF_TOKEN_SECRET)
        .update(encodedPayload)
        .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;

    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (!payload || typeof payload !== 'object') return null;
        if (payload.exp <= Date.now()) return null;
        if (payload.role !== 'admin' && payload.role !== 'moderator') return null;
        const nickname = String(payload.nickname || '').trim().toLowerCase();
        if (!nickname) return null;
        return { nickname, role: payload.role, exp: payload.exp };
    } catch (error) {
        return null;
    }
}

function normalizeNick(nickname) {
    return String(nickname || '').trim().toLowerCase();
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

function loadAccountsStore() {
    try {
        if (!fs.existsSync(ACCOUNTS_FILE)) return;
        const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        accountsStore.users = parsed.users && typeof parsed.users === 'object' ? parsed.users : {};
        accountsStore.staff = parsed.staff && typeof parsed.staff === 'object' ? parsed.staff : {};
    } catch (error) {
        console.warn('Warning: failed to load accounts store, using empty store.');
    }
}

function saveAccountsStore() {
    pendingAccountsSave = true;
    if (isSavingAccounts) return;
    isSavingAccounts = true;

    const flush = () => {
        if (!pendingAccountsSave) {
            isSavingAccounts = false;
            return;
        }
        pendingAccountsSave = false;
        const snapshot = JSON.stringify(accountsStore, null, 2);
        fs.writeFile(ACCOUNTS_FILE, snapshot, 'utf8', (error) => {
            if (error) {
                console.error('Failed to save accounts store:', error.message);
            }
            setImmediate(flush);
        });
    };

    flush();
}

function getAccountByNick(normalizedNick) {
    return accountsStore.users[normalizedNick] || accountsStore.staff[normalizedNick] || null;
}

function createAuthToken({ nickname, role, ttlMs = AUTH_SESSION_TTL_MS }) {
    if (!AUTH_TOKEN_SECRET) return null;
    const payload = {
        nickname: normalizeNick(nickname),
        role,
        exp: Date.now() + ttlMs
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
        .createHmac('sha256', AUTH_TOKEN_SECRET)
        .update(encodedPayload)
        .digest('base64url');
    return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token) {
    if (!AUTH_TOKEN_SECRET || !token || typeof token !== 'string') return null;
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
        .createHmac('sha256', AUTH_TOKEN_SECRET)
        .update(encodedPayload)
        .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;

    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (!payload || typeof payload !== 'object') return null;
        if (!payload.exp || payload.exp <= Date.now()) return null;
        const nickname = normalizeNick(payload.nickname);
        const role = String(payload.role || 'user');
        if (!nickname || !['user', 'admin', 'moderator'].includes(role)) return null;
        return { nickname, role, exp: payload.exp };
    } catch (error) {
        return null;
    }
}

function decayStrikesIfNeeded(state, now) {
    if (!state.lastStrikeAt) return;
    if (now - state.lastStrikeAt > SPAM_POLICY.strikeDecayMs) {
        state.strikes = Math.max(0, state.strikes - 1);
        state.lastStrikeAt = now;
    }
}

function comparePenalties(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.action !== b.action) {
        return a.action === 'ban' ? a : b;
    }
    return a.until >= b.until ? a : b;
}

function applyModerationStrike(state, reason, severity = 'normal') {
    const now = Date.now();
    decayStrikesIfNeeded(state, now);
    state.strikes += 1;
    state.lastStrikeAt = now;

    if (severity === 'hard' || state.strikes >= SPAM_POLICY.banAfterStrikes) {
        const banIndex = Math.min(state.banLevel, SPAM_POLICY.banDurationsMs.length - 1);
        const banDuration = SPAM_POLICY.banDurationsMs[banIndex];
        state.banLevel = Math.min(state.banLevel + 1, SPAM_POLICY.banDurationsMs.length - 1);
        state.banUntil = Math.max(state.banUntil, now + banDuration);
        state.muteUntil = Math.max(state.muteUntil, state.banUntil);
        return { action: 'ban', until: state.banUntil, reason, strikes: state.strikes, triggered: true };
    }

    const muteIndex = Math.min(state.muteLevel, SPAM_POLICY.muteDurationsMs.length - 1);
    const muteDuration = SPAM_POLICY.muteDurationsMs[muteIndex];
    state.muteLevel = Math.min(state.muteLevel + 1, SPAM_POLICY.muteDurationsMs.length - 1);
    state.muteUntil = Math.max(state.muteUntil, now + muteDuration);
    return { action: 'mute', until: state.muteUntil, reason, strikes: state.strikes, triggered: true };
}

function checkActivePenalty(state) {
    const now = Date.now();
    if (state.banUntil > now) {
        return { action: 'ban', until: state.banUntil, reason: 'active', strikes: state.strikes, triggered: false };
    }
    if (state.muteUntil > now) {
        return { action: 'mute', until: state.muteUntil, reason: 'active', strikes: state.strikes, triggered: false };
    }
    return null;
}

function evaluateSpamAndPenalties(userData, text) {
    const now = Date.now();
    const normalizedText = String(text || '').trim().toLowerCase();
    const isLikelyLink = /(https?:\/\/|t\.me\/|discord\.gg\/|www\.)/i.test(normalizedText);

    const nickState = userData.nickState;
    const ipState = userData.ipState;

    const activeNickPenalty = nickState ? checkActivePenalty(nickState) : null;
    const activeIpPenalty = ipState ? checkActivePenalty(ipState) : null;
    const activePenalty = comparePenalties(activeNickPenalty, activeIpPenalty);
    if (activePenalty) return activePenalty;

    const states = [nickState, ipState].filter(Boolean);
    let strikeReason = null;
    let strikeSeverity = 'normal';

    for (const state of states) {
        decayStrikesIfNeeded(state, now);

        if (state.windowStart === 0 || now - state.windowStart > SPAM_POLICY.burstWindowMs) {
            state.windowStart = now;
            state.windowCount = 0;
        }
        state.windowCount += 1;
        if (state.windowCount > SPAM_POLICY.hardBurstLimit) {
            strikeReason = 'hard_burst';
            strikeSeverity = 'hard';
        } else if (!strikeReason && state.windowCount > SPAM_POLICY.burstLimit) {
            strikeReason = 'burst';
        }

        if (!strikeReason && state.lastMessageAt && now - state.lastMessageAt < SPAM_POLICY.minMessageIntervalMs) {
            strikeReason = 'speed';
        }
        state.lastMessageAt = now;

        if (!state.duplicateWindowStart || now - state.duplicateWindowStart > SPAM_POLICY.duplicateWindowMs) {
            state.duplicateWindowStart = now;
            state.duplicateCount = 0;
            state.lastText = '';
        }
        if (normalizedText && state.lastText === normalizedText) {
            state.duplicateCount += 1;
            if (!strikeReason && state.duplicateCount >= SPAM_POLICY.duplicateLimit) {
                strikeReason = 'duplicate';
            }
        } else {
            state.lastText = normalizedText;
            state.duplicateCount = 1;
        }

        if (isLikelyLink) {
            if (!state.linkWindowStart || now - state.linkWindowStart > SPAM_POLICY.linkWindowMs) {
                state.linkWindowStart = now;
                state.linkCount = 0;
            }
            state.linkCount += 1;
            if (!strikeReason && state.linkCount > SPAM_POLICY.linkLimit) {
                strikeReason = 'link_spam';
            }
        } else if (!state.linkWindowStart || now - state.linkWindowStart > SPAM_POLICY.linkWindowMs) {
            state.linkWindowStart = now;
            state.linkCount = 0;
        }
    }

    if (!strikeReason) return null;

    const nickPenalty = nickState ? applyModerationStrike(nickState, strikeReason, strikeSeverity) : null;
    const ipPenalty = ipState ? applyModerationStrike(ipState, strikeReason, strikeSeverity) : null;
    return comparePenalties(nickPenalty, ipPenalty) || { action: 'mute', until: now + 10000, reason: strikeReason, triggered: true };
}

function penaltyReasonLabel(reason) {
    if (reason === 'speed') return 'too fast';
    if (reason === 'duplicate') return 'duplicate messages';
    if (reason === 'link_spam') return 'link spam';
    if (reason === 'hard_burst') return 'hard flood';
    if (reason === 'burst') return 'flood';
    return 'chat rules violation';
}

function readJsonBody(req, maxBytes = 8192) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > maxBytes) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                resolve(parsed);
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });

        req.on('error', reject);
    });
}

loadAccountsStore();

const server = http.createServer((req, res) => {
    setDefaultSecurityHeaders(res);
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const isStaffSecretApi = requestUrl.pathname === '/api/verify-staff-secret';
    const isStaffSessionApi = requestUrl.pathname === '/api/staff-session';
    const isAuthRegisterUserApi = requestUrl.pathname === '/api/auth/register-user';
    const isAuthLoginUserApi = requestUrl.pathname === '/api/auth/login-user';
    const isAuthCreateStaffApi = requestUrl.pathname === '/api/auth/create-staff';
    const isAuthLoginStaffApi = requestUrl.pathname === '/api/auth/login-staff';
    const isAuthSessionApi = requestUrl.pathname === '/api/auth/session';
    const isAnyApi = isStaffSecretApi
        || isStaffSessionApi
        || isAuthRegisterUserApi
        || isAuthLoginUserApi
        || isAuthCreateStaffApi
        || isAuthLoginStaffApi
        || isAuthSessionApi;

    if (isAnyApi && req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (req.method === 'POST' && isStaffSecretApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`verify-secret:${ip}`, 12, 60_000)) {
            res.writeHead(429, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const providedCode = String(payload?.secretCode || '').trim();
                const hasConfiguredSecret = Boolean(STAFF_SECRET_CODE);
                const ok = hasConfiguredSecret && providedCode === STAFF_SECRET_CODE;
                let error = null;
                if (!ok) {
                    error = hasConfiguredSecret ? 'invalid_secret' : 'secret_not_configured';
                }
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(JSON.stringify({ ok, error }));
            })
            .catch(() => {
                res.writeHead(400, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    if (req.method === 'POST' && isStaffSessionApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`staff-session:${ip}`, 20, 60_000)) {
            res.writeHead(429, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const providedCode = String(payload?.secretCode || '').trim();
                const nickname = String(payload?.nickname || '').trim().slice(0, 20);
                const role = String(payload?.role || '').trim();
                const isStaffRole = role === 'admin' || role === 'moderator';

                if (!nickname || !isStaffRole) {
                    res.writeHead(400, {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    });
                    res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
                    return;
                }

                const hasConfiguredSecret = Boolean(STAFF_SECRET_CODE);
                const secretOk = hasConfiguredSecret && providedCode === STAFF_SECRET_CODE;
                if (!secretOk) {
                    res.writeHead(200, {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    });
                    res.end(JSON.stringify({
                        ok: false,
                        error: hasConfiguredSecret ? 'invalid_secret' : 'secret_not_configured'
                    }));
                    return;
                }

                const token = createStaffSessionToken({ nickname, role });
                if (!token) {
                    res.writeHead(500, {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    });
                    res.end(JSON.stringify({ ok: false, error: 'token_not_configured' }));
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(JSON.stringify({
                    ok: true,
                    token,
                    expiresAt: new Date(Date.now() + STAFF_SESSION_TTL_MS).toISOString()
                }));
            })
            .catch(() => {
                res.writeHead(400, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    if (req.method === 'POST' && isAuthRegisterUserApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`auth-register-user:${ip}`, 25, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const nickname = String(payload?.nickname || '').trim().slice(0, 20);
                const password = String(payload?.password || '');
                const normalized = normalizeNick(nickname);
                if (!nickname || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
                    return;
                }
                if (password.length < 4) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'weak_password' }));
                    return;
                }
                if (getAccountByNick(normalized)) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'nickname_taken' }));
                    return;
                }

                accountsStore.users[normalized] = {
                    nickname,
                    passwordHash: hashPassword(password),
                    role: 'user',
                    registered: new Date().toISOString()
                };
                saveAccountsStore();

                const token = createAuthToken({ nickname, role: 'user' });
                if (!token) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'token_not_configured' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: true, nickname, role: 'user', token }));
            })
            .catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    if (req.method === 'POST' && isAuthLoginUserApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`auth-login-user:${ip}`, 35, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const nickname = String(payload?.nickname || '').trim().slice(0, 20);
                const password = String(payload?.password || '');
                const normalized = normalizeNick(nickname);
                const account = accountsStore.users[normalized];
                if (!account) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'account_not_found' }));
                    return;
                }
                if (account.passwordHash !== hashPassword(password)) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_password' }));
                    return;
                }

                const token = createAuthToken({ nickname: account.nickname, role: 'user' });
                if (!token) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'token_not_configured' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: true, nickname: account.nickname, role: 'user', token }));
            })
            .catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    if (req.method === 'POST' && isAuthCreateStaffApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`auth-create-staff:${ip}`, 20, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const nickname = String(payload?.nickname || '').trim().slice(0, 20);
                const password = String(payload?.password || '');
                const role = String(payload?.role || 'moderator');
                const secretCode = String(payload?.secretCode || '').trim();
                const normalized = normalizeNick(nickname);
                if (!nickname || !password || !['admin', 'moderator'].includes(role)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
                    return;
                }
                if (!STAFF_SECRET_CODE) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'secret_not_configured' }));
                    return;
                }
                if (secretCode !== STAFF_SECRET_CODE) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_secret' }));
                    return;
                }
                if (password.length < 4) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'weak_password' }));
                    return;
                }
                if (getAccountByNick(normalized)) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'nickname_taken' }));
                    return;
                }

                accountsStore.staff[normalized] = {
                    nickname,
                    passwordHash: hashPassword(password),
                    role,
                    registered: new Date().toISOString()
                };
                saveAccountsStore();

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: true }));
            })
            .catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    if (req.method === 'POST' && isAuthLoginStaffApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`auth-login-staff:${ip}`, 30, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const nickname = String(payload?.nickname || '').trim().slice(0, 20);
                const password = String(payload?.password || '');
                const role = String(payload?.role || '');
                const secretCode = String(payload?.secretCode || '').trim();
                const normalized = normalizeNick(nickname);
                const account = accountsStore.staff[normalized];
                if (!account) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'account_not_found' }));
                    return;
                }
                if (!STAFF_SECRET_CODE) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'secret_not_configured' }));
                    return;
                }
                if (secretCode !== STAFF_SECRET_CODE) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_secret' }));
                    return;
                }
                if (account.passwordHash !== hashPassword(password)) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_password' }));
                    return;
                }
                if (account.role !== role) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_role' }));
                    return;
                }

                const token = createAuthToken({ nickname: account.nickname, role: account.role });
                if (!token) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'token_not_configured' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: true, nickname: account.nickname, role: account.role, token }));
            })
            .catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    if (req.method === 'POST' && isAuthSessionApi) {
        const ip = getClientIp(req);
        if (isRateLimited(`auth-session:${ip}`, 90, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
            return;
        }

        readJsonBody(req)
            .then((payload) => {
                const token = String(payload?.token || '').trim();
                const verified = verifyAuthToken(token);
                if (!verified) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_session' }));
                    return;
                }
                const source = verified.role === 'user' ? accountsStore.users : accountsStore.staff;
                const account = source[verified.nickname];
                if (!account || account.role !== verified.role) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: false, error: 'account_not_found' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: true, nickname: account.nickname, role: account.role }));
            })
            .catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
            });
        return;
    }

    const filePath = safePathFromUrl(req.url || '/');
    const rootPath = path.resolve(ROOT);
    const absPath = path.resolve(ROOT, filePath);
    const accountsPath = path.resolve(ACCOUNTS_FILE);

    if (!absPath.startsWith(rootPath) || absPath === accountsPath) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(absPath, (error, data) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(500);
            res.end('Server error');
            return;
        }

        const ext = path.extname(absPath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    const ip = getClientIp(ws._socket?.parser?.incoming || { headers: {}, socket: ws._socket });
    const ipState = getOrCreateModerationState(moderationByIp, ip);
    clients.set(ws, { nickname: null, role: 'user', ip, ipState, nickState: null });

    send(ws, {
        type: 'system',
        text: '[SYSTEM] Connected to online chat'
    });

    send(ws, {
        type: 'history',
        messages: chatHistory
    });

    ws.on('message', (raw) => {
        let payload;
        try {
            payload = JSON.parse(raw.toString());
        } catch (error) {
            return;
        }

        const userData = clients.get(ws);
        if (!userData) return;

        if (payload.type === 'join') {
            const nickname = String(payload.user || '').trim().slice(0, 20);
            const requestedRole = String(payload.role || 'user');
            const requestedToken = String(payload.authToken || payload.staffToken || '').trim();
            let role = 'user';
            if (!nickname) return;

            if (requestedToken) {
                const tokenPayload = verifyAuthToken(requestedToken);
                const normalizedNick = nickname.toLowerCase();
                if (tokenPayload && tokenPayload.nickname === normalizedNick) {
                    role = tokenPayload.role;
                } else if (requestedRole === 'admin' || requestedRole === 'moderator') {
                    send(ws, {
                        type: 'system',
                        text: '[SYSTEM] Staff role verification failed. Connected as user.'
                    });
                }
            } else if (requestedRole === 'admin' || requestedRole === 'moderator') {
                send(ws, {
                    type: 'system',
                    text: '[SYSTEM] Staff role verification failed. Connected as user.'
                });
            }

            userData.nickState = getOrCreateModerationState(moderationByNick, nickname);
            const penalty = comparePenalties(checkActivePenalty(userData.nickState), checkActivePenalty(userData.ipState));
            if (penalty) {
                const left = formatDurationMs(penalty.until - Date.now());
                send(ws, {
                    type: 'system',
                    text: penalty.action === 'ban'
                        ? '[BAN] Access to chat is restricted for ' + left
                        : '[MUTE] You are muted for ' + left
                });
                if (penalty.action === 'ban') {
                    ws.close();
                }
                return;
            }

            userData.nickname = nickname;
            userData.role = role;

            broadcast({ type: 'system', text: '[SYSTEM] ' + nickname + ' joined the chat' }, ws);
            return;
        }

        if (payload.type === 'leave') {
            if (userData.nickname) {
                broadcast({ type: 'system', text: '[SYSTEM] ' + userData.nickname + ' left the chat' }, ws);
            }
            return;
        }
        if (payload.type === 'chat_message') {
            if (!userData.nickname) return;
            const text = String(payload.text || '').trim().slice(0, 600);
            if (!text) return;

            const penalty = evaluateSpamAndPenalties(userData, text);
            if (penalty) {
                const left = formatDurationMs(penalty.until - Date.now());
                const reasonText = penaltyReasonLabel(penalty.reason);
                send(ws, {
                    type: 'system',
                    text: penalty.action === 'ban'
                        ? '[BAN] Spam (' + reasonText + '): ' + left
                        : '[MUTE] Spam (' + reasonText + '): ' + left
                });
                if (penalty.triggered && userData.nickname) {
                    broadcast({
                        type: 'system',
                        text: penalty.action === 'ban'
                            ? '[MOD] ' + userData.nickname + ' received a ban (' + reasonText + ', ' + left + ')'
                            : '[MOD] ' + userData.nickname + ' received a mute (' + reasonText + ', ' + left + ')'
                    }, ws);
                }
                if (penalty.action === 'ban') {
                    ws.close();
                }
                return;
            }

            const message = {
                user: userData.nickname,
                role: userData.role || 'user',
                text,
                time: nowTime()
            };

            chatHistory.push(message);
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.splice(0, chatHistory.length - MAX_HISTORY);
            }

            broadcast({ type: 'chat_message', message });
        }
    });

    ws.on('close', () => {
        const userData = clients.get(ws);
        if (userData?.nickname) {
            broadcast({ type: 'system', text: '[SYSTEM] ' + userData.nickname + ' disconnected' }, ws);
        }
        clients.delete(ws);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Site server: http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}/ws`);
    if (!STAFF_SECRET_CODE) {
        console.warn('Warning: STAFF_SECRET_CODE is not set. Staff registration will be disabled.');
    }
    if (!AUTH_TOKEN_SECRET) {
        console.warn('Warning: AUTH_TOKEN_SECRET is not set. Auth sessions will be disabled.');
    }
});
