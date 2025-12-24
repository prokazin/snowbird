import Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js';

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.balance = 0; // -1 до 1
        this.speed = 8;   // Скорость скольжения вперёд
        this.score = 0;
        this.grinding = true;
    }

    preload() {
        // Ассеты (скачайте и положите в assets/)
        this.load.image('bg', 'assets/background.jpg'); // Снежный склон/горы
        this.load.image('rail', 'assets/rail.png');     // Длинная перила (горизонтальная с перспективой)
        this.load.spritesheet('player', 'assets/player.png', { frameWidth: 100, frameHeight: 150 }); // 3 кадра: левый наклон, центр, правый
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Фон (парраллакс для ощущения скорости)
        this.bg = this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0);

        // Бесконечная перила (тайлы для бесконечности)
        this.rail = this.add.tileSprite(0, height - 150, width * 2, 100, 'rail').setOrigin(0, 0.5);

        // Сноубордист (от 3-го лица сзади)
        this.player = this.add.sprite(width / 2, height - 200, 'player').setScale(1.2);

        // Анимации наклона
        this.anims.create({ key: 'left', frames: [{ key: 'player', frame: 0 }] });
        this.anims.create({ key: 'center', frames: [{ key: 'player', frame: 1 }] });
        this.anims.create({ key: 'right', frames: [{ key: 'player', frame: 2 }] });
        this.player.play('center');

        // Камера следует за игроком (но игрок статичен по X, двигается мир)
        this.cameras.main.startFollow(this.player, true, 0, 1);

        // Счёт
        this.scoreText = this.add.text(20, 20, 'Очки: 0', { fontSize: '40px', color: '#fff' }).setScrollFactor(0);

        // Разрешение на наклон (для iOS)
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            tg.MainButton.setText('Разрешить наклон устройства').show().onClick(() => {
                DeviceMotionEvent.requestPermission().then(() => this.startMotion());
                tg.MainButton.hide();
            });
        } else {
            this.startMotion();
        }

        // Фоллбек клавиатура
        this.keys = this.input.keyboard.createCursorKeys();
    }

    startMotion() {
        window.addEventListener('devicemotion', (e) => {
            if (e.accelerationIncludingGravity) {
                this.balance = Phaser.Math.Clamp(e.accelerationIncludingGravity.x / 10, -1, 1);
            }
        });
    }

    update() {
        if (!this.grinding) return;

        // Парраллакс фона и перил для ощущения движения вперёд
        this.bg.tilePositionY -= this.speed * 0.5;
        this.rail.tilePositionY -= this.speed;

        // Наклон игрока (визуально)
        if (this.balance < -0.2) {
            this.player.play('left', true);
            this.player.x -= 4; // Смещение влево при наклоне
        } else if (this.balance > 0.2) {
            this.player.play('right', true);
            this.player.x += 4;
        } else {
            this.player.play('center', true);
        }

        // Проверка падения (слишком сильный наклон или выход за края)
        if (Math.abs(this.balance) > 0.7 || this.player.x < 100 || this.player.x > this.scale.width - 100) {
            this.gameOver();
        }

        // Начисление очков за скольжение
        this.score += 1;
        this.scoreText.setText('Очки: ' + Math.floor(this.score / 10));

        // Фоллбек клавиши
        if (this.keys.left.isDown) this.balance = -0.6;
        if (this.keys.right.isDown) this.balance = 0.6;
    }

    gameOver() {
        this.grinding = false;
        tg.showAlert(`Падение! Твои очки: ${Math.floor(this.score / 10)}`);
        this.time.delayedCall(2000, () => {
            this.score = 0;
            this.player.x = this.scale.width / 2;
            this.grinding = true;
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
    physics: { default: 'arcade' },
    scene: GameScene
};

new Phaser.Game(config);
