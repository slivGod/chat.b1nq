// РЎРРЎРўР•РњРђ РЎРўРђРўРЈРЎРђ
let isOnline = true;
let lastActivityTime = Date.now();
let inactivityTimeout = null;
const INACTIVITY_TIME = 30 * 1000; // 30 СЃРµРєСѓРЅРґ
const pageBootTime = Date.now();

function updateActivityStatus() {
    lastActivityTime = Date.now();
    if (!isOnline) {
        setOnlineStatus(true);
    }
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    inactivityTimeout = setTimeout(() => {
        setOnlineStatus(false);
    }, INACTIVITY_TIME);
}

function setOnlineStatus(status) {
    isOnline = status;
    const statusElement = document.querySelector('.status-online');
    const avatarMain = document.querySelector('.avatar-main');
    const tgHeader = document.querySelector('.tg-header');
    
    if (!statusElement) return;
    
    if (status) {
        statusElement.textContent = 'в сети';
        statusElement.classList.add('online');
        statusElement.classList.remove('offline');
        if (avatarMain) {
            avatarMain.style.background = 'linear-gradient(135deg, #52b7e8, #0088cc)';
            avatarMain.style.boxShadow = '0 4px 20px rgba(49, 162, 76, 0.4), 0 0 30px rgba(49, 162, 76, 0.2)';
        }
        if (tgHeader) {
            tgHeader.style.background = 'linear-gradient(135deg, #0088cc 0%, #005c99 100%)';
            tgHeader.style.boxShadow = '0 4px 20px rgba(49, 162, 76, 0.3)';
        }
    } else {
        const timeNow = new Date();
        const minutes = String(timeNow.getMinutes()).padStart(2, '0');
        const hours = String(timeNow.getHours()).padStart(2, '0');
        statusElement.textContent = `был в сети ${hours}:${minutes}`;
        statusElement.classList.add('offline');
        statusElement.classList.remove('online');
        if (avatarMain) {
            avatarMain.style.background = 'linear-gradient(135deg, #555555, #333333)';
            avatarMain.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        }
        if (tgHeader) {
            tgHeader.style.background = 'linear-gradient(135deg, #333333 0%, #1a1a1a 100%)';
            tgHeader.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        }
    }
}

document.addEventListener('mousemove', updateActivityStatus);
document.addEventListener('click', updateActivityStatus);
document.addEventListener('keydown', updateActivityStatus);
document.addEventListener('touchstart', updateActivityStatus);

function hideSiteLoader() {
    const loader = document.getElementById('site-loader');
    if (!loader) return;
    loader.classList.add('hidden');
}

window.addEventListener('load', () => {
    updateActivityStatus();
    const minimumLoaderTime = 900;
    const elapsed = Date.now() - pageBootTime;
    const delay = Math.max(0, minimumLoaderTime - elapsed);
    setTimeout(hideSiteLoader, delay);
});

setInterval(() => {
    if (isOnline) updateActivityStatus();
}, 5000);

const canvas = document.getElementById('space');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];
let meteors = [];
let mouseX = 0;
let mouseY = 0;
let particles = [];
let backgroundParticles = [];
let gridLines = [];
let glowOrbs = [];
let currentTheme = 'dark';

const themeColors = {
    light: { star: '#FFD700', meteor: '#FF6B6B' },
    dark: { star: '#ffffff', meteor: '#a855f7' }, 
    neon: { star: '#00ff00', meteor: '#ff00ff' } 
};

// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ С„РѕРЅРѕРІС‹С… СЌС„С„РµРєС‚РѕРІ РґР»СЏ РєР°Р¶РґРѕР№ С‚РµРјС‹
function initBackgroundEffects() {
    backgroundParticles = [];
    gridLines = [];
    glowOrbs = [];
    
    if (currentTheme === 'light') {
        // РћР±Р»Р°РєР° РґР»СЏ СЃРІРµС‚Р»РѕР№ С‚РµРјС‹
        for (let i = 0; i < 15; i++) {
            backgroundParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.1,
                radius: Math.random() * 80 + 40,
                opacity: Math.random() * 0.2 + 0.1
            });
        }
    } else if (currentTheme === 'dark') {
        // РўСѓРјР°РЅ РґР»СЏ С‚РµРјРЅРѕР№ С‚РµРјС‹
        for (let i = 0; i < 12; i++) {
            backgroundParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                radius: Math.random() * 120 + 80,
                opacity: Math.random() * 0.1 + 0.05
            });
        }
    } else if (currentTheme === 'neon') {
        // РЎРІРµС‚СЏС‰РёРµСЃСЏ СЃС„РµСЂС‹ РґР»СЏ neon С‚РµРјС‹ - РјРЅРѕРіРѕ РјР°Р»РµРЅСЊРєРёС… Рё Р±С‹СЃС‚СЂС‹С…
        for (let i = 0; i < 25; i++) {
            glowOrbs.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 12 + 4,
                color: Math.random() > 0.5 ? '#00ff00' : '#ff00ff'
            });
        }
    }
}

// РћС‚СЃР»РµР¶РёРІР°РЅРёРµ РґРІРёР¶РµРЅРёСЏ РјС‹С€Рё
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // РћР±РЅРѕРІР»СЏРµРј РєР°СЃС‚РѕРјРЅС‹Р№ РєСѓСЂСЃРѕСЂ
    const cursorGlow = document.getElementById('cursor-glow');
    if (cursorGlow) {
        cursorGlow.style.left = mouseX + 'px';
        cursorGlow.style.top = mouseY + 'px';
    }
});

document.addEventListener('mousedown', () => {
    const cursorGlow = document.getElementById('cursor-glow');
    if (cursorGlow) {
        cursorGlow.classList.add('active');
    }
});

document.addEventListener('mouseup', () => {
    const cursorGlow = document.getElementById('cursor-glow');
    if (cursorGlow) {
        cursorGlow.classList.remove('active');
    }
});

// Р­С„С„РµРєС‚ РїР°СЂР°Р»Р»Р°РєСЃР° РЅР° РїСЂРёР»РѕР¶РµРЅРёРµ
document.addEventListener('mousemove', (e) => {
    const app = document.querySelector('.tg-app');
    if (app) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const distX = (e.clientX - centerX) * 0.02;
        const distY = (e.clientY - centerY) * 0.02;
        
        app.style.transform = `translateY(0px) rotateX(${distY}deg) rotateY(${distX}deg) perspective(1000px)`;
    }
});

function initStars() {
    stars = [];
    for(let i=0; i<400; i++) {
        stars.push({ 
            x: Math.random()*canvas.width, 
            y: Math.random()*canvas.height, 
            size: Math.random()*2.5 + 0.5,
            brightness: Math.random() * 0.5 + 0.5
        });
    }
}

function spawnMeteor() {
    meteors.push({
        x: Math.random()*canvas.width + 200,
        y: -50,
        vx: -3, vy: 3,
        life: 180
    });
}
setInterval(spawnMeteor, 2500);

function draw() {
    const colors = themeColors[currentTheme];
    
    // РЎРЅР°С‡Р°Р»Р° РѕС‡РёС‰Р°РµРј С…РѕР»СЃС‚
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Р РёСЃСѓРµРј С„РѕРЅРѕРІС‹Рµ СЌС„С„РµРєС‚С‹
    if (currentTheme === 'light') {
        drawLightBackground();
    } else if (currentTheme === 'dark') {
        drawDarkBackground();
    } else if (currentTheme === 'neon') {
        drawNeonBackground();
    }

    // Р—Р’Р•Р—Р”Р«
    ctx.fillStyle = colors.star;
    stars.forEach(s => {
        const opacity = 0.5 + Math.sin(Date.now() * 0.001 + s.x + s.y) * 0.5;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = colors.star;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fill();
        s.y += 0.3; if(s.y > canvas.height) s.y = 0;
    });
    ctx.globalAlpha = 1;

    // РљРѕРјРµС‚С‹ Рё РјРµС‚РµРѕСЂРёС‚С‹ СЃ С…РІРѕСЃС‚Р°РјРё
    meteors.forEach((m, i) => {
        // РћСЃРЅРѕРІРЅРѕР№ СЏСЂРєРёР№ С…РІРѕСЃС‚ РєРѕРјРµС‚С‹
        const tailGradient = ctx.createLinearGradient(m.x, m.y, m.x + 60, m.y - 60);
        tailGradient.addColorStop(0, `rgba(255, 200, 100, ${m.life / 180})`);
        tailGradient.addColorStop(0.3, `rgba(100, 200, 255, ${m.life / 180 * 0.7})`);
        tailGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.strokeStyle = tailGradient;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + 60, m.y - 60);
        ctx.stroke();
        
        // Р’РЅРµС€РЅРёР№ СЃРІРµС‚СЏС‰РёР№СЃСЏ СЃР»РѕР№ С…РІРѕСЃС‚Р°
        const glowGradient = ctx.createLinearGradient(m.x, m.y, m.x + 60, m.y - 60);
        glowGradient.addColorStop(0, `rgba(255, 100, 50, ${m.life / 180 * 0.5})`);
        glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = glowGradient;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + 60, m.y - 60);
        ctx.stroke();
        
        // РЇРґСЂРѕ РєРѕРјРµС‚С‹
        ctx.fillStyle = `rgba(255, 255, 150, ${m.life / 180})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        m.x += m.vx; m.y += m.vy; m.life--;
        if(m.life <= 0) meteors.splice(i, 1);
    });
    
    // Р§Р°СЃС‚РёС†С‹ РѕС‚ РєСѓСЂСЃРѕСЂР°
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vx *= 0.98;
        p.vy *= 0.98;
        
        ctx.globalAlpha = p.life;
        ctx.fillStyle = `rgba(0, 136, 204, ${p.life * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
        
        if(p.life <= 0) particles.splice(i, 1);
    });
    ctx.globalAlpha = 1;
    
    requestAnimationFrame(draw);
}

function drawLightBackground() {
    // РЇСЂРєРѕРµ РґРЅРµРІРЅРѕРµ РЅРµР±Рѕ СЃ РіСЂР°РґРёРµРЅС‚РѕРј
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#FFE4B5');
    gradient.addColorStop(0.3, '#87CEEB');
    gradient.addColorStop(0.7, '#E0F6FF');
    gradient.addColorStop(1, '#FFFACD');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // РћР±Р»Р°РєР°
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    backgroundParticles.forEach(p => {
        p.x += p.vx * 0.5;
        p.y += p.vy * 0.5;
        if (p.x > canvas.width + 300) p.x = -300;
        if (p.y > canvas.height + 300) p.y = -300;
        
        const cloudGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = cloudGradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // РЎРѕР»РЅС†Рµ
    const sunX = canvas.width * 0.85;
    const sunY = canvas.height * 0.15;
    
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 220);
    sunGradient.addColorStop(0, 'rgba(255, 255, 100, 0.7)');
    sunGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.3)');
    sunGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 220, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 65, 0, Math.PI * 2);
    ctx.fill();
}

function drawDarkBackground() {
    // Р РµР°Р»РёСЃС‚РёС‡РЅС‹Р№ РєРѕСЃРјРѕСЃ - РіР»СѓР±РѕРєРёР№ РєРѕСЃРјРѕСЃ
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000814');
    gradient.addColorStop(0.2, '#001d3d');
    gradient.addColorStop(0.4, '#0a0f3d');
    gradient.addColorStop(0.6, '#1a0f3e');
    gradient.addColorStop(0.8, '#0d0a2e');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // РљСЂР°СЃРёРІС‹Рµ С‚СѓРјР°РЅРЅРѕСЃС‚Рё СЃРёРЅРёРµ
    backgroundParticles.forEach((p, idx) => {
        p.x += p.vx * 0.3;
        p.y += p.vy * 0.3;
        if (p.x > canvas.width + 400) p.x = -400;
        if (p.y > canvas.height + 400) p.y = -400;
        if (p.x < -400) p.x = canvas.width + 400;
        if (p.y < -400) p.y = canvas.height + 400;
        
        // Р§РµСЂРµРґСѓРµРј С†РІРµС‚Р° С‚СѓРјР°РЅРЅРѕСЃС‚РµР№
        const colors = [
            `rgba(100, 150, 255, ${p.opacity * 2})`,
            `rgba(168, 85, 247, ${p.opacity * 2.2})`,
            `rgba(138, 43, 226, ${p.opacity * 1.8})`
        ];
        
        const nebula = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        nebula.addColorStop(0, colors[idx % colors.length]);
        nebula.addColorStop(0.5, colors[idx % colors.length].replace(/[0-9.]+\)/, (m) => (parseFloat(m) * 0.6).toFixed(2) + ')'));
        nebula.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nebula;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // РҐРѕР»РѕРґРЅС‹Р№ РіРѕР»СѓР±РѕР№ С‚СѓРјР°РЅ СЃР»РµРІР°
    const blueGlow = ctx.createRadialGradient(canvas.width * 0.1, canvas.height * 0.3, 50, canvas.width * 0.1, canvas.height * 0.3, 800);
    blueGlow.addColorStop(0, 'rgba(100, 200, 255, 0.2)');
    blueGlow.addColorStop(0.3, 'rgba(100, 150, 255, 0.1)');
    blueGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = blueGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Р¤РёРѕР»РµС‚РѕРІС‹Р№ С‚СѓРјР°РЅ СЃРїСЂР°РІР°
    const purpleGlow = ctx.createRadialGradient(canvas.width * 0.85, canvas.height * 0.6, 50, canvas.width * 0.85, canvas.height * 0.6, 800);
    purpleGlow.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
    purpleGlow.addColorStop(0.3, 'rgba(138, 43, 226, 0.08)');
    purpleGlow.addColorStop(1, 'rgba(138, 43, 226, 0)');
    ctx.fillStyle = purpleGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawNeonBackground() {
    // РљРёР±РµСЂРїР°РЅРє С„РѕРЅ
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0d0221');
    gradient.addColorStop(0.5, '#1a0633');
    gradient.addColorStop(1, '#0d0221');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // РЎРµС‚РєР°
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    const offset = (Date.now() * 0.08) % 100;
    
    for (let i = -offset; i < canvas.height; i += 100) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    for (let i = -offset; i < canvas.width; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 10, canvas.height);
        ctx.stroke();
    }
    
    // РЎС„РµСЂС‹ СЃ СЂР°Р·РЅРѕС†РІРµС‚РЅС‹РјРё РјРµРЅСЏСЋС‰РёРјРёСЃСЏ С€Р°СЂРёРєР°РјРё
    const neonColors = ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0088', '#00D4FF', '#FF3366', '#33FFFF'];
    
    glowOrbs.forEach((orb, index) => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        
        if (orb.x > canvas.width + 150) orb.x = -150;
        if (orb.y > canvas.height + 150) orb.y = -150;
        if (orb.x < -150) orb.x = canvas.width + 150;
        if (orb.y < -150) orb.y = canvas.height + 150;
        
        // Р”РёРЅР°РјРёС‡РµСЃРєРё РјРµРЅСЏСЋС‰РёР№СЃСЏ С†РІРµС‚
        const colorCycle = (Math.floor(Date.now() / 400) + index) % neonColors.length;
        const orbColor = neonColors[colorCycle];
        
        const pulsing = (Math.sin(Date.now() * 0.004 + index * 2) + 1) / 2;
        const glowRadius = orb.radius * (1 + pulsing * 0.5);
        
        // Р‘РѕР»СЊС€РѕР№ СЃРІРµС‚СЏС‰РёР№СЃСЏ РѕСЂРµРѕР»
        const glowGradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, glowRadius * 3);
        glowGradient.addColorStop(0, orbColor + '88');
        glowGradient.addColorStop(0.4, orbColor + '44');
        glowGradient.addColorStop(0.7, orbColor + '22');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, glowRadius * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // РЎСЂРµРґРЅРёР№ РѕСЂРµРѕР»
        const midGlow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, glowRadius * 1.5);
        midGlow.addColorStop(0, orbColor + 'CC');
        midGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = midGlow;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, glowRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // РЇСЂРєРѕРµ СЏРґСЂРѕ С€Р°СЂРёРєР°
        ctx.fillStyle = orbColor;
        ctx.shadowColor = orbColor;
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Р‘РµР»РѕРµ СЃРёСЏРЅРёРµ РІ С†РµРЅС‚СЂРµ
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Р РђРЎРљР Р«РўРР• РЎРџРРЎРљРђ
function toggleSocialList() {
    const dropdown = document.getElementById('social-dropdown');
    const arrow = document.getElementById('folder-arrow');
    const isVisible = dropdown.classList.contains('show');
    
    if (isVisible) {
        dropdown.classList.remove('show');
        setTimeout(() => dropdown.style.display = 'none', 300);
        arrow.innerText = 'в–ј';
    } else {
        dropdown.style.display = 'flex';
        setTimeout(() => dropdown.classList.add('show'), 10);
        arrow.innerText = 'в–І';
    }
}

function setTheme(name) {
    currentTheme = name;
    document.body.className = 'theme-' + name;
    initBackgroundEffects();
    
    const themeElements = document.querySelectorAll('.tg-app, .clock-item, .theme-switcher button');
    themeElements.forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = 'slideUp 0.4s ease-out forwards';
        }, 10);
    });
    
    localStorage.setItem('selectedTheme', name);
}

function updateTime() {
    const opt = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('time-de').innerText = new Intl.DateTimeFormat('ru-RU', {timeZone: 'Europe/Berlin', ...opt}).format(new Date());
    document.getElementById('time-ua').innerText = new Intl.DateTimeFormat('ru-RU', {timeZone: 'Europe/Kyiv', ...opt}).format(new Date());
    document.getElementById('time-ru').innerText = new Intl.DateTimeFormat('ru-RU', {timeZone: 'Europe/Moscow', ...opt}).format(new Date());
}

let gameScore = 0;
let gameActive = false;
let gameTargets = [];

function toggleGame(show) {
    const overlay = document.getElementById('game-overlay');
    overlay.style.display = show ? 'flex' : 'none';
    if (show) {
        startGame();
    } else {
        gameActive = false;
    }
}

function startGame() {
    gameActive = true;
    gameScore = 0;
    gameTargets = [];
    const hint = document.querySelector('.game-hint');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // РЎРѕР·РґР°С‘Рј С†РµР»Рё (РјРёС€РµРЅРё)
    for (let i = 0; i < 5; i++) {
        gameTargets.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: Math.random() * (canvas.height - 60) + 30,
            radius: 25,
            clicked: false,
            pulse: 0
        });
    }
    
    // РћР±СЂР°Р±РѕС‚С‡РёРє РєР»РёРєР°
    canvas.onclick = (e) => {
        if (!gameActive) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        gameTargets.forEach(target => {
            if (!target.clicked) {
                const dx = clickX - target.x;
                const dy = clickY - target.y;
                if (Math.sqrt(dx*dx + dy*dy) < target.radius) {
                    target.clicked = true;
                    gameScore++;
                    hint.textContent = `🎯 Попадания: ${gameScore}`;
                    
                    // РЎРѕР·РґР°С‘Рј РЅРѕРІСѓСЋ РјРёС€РµРЅСЊ
                    if (gameTargets.every(t => t.clicked)) {
                        gameTargets = [];
                        for (let i = 0; i < 5; i++) {
                            gameTargets.push({
                                x: Math.random() * (canvas.width - 60) + 30,
                                y: Math.random() * (canvas.height - 60) + 30,
                                radius: 25,
                                clicked: false,
                                pulse: 0
                            });
                        }
                    }
                }
            }
        });
    };
    
    // РђРЅРёРјР°С†РёСЏ РёРіСЂС‹
    function drawGame() {
        if (!gameActive) return;
        
        // Р¤РѕРЅ
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(30, 60, 100, 0.8)');
        grad.addColorStop(1, 'rgba(50, 40, 100, 0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // РњРёС€РµРЅРё
        gameTargets.forEach(target => {
            target.pulse = (Math.sin(Date.now() * 0.005) + 1) / 2;
            
            // Р’РЅРµС€РЅРёР№ РєСЂСѓРі
            ctx.strokeStyle = target.clicked ? 'rgba(100, 255, 100, 0.5)' : `rgba(0, 200, 255, ${0.5 + target.pulse * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Р¦РµРЅС‚СЂ
            ctx.fillStyle = target.clicked ? 'rgba(100, 255, 100, 0.8)' : `rgba(100, 200, 255, ${0.7 + target.pulse * 0.3})`;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // РўРѕС‡РєР° РІ С†РµРЅС‚СЂРµ
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        requestAnimationFrame(drawGame);
    }
    
    drawGame();
}

// РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј
initStars();
initBackgroundEffects();
draw();
setInterval(updateTime, 1000);

const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
setTheme(savedTheme);
// ===== AUTH SYSTEM (3 TYPES: REGISTER / USER LOGIN / STAFF LOGIN) =====
const USER_ACCOUNTS_KEY = 'siteUserAccounts';
const STAFF_ACCOUNTS_KEY = 'siteStaffAccounts';
const AUTH_SESSION_KEY = 'siteAuthSession';
const LEGACY_USER_ACCOUNTS_KEYS = ['userAccounts', 'users'];
const LEGACY_STAFF_ACCOUNTS_KEYS = ['staffAccounts', 'adminAccounts'];

function getStoredObject(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed;
    } catch (error) {
        return {};
    }
}

function getStoredAccountsLike(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));
        if (!parsed) return {};

        if (Array.isArray(parsed)) {
            const mapped = {};
            parsed.forEach((entry) => {
                if (!entry || typeof entry !== 'object') return;
                const nickname = String(entry.nickname || '').trim();
                if (!nickname) return;
                mapped[normalizeNick(nickname)] = entry;
            });
            return mapped;
        }

        if (typeof parsed !== 'object') return {};
        return parsed;
    } catch (error) {
        return {};
    }
}

function migrateLegacyAccountsStorage() {
    const users = getStoredAccountsLike(USER_ACCOUNTS_KEY);
    const staff = getStoredAccountsLike(STAFF_ACCOUNTS_KEY);
    let usersChanged = false;
    let staffChanged = false;

    LEGACY_USER_ACCOUNTS_KEYS.forEach((legacyKey) => {
        const legacyUsers = getStoredAccountsLike(legacyKey);
        Object.entries(legacyUsers).forEach(([legacyNick, legacyData]) => {
            const nickname = String(legacyData?.nickname || legacyNick || '').trim();
            if (!nickname) return;
            const key = normalizeNick(nickname);
            if (!users[key]) {
                users[key] = {
                    nickname,
                    passwordHash: legacyData?.passwordHash || '',
                    password: legacyData?.password || '',
                    role: 'user',
                    registered: legacyData?.registered || new Date().toISOString()
                };
                usersChanged = true;
            }
        });
    });

    LEGACY_STAFF_ACCOUNTS_KEYS.forEach((legacyKey) => {
        const legacyStaff = getStoredAccountsLike(legacyKey);
        Object.entries(legacyStaff).forEach(([legacyNick, legacyData]) => {
            const nickname = String(legacyData?.nickname || legacyNick || '').trim();
            if (!nickname) return;
            const key = normalizeNick(nickname);
            if (!staff[key]) {
                staff[key] = {
                    nickname,
                    passwordHash: legacyData?.passwordHash || '',
                    password: legacyData?.password || '',
                    role: legacyData?.role || 'moderator',
                    registered: legacyData?.registered || new Date().toISOString()
                };
                staffChanged = true;
            }
        });
    });

    if (usersChanged) setStoredObject(USER_ACCOUNTS_KEY, users);
    if (staffChanged) setStoredObject(STAFF_ACCOUNTS_KEY, staff);
}

let popupState = {
    overlay: null,
    title: null,
    message: null,
    okBtn: null,
    cancelBtn: null,
    resolver: null
};

function initCustomPopup() {
    popupState.overlay = document.getElementById('custom-popup-overlay');
    popupState.title = document.getElementById('custom-popup-title');
    popupState.message = document.getElementById('custom-popup-message');
    popupState.okBtn = document.getElementById('custom-popup-ok');
    popupState.cancelBtn = document.getElementById('custom-popup-cancel');

    if (!popupState.overlay || !popupState.okBtn || !popupState.cancelBtn) return;

    popupState.okBtn.addEventListener('click', () => closeCustomPopup(true));
    popupState.cancelBtn.addEventListener('click', () => closeCustomPopup(false));
    popupState.overlay.addEventListener('click', (event) => {
        if (event.target === popupState.overlay) closeCustomPopup(false);
    });
}

function closeCustomPopup(result) {
    if (!popupState.overlay) return;
    popupState.overlay.classList.remove('show');
    popupState.overlay.setAttribute('aria-hidden', 'true');
    const resolver = popupState.resolver;
    popupState.resolver = null;
    if (resolver) resolver(result);
}

function showCustomPopup(message, options = {}) {
    const {
        title = 'ПРЕДУПРЕЖДЕНИЕ',
        okText = 'ОК',
        cancelText = 'Отмена',
        isConfirm = false
    } = options;

    if (!popupState.overlay || !popupState.okBtn || !popupState.cancelBtn || !popupState.title || !popupState.message) {
        return Promise.resolve(isConfirm ? false : true);
    }

    popupState.title.textContent = title;
    popupState.message.textContent = String(message || '');
    popupState.okBtn.textContent = okText;
    popupState.cancelBtn.textContent = cancelText;
    popupState.cancelBtn.style.display = isConfirm ? 'inline-flex' : 'none';

    popupState.overlay.classList.add('show');
    popupState.overlay.setAttribute('aria-hidden', 'false');

    return new Promise((resolve) => {
        popupState.resolver = resolve;
    });
}

function showAlertPopup(message, title = 'ПРЕДУПРЕЖДЕНИЕ') {
    return showCustomPopup(message, { title, okText: 'ОК', isConfirm: false });
}

function showConfirmPopup(message, title = 'ПОДТВЕРДИТЕ ДЕЙСТВИЕ') {
    return showCustomPopup(message, { title, okText: 'ОК', cancelText: 'Отмена', isConfirm: true });
}

window.alert = (message) => {
    showAlertPopup(message);
};

function setStoredObject(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function normalizeNick(nickname) {
    return nickname.trim().toLowerCase();
}

function isSha256Hash(value) {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

async function hashPassword(password) {
    const data = new TextEncoder().encode(String(password || ''));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

async function checkAccountPasswordAndMigrate(account, password, storageKey, normalizedNick) {
    if (!account) return false;

    if (isSha256Hash(account.passwordHash)) {
        const incomingHash = await hashPassword(password);
        return account.passwordHash === incomingHash;
    }

    if (account.password && account.password === password) {
        account.passwordHash = await hashPassword(password);
        delete account.password;

        const storage = getStoredObject(storageKey);
        storage[normalizedNick] = account;
        setStoredObject(storageKey, storage);
        return true;
    }

    return false;
}

function resolveApiEndpoint(pathname) {
    const configured = String(window.CHAT_SERVER_URL || '').trim();
    if (configured) {
        try {
            const base = new URL(configured);
            if (base.protocol === 'ws:') base.protocol = 'http:';
            if (base.protocol === 'wss:') base.protocol = 'https:';
            return `${base.origin}${pathname}`;
        } catch (error) {
            return pathname;
        }
    }
    return pathname;
}

async function verifyStaffSecret(secretCode) {
    const endpoint = resolveApiEndpoint('/api/verify-staff-secret');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretCode })
        });
        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            return {
                ok: false,
                error: data?.error || (response.status === 429 ? 'rate_limited' : 'server_error')
            };
        }

        return {
            ok: data?.ok === true,
            error: data?.error || (data?.ok ? null : 'invalid_secret')
        };
    } catch (error) {
        return { ok: false, error: 'network_error' };
    }
}

async function issueStaffSessionToken(secretCode, nickname, role) {
    const endpoint = resolveApiEndpoint('/api/staff-session');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretCode, nickname, role })
        });
        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            return {
                ok: false,
                error: data?.error || (response.status === 429 ? 'rate_limited' : 'server_error')
            };
        }

        if (!data?.ok || !data?.token) {
            return { ok: false, error: data?.error || 'server_error' };
        }

        return {
            ok: true,
            token: String(data.token),
            expiresAt: data.expiresAt || null
        };
    } catch (error) {
        return { ok: false, error: 'network_error' };
    }
}

function switchAuthForm(formId) {
    document.querySelectorAll('#auth-container .auth-form').forEach((form) => {
        form.classList.remove('active-form');
    });
    const activeForm = document.getElementById(formId);
    if (activeForm) {
        activeForm.classList.add('active-form');
    }
}

function showUserRegister() {
    switchAuthForm('user-register-form');
}

function showUserLogin() {
    switchAuthForm('user-login-form');
}

function showAdminLogin() {
    switchAuthForm('admin-login-form');
}

function showAdminRegister() {
    switchAuthForm('admin-register-form');
}

function showMainApp() {
    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-content');
    if (authContainer) authContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
}

function showAuthScreen() {
    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-content');
    if (authContainer) authContainer.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
}

function updateHeaderNickname(nickname) {
    const headerNick = document.getElementById('profile-display-nick');
    if (!headerNick) return;
    headerNick.textContent = nickname || 'xss.b1nq';
}

function persistSession(nickname, role, staffToken = null) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        nickname,
        role,
        staffToken: staffToken || null,
        loginAt: new Date().toISOString()
    }));
}

function finalizeAuth(nickname, role, staffToken = null) {
    persistSession(nickname, role, staffToken);
    localStorage.setItem('chatNickname', nickname);
    const isStaffWithToken = (role === 'admin' || role === 'moderator') && Boolean(staffToken);
    localStorage.setItem('isAdmin', String(isStaffWithToken));

    savedSideNickname = nickname;
    currentSideUser = nickname;
    updateHeaderNickname(nickname);
    showMainApp();
    completeRegistration();

    if (!adminUsers[nickname]) {
        adminUsers[nickname] = {
            diamonds: userDiamonds,
            messageCount: 0,
            registered: new Date().toISOString(),
            role
        };
        localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    }

    initAdminPanel();
}

async function registerUser() {
    const nickname = (document.getElementById('user-register-nick')?.value || '').trim();
    const password = document.getElementById('user-register-password')?.value || '';
    const confirmPassword = document.getElementById('user-register-password-confirm')?.value || '';

    if (!nickname || !password || !confirmPassword) {
        alert('Заполни все поля регистрации');
        return;
    }
    if (nickname.length > 20) {
        alert('Ник не должен быть длиннее 20 символов');
        return;
    }
    if (password.length < 4) {
        alert('Пароль должен быть не короче 4 символов');
        return;
    }
    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    const users = getStoredObject(USER_ACCOUNTS_KEY);
    const staff = getStoredObject(STAFF_ACCOUNTS_KEY);
    const key = normalizeNick(nickname);

    if (users[key] || staff[key]) {
        alert('Пользователь с таким ником уже существует');
        return;
    }

    users[key] = {
        nickname,
        passwordHash: await hashPassword(password),
        role: 'user',
        registered: new Date().toISOString()
    };
    setStoredObject(USER_ACCOUNTS_KEY, users);

    alert('Регистрация завершена');
    finalizeAuth(nickname, 'user');
}

async function loginUser() {
    const nickname = (document.getElementById('user-login-nick')?.value || '').trim();
    const password = document.getElementById('user-login-password')?.value || '';

    if (!nickname || !password) {
        alert('Введи ник и пароль');
        return;
    }

    const users = getStoredObject(USER_ACCOUNTS_KEY);
    const account = users[normalizeNick(nickname)];
    if (!account) {
        alert('Аккаунт не найден. Проверь ник или зарегистрируйся заново.');
        return;
    }

    const passwordOk = await checkAccountPasswordAndMigrate(account, password, USER_ACCOUNTS_KEY, normalizeNick(nickname));
    if (!passwordOk) {
        alert('Неверный пароль');
        return;
    }

    finalizeAuth(account.nickname, 'user');
}

async function createStaffAccount() {
    const secretCode = document.getElementById('admin-secret-code')?.value || '';
    const role = document.getElementById('new-staff-role')?.value || 'moderator';
    const nickname = (document.getElementById('new-admin-nick')?.value || '').trim();
    const password = document.getElementById('new-admin-password')?.value || '';
    const confirmPassword = document.getElementById('new-admin-password-confirm')?.value || '';

    if (!secretCode.trim()) {
        alert('Введи секретную фразу');
        return;
    }

    const secretResult = await verifyStaffSecret(secretCode);
    if (!secretResult.ok) {
        if (secretResult.error === 'invalid_secret') {
            alert('Неверная секретная фраза');
        } else if (secretResult.error === 'secret_not_configured') {
            alert('На сервере не настроена секретная фраза STAFF_SECRET_CODE');
        } else if (secretResult.error === 'rate_limited') {
            alert('Слишком много попыток. Подожди 1 минуту и попробуй снова.');
        } else if (secretResult.error === 'network_error') {
            alert('Не удалось проверить секретную фразу: нет связи с сервером');
        } else {
            alert('Ошибка проверки секретной фразы на сервере');
        }
        return;
    }
    if (!nickname || !password || !confirmPassword) {
        alert('Заполни все поля');
        return;
    }
    if (nickname.length > 20) {
        alert('Ник не должен быть длиннее 20 символов');
        return;
    }
    if (password.length < 4) {
        alert('Пароль должен быть не короче 4 символов');
        return;
    }
    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    const users = getStoredObject(USER_ACCOUNTS_KEY);
    const staff = getStoredObject(STAFF_ACCOUNTS_KEY);
    const key = normalizeNick(nickname);

    if (users[key] || staff[key]) {
        alert('Пользователь с таким ником уже существует');
        return;
    }

    staff[key] = {
        nickname,
        passwordHash: await hashPassword(password),
        role,
        registered: new Date().toISOString()
    };
    setStoredObject(STAFF_ACCOUNTS_KEY, staff);

    alert('Аккаунт состава создан. Выполни вход.');
    showAdminLogin();
}

async function loginStaff() {
    const role = document.getElementById('staff-login-role')?.value || 'admin';
    const nickname = (document.getElementById('staff-login-nick')?.value || '').trim();
    const password = document.getElementById('staff-login-password')?.value || '';
    const secretCode = document.getElementById('staff-login-secret-code')?.value || '';

    if (!nickname || !password || !secretCode.trim()) {
        alert('Введи ник, пароль и секретную фразу');
        return;
    }

    const staff = getStoredObject(STAFF_ACCOUNTS_KEY);
    const account = staff[normalizeNick(nickname)];
    if (!account) {
        alert('Аккаунт состава не найден');
        return;
    }

    const passwordOk = await checkAccountPasswordAndMigrate(account, password, STAFF_ACCOUNTS_KEY, normalizeNick(nickname));
    if (!passwordOk) {
        alert('Неверный пароль аккаунта состава');
        return;
    }
    if (account.role !== role) {
        alert('Выбрана неверная роль для этого аккаунта');
        return;
    }

    const tokenResult = await issueStaffSessionToken(secretCode, account.nickname, account.role);
    if (!tokenResult.ok) {
        if (tokenResult.error === 'invalid_secret') {
            alert('Неверная секретная фраза');
        } else if (tokenResult.error === 'secret_not_configured') {
            alert('На сервере не настроена секретная фраза STAFF_SECRET_CODE');
        } else if (tokenResult.error === 'rate_limited') {
            alert('Слишком много попыток. Подожди 1 минуту и попробуй снова.');
        } else if (tokenResult.error === 'network_error') {
            alert('Не удалось связаться с сервером для подтверждения роли');
        } else {
            alert('Ошибка проверки роли состава на сервере');
        }
        return;
    }

    finalizeAuth(account.nickname, account.role, tokenResult.token);
}

// Backward compatibility for existing onclick names
function loginAdmin() {
    loginStaff();
}

function createAdmin() {
    createStaffAccount();
}

function restoreAuthSession() {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
        showAuthScreen();
        showUserRegister();
        return;
    }

    try {
        const session = JSON.parse(raw);
        if (!session?.nickname) {
            showAuthScreen();
            showUserRegister();
            return;
        }

        const normalized = normalizeNick(session.nickname);
        const users = getStoredObject(USER_ACCOUNTS_KEY);
        const staff = getStoredObject(STAFF_ACCOUNTS_KEY);
        const isStaffRole = session.role === 'admin' || session.role === 'moderator';
        const hasAccount = isStaffRole
            ? Boolean(staff[normalized]) && staff[normalized].role === session.role
            : Boolean(users[normalized]);
        const hasValidStaffToken = !isStaffRole || Boolean(session?.staffToken);
        if (!hasAccount) {
            localStorage.removeItem(AUTH_SESSION_KEY);
            localStorage.removeItem('chatNickname');
            localStorage.setItem('isAdmin', 'false');
            showAuthScreen();
            showUserLogin();
            alert('Сессия устарела: аккаунт не найден. Войди заново.');
            return;
        }
        if (!hasValidStaffToken) {
            localStorage.removeItem(AUTH_SESSION_KEY);
            localStorage.removeItem('chatNickname');
            localStorage.setItem('isAdmin', 'false');
            showAuthScreen();
            showAdminLogin();
            alert('Сессия состава устарела. Войди заново с секретной фразой.');
            return;
        }

        savedSideNickname = session.nickname;
        currentSideUser = session.nickname;
        updateHeaderNickname(session.nickname);
        localStorage.setItem('chatNickname', session.nickname);
        localStorage.setItem('isAdmin', String(isStaffRole && hasValidStaffToken));
        showMainApp();
        completeRegistration();
        initAdminPanel();
    } catch (error) {
        showAuthScreen();
        showUserRegister();
    }
}

async function logoutAccount() {
    const approved = await showConfirmPopup('Выйти из аккаунта?');
    if (!approved) return;

    disconnectOnlineChat(true);

    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem('chatNickname');
    localStorage.setItem('isAdmin', 'false');

    savedSideNickname = null;
    currentSideUser = null;
    updateHeaderNickname('xss.b1nq');
    isInSideChat = false;

    const messagesContainer = document.getElementById('side-messages-container');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        messagesContainer.style.display = 'none';
    }
    const sideAuthForm = document.getElementById('side-auth-form');
    if (sideAuthForm) sideAuthForm.style.display = 'flex';
    const sideUserPanel = document.getElementById('side-user-panel');
    if (sideUserPanel) sideUserPanel.style.display = 'none';
    const sideInput = document.getElementById('side-chat-input-area');
    if (sideInput) sideInput.style.display = 'none';
    const sideNickInput = document.getElementById('side-nickname-input');
    if (sideNickInput) sideNickInput.value = '';

    const adminBtn = document.getElementById('admin-toggle-btn');
    if (adminBtn) adminBtn.style.display = 'none';
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.classList.add('closed');

    showAuthScreen();
    const users = getStoredObject(USER_ACCOUNTS_KEY);
    if (Object.keys(users).length > 0) {
        showUserLogin();
    } else {
        showUserRegister();
    }
}

async function clearAllLocalAccounts() {
    if (!syncAdminPrivilegeFlag()) {
        alert('Только админ может выполнять полный сброс аккаунтов');
        return;
    }

    const approved = await showConfirmPopup('Удалить ВСЕ локальные аккаунты, сессии и статистику на этом устройстве?');
    if (!approved) return;

    const keysToRemove = [
        USER_ACCOUNTS_KEY,
        STAFF_ACCOUNTS_KEY,
        AUTH_SESSION_KEY,
        'adminUsers',
        'userDiamonds',
        'chatNickname',
        'savedSideNickname',
        'isAdmin',
        'userInventory',
        'lastNicknameChangeDate',
        CHAT_COOLDOWN_ENABLED_KEY
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('lastUse_')) {
            localStorage.removeItem(key);
        }
    });

    disconnectOnlineChat(true);

    if (typeof adminUsers !== 'undefined') {
        adminUsers = {};
    }

    savedSideNickname = null;
    currentSideUser = null;
    userDiamonds = 0;
    isInSideChat = false;
    updateHeaderNickname('xss.b1nq');
    showAuthScreen();
    showUserRegister();
    updatePointsDisplay();

    alert('Все локальные аккаунты удалены');
}

function localizeUI() {
    const setText = (selector, text) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
    };
    const setAttr = (selector, attr, value) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, value);
    };

    const themeBtns = document.querySelectorAll('.theme-switcher button');
    if (themeBtns[0]) {
        themeBtns[0].setAttribute('title', 'Светлая');
        themeBtns[0].textContent = '☀️';
    }
    if (themeBtns[1]) {
        themeBtns[1].setAttribute('title', 'Темная');
        themeBtns[1].textContent = '🌙';
    }
    if (themeBtns[2]) {
        themeBtns[2].setAttribute('title', 'Неон');
        themeBtns[2].textContent = '🔮';
    }
    const logoutBtn = document.getElementById('logout-account-btn');
    if (logoutBtn) {
        logoutBtn.setAttribute('title', 'Выйти из аккаунта');
        logoutBtn.textContent = '🚪';
    }

    const clockLabels = document.querySelectorAll('.clocks-wrapper .label');
    if (clockLabels[0]) clockLabels[0].textContent = 'Германия';
    if (clockLabels[1]) clockLabels[1].textContent = 'Украина';
    if (clockLabels[2]) clockLabels[2].textContent = 'Россия';

    setText('.status-online', 'в сети');
    setText('.chat-row .chat-avatar.folder', '📁');
    setText('.chat-row .chat-name', 'Мои соцсети');
    setText('#folder-arrow', '▾');
    setText('.chat-row .chat-msg', 'Нажми, чтобы увидеть список');

    const quickRow = document.querySelectorAll('.chat-row')[1];
    if (quickRow) {
        const quickName = quickRow.querySelector('.chat-name');
        const quickTime = quickRow.querySelector('.chat-time');
        const quickMsg = quickRow.querySelector('.chat-msg');
        const quickAvatar = quickRow.querySelector('.chat-avatar');
        if (quickAvatar) quickAvatar.textContent = '🎮';
        if (quickName) quickName.textContent = 'Мини-игра';
        if (quickTime) quickTime.textContent = 'Сейчас';
        if (quickMsg) quickMsg.textContent = 'Избегай препятствия и набирай очки';
    }

    const gameHeader = document.querySelector('.game-header');
    const gameHeaderBtn = document.querySelector('.game-header button');
    if (gameHeader && gameHeader.firstChild && gameHeader.firstChild.nodeType === Node.TEXT_NODE) {
        gameHeader.firstChild.nodeValue = '🎮 Мини-игра ';
    }
    if (gameHeaderBtn) gameHeaderBtn.textContent = '✕';
    setText('.game-hint', 'Нажмите, чтобы начать');

    setAttr('.side-chat-header', 'title', 'Нажми для закрытия');
    setText('.side-chat-header h3', '💬 Чат');
    setText('#toggle-chat-btn', '✕');
    setAttr('#side-nickname-input', 'placeholder', 'Введи ник...');
    setText('#side-auth-form button', 'Войти');
    setText('#side-auth-form div', '⚠️ Ник нельзя менять');
    setText('.side-change-nick', 'Сменить ник');
    setText('.side-exit-btn', 'Выход');
    setAttr('#side-message-input', 'placeholder', 'Сообщение...');
    setText('#side-chat-input-area button', '➤');
    setText('#cooldown-timer', '⏱s');
    setAttr('#open-chat-btn', 'title', 'Открыть чат (Escape)');
    setText('#open-chat-btn', '💬');

    setText('.shop-header h3', '🛍️ Магазин');
    setText('.shop-close', '✕');
    const statLabels = document.querySelectorAll('.shop-stats .stat-label');
    if (statLabels[0]) statLabels[0].textContent = '💎 Алмазы:';
    if (statLabels[1]) statLabels[1].textContent = '👤 Ник:';
    setAttr('#open-shop-btn', 'title', 'Открыть магазин');
    setText('#open-shop-btn', '🛍️');

    setText('.admin-header h3', '⚙️ Админ панель');
    setText('.admin-close', '✕');
    const adminTabs = document.querySelectorAll('.admin-tab-btn');
    if (adminTabs[0]) adminTabs[0].textContent = '👥 Участники';
    if (adminTabs[1]) adminTabs[1].textContent = '📊 Статистика';
    if (adminTabs[2]) adminTabs[2].textContent = '⚙️ Настройки';
    setAttr('#admin-search-input', 'placeholder', 'Поиск участника...');
    setAttr('#admin-toggle-btn', 'title', 'Админ панель');
    setText('#admin-toggle-btn', '⚙️');

    const statTitles = document.querySelectorAll('#admin-stats-tab .stat-title');
    if (statTitles[0]) statTitles[0].textContent = 'Всего участников:';
    if (statTitles[1]) statTitles[1].textContent = 'Всего сообщений:';
    if (statTitles[2]) statTitles[2].textContent = 'Всего алмазов:';
    if (statTitles[3]) statTitles[3].textContent = 'Среднее алмазов на участника:';

    const settingLabels = document.querySelectorAll('#admin-settings-tab .setting-item label');
    if (settingLabels[0]) settingLabels[0].textContent = 'Награда за сообщение (алмазов):';
    if (settingLabels[1]) settingLabels[1].textContent = 'Пассивный доход (алмазов каждые 7м):';
    if (settingLabels[2]) settingLabels[2].textContent = 'Цена смены ника:';
    const settingButtons = document.querySelectorAll('#admin-settings-tab .setting-item button');
    if (settingButtons[0]) settingButtons[0].textContent = 'Сохранить';
    if (settingButtons[1]) settingButtons[1].textContent = 'Сохранить';
    if (settingButtons[2]) settingButtons[2].textContent = 'Сохранить';

    setText('.admin-edit-header h4', 'Редактирование профиля');
    setText('.admin-modal-close', '✕');
    const adminEditLabels = document.querySelectorAll('#admin-edit-form .form-group label');
    if (adminEditLabels[0]) adminEditLabels[0].textContent = 'Ник:';
    if (adminEditLabels[1]) adminEditLabels[1].textContent = 'Алмазы:';
    if (adminEditLabels[2]) adminEditLabels[2].textContent = 'Добавить/вычесть алмазы:';
    setAttr('#admin-edit-nick', 'placeholder', 'Введи новый ник');
    setAttr('#admin-edit-diamonds', 'placeholder', 'Количество алмазов');
    setAttr('#admin-custom-diamonds', 'placeholder', 'Сумма');
    const formActions = document.querySelectorAll('.form-actions button');
    if (formActions[0]) formActions[0].textContent = '💾 Сохранить';
    if (formActions[1]) formActions[1].textContent = '🗑️ Удалить';
    if (formActions[2]) formActions[2].textContent = '❌ Отмена';

    const applyBtn = document.querySelector('.diamond-adjust button:last-child');
    if (applyBtn) applyBtn.textContent = 'Применить';
    const resetAccountsLabel = document.getElementById('admin-reset-accounts-label');
    if (resetAccountsLabel) resetAccountsLabel.textContent = 'Сброс локальных аккаунтов на этом устройстве';
    const resetAllBtn = document.getElementById('admin-reset-accounts-btn');
    if (resetAllBtn) resetAllBtn.textContent = 'Сбросить все аккаунты';
}

// Р­С„С„РµРєС‚ РІРѕР»РЅС‹ РїСЂРё РєР»РёРєРµ РЅР° Р°РІР°С‚Р°СЂ
document.addEventListener('DOMContentLoaded', () => {
    initCustomPopup();
    migrateLegacyAccountsStorage();
    const avatarMain = document.querySelector('.avatar-main');
    if (avatarMain) {
        avatarMain.addEventListener('click', (e) => {
            const rect = avatarMain.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.8)';
            ripple.style.pointerEvents = 'none';
            ripple.style.animation = 'wave 0.8s ease-out forwards';
            ripple.style.inset = '0';
            avatarMain.appendChild(ripple);
            setTimeout(() => ripple.remove(), 800);
            
            createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
    }
    
    const chatRows = document.querySelectorAll('.chat-row');
    chatRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });
    
    try {
        localizeUI();
    } catch (error) {
        console.warn('Localization skipped:', error);
    }
    restoreAuthSession();
});

function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.pointerEvents = 'none';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.background = 'radial-gradient(circle, #0088cc, #005c99)';
        particle.style.borderRadius = '50%';
        particle.style.zIndex = '999';
        document.body.appendChild(particle);
        
        const angle = (i / 8) * Math.PI * 2;
        const velocity = {
            x: Math.cos(angle) * 6,
            y: Math.sin(angle) * 6
        };
        
        let life = 1;
        const animate = () => {
            life -= 0.02;
            particle.style.opacity = life;
            particle.style.transform = `translate(${velocity.x * 30}px, ${velocity.y * 30}px)`;
            
            if (life > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        animate();
    }
}

// ===== РЎРРЎРўР•РњРђ Р§РђРўРђ (Р‘РћРљРћР’РђРЇ РџРђРќР•Р›Р¬) =====
let currentSideUser = null;
let sideChatMessages = [];
let isInSideChat = false;
let savedSideNickname = localStorage.getItem('chatNickname');
let userDiamonds = parseInt(localStorage.getItem('userDiamonds')) || 0;
let lastMessageTime = 0;
const MESSAGE_COOLDOWN = 3000; // 3 СЃРµРєСѓРЅРґС‹
const CHAT_COOLDOWN_ENABLED_KEY = 'chatCooldownEnabled';
let isMessageCooldownEnabled = localStorage.getItem(CHAT_COOLDOWN_ENABLED_KEY) !== 'false';
let lastNicknameChangeDate = localStorage.getItem('lastNicknameChangeDate') || null;
let passiveIncomeInterval = null;
let chatSocket = null;
let chatConnected = false;
let chatReconnectTimer = null;
let chatShouldReconnect = false;
let cooldownIntervalId = null;

function clearCooldownState() {
    if (cooldownIntervalId) {
        clearInterval(cooldownIntervalId);
        cooldownIntervalId = null;
    }

    const messageInput = document.getElementById('side-message-input');
    const button = document.querySelector('.side-chat-input-area button');
    const timerDisplay = document.getElementById('cooldown-timer');

    if (messageInput) messageInput.disabled = false;
    if (button) button.disabled = false;
    if (timerDisplay) timerDisplay.style.display = 'none';
}

function refreshCooldownSettingUI() {
    const label = document.getElementById('admin-cooldown-label');
    const button = document.getElementById('admin-cooldown-toggle-btn');

    if (label) {
        label.textContent = `Ограничение сообщений (cooldown): ${isMessageCooldownEnabled ? 'включено' : 'выключено'}`;
    }
    if (button) {
        button.textContent = isMessageCooldownEnabled ? 'Выключить' : 'Включить';
    }
}

function getRoleMeta(role) {
    const roleMap = {
        admin: { label: 'Админ', badgeClass: 'role-admin' },
        moderator: { label: 'Модератор', badgeClass: 'role-moderator' },
        user: { label: 'Участник', badgeClass: 'role-user' }
    };
    return roleMap[role] || roleMap.user;
}

function resolveUserRole(nickname) {
    if (!nickname) return 'user';

    const sessionRaw = localStorage.getItem(AUTH_SESSION_KEY);
    if (sessionRaw) {
        try {
            const session = JSON.parse(sessionRaw);
            if (session?.nickname === nickname && session?.role) {
                if ((session.role === 'admin' || session.role === 'moderator') && session?.staffToken) {
                    return session.role;
                }
                if (session.role === 'user') {
                    return 'user';
                }
            }
        } catch (error) {
            // ignore broken session data
        }
    }

    return 'user';
}

function getCurrentSessionStaffToken() {
    const sessionRaw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionRaw) return '';
    try {
        const session = JSON.parse(sessionRaw);
        return String(session?.staffToken || '');
    } catch (error) {
        return '';
    }
}

function updateSideUserInfo() {
    const userInfo = document.getElementById('side-user-info');
    if (!userInfo || !currentSideUser) return;

    const roleMeta = getRoleMeta(resolveUserRole(currentSideUser));
    userInfo.innerHTML = '';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'side-user-name';
    nameSpan.textContent = `👤 ${currentSideUser}`;

    const badgeSpan = document.createElement('span');
    badgeSpan.className = `role-badge ${roleMeta.badgeClass}`;
    badgeSpan.textContent = roleMeta.label;

    userInfo.appendChild(nameSpan);
    userInfo.appendChild(badgeSpan);
}

function getChatWsUrl() {
    const configured = window.CHAT_SERVER_URL || '';
    const configuredPath = window.CHAT_WS_PATH || '/ws';

    if (configured) {
        try {
            const normalized = configured.startsWith('ws://') || configured.startsWith('wss://')
                ? configured
                : configured.startsWith('http://')
                    ? `ws://${configured.slice('http://'.length)}`
                    : configured.startsWith('https://')
                        ? `wss://${configured.slice('https://'.length)}`
                        : configured;
            const url = new URL(normalized);
            if (!url.pathname || url.pathname === '/') {
                url.pathname = configuredPath;
            }
            return url.toString();
        } catch (error) {
            addSystemMessageSideChat('⚠️ Неверный CHAT_SERVER_URL в config.js');
            return '';
        }
    }

    if (!window.location.host) return '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}${configuredPath}`;
}

function connectOnlineChat() {
    if (!isInSideChat || !currentSideUser) return;
    if (chatSocket && (chatSocket.readyState === WebSocket.OPEN || chatSocket.readyState === WebSocket.CONNECTING)) return;

    const wsUrl = getChatWsUrl();
    if (!wsUrl) {
        addSystemMessageSideChat('⚠️ Онлайн-чат недоступен: запусти сайт через сервер.');
        return;
    }

    chatSocket = new WebSocket(wsUrl);

    chatSocket.onopen = () => {
        chatConnected = true;
        if (chatReconnectTimer) {
            clearTimeout(chatReconnectTimer);
            chatReconnectTimer = null;
        }
        chatSocket.send(JSON.stringify({
            type: 'join',
            user: currentSideUser,
            role: resolveUserRole(currentSideUser),
            staffToken: getCurrentSessionStaffToken()
        }));
    };

    chatSocket.onmessage = (event) => {
        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch (error) {
            return;
        }

        if (payload.type === 'history' && Array.isArray(payload.messages)) {
            const messagesContainer = document.getElementById('side-messages-container');
            if (messagesContainer) messagesContainer.innerHTML = '';
            payload.messages.forEach((message) => {
                const isOwn = message.user === currentSideUser;
                displayMessageSideChat(isOwn, message.text, message.time, message.user, message.role);
            });
            return;
        }

        if (payload.type === 'chat_message' && payload.message) {
            const message = payload.message;
            const isOwn = message.user === currentSideUser;
            displayMessageSideChat(isOwn, message.text, message.time, message.user, message.role);
            return;
        }

        if (payload.type === 'system' && payload.text) {
            addSystemMessageSideChat(payload.text);
        }
    };

    chatSocket.onclose = () => {
        chatConnected = false;
        chatSocket = null;

        if (chatShouldReconnect && isInSideChat) {
            addSystemMessageSideChat('🔄 Переподключение к чату...');
            chatReconnectTimer = setTimeout(() => {
                connectOnlineChat();
            }, 1800);
        }
    };

    chatSocket.onerror = () => {
        addSystemMessageSideChat('⚠️ Ошибка подключения к онлайн-чату');
    };
}

function disconnectOnlineChat(sendLeave = true) {
    chatShouldReconnect = false;
    if (chatReconnectTimer) {
        clearTimeout(chatReconnectTimer);
        chatReconnectTimer = null;
    }

    if (!chatSocket) return;

    if (sendLeave && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({ type: 'leave' }));
    }

    chatSocket.close();
    chatSocket = null;
    chatConnected = false;
}

function minimizeChat() {
    const panel = document.getElementById('side-chat-panel');
    const btn = document.getElementById('open-chat-btn');
    
    panel.classList.add('closed');
    if (btn) btn.classList.add('visible');
}

function openChat() {
    const panel = document.getElementById('side-chat-panel');
    const btn = document.getElementById('open-chat-btn');
    
    panel.classList.remove('closed');
    if (btn) btn.classList.remove('visible');
}

function toggleChatWithKey(e) {
    // Р“РѕСЂСЏС‡Р°СЏ РєР»Р°РІРёС€Р° Escape РґР»СЏ РѕС‚РєСЂС‹С‚РёСЏ/Р·Р°РєСЂС‹С‚РёСЏ С‡Р°С‚Р°
    if (e.key === 'Escape') {
        const panel = document.getElementById('side-chat-panel');
        panel.classList.toggle('closed');
        
        const btn = document.getElementById('open-chat-btn');
        if (btn) {
            if (panel.classList.contains('closed')) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }
    }
}

function autoJoinSideChat() {
    if (savedSideNickname) {
        currentSideUser = savedSideNickname;
        completeRegistration();
    }
}

function joinSideChat() {
    const nicknameInput = document.getElementById('side-nickname-input');
    const nickname = nicknameInput.value.trim();
    
    if (!nickname) {
        alert('Пожалуйста, введи ник');
        return;
    }
    
    if (nickname.length > 20) {
        alert('Ник не должен быть длиннее 20 символов');
        return;
    }
    
    // Р•СЃР»Рё РЅРёРє СѓР¶Рµ СЃРѕС…СЂР°РЅРµРЅ, РёСЃРїРѕР»СЊР·СѓРµРј РµРіРѕ Рё РЅРµ РїРѕР·РІРѕР»СЏРµРј РјРµРЅСЏС‚СЊ
    if (savedSideNickname && savedSideNickname !== nickname) {
        alert('Ты уже зарегистрирован как ' + savedSideNickname + '!\nНик нельзя менять.');
        nicknameInput.value = savedSideNickname;
        currentSideUser = savedSideNickname;
        completeRegistration();
        return;
    }
    
    // РЎРѕС…СЂР°РЅСЏРµРј РЅРёРє РІ localStorage (РїРµСЂРІС‹Р№ СЂР°Р·)
    if (!savedSideNickname) {
        savedSideNickname = nickname;
        localStorage.setItem('chatNickname', nickname);
    }
    
    currentSideUser = savedSideNickname;
    completeRegistration();
}

function completeRegistration() {
    if (currentSideUser) {
        isInSideChat = true;
        updateHeaderNickname(currentSideUser);
        
        document.getElementById('side-auth-form').style.display = 'none';
        document.getElementById('side-messages-container').style.display = 'flex';
        document.getElementById('side-user-panel').style.display = 'flex';
        document.getElementById('side-chat-input-area').style.display = 'flex';
        
        updateSideUserInfo();
        
        const messagesContainer = document.getElementById('side-messages-container');
        messagesContainer.innerHTML = '';
        chatShouldReconnect = true;
        connectOnlineChat();
        
        document.getElementById('side-nickname-input').value = '';
        document.getElementById('side-message-input').focus();
        
        // РћР±РЅРѕРІР»СЏРµРј РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ РЅРёРєР° РІ РјР°РіР°Р·РёРЅРµ
        document.getElementById('nickname-display').textContent = currentSideUser;
    }
}

function exitSideChat() {
    if (!isInSideChat) return;
    disconnectOnlineChat(true);
    
    isInSideChat = false;
    currentSideUser = null;
    updateHeaderNickname(savedSideNickname || localStorage.getItem('chatNickname') || 'xss.b1nq');
    
    document.getElementById('side-auth-form').style.display = 'flex';
    document.getElementById('side-messages-container').style.display = 'none';
    document.getElementById('side-user-panel').style.display = 'none';
    document.getElementById('side-chat-input-area').style.display = 'none';
    
    document.getElementById('side-nickname-input').value = '';
}

function changeNickname() {
    alert('Ник нельзя менять.\nВ магазине доступна услуга "Смена ника" за 1000 алмазов (раз в день).');
}

function sendMessageSideChat() {
    if (!isInSideChat) return;
    
    const messageInput = document.getElementById('side-message-input');
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    // РџСЂРѕРІРµСЂСЏРµРј cooldown РјРµР¶РґСѓ СЃРѕРѕР±С‰РµРЅРёСЏРјРё
    const now = Date.now();
    if (isMessageCooldownEnabled && now - lastMessageTime < MESSAGE_COOLDOWN) {
        const remainingTime = MESSAGE_COOLDOWN - (now - lastMessageTime);
        startCooldownTimer(remainingTime);
        return;
    }
    
    lastMessageTime = now;
    
    if (!chatConnected || !chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        alert('Нет подключения к онлайн-чату. Проверь сервер и интернет.');
        return;
    }

    const message = {
        type: 'chat_message',
        text: text
    };

    chatSocket.send(JSON.stringify(message));
    
    // Р”РѕР±Р°РІР»СЏРµРј Р°Р»РјР°Р·С‹ Р·Р° СЃРѕРѕР±С‰РµРЅРёРµ (3 Р°Р»РјР°Р·Р°)
    addDiamonds(3);
    
    // РЎРѕС…СЂР°РЅСЏРµРј РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РґР»СЏ Р°РґРјРёРЅ РїР°РЅРµР»Рё
    if (!adminUsers[currentSideUser]) {
        adminUsers[currentSideUser] = {
            diamonds: userDiamonds,
            messageCount: 1,
            registered: new Date().toISOString(),
            role: resolveUserRole(currentSideUser)
        };
    } else {
        adminUsers[currentSideUser].diamonds = userDiamonds;
        adminUsers[currentSideUser].messageCount = (adminUsers[currentSideUser].messageCount || 0) + 1;
        if (!adminUsers[currentSideUser].role) {
            adminUsers[currentSideUser].role = resolveUserRole(currentSideUser);
        }
    }
    localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    
    messageInput.value = '';
    messageInput.focus();
    
    // РќР°С‡РёРЅР°РµРј cooldown С‚Р°Р№РјРµСЂ
    if (isMessageCooldownEnabled) {
        startCooldownTimer(MESSAGE_COOLDOWN);
    } else {
        clearCooldownState();
    }
}

function startCooldownTimer(duration) {
    if (!isMessageCooldownEnabled) return;

    clearCooldownState();

    const messageInput = document.getElementById('side-message-input');
    const button = document.querySelector('.side-chat-input-area button');
    const timerDisplay = document.getElementById('cooldown-timer');
    
    if (!timerDisplay) return;
    
    messageInput.disabled = true;
    if (button) button.disabled = true;
    
    let remainingTime = Math.ceil(duration / 1000);
    
    timerDisplay.style.display = 'flex';
    timerDisplay.textContent = `⏱ ${remainingTime}s`;
    
    cooldownIntervalId = setInterval(() => {
        remainingTime--;
        timerDisplay.textContent = `⏱ ${remainingTime}s`;
        
        if (remainingTime <= 0) {
            clearCooldownState();
            messageInput.disabled = false;
            if (button) button.disabled = false;
            timerDisplay.style.display = 'none';
            messageInput.focus();
        }
    }, 1000);
}

function displayMessageSideChat(isOwn, text, time, username = currentSideUser, role = null) {
    const messagesContainer = document.getElementById('side-messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const userDiv = document.createElement('div');
    userDiv.className = 'message-user';
    const roleMeta = getRoleMeta(role || resolveUserRole(username));

    const nameSpan = document.createElement('span');
    nameSpan.className = 'message-user-name';
    nameSpan.textContent = username || (isOwn ? 'Ты' : 'Участник');

    const badgeSpan = document.createElement('span');
    badgeSpan.className = `role-badge ${roleMeta.badgeClass}`;
    badgeSpan.textContent = roleMeta.label;

    userDiv.appendChild(nameSpan);
    userDiv.appendChild(badgeSpan);
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = time;
    
    messageDiv.appendChild(userDiv);
    messageDiv.appendChild(textDiv);
    messageDiv.appendChild(timeDiv);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessageSideChat(text) {
    const messagesContainer = document.getElementById('side-messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message other';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.opacity = '0.6';
    messageDiv.style.fontSize = '0.8rem';
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// РћР±РЅРѕРІР»СЏРµРј handleMessageKeyPress РґР»СЏ СЂР°Р±РѕС‚С‹ СЃ Р±РѕРєРѕРІС‹Рј С‡Р°С‚РѕРј
function handleMessageKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (event.target.id === 'side-message-input') {
            sendMessageSideChat();
        }
    }
}

// Р“РѕСЂСЏС‡Р°СЏ РєР»Р°РІРёС€Р° РґР»СЏ Р·Р°РєСЂС‹С‚РёСЏ/РѕС‚РєСЂС‹С‚РёСЏ С‡Р°С‚Р°
document.addEventListener('keydown', toggleChatWithKey);

// ===== РЎРРЎРўР•РњРђ РњРђР“РђР—РРќРђ =====
const shopItems = [
    { id: 'nickname-change', name: 'Смена ника', icon: '🔤', price: 1000, type: 'service', dailyLimit: true }
];

let userInventory = JSON.parse(localStorage.getItem('userInventory')) || [];

function initShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    
    container.innerHTML = '';
    shopItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        itemEl.innerHTML = `
            <span class="shop-item-icon">${item.icon}</span>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${item.price} 💎</div>
        `;
        itemEl.addEventListener('click', () => buyShopItem(item));
        container.appendChild(itemEl);
    });
    
    updatePointsDisplay();
}

function buyShopItem(item) {
    if (item.type === 'service') {
        if (item.id === 'nickname-change') {
            buySingleUseItem('nickname-change', item.price);
        }
    }
}

function buySingleUseItem(itemId, price) {
    const today = new Date().toDateString();
    const lastUseDate = localStorage.getItem(`lastUse_${itemId}`);
    
    if (lastUseDate === today) {
        alert('⏰ Эту услугу можно купить только один раз в день');
        return;
    }
    
    if (spendDiamonds(price)) {
        if (itemId === 'nickname-change') {
            allowNicknameChange();
            localStorage.setItem(`lastUse_${itemId}`, today);
        }
    } else {
        alert('Недостаточно алмазов');
    }
}

function allowNicknameChange() {
    const currentNick = localStorage.getItem('savedSideNickname');
    const newNick = prompt('Введи новый ник:', currentNick);
    
    if (newNick && newNick.trim()) {
        localStorage.setItem('savedSideNickname', newNick.trim());
        currentSideUser = newNick.trim();
        updateHeaderNickname(currentSideUser);
        updateSideUserInfo();
        alert('Ник успешно изменен');
    }
}

function updateShopUI() {
    // РћР±РЅРѕРІРёС‚СЊ UI РјР°РіР°Р·РёРЅР° РїРѕСЃР»Рµ РїРѕРєСѓРїРєРё
    initShop();
}

// ===== РџРђРЎРЎРР’РќР«Р™ Р”РћРҐРћР” =====
function startPassiveIncome() {
    // 7 РјРёРЅСѓС‚ = 420000 РјРёР»Р»РёСЃРµРєСѓРЅРґ
    const PASSIVE_INCOME_INTERVAL = 7 * 60 * 1000; // 7 РјРёРЅСѓС‚
    const PASSIVE_INCOME_AMOUNT = 1; // 1 Р°Р»РјР°Р·
    
    passiveIncomeInterval = setInterval(() => {
        addDiamonds(PASSIVE_INCOME_AMOUNT);
        console.log('рџ’Ћ +1 Р°Р»РјР°Р· РїР°СЃСЃРёРІРЅРѕРіРѕ РґРѕС…РѕРґР°');
    }, PASSIVE_INCOME_INTERVAL);
}

function openShop() {
    const shopPanel = document.getElementById('shop-panel');
    const shopBtn = document.getElementById('open-shop-btn');
    
    if (shopPanel) {
        shopPanel.classList.remove('closed');
        initShop();
    }
    if (shopBtn) shopBtn.classList.remove('visible');
}

function closeShop() {
    const shopPanel = document.getElementById('shop-panel');
    const shopBtn = document.getElementById('open-shop-btn');
    
    if (shopPanel) shopPanel.classList.add('closed');
    if (shopBtn) shopBtn.classList.add('visible');
}

function updatePointsDisplay() {
    const pointsDisplay = document.getElementById('points-display');
    if (pointsDisplay) {
        pointsDisplay.textContent = userDiamonds;
    }
}

// Р”РѕР±Р°РІРёС‚СЊ Р°Р»РјР°Р·С‹
function addDiamonds(amount) {
    userDiamonds += amount;
    localStorage.setItem('userDiamonds', userDiamonds);
    updatePointsDisplay();
    updateShopUI();
}

// РџРѕС‚СЂР°С‚РёС‚СЊ Р°Р»РјР°Р·С‹ (РґР»СЏ РїРѕРєСѓРїРѕРє)
function spendDiamonds(amount) {
    if (userDiamonds >= amount) {
        userDiamonds -= amount;
        localStorage.setItem('userDiamonds', userDiamonds);
        updatePointsDisplay();
        updateShopUI();
        return true;
    }
    return false;
}

// РРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°С‚СЊ РїСЂРё Р·Р°РіСЂСѓР·РєРµ
document.addEventListener('DOMContentLoaded', () => {
    initShop();
    startPassiveIncome();
    initAdminPanel();
    refreshCooldownSettingUI();
});

// ===== РЎРРЎРўР•РњРђ РђР”РњРРќ РџРђРќР•Р›Р =====
let adminUsers = getStoredObject('adminUsers');
let currentEditingUser = null;
let isAdmin = localStorage.getItem('isAdmin') === 'true';

function syncAdminPrivilegeFlag() {
    const sessionRaw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionRaw) {
        localStorage.setItem('isAdmin', 'false');
        isAdmin = false;
        return false;
    }

    try {
        const session = JSON.parse(sessionRaw);
        const role = String(session?.role || '');
        const normalizedNick = normalizeNick(String(session?.nickname || ''));
        const staff = getStoredObject(STAFF_ACCOUNTS_KEY);
        const staffAccount = staff[normalizedNick];
        const allowedBySession = (role === 'admin' || role === 'moderator')
            && Boolean(session?.staffToken)
            && Boolean(staffAccount)
            && staffAccount.role === role;
        localStorage.setItem('isAdmin', String(allowedBySession));
        isAdmin = allowedBySession;
        return allowedBySession;
    } catch (error) {
        localStorage.setItem('isAdmin', 'false');
        isAdmin = false;
        return false;
    }
}

function getAdminKeyByNormalized(normalizedNick) {
    return Object.keys(adminUsers).find((nick) => normalizeNick(nick) === normalizedNick) || null;
}

function syncAdminUsersWithRegisteredAccounts() {
    const users = getStoredObject(USER_ACCOUNTS_KEY);
    const staff = getStoredObject(STAFF_ACCOUNTS_KEY);
    let changed = false;

    const upsertFromAccount = (account, fallbackRole) => {
        if (!account) return;
        const nickname = String(account.nickname || '').trim();
        if (!nickname) return;

        const normalized = normalizeNick(nickname);
        const existingKey = getAdminKeyByNormalized(normalized);
        const role = account.role || fallbackRole;
        const registered = account.registered || new Date().toISOString();

        if (!existingKey) {
            adminUsers[nickname] = {
                diamonds: 0,
                messageCount: 0,
                registered,
                role
            };
            changed = true;
            return;
        }

        if (!adminUsers[existingKey].role && role) {
            adminUsers[existingKey].role = role;
            changed = true;
        }
        if (!adminUsers[existingKey].registered && registered) {
            adminUsers[existingKey].registered = registered;
            changed = true;
        }
    };

    Object.values(users).forEach((account) => upsertFromAccount(account, 'user'));
    Object.values(staff).forEach((account) => upsertFromAccount(account, 'moderator'));

    if (changed) {
        localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    }
}

// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ Р°РґРјРёРЅ РїР°РЅРµР»Рё
function initAdminPanel() {
    syncAdminPrivilegeFlag();
    if (isAdmin) {
        document.getElementById('admin-toggle-btn').style.display = 'block';
    } else {
        document.getElementById('admin-toggle-btn').style.display = 'none';
    }
    refreshCooldownSettingUI();
}

// Р’РєР»СЋС‡РёС‚СЊ СЂРµР¶РёРј Р°РґРјРёРЅР°
function enableAdminMode() {
    syncAdminPrivilegeFlag();
    if (!isAdmin) {
        alert('Режим админа включается только через вход состава');
        return;
    }
    document.getElementById('admin-toggle-btn').style.display = 'block';
}

// РћС‚РєСЂС‹С‚СЊ Р°РґРјРёРЅ РїР°РЅРµР»СЊ
function openAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
        panel.classList.remove('closed');
        loadAdminMembers();
        updateAdminStats();
    }
}

// Р—Р°РєСЂС‹С‚СЊ Р°РґРјРёРЅ РїР°РЅРµР»СЊ
function closeAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
        panel.classList.add('closed');
    }
}

// РџРµСЂРµРєР»СЋС‡РµРЅРёРµ РІРєР»Р°РґРѕРє
function switchAdminTab(tabName) {
    // РЎРєСЂС‹С‚СЊ РІСЃРµ РІРєР»Р°РґРєРё
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // РџРѕРєР°Р·Р°С‚СЊ РЅСѓР¶РЅСѓСЋ РІРєР»Р°РґРєСѓ
    const tab = document.getElementById(`admin-${tabName}-tab`);
    const btn = document.querySelector(`.admin-tab-btn[onclick="switchAdminTab('${tabName}')"]`);
    
    if (tab) tab.style.display = 'block';
    if (btn) btn.classList.add('active');

    if (tabName === 'stats') {
        updateAdminStats();
    }
    if (tabName === 'members') {
        loadAdminMembers();
    }
}

// Р—Р°РіСЂСѓР·РёС‚СЊ СЃРїРёСЃРѕРє СѓС‡Р°СЃС‚РЅРёРєРѕРІ
function loadAdminMembers() {
    const list = document.getElementById('admin-members-list');
    if (!list) return;
    syncAdminUsersWithRegisteredAccounts();

    list.innerHTML = '';

    if (Object.keys(adminUsers).length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--hint); padding: 20px;">Нет участников</div>';
        return;
    }

    const members = Object.entries(adminUsers)
        .sort(([nickA], [nickB]) => nickA.localeCompare(nickB, 'ru'));

    members.forEach(([nickname, userData]) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'admin-member-item';
        itemEl.innerHTML = `
            <div class="admin-member-info">
                <div class="admin-member-name">${nickname}</div>
                <div class="admin-member-diamonds">💎 ${userData.diamonds || 0}</div>
            </div>
            <div class="admin-member-actions">
                <button class="admin-btn-edit" onclick="editAdminMember('${nickname}')">✏️ Редактировать</button>
            </div>
        `;
        list.appendChild(itemEl);
    });
}

// Р¤РёР»СЊС‚СЂРѕРІР°С‚СЊ СѓС‡Р°СЃС‚РЅРёРєРѕРІ
function filterAdminMembers() {
    const searchInput = document.getElementById('admin-search-input');
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.admin-member-item');

    items.forEach(item => {
        const name = item.querySelector('.admin-member-name').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СѓС‡Р°СЃС‚РЅРёРєР°
function editAdminMember(nickname) {
    currentEditingUser = nickname;
    const userData = adminUsers[nickname];

    document.getElementById('admin-edit-nick').value = nickname;
    document.getElementById('admin-edit-diamonds').value = userData.diamonds || 0;

    const modal = document.getElementById('admin-edit-modal');
    if (modal) modal.style.display = 'flex';
}

// Р—Р°РєСЂС‹С‚СЊ РјРѕРґР°Р»СЊРЅРѕРµ РѕРєРЅРѕ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ
function closeAdminEditModal() {
    const modal = document.getElementById('admin-edit-modal');
    if (modal) modal.style.display = 'none';
    currentEditingUser = null;
}

// РР·РјРµРЅРёС‚СЊ РєРѕР»РёС‡РµСЃС‚РІРѕ Р°Р»РјР°Р·РѕРІ
function adjustDiamonds(amount) {
    const input = document.getElementById('admin-edit-diamonds');
    const current = parseInt(input.value) || 0;
    input.value = Math.max(0, current + amount);
}

// РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ СѓС‡Р°СЃС‚РЅРёРєР°
function saveAdminEditMember() {
    if (!currentEditingUser) return;

    const newNick = document.getElementById('admin-edit-nick').value.trim();
    const diamonds = parseInt(document.getElementById('admin-edit-diamonds').value) || 0;

    if (!newNick) {
        alert('Введи ник');
        return;
    }

    // Р•СЃР»Рё РЅРёРє Р±С‹Р» РёР·РјРµРЅС‘РЅ
    if (newNick !== currentEditingUser) {
        delete adminUsers[currentEditingUser];
    }

    adminUsers[newNick] = {
        diamonds: diamonds,
        registered: adminUsers[currentEditingUser]?.registered || new Date().toISOString()
    };

    localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    
    // Р•СЃР»Рё СЌС‚Рѕ С‚РµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ, РѕР±РЅРѕРІР»СЏРµРј РµРіРѕ Р°Р»РјР°Р·С‹
    if (newNick === currentSideUser) {
        userDiamonds = diamonds;
        localStorage.setItem('userDiamonds', userDiamonds);
        updatePointsDisplay();
    }

    alert('Профиль обновлен');
    closeAdminEditModal();
    loadAdminMembers();
    updateAdminStats();
}

// РЈРґР°Р»РёС‚СЊ СѓС‡Р°СЃС‚РЅРёРєР°
async function deleteAdminMember() {
    if (!currentEditingUser) return;

    const approved = await showConfirmPopup(`Ты уверен? Удалить ${currentEditingUser}?`);
    if (!approved) return;

    delete adminUsers[currentEditingUser];
    localStorage.setItem('adminUsers', JSON.stringify(adminUsers));

    alert('Участник удален');
    closeAdminEditModal();
    loadAdminMembers();
    updateAdminStats();
}

// РћР±РЅРѕРІРёС‚СЊ СЃС‚Р°С‚РёСЃС‚РёРєСѓ
function updateAdminStats() {
    syncAdminUsersWithRegisteredAccounts();

    const users = Object.entries(adminUsers);
    const totalMembers = users.length;
    let totalDiamonds = 0;
    let totalMessages = 0;

    users.forEach(([nick, data]) => {
        totalDiamonds += data.diamonds || 0;
        totalMessages += data.messageCount || 0;
    });

    document.getElementById('admin-total-members').textContent = totalMembers;
    document.getElementById('admin-total-messages').textContent = totalMessages;
    document.getElementById('admin-total-diamonds').textContent = totalDiamonds;
    document.getElementById('admin-avg-diamonds').textContent = totalMembers > 0 ? Math.round(totalDiamonds / totalMembers) : 0;
}

// РћР±РЅРѕРІРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё
function updateAdminSetting(setting) {
    if (setting === 'messageCooldown') {
        isMessageCooldownEnabled = !isMessageCooldownEnabled;
        localStorage.setItem(CHAT_COOLDOWN_ENABLED_KEY, String(isMessageCooldownEnabled));
        refreshCooldownSettingUI();
        if (!isMessageCooldownEnabled) {
            clearCooldownState();
        }
        alert(`Ограничение сообщений ${isMessageCooldownEnabled ? 'включено' : 'выключено'}`);
        return;
    }

    const msgReward = parseInt(document.getElementById('admin-msg-reward').value) || 3;
    const passiveReward = parseInt(document.getElementById('admin-passive-reward').value) || 1;
    const nickPrice = parseInt(document.getElementById('admin-nick-price').value) || 1000;

    localStorage.setItem('msgReward', msgReward);
    localStorage.setItem('passiveReward', passiveReward);
    localStorage.setItem('nickPrice', nickPrice);

    alert('Настройки сохранены');
}

// Р—Р°РєСЂС‹С‚СЊ РјРѕРґР°Р»СЊРЅРѕРµ РѕРєРЅРѕ РїСЂРё РєР»РёРєРµ РІРЅРµ РµРіРѕ
document.addEventListener('click', (e) => {
    const modal = document.getElementById('admin-edit-modal');
    if (e.target === modal) {
        closeAdminEditModal();
    }
});


