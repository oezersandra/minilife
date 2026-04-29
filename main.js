// ─── Sound Manager ────────────────────────────────────────────────────────────
class SoundManager {
    constructor() {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    playTone(freq, type, duration, volume = 0.1) {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }
    feed()  { this.playTone(440, 'sine', 0.5); }
    sleep() { this.playTone(330, 'sine', 1.5); }
    play()  { [523,659,783].forEach((f,i) => setTimeout(() => this.playTone(f,'sine',0.3), i*100)); }
    clean() { for(let i=0;i<5;i++) setTimeout(() => this.playTone(800+Math.random()*400,'triangle',0.1,0.05),i*50); }
    pop()   { this.playTone(1200,'sine',0.1,0.05); }
    rattle(){ for(let i=0;i<3;i++) setTimeout(() => this.playTone(1000+Math.random()*500,'square',0.05,0.03),i*80); }
}

// ─── Phaser Bubble-Pop Minigame ───────────────────────────────────────────────
class BubblePopScene extends Phaser.Scene {
    constructor() { super('BubblePopScene'); }
    create() {
        this.score = 0; this.timeLeft = 30; this.bubbles = this.add.group();
        this.spawnTimer = this.time.addEvent({ delay: 500, callback: this.spawnBubble, callbackScope: this, loop: true });
        this.gameTimer  = this.time.addEvent({ delay: 1000, callback: this.updateTimer,  callbackScope: this, loop: true });
    }
    spawnBubble() {
        const x = Phaser.Math.Between(50, 450), y = 650;
        const radius = Phaser.Math.Between(20, 50);
        const color  = Phaser.Display.Color.RandomRGB().color;
        
        let points = 5;
        if (radius < 30) points = 15;
        else if (radius < 40) points = 10;
        
        const bubble = this.add.circle(x, y, radius, color, 0.6);
        bubble.setStrokeStyle(2, 0xffffff, 0.8);
        this.bubbles.add(bubble);
        bubble.setInteractive();
        bubble.on('pointerdown', () => {
            this.score += points;
            window.gameInstance.sounds.pop();
            
            const popup = this.add.text(bubble.x, bubble.y, `+${points}`, {
                fontFamily: 'Outfit',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            });
            popup.setOrigin(0.5, 0.5);
            
            this.tweens.add({
                targets: popup,
                y: popup.y - 40,
                alpha: 0,
                duration: 800,
                ease: 'Power1',
                onComplete: () => popup.destroy()
            });
            
            bubble.destroy();
            document.getElementById('minigame-score').innerText = `Punkte: ${this.score}`;
        });
        this.tweens.add({ targets: bubble, y: -100, x: x + Phaser.Math.Between(-50, 50),
            duration: Phaser.Math.Between(3000, 5000), onComplete: () => bubble.destroy() });
    }
    updateTimer() {
        this.timeLeft--;
        document.getElementById('minigame-timer').innerText = `Zeit: ${this.timeLeft}`;
        if (this.timeLeft <= 0) { this.scene.pause(); window.gameInstance.endMinigame(this.score); }
    }
}

// ─── Smooth Noise (simple 1-D value noise with interpolation) ─────────────────
class SmoothNoise {
    constructor(seed = 0) {
        this.seed = seed;
        this._cache = {};
    }
    _rand(n) {
        n = (n + this.seed) | 0;
        n = ((n >> 8) ^ n) * 0x45d9f3b;
        n = ((n >> 8) ^ n) * 0x45d9f3b;
        n = ((n >> 8) ^ n);
        return (n & 0xffff) / 0xffff;
    }
    _lerp(a, b, t) { return a + (b - a) * (t * t * (3 - 2 * t)); }
    get(x) {
        const xi = Math.floor(x), xf = x - xi;
        return this._lerp(this._rand(xi), this._rand(xi + 1), xf) * 2 - 1;
    }
}

// ─── Spring ──────────────────────────────────────────────────────────────────
class Spring {
    constructor(stiffness = 0.08, damping = 0.75, init = 0) {
        this.stiffness = stiffness; this.damping = damping;
        this.pos = init; this.vel = 0; this.target = init;
    }
    update() {
        const force = (this.target - this.pos) * this.stiffness;
        this.vel = (this.vel + force) * this.damping;
        this.pos += this.vel;
        return this.pos;
    }
}

// ─── Baby Controller ─────────────────────────────────────────────────────────
class BabyController {
    constructor() {
        // SVG elements
        this.headGroup  = document.getElementById('baby-head-group');
        this.bodyGroup  = document.getElementById('baby-body-group');
        this.armLeft    = document.getElementById('baby-arm-left');
        this.armRight   = document.getElementById('baby-arm-right');
        this.legLeft    = document.getElementById('baby-leg-left');
        this.legRight   = document.getElementById('baby-leg-right');
        this.eyelidL    = document.getElementById('eyelid-left');
        this.eyelidR    = document.getElementById('eyelid-right');
        this.irisL      = document.getElementById('iris-left');
        this.irisR      = document.getElementById('iris-right');
        this.mouthHappy = document.getElementById('mouth-happy');
        this.mouthSad   = document.getElementById('mouth-sad');
        this.mouthOpen  = document.getElementById('mouth-open');
        this.tearL      = document.getElementById('tear-left');
        this.tearR      = document.getElementById('tear-right');
        this.sleepZ     = [document.getElementById('sleep-z1'), document.getElementById('sleep-z2'), document.getElementById('sleep-z3')];
        this.babyBody   = document.getElementById('baby-body');
        this.babySvg    = document.getElementById('baby-svg');

        // State machine with blend weights
        this.STATES = ['idle','feeding','sleeping','playing','cleaning','crying'];
        this.blendWeights = { idle:1, feeding:0, sleeping:0, playing:0, cleaning:0, crying:0 };
        this.state = 'idle';
        this.stateTimer = 0;
        this._stateTimeout = null;

        // Noise generators
        this.noiseHead  = new SmoothNoise(1);
        this.noiseBody  = new SmoothNoise(7);
        this.noiseArm   = new SmoothNoise(13);
        this.noiseLeg   = new SmoothNoise(19);
        this.noiseGaze  = new SmoothNoise(31);

        // Springs
        this.springHeadX  = new Spring(0.05, 0.80);
        this.springHeadY  = new Spring(0.05, 0.80);
        this.springBodyY  = new Spring(0.04, 0.85);
        this.springBodySX = new Spring(0.06, 0.88, 1);
        this.springBodySY = new Spring(0.06, 0.88, 1);
        this.springArmL   = new Spring(0.06, 0.78);
        this.springArmR   = new Spring(0.06, 0.78);
        this.springLegL   = new Spring(0.05, 0.80);
        this.springLegR   = new Spring(0.05, 0.80);
        this.springGazeX  = new Spring(0.07, 0.82);
        this.springGazeY  = new Spring(0.07, 0.82);

        // Blink & Yawn
        this.blinkT = 0;
        this.nextBlink = 2 + Math.random() * 3;
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.yawnTimer = 10 + Math.random() * 20;
        this.yawnProgress = 0;
        this.isYawning = false;

        // Mouse gaze
        this.mouseX = 0; this.mouseY = 0;
        document.addEventListener('mousemove', e => {
            if(!this.babySvg) return;
            const r = this.babySvg.getBoundingClientRect();
            this.mouseX = (e.clientX - r.left - 100) / 100;
            this.mouseY = (e.clientY - r.top  - 75)  / 100;
        });

        this.tearPhase = 0;
        this.sleepZPhase = 0;
        this.wiggleActive = false;
        this.wiggleT = 0;
        this.shakeOffset = 0;

        // Joy burst
        this.joyBurst = false;
        this.joyT = 0;
        if(this.babySvg) {
            this.babySvg.style.cursor = 'pointer';
            this.babySvg.addEventListener('click', () => this._onBabyClick());
        }

        this.t = 0;
        this._raf = requestAnimationFrame((ts) => this._animate(ts));
    }

    _onBabyClick() {
        if (this.state === 'sleeping') return;
        this.joyBurst = true;
        this.joyT = 0;
        this.wiggleActive = true;
        this.wiggleT = 0;
        this._spawnHearts();
    }

    _spawnHearts() {
        const container = document.getElementById('baby-container');
        if(!container) return;
        const emojis = ['❤️','💕','✨','😊','🌟'];
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.textContent = emojis[i % emojis.length];
                el.style.cssText = `position:absolute;left:${30 + Math.random()*40}%;bottom:60%;font-size:${16 + Math.random()*14}px;pointer-events:none;animation: heartFloat 1.2s ease-out forwards;z-index:20;`;
                container.appendChild(el);
                setTimeout(() => el.remove(), 1300);
            }, i * 120);
        }
    }

    _animate(ts) {
        this._raf = requestAnimationFrame((t) => this._animate(t));
        const dt = 0.016;
        this.t += dt;
        this.stateTimer += dt;

        // Blend weights
        for (const s of this.STATES) {
            const target = s === this.state ? 1 : 0;
            this.blendWeights[s] += (target - this.blendWeights[s]) * 3.0 * dt;
            if (this.blendWeights[s] < 0.001) this.blendWeights[s] = 0;
        }
        const { idle: wIdle, crying: wCrying, sleeping: wSleep, feeding: wFeed, playing: wPlay } = this.blendWeights;
        const s = Math.max(0.1, (wCrying * 2.0) + (wSleep * 0.15) + (wPlay * 1.2) + (wIdle * 0.5) + (wFeed * 0.6));

        // Head bob
        this.shakeOffset = Math.sin(this.t * 18) * (wCrying * 9);
        this.springHeadX.target = this.noiseHead.get(this.t * s * 0.7) * 8 + this.shakeOffset;
        this.springHeadY.target = this.noiseHead.get(this.t * s * 0.5 + 100) * 5 + (wSleep * 3);
        const hx = this.springHeadX.update(), hy = this.springHeadY.update();

        // Body breathe
        const breatheSpeed = wSleep > 0.5 ? 1.1 : 2.4;
        this.springBodyY.target = Math.sin(this.t * breatheSpeed) * (wSleep > 0.5 ? 3.0 : 1.8);
        const by = this.springBodyY.update();
        const exhale = Math.sin(this.t * breatheSpeed) * 0.025 + 1;
        this.springBodySX.target = 1 + (exhale - 1) * 0.5;
        this.springBodySY.target = exhale;
        const bsx = this.springBodySX.update(), bsy = this.springBodySY.update();

        // Arms
        const armBoost = wPlay * 20 + wCrying * 15;
        this.springArmL.target = (20 + armBoost) + this.noiseArm.get(this.t * s * 0.9) * (12 + wPlay * 8);
        this.springArmR.target = (20 + armBoost) + this.noiseArm.get(this.t * s * 0.9 + 50) * (12 + wPlay * 8);
        const alA = this.springArmL.update(), arA = this.springArmR.update();

        // Legs
        const legSpeed = this.t * (wPlay * 1.8 + wCrying * 1.2 + wIdle * 0.4) * 1.4;
        const legScale = 1 - wSleep * 0.7;
        this.springLegL.target = this.noiseLeg.get(legSpeed) * (10 + wPlay * 15) * legScale;
        this.springLegR.target = this.noiseLeg.get(legSpeed + 30) * (10 + wPlay * 15) * legScale;
        const llA = this.springLegL.update(), lrA = this.springLegR.update();

        // Gaze
        const gazeFrozen = wSleep;
        this.springGazeX.target = Math.max(-4, Math.min(4, this.mouseX * 5 * (1-gazeFrozen) + this.noiseGaze.get(this.t * 0.3) * 3 * (1-gazeFrozen)));
        this.springGazeY.target = Math.max(-3, Math.min(3, this.mouseY * 3 * (1-gazeFrozen) + this.noiseGaze.get(this.t * 0.3 + 200) * 2 * (1-gazeFrozen)));
        const gx = this.springGazeX.update(), gy = this.springGazeY.update();

        // Transforms
        const headRot = hx * 0.25 + this.shakeOffset * 0.1;
        this.headGroup.setAttribute('transform', `translate(${100 + hx}, ${75 + hy}) rotate(${headRot}, 0, 0)`);
        this.bodyGroup.setAttribute('transform', `translate(100, ${130 + by}) scale(${bsx.toFixed(4)}, ${bsy.toFixed(4)})`);
        this.armLeft.setAttribute('transform', `translate(-38,-10) rotate(${-alA}, 0, -10)`);
        this.armRight.setAttribute('transform', `translate(38,-10) rotate(${arA}, 0, -10)`);
        this.legLeft.setAttribute('transform', `translate(-18,42) rotate(${llA}, 0, 0)`);
        this.legRight.setAttribute('transform', `translate(18,42) rotate(${lrA}, 0, 0)`);
        this.irisL.setAttribute('cx', gx); this.irisL.setAttribute('cy', gy);
        this.irisR.setAttribute('cx', gx); this.irisR.setAttribute('cy', gy);

        // Blinking
        this.blinkT += dt;
        if (!this.isBlinking && !this.isYawning && this.blinkT > this.nextBlink / (1 + wCrying * 2)) {
            this.isBlinking = true; this.blinkProgress = 0; this.blinkT = 0; this.nextBlink = 2 + Math.random() * 4;
        }
        if (this.isBlinking) {
            this.blinkProgress += dt * 8;
            const eyelidY = -10 + 10 * Math.sin(this.blinkProgress * Math.PI);
            if (wSleep < 0.5) { this.eyelidL.setAttribute('cy', eyelidY); this.eyelidR.setAttribute('cy', eyelidY); }
            if (this.blinkProgress >= 1) this.isBlinking = false;
        }

        // Yawning
        if (!this.isYawning) {
            this.yawnTimer -= dt;
            if (this.yawnTimer <= 0 && (wIdle > 0.5 || wPlay > 0.3) && wCrying < 0.1) {
                this.isYawning = true; this.yawnProgress = 0; this.yawnTimer = 15 + Math.random() * 25;
            }
        }
        if (this.isYawning) {
            this.yawnProgress += dt * 1.2;
            const yawnOpen = Math.sin(this.yawnProgress * Math.PI);
            this.eyelidL.setAttribute('cy', -10 + 6 * yawnOpen);
            this.eyelidR.setAttribute('cy', -10 + 6 * yawnOpen);
            this.mouthOpen.setAttribute('rx', 8 + yawnOpen * 6);
            this.mouthOpen.setAttribute('ry', 4 + yawnOpen * 8);
            this.mouthOpen.setAttribute('opacity', yawnOpen * 0.9);
            this.mouthHappy.setAttribute('opacity', 1 - yawnOpen);
            if (this.yawnProgress >= 1) {
                this.isYawning = false;
                this.mouthOpen.setAttribute('opacity', 0);
                this.mouthHappy.setAttribute('opacity', 1);
            }
        }

        // Joy burst
        if (this.joyBurst) {
            this.joyT += dt * 6;
            const joy = Math.sin(this.joyT) * Math.max(0, 1 - this.joyT / 15);
            this.babySvg.style.filter = `drop-shadow(0 0 ${8 + joy * 12}px rgba(253,200,50,${0.3 + joy * 0.5}))`;
            if (this.joyT > 15) { this.joyBurst = false; this.babySvg.style.filter = 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))'; }
        }

        // Wiggle
        if (this.wiggleActive) {
            this.wiggleT += dt * 10;
            const wiggle = Math.sin(this.wiggleT) * 9 * Math.max(0, 1 - this.wiggleT / 20);
            this.headGroup.setAttribute('transform', `translate(${100 + hx + wiggle}, ${75 + hy}) rotate(${wiggle * 0.4 + headRot}, 0, 0)`);
            if (this.wiggleT > 20) { this.wiggleActive = false; this.wiggleT = 0; }
        }

        this._applyStateEffects(wIdle, wCrying, wSleep, wFeed, wPlay);
    }

    _applyStateEffects(wIdle, wCrying, wSleep, wFeed, wPlay) {
        // Tears
        if (wCrying > 0.01) {
            this.tearPhase += 0.07;
            const tearOp = (0.5 + 0.5 * Math.sin(this.tearPhase)) * wCrying;
            this.tearL.setAttribute('opacity', tearOp); this.tearR.setAttribute('opacity', tearOp);
            this.tearL.setAttribute('cy', 18 + Math.sin(this.tearPhase) * 5);
            this.tearR.setAttribute('cy', 18 + Math.sin(this.tearPhase + 1) * 5);
        } else {
            this.tearL.setAttribute('opacity', 0); this.tearR.setAttribute('opacity', 0);
        }

        // Mouth
        if (!this.isYawning) {
            this.mouthHappy.setAttribute('opacity', Math.min(1, Math.max(0, wIdle + wPlay + wSleep * 0.5 - wCrying - wFeed)));
            this.mouthSad.setAttribute('opacity', Math.min(1, wCrying * 1.2));
            this.mouthOpen.setAttribute('opacity', Math.min(1, wFeed * 1.2));
        }

        // Sleep eyes & Zzz
        if (wSleep > 0.01 && !this.isBlinking && !this.isYawning) {
            const eyelidClose = -10 + 9 * wSleep;
            this.eyelidL.setAttribute('cy', eyelidClose); this.eyelidR.setAttribute('cy', eyelidClose);
        } else if (!this.isBlinking && !this.isYawning && wSleep < 0.05) {
            this.eyelidL.setAttribute('cy', -10); this.eyelidR.setAttribute('cy', -10);
        }
        if (wSleep > 0.3) {
            this.sleepZPhase += 0.018;
            this.sleepZ.forEach((z, i) => {
                const phase = (this.sleepZPhase + i * 0.55) % 3;
                z.setAttribute('opacity', Math.max(0, Math.sin(phase * Math.PI / 1.5)) * wSleep);
                z.setAttribute('y', [-30, -45, -58][i] - Math.sin(phase * Math.PI / 1.5) * 6);
            });
        } else {
            this.sleepZ.forEach(z => z.setAttribute('opacity', 0));
        }
    }

    setState(s, duration = 0) {
        if (s === this.state && duration === 0) return;
        this.state = s;
        this.stateTimer = 0;
        if (s === 'playing' || s === 'feeding') { this.wiggleActive = true; this.wiggleT = 0; }
        clearTimeout(this._stateTimeout);
        if (duration > 0) this._stateTimeout = setTimeout(() => this.setState('idle'), duration);
    }

    setSpriteSheet() {} setFrame() {}
    playAnimation(frames, fps, loop) {
        if (frames[0] === 5)  this.setState('sleeping', loop ? 0 : 6000);
        else if (frames[0] === 0)  this.setState('feeding', 3000);
        else if (frames[0] === 10) this.setState(this._isCrying() ? 'crying' : 'playing', loop ? 0 : 4000);
        else if (frames[0] === 15) this.setState('playing', 4000);
    }
    _isCrying() {
        const g = window.gameInstance;
        return g && (g.stats.hunger < 20 || g.stats.sleep < 20 || g.stats.happiness < 20 || g.stats.hygiene < 20);
    }
}

// ─── Game Controller ──────────────────────────────────────────────────────────
class GameController {
    constructor() {
        this.stats  = { hunger: 100, sleep: 100, happiness: 100, hygiene: 100 };
        this.growth = { xp: 0, level: 1, lastUpdate: Date.now() };
        this.baby   = new BabyController();
        this.sounds = new SoundManager();
        this.loadGame();
        this.setupEventListeners();
        this.startGameLoop();
        this.updateUI();
    }

    loadGame() {
        const saved = localStorage.getItem('minilife_save_v2');
        if (saved) {
            const d = JSON.parse(saved);
            this.stats  = d.stats;
            this.growth = d.growth || { xp: 0, level: 1, lastUpdate: Date.now() };
        }
    }
    saveGame() { localStorage.setItem('minilife_save_v2', JSON.stringify({ stats: this.stats, growth: this.growth })); }

    gainXP(amount) {
        this.growth.xp += amount;
        const needed = this.growth.level * 150;
        if (this.growth.xp >= needed) { this.growth.level++; this.growth.xp = 0; this.applyLevelUpEffect(); }
        this.updateUI();
    }

    applyLevelUpEffect() {
        const svg = document.getElementById('baby-svg');
        svg.style.transition = 'transform 0.5s ease';
        svg.style.transform  = 'scale(1.2)';
        setTimeout(() => { svg.style.transform = 'scale(1)'; }, 500);
        this.sounds.play();
        this.baby.setState('playing', 3000);
    }

    setupEventListeners() {
        document.getElementById('btn-feed').addEventListener('click', () => {
            this.stats.hunger = Math.min(100, this.stats.hunger + 30);
            this.baby.setState('feeding', 3000);
            this.sounds.feed(); this.gainXP(20); this.saveGame();
            this.toggleSleepMode(false);
        });
        document.getElementById('btn-sleep').addEventListener('click', () => {
            this.stats.sleep = Math.min(100, this.stats.sleep + 25);
            this.baby.setState('sleeping', 8000);
            this.sounds.sleep(); this.gainXP(25); this.saveGame();
            this.toggleSleepMode(true);
        });
        document.getElementById('btn-play').addEventListener('click', () => {
            this.stats.happiness = Math.min(100, this.stats.happiness + 20);
            this.baby.setState('playing', 4000);
            this.sounds.play(); this.gainXP(30); this.saveGame();
        });
        document.getElementById('btn-clean').addEventListener('click', () => {
            this.stats.hygiene = Math.min(100, this.stats.hygiene + 30);
            this.baby.setState('playing', 3000);
            this.createBubbles(); this.sounds.clean(); this.gainXP(20); this.saveGame();
            setTimeout(() => this.applyShine(), 1500);
        });
        document.getElementById('btn-game').addEventListener('click', () => this.startMinigame());
        document.getElementById('btn-close-game').addEventListener('click', () => this.endMinigame(0, true));

        document.getElementById('item-duck').addEventListener('click', () => {
            this.stats.hygiene = Math.min(100, this.stats.hygiene + 25);
            this.baby.setState('playing', 2000); this.sounds.clean(); this.gainXP(10); this.updateUI();
        });
        document.getElementById('item-bear').addEventListener('click', () => {
            this.stats.sleep = Math.min(100, this.stats.sleep + 10);
            this.baby.setState('sleeping', 3000); this.sounds.sleep(); this.gainXP(10); this.updateUI();
        });
        document.getElementById('item-rattle').addEventListener('click', () => {
            this.stats.happiness = Math.min(100, this.stats.happiness + 15);
            this.baby.setState('playing', 2000); this.sounds.rattle(); this.gainXP(15); this.updateUI();
        });
    }

    toggleSleepMode(on) {
        const overlay = document.getElementById('sleep-overlay');
        if (on) overlay.classList.remove('hidden'); else overlay.classList.add('hidden');
    }

    startMinigame() {
        document.getElementById('minigame-overlay').classList.remove('hidden');
        this.phaserGame = new Phaser.Game({
            type: Phaser.AUTO, parent: 'minigame-container',
            width: 500, height: 600, transparent: true, scene: BubblePopScene
        });
        document.getElementById('minigame-score').innerText = 'Punkte: 0';
        document.getElementById('minigame-timer').innerText = 'Zeit: 30';
    }

    endMinigame(score, manual = false) {
        if (this.phaserGame) { this.phaserGame.destroy(true); this.phaserGame = null; }
        document.getElementById('minigame-overlay').classList.add('hidden');
        if (!manual && score > 0) {
            const xp = score * 5, happy = Math.min(30, score * 2);
            this.stats.happiness = Math.min(100, this.stats.happiness + happy);
            this.gainXP(xp);
            document.getElementById('status-message').innerText =
                `Klasse! ${score} Blasen → +${xp} XP!`;
            this.baby.setState('playing', 3000);
        }
    }

    createBubbles() {
        const c = document.getElementById('baby-container');
        for (let i = 0; i < 15; i++) {
            const b = document.createElement('div');
            b.className = 'bubble';
            const size = 10 + Math.random() * 30;
            b.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;--drift:${(Math.random()-0.5)*100}px;animation-delay:${Math.random()*0.5}s`;
            c.appendChild(b);
            setTimeout(() => b.remove(), 2500);
        }
    }

    applyShine() {
        const svg = document.getElementById('baby-svg');
        svg.style.filter = 'brightness(1.4) drop-shadow(0 0 12px #a5f3fc)';
        setTimeout(() => { svg.style.filter = ''; }, 800);
    }

    startGameLoop() {
        setInterval(() => {
            this.stats.hunger    = Math.max(0, this.stats.hunger    - 0.15);
            this.stats.sleep     = Math.max(0, this.stats.sleep     - 0.10);
            this.stats.happiness = Math.max(0, this.stats.happiness - 0.20);
            this.stats.hygiene   = Math.max(0, this.stats.hygiene   - 0.10);
            this.updateUI(); this.saveGame();
        }, 1000);
    }

    updateUI() {
        const update = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.style.width = `${val}%`;
            const vEl = document.getElementById(id.replace('-bar', '-value'));
            if (vEl) vEl.innerText = `${Math.round(val)}%`;
        };
        update('hunger-bar', this.stats.hunger);
        update('sleep-bar',  this.stats.sleep);
        update('happiness-bar', this.stats.happiness);
        update('hygiene-bar', this.stats.hygiene);

        const nextXP = this.growth.level * 150;
        const xpFill = document.getElementById('xp-fill');
        if (xpFill) xpFill.style.width = `${(this.growth.xp / nextXP) * 100}%`;
        const xpVal = document.getElementById('xp-value');
        if (xpVal) xpVal.innerText = `${Math.round(this.growth.xp)} / ${nextXP}`;

        const stageNames = ['SÄUGLING','KRABBLER','KLEINKIND','KIND'];
        const stageIdx = this.growth.level >= 30 ? 3 : this.growth.level >= 15 ? 2 : this.growth.level >= 5 ? 1 : 0;
        const gInfo = document.getElementById('growth-info');
        if (gInfo) gInfo.innerText = `LEVEL ${this.growth.level} • ${stageNames[stageIdx]}`;

        // Scale SVG with growth
        const scale = Math.min(1.5, 0.8 + this.growth.level * 0.01);
        document.getElementById('baby-container').style.transform = `scale(${scale})`;

        // Status message + crying state
        const msg = document.getElementById('status-message');
        const needsAttention = this.stats.hunger < 20 || this.stats.sleep < 20 ||
                               this.stats.happiness < 20 || this.stats.hygiene < 20;
        if (msg) {
            if (this.stats.hunger < 20)      msg.innerText = '😢 Das Baby hat großen Hunger!';
            else if (this.stats.sleep < 20)  msg.innerText = '😴 Das Baby ist völlig übermüdet...';
            else if (this.stats.happiness<20)msg.innerText = '🥺 Das Baby ist einsam...';
            else if (this.stats.hygiene < 20)msg.innerText = '🛁 Das Baby möchte gebadet werden!';
            else                              msg.innerText = '😊 Das Baby ist glücklich und gesund!';
        }

        if (needsAttention && this.baby.state === 'idle') {
            this.baby.setState('crying');
        } else if (!needsAttention && this.baby.state === 'crying') {
            this.baby.setState('idle');
        }
    }
}

window.addEventListener('load', () => { window.gameInstance = new GameController(); });
