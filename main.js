class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, type, duration, volume = 0.1) {
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
    }

    feed() { this.playTone(440, 'sine', 0.5); setTimeout(() => this.playTone(660, 'sine', 0.5), 100); }
    sleep() { this.playTone(330, 'sine', 1.5, 0.05); this.playTone(220, 'sine', 2.0, 0.05); }
    play() { [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.3), i * 100)); }
    clean() { for (let i = 0; i < 5; i++) setTimeout(() => this.playTone(800 + Math.random() * 400, 'triangle', 0.1, 0.05), i * 50); }
    toy() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.2, 0.03), i * 80)); }
    growth() { [261, 329, 392, 523, 659, 783, 1046].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.4, 0.05), i * 150)); }
}

class BabyScene extends Phaser.Scene {
    constructor() { super('BabyScene'); }
    preload() { 
        this.load.image('baby_newborn', 'baby.png');
        this.load.image('baby_infant', 'baby_infant.png');
        this.load.image('baby_crawler', 'baby_crawler.png');
        this.load.image('baby_toddler', 'baby_toddler.png');
    }

    create() {
        this.baby = this.add.container(200, 200);
        this.babyImage = this.add.image(0, 0, 'baby_newborn');
        this.babyImage.setDisplaySize(180, 180);
        
        const shadow = this.add.circle(0, 80, 60, 0x000000, 0.2);
        shadow.setScale(1, 0.3);
        this.baby.add([shadow, this.babyImage]);
        this.tweens.add({ targets: this.baby, y: 190, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.game.events.on('feed', () => this.onAction('🍼'));
        this.game.events.on('sleep', () => this.onAction('💤'));
        this.game.events.on('play', () => this.onAction('🧸'));
        this.game.events.on('clean', () => this.onAction('🛁'));
        this.game.events.on('toy', (emoji) => this.onAction(emoji));
        this.game.events.on('evolve', (stage) => this.onEvolve(stage));
    }

    onEvolve(stage) {
        const key = `baby_${stage.toLowerCase()}`;
        this.tweens.add({
            targets: this.babyImage, alpha: 0, scale: 1.5, duration: 500,
            onComplete: () => {
                this.babyImage.setTexture(key);
                this.babyImage.alpha = 1;
                this.babyImage.scale = 1;
                this.babyImage.setDisplaySize(180, 180);
                const flare = this.add.circle(0, 0, 10, 0xffffff, 0.8);
                this.baby.add(flare);
                this.tweens.add({ targets: flare, scale: 20, alpha: 0, duration: 800, onComplete: () => flare.destroy() });
            }
        });
    }

    onAction(emoji) {
        const text = this.add.text(0, -100, emoji, { fontSize: '48px' }).setOrigin(0.5);
        this.baby.add(text);
        this.tweens.add({ targets: text, y: -160, alpha: 0, duration: 1500, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
        this.tweens.add({ targets: this.babyImage, scale: 1.1, duration: 150, yoyo: true, ease: 'Back.easeOut' });
    }
}

class GameController {
    constructor() {
        this.stats = { hunger: 100, sleep: 100, happiness: 100, hygiene: 100 };
        this.growth = { days: 1, lastUpdate: Date.now(), stage: 'Newborn' };
        this.elements = {
            hungerBar: document.getElementById('hunger-bar'),
            sleepBar: document.getElementById('sleep-bar'),
            happinessBar: document.getElementById('happiness-bar'),
            hygieneBar: document.getElementById('hygiene-bar'),
            hungerValue: document.getElementById('hunger-value'),
            sleepValue: document.getElementById('sleep-value'),
            happinessValue: document.getElementById('happiness-value'),
            hygieneValue: document.getElementById('hygiene-value'),
            growthInfo: document.getElementById('growth-info'),
            statusMessage: document.getElementById('status-message')
        };
        this.phaserGame = new Phaser.Game({
            type: Phaser.AUTO, parent: 'phaser-container', width: 400, height: 400, transparent: true, scene: BabyScene
        });
        this.sounds = new SoundManager();
        this.loadGame();
        this.setupEventListeners();
        this.startGameLoop();
    }

    loadGame() {
        const savedData = localStorage.getItem('minilife_save');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.stats = data.stats;
            this.growth = data.growth;
            this.updateUI();
        }
    }

    saveGame() { localStorage.setItem('minilife_save', JSON.stringify({ stats: this.stats, growth: this.growth })); }

    setupEventListeners() {
        document.getElementById('btn-feed').addEventListener('click', () => this.interact('hunger', 20, "Yummy! Baby is eating.", 'feed', () => this.sounds.feed()));
        document.getElementById('btn-sleep').addEventListener('click', () => this.interact('sleep', 30, "Shhh... Baby is resting.", 'sleep', () => this.sounds.sleep()));
        document.getElementById('btn-play').addEventListener('click', () => this.interact('happiness', 25, "Giggle! Baby is playing.", 'play', () => this.sounds.play()));
        document.getElementById('btn-clean').addEventListener('click', () => this.interact('hygiene', 35, "Splosh! Baby is clean now.", 'clean', () => this.sounds.clean()));
        document.getElementById('item-duck').addEventListener('click', () => this.useToy('hygiene', 15, "Quack! Baby loves the duck.", '🦆'));
        document.getElementById('item-bear').addEventListener('click', () => this.useToy('sleep', 15, "Snuggle time with the bear.", '🧸'));
        document.getElementById('item-rattle').addEventListener('click', () => this.useToy('happiness', 20, "Shake shake! Happy baby.", '🪇'));
    }

    useToy(stat, amount, message, emoji) {
        this.stats[stat] = Math.min(100, this.stats[stat] + amount);
        this.stats.happiness = Math.min(100, this.stats.happiness + 5);
        this.updateUI(); this.showMessage(message); this.phaserGame.events.emit('toy', emoji); this.sounds.toy(); this.saveGame();
    }

    interact(stat, amount, message, eventName, soundEffect) {
        this.stats[stat] = Math.min(100, this.stats[stat] + amount);
        this.updateUI(); this.showMessage(message); this.phaserGame.events.emit(eventName); if (soundEffect) soundEffect(); this.saveGame();
    }

    startGameLoop() {
        setInterval(() => {
            this.stats.hunger = Math.max(0, this.stats.hunger - 0.1);
            this.stats.sleep = Math.max(0, this.stats.sleep - 0.05);
            this.stats.happiness = Math.max(0, this.stats.happiness - 0.2);
            this.stats.hygiene = Math.max(0, this.stats.hygiene - 0.1);
            const now = Date.now();
            if (now - this.growth.lastUpdate > 10000) { 
                this.growth.days++; this.growth.lastUpdate = now; this.checkEvolution();
            }
            this.updateUI(); this.checkStatus(); this.saveGame();
        }, 1000);
    }

    checkEvolution() {
        const oldStage = this.growth.stage;
        const newStage = this.getGrowthStage();
        if (newStage !== oldStage) {
            this.growth.stage = newStage;
            this.showMessage(`OMG! Baby evolved into a ${newStage}! ✨`);
            this.phaserGame.events.emit('evolve', newStage);
            this.sounds.growth();
        }
    }

    updateUI() {
        this.elements.hungerBar.style.width = `${this.stats.hunger}%`;
        this.elements.sleepBar.style.width = `${this.stats.sleep}%`;
        this.elements.happinessBar.style.width = `${this.stats.happiness}%`;
        this.elements.hygieneBar.style.width = `${this.stats.hygiene}%`;
        this.elements.hungerValue.innerText = `${Math.round(this.stats.hunger)}%`;
        this.elements.sleepValue.innerText = `${Math.round(this.stats.sleep)}%`;
        this.elements.happinessValue.innerText = `${Math.round(this.stats.happiness)}%`;
        this.elements.hygieneValue.innerText = `${Math.round(this.stats.hygiene)}%`;
        this.elements.growthInfo.innerText = `Day ${this.growth.days} • ${this.growth.stage}`;
    }

    getGrowthStage() {
        if (this.growth.days < 3) return "Newborn";
        if (this.growth.days < 7) return "Infant";
        if (this.growth.days < 14) return "Crawler";
        return "Toddler";
    }

    checkStatus() {
        if (this.stats.hunger < 20) this.showMessage("Baby is hungry! 🍼");
        else if (this.stats.sleep < 20) this.showMessage("Baby is sleepy! 💤");
        else if (this.stats.happiness < 20) this.showMessage("Baby is sad! 🧸");
        else if (this.stats.hygiene < 20) this.showMessage("Baby needs a bath! 🛁");
    }

    showMessage(text) { this.elements.statusMessage.innerText = text; this.elements.statusMessage.style.opacity = 1; }
}

window.addEventListener('DOMContentLoaded', () => { new GameController(); });
