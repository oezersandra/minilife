class BabyScene extends Phaser.Scene {
    constructor() {
        super('BabyScene');
    }

    preload() {
        // We'll load actual assets here later. 
        // For now, we'll create a placeholder baby.
    }

    create() {
        // Create a placeholder baby character (a cute circle for now)
        this.baby = this.add.container(200, 200);
        
        const head = this.add.circle(0, 0, 50, 0xffccaa);
        const eyeL = this.add.circle(-15, -10, 5, 0x000000);
        const eyeR = this.add.circle(15, -10, 5, 0x000000);
        const mouth = this.add.arc(0, 10, 20, 0, 180, false, 0x000000);
        mouth.setLineWidth(2);

        this.baby.add([head, eyeL, eyeR, mouth]);

        // Floating animation
        this.tweens.add({
            targets: this.baby,
            y: 190,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Event listeners for game actions
        this.game.events.on('feed', () => this.onAction('🍼', 0x00ff00));
        this.game.events.on('sleep', () => this.onAction('💤', 0xaaaaff));
        this.game.events.on('play', () => this.onAction('🧸', 0xff00ff));
    }

    onAction(emoji, color) {
        // Show emoji feedback
        const text = this.add.text(0, -60, emoji, { fontSize: '32px' }).setOrigin(0.5);
        this.baby.add(text);

        this.tweens.add({
            targets: text,
            y: -120,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });

        // Brief scale jump
        this.tweens.add({
            targets: this.baby,
            scale: 1.2,
            duration: 100,
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
            happiness: 100
        };

        this.elements = {
            hungerBar: document.getElementById('hunger-bar'),
            sleepBar: document.getElementById('sleep-bar'),
            happinessBar: document.getElementById('happiness-bar'),
            hungerValue: document.getElementById('hunger-value'),
            sleepValue: document.getElementById('sleep-value'),
            happinessValue: document.getElementById('happiness-value'),
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
        
        this.setupEventListeners();
        this.startGameLoop();
    }

    setupEventListeners() {
        document.getElementById('btn-feed').addEventListener('click', () => this.interact('hunger', 20, "Yummy! Baby is eating.", 'feed'));
        document.getElementById('btn-sleep').addEventListener('click', () => this.interact('sleep', 30, "Shhh... Baby is resting.", 'sleep'));
        document.getElementById('btn-play').addEventListener('click', () => this.interact('happiness', 25, "Giggle! Baby is playing.", 'play'));
    }

    interact(stat, amount, message, eventName) {
        this.stats[stat] = Math.min(100, this.stats[stat] + amount);
        this.updateUI();
        this.showMessage(message);
        this.phaserGame.events.emit(eventName);
    }

    startGameLoop() {
        setInterval(() => {
            this.stats.hunger = Math.max(0, this.stats.hunger - 0.5);
            this.stats.sleep = Math.max(0, this.stats.sleep - 0.3);
            this.stats.happiness = Math.max(0, this.stats.happiness - 0.7);
            
            this.updateUI();
            this.checkStatus();
        }, 1000);
    }

    updateUI() {
        this.elements.hungerBar.style.width = `${this.stats.hunger}%`;
        this.elements.sleepBar.style.width = `${this.stats.sleep}%`;
        this.elements.happinessBar.style.width = `${this.stats.happiness}%`;

        this.elements.hungerValue.innerText = `${Math.round(this.stats.hunger)}%`;
        this.elements.sleepValue.innerText = `${Math.round(this.stats.sleep)}%`;
        this.elements.happinessValue.innerText = `${Math.round(this.stats.happiness)}%`;
    }

    checkStatus() {
        if (this.stats.hunger < 20) {
            this.showMessage("Baby is hungry! 🍼");
        } else if (this.stats.sleep < 20) {
            this.showMessage("Baby is sleepy! 💤");
        } else if (this.stats.happiness < 20) {
            this.showMessage("Baby is sad! 🧸");
        }
    }

    showMessage(text) {
        this.elements.statusMessage.innerText = text;
        this.elements.statusMessage.style.opacity = 1;
    }
}

// Initialize the game controller
window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
