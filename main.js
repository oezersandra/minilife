class BabyScene extends Phaser.Scene {
    constructor() {
        super('BabyScene');
    }

    preload() {
        this.load.image('baby', 'baby.png');
    }

    create() {
        this.baby = this.add.container(200, 200);
        this.babyImage = this.add.image(0, 0, 'baby');
        this.babyImage.setDisplaySize(180, 180);
        
        const shadow = this.add.circle(0, 80, 60, 0x000000, 0.2);
        shadow.setScale(1, 0.3);
        
        this.baby.add([shadow, this.babyImage]);

        this.tweens.add({
            targets: this.baby,
            y: 190,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Event listeners for game actions
        this.game.events.on('feed', () => this.onAction('🍼'));
        this.game.events.on('sleep', () => this.onAction('💤'));
        this.game.events.on('play', () => this.onAction('🧸'));
        this.game.events.on('clean', () => this.onAction('🛁'));
    }

    onAction(emoji) {
        const text = this.add.text(0, -100, emoji, { fontSize: '48px' }).setOrigin(0.5);
        this.baby.add(text);

        this.tweens.add({
            targets: text,
            y: -160,
            alpha: 0,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy()
        });

        this.tweens.add({
            targets: this.babyImage,
            scale: 1.1,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
}

class GameController {
    constructor() {
        this.stats = {
            hunger: 100,
            sleep: 100,
            happiness: 100,
            hygiene: 100
        };
        
        this.growth = {
            days: 1,
            lastUpdate: Date.now()
        };

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

        const config = {
            type: Phaser.AUTO,
            parent: 'phaser-container',
            width: 400,
            height: 400,
            transparent: true,
            scene: BabyScene
        };

        this.phaserGame = new Phaser.Game(config);
        
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

    saveGame() {
        const data = {
            stats: this.stats,
            growth: this.growth
        };
        localStorage.setItem('minilife_save', JSON.stringify(data));
    }

    setupEventListeners() {
        document.getElementById('btn-feed').addEventListener('click', () => this.interact('hunger', 20, "Yummy! Baby is eating.", 'feed'));
        document.getElementById('btn-sleep').addEventListener('click', () => this.interact('sleep', 30, "Shhh... Baby is resting.", 'sleep'));
        document.getElementById('btn-play').addEventListener('click', () => this.interact('happiness', 25, "Giggle! Baby is playing.", 'play'));
        document.getElementById('btn-clean').addEventListener('click', () => this.interact('hygiene', 35, "Splosh! Baby is clean now.", 'clean'));
    }

    interact(stat, amount, message, eventName) {
        this.stats[stat] = Math.min(100, this.stats[stat] + amount);
        this.updateUI();
        this.showMessage(message);
        this.phaserGame.events.emit(eventName);
        this.saveGame();
    }

    startGameLoop() {
        setInterval(() => {
            // Stats decay
            this.stats.hunger = Math.max(0, this.stats.hunger - 0.2);
            this.stats.sleep = Math.max(0, this.stats.sleep - 0.1);
            this.stats.happiness = Math.max(0, this.stats.happiness - 0.3);
            this.stats.hygiene = Math.max(0, this.stats.hygiene - 0.15);
            
            // Growth progression (1 day every 5 minutes for testing, can be real-time later)
            const now = Date.now();
            if (now - this.growth.lastUpdate > 300000) { // 5 minutes
                this.growth.days++;
                this.growth.lastUpdate = now;
                this.showMessage("Yay! Baby is growing! 🎉");
            }
            
            this.updateUI();
            this.checkStatus();
            this.saveGame();
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

        const stage = this.getGrowthStage();
        this.elements.growthInfo.innerText = `Day ${this.growth.days} • ${stage}`;
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

    showMessage(text) {
        this.elements.statusMessage.innerText = text;
        this.elements.statusMessage.style.opacity = 1;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
