class GameRenderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = null;
        this.lastUpdate = 0;
        this.animationId = null;
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        
        this.init();
    }
    
    async init() {
        await this.fetchGameState();
        this.setupMusicControls();
        this.render();
        
        this.testCar();
        setInterval(() => this.fetchGameState(), 100);
        this.testMusic();
    }

    async testMusic() {
        try {
            const response = await fetch(this.music.src);
            if (response.ok) {
                console.log('Fichier audio trouvé:', this.music.src);
                
                this.music.load();
                
                document.addEventListener('click', () => {
                    if (this.music.paused) {
                        this.music.load();
                    }
                }, { once: true });
            } else {
                console.error('Fichier audio non trouvé:', this.music.src);
                document.getElementById('songTitle').textContent = 'Fichier non trouvé!';
            }
        } catch (error) {
            console.error('Erreur lors du test du fichier audio:', error);
        }
    }
    
    async fetchGameState() {
        try {
            const response = await fetch('/api/game_state');
            this.gameState = await response.json();
            
            this.updateUI();
        } catch (error) {
            console.error('Erreur lors du chargement de l\'état du jeu:', error);
        }
    }
    
    setupMusicControls() {
        this.music = document.getElementById('raceMusic');
        this.musicToggle = document.getElementById('musicToggle');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.musicIcon = document.getElementById('musicIcon');
        this.musicStatus = document.getElementById('musicStatus');
        this.musicProgress = document.getElementById('musicProgress');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        
        this.musicToggle.addEventListener('click', () => this.toggleMusic());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        this.music.addEventListener('timeupdate', () => this.updateMusicProgress());
        this.music.addEventListener('loadedmetadata', () => this.updateTotalTime());
        this.music.addEventListener('ended', () => this.music.currentTime = 0);
        this.music.addEventListener('play', () => this.updateMusicUI(true));
        this.music.addEventListener('pause', () => this.updateMusicUI(false));

        this.setVolume(this.volumeSlider.value);
    }

    toggleMusic() {
        if (this.music.paused) {
            this.music.play().catch(e => {
                console.error('Erreur de lecture audio:', e);
                alert('Impossible de lire la musique. Assurez-vous que le fichier existe et que votre navigateur supporte l\'audio.');
            });
        } else {
            this.music.pause();
        }
    }

    setVolume(value) {
        const volume = value / 100;
        this.music.volume = volume;
        this.volumeValue.textContent = `${value}%`;
        
        if (value == 0) {
            this.musicIcon.textContent = '🔇';
        } else if (value < 30) {
            this.musicIcon.textContent = '🔈';
        } else if (value < 70) {
            this.musicIcon.textContent = '🔉';
        } else {
            this.musicIcon.textContent = '🔊';
        }
    }

    updateMusicProgress() {
        if (this.music.duration) {
            const progress = (this.music.currentTime / this.music.duration) * 100;
            this.musicProgress.style.width = `${progress}%`;
            
            this.currentTime.textContent = this.formatTime(this.music.currentTime);
        }
    }

    updateTotalTime() {
        if (this.music.duration) {
            this.totalTime.textContent = this.formatTime(this.music.duration);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateMusicUI(playing) {
        if (playing) {
            this.musicStatus.textContent = 'En cours';
            this.musicStatus.style.color = '#00ff00';
            this.musicToggle.classList.add('music-playing');
            this.musicIcon.style.animation = 'pulse 2s infinite';
        } else {
            this.musicStatus.textContent = 'Arrêtée';
            this.musicStatus.style.color = '#ff0000';
            this.musicToggle.classList.remove('music-playing');
            this.musicIcon.style.animation = 'none';
        }
    }

    async startGame() {
        try {
            await fetch('/api/start_game', { method: 'POST' });
            console.log('Jeu démarré');
            
            if (this.music.paused) {
                this.music.play().catch(e => {
                    console.warn('La musique ne peut pas démarrer automatiquement:', e);
                });
            }
        } catch (error) {
            console.error('Erreur lors du démarrage du jeu:', error);
        }
    }

    async stopGame() {
        try {
            await fetch('/api/stop_game', { method: 'POST' });
            console.log('Jeu arrêté');
        } catch (error) {
            console.error('Erreur lors de l\'arrêt du jeu:', error);
        }
    }
    
    async resetGame() {
        try {
            await fetch('/api/reset_game', { method: 'POST' });
            console.log('Jeu réinitialisé');
        } catch (error) {
            console.error('Erreur lors de la réinitialisation du jeu:', error);
        }
    }
    
    async testCar() {
        try {
            const response = await fetch('/api/test_car');
            const data = await response.json();
            console.log('Test voiture:', data);
            
            if (data.sensors) {
                console.log('Capteurs:', data.sensors);
            }
        } catch (error) {
            console.error('Erreur test:', error);
        }
    }

    updateUI() {
        if (!this.gameState) return;
        
        document.getElementById('gameTime').textContent = Math.floor(this.gameState.time / 20);
        
        this.updateLeaderboard();
    }
    
    updateLeaderboard() {
        if (!this.gameState || !this.gameState.cars) return;
        
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        
        const sortedCars = [...this.gameState.cars].sort((a, b) => {
            if (b.progress !== a.progress) return b.progress - a.progress;
            return b.last_checkpoint - a.last_checkpoint;
        });
        
        sortedCars.forEach((car, index) => {
            const row = document.createElement('tr');
            
            const positionCell = document.createElement('td');
            positionCell.textContent = index + 1;
            positionCell.style.fontWeight = 'bold';
            positionCell.style.color = index === 0 ? '#ffd700' : '#fff';
            
            // Voiture
            const carCell = document.createElement('td');
            carCell.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; background-color: ${car.color}; border-radius: 50%;"></div>
                <span>Voiture ${car.id + 1}</span>
            </div>`;
            
            // Tours
            const lapCell = document.createElement('td');
            lapCell.textContent = car.lap;
            
            // Progression
            const progressCell = document.createElement('td');
            progressCell.textContent = car.progress.toFixed(2);
            
            // Vitesse
            const speedCell = document.createElement('td');
            speedCell.textContent = car.speed.toFixed(1);
            
            // Statut
            const statusCell = document.createElement('td');
            if (car.crashed) {
                statusCell.textContent = 'Accidenté';
                statusCell.style.color = '#ff0000';
            } else {
                statusCell.textContent = 'En course';
                statusCell.style.color = '#00ff00';
            }
            
            row.appendChild(positionCell);
            row.appendChild(carCell);
            row.appendChild(lapCell);
            row.appendChild(progressCell);
            row.appendChild(speedCell);
            row.appendChild(statusCell);
            
            tbody.appendChild(row);
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawTrack();
        this.drawCheckpoints();
        this.drawCars();
        
        this.animationId = requestAnimationFrame(() => this.render());
    }
    
    drawTrack() {
        if (!this.gameState || !this.gameState.track) return;
        
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 60;
        this.ctx.lineCap = 'round';
        
        this.gameState.track.forEach(segment => {
            const [x1, y1, x2, y2, width] = segment;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        
        this.gameState.track.forEach(segment => {
            const [x1, y1, x2, y2, width] = segment;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            
        });
    }
    
    drawCheckpoints() {
        if (!this.gameState || !this.gameState.checkpoints) return;
        
        this.gameState.checkpoints.forEach((checkpoint, index) => {
            const [x, y, radius] = checkpoint;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = index === 0 ? '#00ff00' : 'rgba(0, 255, 0, 0.3)';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(index + 1, x, y);
        });
    }
    
    drawCars() {
        if (!this.gameState || !this.gameState.cars) return;
        
        this.gameState.cars.forEach(car => {
            if (car.crashed) {
                this.drawCar(car, 0.5);
                
                this.ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(car.x, car.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(car.x, car.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.drawCar(car, 1);
                this.drawSensors(car);
            }
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(car.id + 1, car.x, car.y - 25);
        });
    }
    
    drawCar(car, alpha = 1) {
        this.ctx.save();
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.angle * Math.PI / 180);
        this.ctx.fillStyle = car.color;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillRect(-15, -8, 30, 16);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(-10, -6, 20, 12);
        this.ctx.restore();
    }
    
    drawSensors(car) {
        const sensorAngles = [-30, -15, 0, 15, 30];
        
        sensorAngles.forEach(angle => {
            const sensorAngle = car.angle + angle;
            const radAngle = sensorAngle * Math.PI / 180;
            
            const endX = car.x + Math.cos(radAngle) * 50;
            const endY = car.y + Math.sin(radAngle) * 50;
            
            this.ctx.beginPath();
            this.ctx.moveTo(car.x, car.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fill();
        });
    }
    
    debugGameState() {
        if (!this.gameState || !this.gameState.cars) return;
        
        console.log('=== État du jeu ===');
        console.log(`Temps: ${this.gameState.time}`);
        console.log('Voitures:');
        
        this.gameState.cars.forEach((car, index) => {
            console.log(`Voiture ${index + 1}:`);
            console.log(`  Position: (${car.x.toFixed(1)}, ${car.y.toFixed(1)})`);
            console.log(`  Vitesse: ${car.speed.toFixed(1)}`);
            console.log(`  Angle: ${car.angle.toFixed(1)}°`);
            console.log(`  Tours: ${car.lap}`);
            console.log(`  Progression: ${car.progress.toFixed(2)}`);
            console.log(`  Statut: ${car.crashed ? 'Accidenté' : 'En course'}`);
            console.log(`  Checkpoint: ${car.last_checkpoint + 1}/${this.gameState.checkpoints.length}`);
        });
    }
}

setInterval(() => this.debugGameState(), 5000);

document.addEventListener('DOMContentLoaded', () => {
    new GameRenderer();
});

