class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playTone(freq, type, duration, volume = 0.1) {
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }
    feed() { this.playTone(440, 'sine', 0.5); }
    sleep() { this.playTone(330, 'sine', 1.5); }
    play() { [523, 659, 783].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.3), i * 100)); }
    clean() { for (let i = 0; i < 5; i++) setTimeout(() => this.playTone(800 + Math.random() * 400, 'triangle', 0.1, 0.05), i * 50); }
}

class BabyController {
    constructor() {
        this.layerA = document.getElementById('baby-layer-a');
        this.layerB = document.getElementById('baby-layer-b');
        this.activeLayer = this.layerA;
        this.currentFrame = 3;
        this.animTimer = null;
        this.setFrame(3, true); // initial frame no fade
    }

    setFrame(index, instant = false) {
        if (!this.layerA || !this.layerB) return;
        
        // Prepare the NEXT layer (the one that is NOT active)
        const nextLayer = this.activeLayer === this.layerA ? this.layerB : this.layerA;
        
        const col = index % 5;
        const row = Math.floor(index / 5);
        const x = col * 25;
        const y = row * 33.333;
        
        nextLayer.style.backgroundPosition = `${x}% ${y}%`;
        
        if (instant) {
            this.layerA.classList.remove('active');
            this.layerB.classList.remove('active');
            nextLayer.classList.add('active');
            this.activeLayer = nextLayer;
        } else {
            // Perform Cross-Fade
            nextLayer.classList.add('active');
            this.activeLayer.classList.remove('active');
            this.activeLayer = nextLayer;
        }
    }

    playAnimation(frames, frameRate, loop = false) {
        if (this.animTimer) clearInterval(this.animTimer);
        let i = 0;
        this.animTimer = setInterval(() => {
            this.setFrame(frames[i]);
            i++;
            if (i >= frames.length) {
                if (loop) i = 0;
                else { 
                    clearInterval(this.animTimer); 
                    this.animTimer = null; 
                    setTimeout(() => this.setFrame(3), 500); 
                }
            }
        }, 1000 / frameRate);
    }
}

class GameController {
    constructor() {
        this.stats = { hunger: 100, sleep: 100, happiness: 100, hygiene: 100 };
        this.growth = { days: 43, lastUpdate: Date.now() };
        this.baby = new BabyController();
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
            this.stats = d.stats; this.growth = d.growth;
        }
    }

    saveGame() { 
        localStorage.setItem('minilife_save_v2', JSON.stringify({ stats: this.stats, growth: this.growth })); 
    }

    setupEventListeners() {
        document.getElementById('btn-feed').addEventListener('click', () => {
            this.stats.hunger = Math.min(100, this.stats.hunger + 15);
            this.baby.playAnimation([0, 1, 2, 3, 4], 6);
            this.sounds.feed();
            this.updateUI();
            this.saveGame();
        });
        document.getElementById('btn-sleep').addEventListener('click', () => {
            this.stats.sleep = Math.min(100, this.stats.sleep + 25);
            this.baby.playAnimation([5, 6, 7, 8, 9], 3, true);
            this.sounds.sleep();
            this.updateUI();
            this.saveGame();
        });
        document.getElementById('btn-play').addEventListener('click', () => {
            this.stats.happiness = Math.min(100, this.stats.happiness + 20);
            this.baby.playAnimation([15, 16, 17, 18, 19], 8);
            this.sounds.play();
            this.updateUI();
            this.saveGame();
        });
        document.getElementById('btn-clean').addEventListener('click', () => {
            this.stats.hygiene = Math.min(100, this.stats.hygiene + 30);
            this.baby.playAnimation([10, 11, 12, 13, 14], 5);
            this.sounds.clean();
            this.updateUI();
            this.saveGame();
        });
    }

    startGameLoop() {
        setInterval(() => {
            this.stats.hunger = Math.max(0, this.stats.hunger - 0.15);
            this.stats.sleep = Math.max(0, this.stats.sleep - 0.1);
            this.stats.happiness = Math.max(0, this.stats.happiness - 0.2);
            this.stats.hygiene = Math.max(0, this.stats.hygiene - 0.1);
            this.updateUI();
            this.saveGame();
        }, 1000);
    }

    updateUI() {
        const update = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.style.width = `${val}%`;
            const valEl = document.getElementById(id.replace('-bar', '-value'));
            if (valEl) valEl.innerText = `${Math.round(val)}%`;
        };
        update('hunger-bar', this.stats.hunger);
        update('sleep-bar', this.stats.sleep);
        update('happiness-bar', this.stats.happiness);
        update('hygiene-bar', this.stats.hygiene);
        
        const gInfo = document.getElementById('growth-info');
        if (gInfo) gInfo.innerText = `TAG ${this.growth.days} • KLEINKIND`;
        
        const msg = document.getElementById('status-message');
        if (msg) {
            if (this.stats.hunger < 20) msg.innerText = "Das Baby hat Hunger!";
            else if (this.stats.sleep < 20) msg.innerText = "Das Baby ist müde...";
            else msg.innerText = "Das Baby ist glücklich und gesund!";
        }
    }
}

window.addEventListener('load', () => { new GameController(); });
