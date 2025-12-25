import random
from flask import Flask, render_template, jsonify, request
import json
import numpy as np
from game_logic import F1Game, CarAI
import threading
import time

app = Flask(__name__)

game = F1Game()
game_initialized = False
game_thread = None
game_running = False

def init_game():
    """Initialise le jeu avec des voitures AI"""
    global game, game_initialized
    if not game_initialized:
        for i in range(5):
            ai_car = CarAI(car_id=i)
            game.add_car(ai_car)
        
        game.create_track()
        game_initialized = True

def run_game_loop():
    """Boucle principale du jeu"""
    global game_running, game
    while game_running:
        game.update()
        time.sleep(0.05)  

@app.route('/')
def index():
    """Page d'accueil"""
    init_game()
    return render_template('index.html')

@app.route('/api/game_state')
def game_state():
    """API pour obtenir l'état actuel du jeu"""
    if not game_initialized:
        init_game()
    
    cars_data = []
    for car in game.cars:
        final_position = None
        for finisher in game.finished_cars:
            if finisher['id'] == car.car_id:
                final_position = finisher['position']
                break
        
        cars_data.append({
            'id': car.car_id,
            'x': car.x,
            'y': car.y,
            'angle': car.angle,
            'speed': car.speed,
            'lap': car.lap,
            'progress': min(car.progress, 3.0),  
            'color': car.color,
            'is_ai': True,
            'crashed': car.crashed,
            'finished': car.car_id in [f['id'] for f in game.finished_cars],
            'position': final_position
        })
    
    return jsonify({
        'cars': cars_data,
        'track': game.track_segments,
        'checkpoints': game.checkpoints,
        'max_laps': game.max_laps,
        'time': game.game_time,
        'race_finished': game.race_finished,
        'winners': game.winners,
        'finished_cars': game.finished_cars,
        'cars_remaining': len(game.cars) - len(game.finished_cars)
    })

@app.route('/api/test_car')
def test_car():
    """Route de test pour vérifier que les voitures fonctionnent"""
    if not game_initialized:
        init_game()
    
    if game.cars:
        car = game.cars[0]
        return jsonify({
            'x': car.x,
            'y': car.y,
            'speed': car.speed,
            'angle': car.angle,
            'sensors': car.get_sensor_data(game.track_segments) if hasattr(car, 'get_sensor_data') else []
        })
    
    return jsonify({'error': 'No cars'})

@app.route('/api/start_game', methods=['POST'])
def start_game():
    """API pour démarrer le jeu"""
    global game_running, game_thread, game
    
    if not game_running:
        game.reset()
        game.game_started = True
        
        for i, car in enumerate(game.cars):
            car.x = 100 + i * 40
            car.y = 300 + random.randint(-20, 20)
            car.angle = 90  
            car.speed = 3 + random.random() * 2
            car.lap = 0
            car.progress = 0
            car.last_checkpoint = 0
            car.checkpoint_counter = 0
            car.crashed = False
            car.crash_time = 0
            car.total_distance = 0
            car.train_counter = 0
        
        game_running = True
        game_thread = threading.Thread(target=run_game_loop)
        game_thread.daemon = True
        game_thread.start()
        
        return jsonify({'status': 'started'})
    
    return jsonify({'status': 'already_running'})

@app.route('/api/stop_game', methods=['POST'])
def stop_game():
    """API pour arrêter le jeu"""
    global game_running
    
    game_running = False
    return jsonify({'status': 'stopped'})

@app.route('/api/reset_game', methods=['POST'])
def reset_game():
    """API pour réinitialiser le jeu"""
    global game
    
    game.reset()
    for car in game.cars:
        if hasattr(car, 'retrain_model'):
            car.retrain_model()
    
    return jsonify({'status': 'reset'})

if __name__ == '__main__':
    init_game()
    app.run(debug=True, port=5000)