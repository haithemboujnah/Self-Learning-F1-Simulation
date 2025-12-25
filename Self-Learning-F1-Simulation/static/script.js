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
    
    updateUI() {
        if (!this.gameState) return;
        
        const totalSeconds = Math.floor(this.gameState.time / 20);

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        document.getElementById('gameTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.updateLeaderboard();
        
        if (this.gameState.race_finished) {
            this.showFinalResults();
        }
    }

    updateLeaderboard() {
        if (!this.gameState || !this.gameState.cars) return;
        
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        
        const sortedCars = [...this.gameState.cars].sort((a, b) => {
            if (a.finished && b.finished) {
                return a.position - b.position;
            }
            if (a.finished && !b.finished) {
                return -1;
            }
            if (!a.finished && b.finished) {
                return 1;
            }
            if (b.progress !== a.progress) return b.progress - a.progress;
            return b.speed - a.speed;
        });
        
        sortedCars.forEach((car, index) => {
            const row = document.createElement('tr');
            
            const positionCell = document.createElement('td');
            if (car.finished) {
                switch(car.position) {
                    case 1:
                        positionCell.innerHTML = '🥇';
                        positionCell.style.fontSize = '1.5rem';
                        row.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
                        break;
                    case 2:
                        positionCell.innerHTML = '🥈';
                        positionCell.style.fontSize = '1.5rem';
                        row.style.backgroundColor = 'rgba(192, 192, 192, 0.1)';
                        break;
                    case 3:
                        positionCell.innerHTML = '🥉';
                        positionCell.style.fontSize = '1.5rem';
                        row.style.backgroundColor = 'rgba(205, 127, 50, 0.1)';
                        break;
                    default:
                        positionCell.textContent = car.position;
                        positionCell.style.fontWeight = 'bold';
                        positionCell.style.color = '#fff';
                }
            } else {
                positionCell.textContent = index + 1;
                positionCell.style.fontWeight = 'bold';
                positionCell.style.color = '#aaa';
            }
            
            // Voiture
            const carCell = document.createElement('td');
            let statusIcon = '';
            if (car.finished) {
                statusIcon = '🏁';
                if (car.position === 1) statusIcon = '👑';
            } else if (car.crashed) {
                statusIcon = '💥';
            }
            
            carCell.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; background-color: ${car.color}; border-radius: 50%;"></div>
                <span>Voiture ${car.id + 1}</span>
                <span>${statusIcon}</span>
            </div>`;
            
            // Tours
            const lapCell = document.createElement('td');
            lapCell.textContent = car.lap;
            if (car.lap >= this.gameState.max_laps) {
                lapCell.style.color = '#00ff00';
                lapCell.style.fontWeight = 'bold';
            }
            
            // Progression
            const progressCell = document.createElement('td');
            progressCell.textContent = car.progress.toFixed(2);
            
            // Vitesse
            const speedCell = document.createElement('td');
            speedCell.textContent = car.speed.toFixed(1);
            
            // Statut
            const statusCell = document.createElement('td');
            if (car.finished) {
                statusCell.textContent = `Arrivée #${car.position}`;
                switch(car.position) {
                    case 1:
                        statusCell.textContent = 'PREMIER 🏆';
                        statusCell.style.color = '#ffd700';
                        break;
                    case 2:
                        statusCell.textContent = 'DEUXIÈME 🥈';
                        statusCell.style.color = '#c0c0c0';
                        break;
                    case 3:
                        statusCell.textContent = 'TROISIÈME 🥉';
                        statusCell.style.color = '#cd7f32';
                        break;
                    default:
                        statusCell.textContent = `Position ${car.position}`;
                        statusCell.style.color = '#649eb7ff';
                }
                statusCell.style.fontWeight = 'bold';
            } else if (car.crashed) {
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
        
        const header = document.querySelector('.leaderboard h2');
        if (header) {
            if (this.gameState.race_finished) {
                header.innerHTML = `🏁 CLASSEMENT FINAL 🏁`;
                header.style.color = '#ffd700';
            } else if (this.gameState.finished_cars.length > 0) {
                const finishedCount = this.gameState.finished_cars.length;
                const totalCars = this.gameState.cars.length;
                header.innerHTML = `Classement (${finishedCount}/${totalCars} arrivées)`;
                header.style.color = '#ffff00';
            } else {
                header.innerHTML = `Classement`;
                header.style.color = '#ff0000';
            }
            header.style.textAlign = 'center';
        }
    }

    showFinalResults() {
        let resultsDiv = document.getElementById('finalResults');
        
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'finalResults';
            resultsDiv.className = 'final-results';
            
            resultsDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                padding: 30px;
                border-radius: 20px;
                border: 5px solid #ffd700;
                box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
                z-index: 1000;
                text-align: center;
                max-width: 600px;
                width: 90%;
            `;
            
            document.body.appendChild(resultsDiv);
        }
        
        let resultsHTML = `
            <h2 style="color: #ffd700; margin-bottom: 20px; font-size: 2rem;">🏁 COURSE TERMINÉE ! 🏁</h2>
            <h3 style="color: #fff; margin-bottom: 20px;">Classement Final</h3>
            <div style="margin-bottom: 30px;">
        `;
        
        this.gameState.finished_cars.forEach((finisher, index) => {
            const car = this.gameState.cars.find(c => c.id === finisher.id);
            let medal = '';
            let positionText = '';
            
            switch(finisher.position) {
                case 1:
                    medal = '🥇';
                    positionText = 'PREMIÈRE PLACE';
                    break;
                case 2:
                    medal = '🥈';
                    positionText = 'DEUXIÈME PLACE';
                    break;
                case 3:
                    medal = '🥉';
                    positionText = 'TROISIÈME PLACE';
                    break;
                default:
                    medal = '🏁';
                    positionText = `${finisher.position}ème place`;
            }
            
            resultsHTML += `
                <div style="background: ${index < 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'}; 
                            padding: 15px; 
                            margin: 10px 0; 
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            border-left: 5px solid ${car ? car.color : '#fff'}">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 2rem;">${medal}</span>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: ${car ? car.color : '#fff'}">
                                Voiture ${finisher.id + 1}
                            </div>
                            <div style="color: #ccc;">${positionText}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #aaa;">Temps: ${Math.floor(finisher.finish_time / 20)}s</div>
                        <div style="color: #aaa;">${finisher.lap} tours</div>
                    </div>
                </div>
            `;
        });
        
        resultsHTML += `
            </div>
            <button id="newRaceBtn" style="background: linear-gradient(to right, #00b09b, #96c93d); 
                                        color: white; 
                                        padding: 15px 30px; 
                                        border: none; 
                                        border-radius: 10px; 
                                        font-size: 1.2rem; 
                                        cursor: pointer;
                                        font-weight: bold;">
                🏁 Nouvelle Course 🏁
            </button>
        `;
        
        resultsDiv.innerHTML = resultsHTML;
        
        document.getElementById('newRaceBtn').addEventListener('click', () => {
            this.resetGame();
            resultsDiv.remove();
        });
        
        if (this.music && !this.music.paused) {
            this.music.pause();
            this.updateMusicUI(false);
        }
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

