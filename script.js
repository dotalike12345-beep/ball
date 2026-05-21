// Ball Physics Simulator with Music Sync
class BallSimulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.running = false;
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.isPlaying = false;
        this.lastTouchTime = 0;

        // Ball properties
        this.ballRadius = 15;
        this.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2 - 100,
            vx: 5,
            vy: 3,
            radius: this.ballRadius
        };

        // Physics constants
        this.gravity = 0.3;
        this.friction = 0.999;
        this.bounce = 0.85;
        this.wallThickness = 50;

        // Circle boundary
        this.circle = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: Math.min(canvas.width, canvas.height) / 2 - 40
        };

        this.isTouchingWall = false;

        // Setup event listeners
        this.setupEventListeners();
        this.resizeCanvas();
    }

    setupEventListeners() {
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadAudio());
        document.getElementById('startBtn').addEventListener('click', () => this.toggleSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = Math.min(800, rect.width - 40);
        this.canvas.height = this.canvas.width * 0.75;

        // Update circle position and size
        this.circle.x = this.canvas.width / 2;
        this.circle.y = this.canvas.height / 2;
        this.circle.radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 40;

        // Reset ball position
        if (!this.running) {
            this.ball.x = this.circle.x;
            this.ball.y = this.circle.y - this.circle.radius + 100;
        }
    }

    uploadAudio() {
        document.getElementById('fileInput').click();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }

                this.audioBuffer = await this.audioContext.decodeAudioData(e.target.result);
                document.getElementById('musicStatus').textContent = 'Загружена ✓';
                console.log('Audio loaded successfully');
            } catch (error) {
                console.error('Error loading audio:', error);
                document.getElementById('musicStatus').textContent = 'Ошибка загрузки';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    toggleSimulation() {
        if (!this.audioBuffer) {
            alert('Пожалуйста, загрузите музыку сначала!');
            return;
        }

        this.running = !this.running;

        if (this.running) {
            document.getElementById('startBtn').textContent = '⏸️ Пауза';
            this.animate();
        } else {
            document.getElementById('startBtn').textContent = '▶️ Старт';
            this.stopMusic();
        }
    }

    reset() {
        this.running = false;
        this.stopMusic();
        this.ball.x = this.circle.x;
        this.ball.y = this.circle.y - this.circle.radius + 100;
        this.ball.vx = 5;
        this.ball.vy = 3;
        this.isTouchingWall = false;
        document.getElementById('startBtn').textContent = '▶️ Старт';
        document.getElementById('wallIndicator').classList.remove('active');
        this.draw();
    }

    stopMusic() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
        }
        this.isPlaying = false;
    }

    playMusic() {
        if (this.isPlaying || !this.audioBuffer || !this.audioContext) return;

        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.connect(this.audioContext.destination);

        // Play from the last touch time position
        const playbackTime = (Date.now() - this.lastTouchTime) / 1000;
        const startTime = Math.max(0, playbackTime);

        if (startTime < this.audioBuffer.duration) {
            this.audioSource.start(0, startTime);
            this.isPlaying = true;

            // Stop after a certain duration or when buffer ends
            this.audioSource.onended = () => {
                this.isPlaying = false;
                this.audioSource = null;
            };
        }
    }

    update() {
        // Apply gravity
        this.ball.vy += this.gravity;

        // Apply friction
        this.ball.vx *= this.friction;
        this.ball.vy *= this.friction;

        // Update position
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Check collision with circle boundary
        const dx = this.ball.x - this.circle.x;
        const dy = this.ball.y - this.circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.circle.radius - this.ball.radius;

        this.isTouchingWall = distance >= minDistance - 5;

        if (distance >= minDistance) {
            // Collision detected
            const angle = Math.atan2(dy, dx);
            this.ball.x = this.circle.x + Math.cos(angle) * minDistance;
            this.ball.y = this.circle.y + Math.sin(angle) * minDistance;

            // Bounce
            const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
            this.ball.vx = Math.cos(angle) * speed * this.bounce;
            this.ball.vy = Math.sin(angle) * speed * this.bounce;

            // Music sync
            if (!this.isPlaying) {
                this.lastTouchTime = Date.now();
                this.playMusic();
            }

            // Update indicator
            document.getElementById('wallIndicator').classList.add('active');
        } else {
            document.getElementById('wallIndicator').classList.remove('active');
            if (this.isPlaying && !this.isTouchingWall) {
                this.stopMusic();
            }
        }

        // Update speed display
        const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
        document.getElementById('speedValue').textContent = Math.round(speed * 10) + ' px/s';
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw circle boundary
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(this.circle.x, this.circle.y, this.circle.radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw ball
        this.ctx.fillStyle = '#ff3333';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw ball shadow/glow when touching wall
        if (this.isTouchingWall) {
            this.ctx.strokeStyle = 'rgba(255, 51, 51, 0.5)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    animate() {
        this.update();
        this.draw();

        if (this.running) {
            requestAnimationFrame(() => this.animate());
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const simulator = new BallSimulator(canvas);
    simulator.draw();
});