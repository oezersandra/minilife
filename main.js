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
}

class BabyScene extends Phaser.Scene {
    constructor() { super('BabyScene'); }
    preload() { 
        // 1025 / 5 = 205. We use 205x205 to be 100% precise.
        this.load.spritesheet('baby_sheet', 'baby_spritesheet.png', { 
            frameWidth: 205, 
            frameHeight: 205
        });
    }

    create() {
        // Only ONE sprite, no container, no complex layers
        this.baby = this.add.sprite(200, 200, 'baby_sheet', 3);
        this.baby.setDisplaySize(240, 240);

        // Define clean animations
        this.anims.create({
            key: 'idle',
            frames: [{ key: 'baby_sheet', frame: 3 }],
            frameRate: 1
        });

        this.anims.create({
            key: 'eat',
            frames: this.anims.generateFrameNumbers('baby_sheet', { start: 0, end: 4 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'sleep',
            frames: this.anims.generateFrameNumbers('baby_sheet', { start: 5, end: 9 }),
            frameRate: 4,
            repeat: -1,
            yoyo: true
        });

        this.anims.create({
            key: 'cry',
            frames: this.anims.generateFrameNumbers('baby_sheet', { start: 10, end: 14 }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'play',
            frames: this.anims.generateFrameNumbers('baby_sheet', { start: 15, end: 19 }),
            frameRate: 10,
            repeat: 1
        });

        // Add a gentle floating movement to the whole sprite
        this.tweens.add({
            targets: this.baby,
            y: 205,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.baby.play('idle');

        // Events
        this.game.events.on('feed', () => this.playAnim('eat'));
        this.game.events.on('sleep', () => this.playAnim('sleep'));
        this.game.events.on('play', () => this.playAnim('play'));
        this.game.events.on('clean', () => this.playAnim('idle'));
        this.game.events.on('status_change', (status) => {
            if (this.baby.anims.currentAnim?.key !== 'sleep') {
                if (status === 'SAD' && this.baby.anims.currentAnim?.key !== 'cry') this.baby.play('cry');
                else if (status === 'HAPPY' && this.baby.anims.currentAnim?.key === 'cry') this.baby.play('idle');
            }
        });
    }

    playAnim(key) {
        this.baby.play(key, true);
        if (key !== 'sleep' && key !== 'cry') {
            this.baby.once('animationcomplete', () => {
                this.baby.play('idle');
            });
        }
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
            type: Phaser.AUTO, parent: 'phaser-container', width: 400, height: 400, transparent: true, antialias: true, scene: BabyScene
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
            this.stats = data.stats; this.growth = data.growth; this.updateUI();
        }
    }
    saveGame() { localStorage.setItem('minilife_save', JSON.stringify({ stats: this.stats, growth: this.growth })); }
    setupEventListeners() {
        document.getElementById('btn-feed').addEventListener('click', () => this.interact('hunger', 20, "Mmmmh! Baby isst.", 'feed', () => this.sounds.feed()));
        document.getElementById('btn-sleep').addEventListener('click', () => this.interact('sleep', 30, "Shhh... Baby schläft.", 'sleep', () => this.sounds.sleep()));
        document.getElementById('btn-play').addEventListener('click', () => this.interact('happiness', 25, "Yay! Baby spielt.", 'play', () => this.sounds.play()));
        document.getElementById('btn-clean').addEventListener('click', () => this.interact('hygiene', 35, "Sauber! Baby ist frisch.", 'clean', () => this.sounds.clean()));
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
            this.updateUI(); this.checkStatus(); this.saveGame();
        }, 1000);
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
        this.elements.growthInfo.innerText = `Tag ${this.growth.days} • Kleinkind`;
    }
    checkStatus() {
        let currentStatus = 'HAPPY';
        if (this.stats.hunger < 30 || this.stats.sleep < 30 || this.stats.happiness < 30 || this.stats.hygiene < 30) currentStatus = 'SAD';
        this.phaserGame.events.emit('status_change', currentStatus);
    }
    showMessage(text) { this.elements.statusMessage.innerText = text; this.elements.statusMessage.style.opacity = 1; }
}
window.addEventListener('DOMContentLoaded', () => { new GameController(); });
