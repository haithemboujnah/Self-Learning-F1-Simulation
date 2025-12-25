import numpy as np
from sklearn.neural_network import MLPRegressor
import random
import math
import time

class CarAI:
    """Voiture avec intelligence artificielle"""
    
    def __init__(self, car_id=0):
        self.car_id = car_id
        self.x = 100 + car_id * 30 
        self.y = 300
        self.angle = 90
        self.speed = 2 + random.random() * 2
        self.max_speed = 8
        self.acceleration = 0.2
        self.deceleration = 0.1
        self.turn_speed = 4  
        self.lap = 0
        self.progress = 0
        self.last_checkpoint = 0
        self.checkpoint_counter = 0
        self.crashed = False
        self.crash_time = 0
        self.total_distance = 0
        self.last_x = self.x
        self.last_y = self.y
        
        colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
        self.color = colors[car_id % len(colors)]
        
        self.model = MLPRegressor(
            hidden_layer_sizes=(8, 8),  
            activation='tanh',  
            max_iter=500,
            random_state=car_id,
            learning_rate_init=0.01
        )
        
        self.init_model()
        
        self.training_data = []
        self.training_targets = []
        self.rewards = []
        
        self.train_counter = 0
    
    def init_model(self):
        """Initialise le modèle ML avec des données simples pour avancer droit"""
        X_train = []
        y_train = []
        
        for _ in range(50):
            sensors = [1.0, 1.0, 1.0, 1.0, 1.0]  
            speed = random.random()
            sin_angle = math.sin(math.radians(self.angle))
            cos_angle = math.cos(math.radians(self.angle))
            
            inputs = sensors + [speed, sin_angle, cos_angle]
            X_train.append(inputs)
            
            throttle = 0.8 + random.random() * 0.2  
            steering = (random.random() - 0.5) * 0.2  
            y_train.append([throttle, steering])
        
        self.model.fit(np.array(X_train), np.array(y_train))
    
    def retrain_model(self):
        """Réentraîne le modèle avec les données collectées"""
        if len(self.training_data) > 20:
            X = np.array(self.training_data[-100:])
            y = np.array(self.training_targets[-100:])
            
            self.model.partial_fit(X, y)
            
            if len(self.training_data) > 200:
                self.training_data = self.training_data[-150:]
                self.training_targets = self.training_targets[-150:]
    
    def get_sensor_data(self, track_segments):
        """Simule des capteurs pour détecter les bords de la piste"""
        sensor_angles = [-45, -22.5, 0, 22.5, 45]
        sensor_data = []
        
        for sensor_angle in sensor_angles:
            sensor_dir = math.radians(self.angle + sensor_angle)
            sensor_x = self.x + math.cos(sensor_dir) * 80
            sensor_y = self.y + math.sin(sensor_dir) * 80
            
            on_track = self.is_on_track(sensor_x, sensor_y, track_segments)
            sensor_data.append(1.0 if on_track else 0.0)
        
        return sensor_data
    
    def is_on_track(self, x, y, track_segments):
        """Vérifie si un point est sur la piste"""
        for segment in track_segments:
            sx, sy, ex, ey, width = segment
            
            dist = self.point_to_line_distance(x, y, sx, sy, ex, ey)
            
            if dist <= width / 2 + 5:
                return True
        
        return False
    
    def point_to_line_distance(self, px, py, x1, y1, x2, y2):
        """Calcule la distance d'un point à un segment de ligne"""
        line_vec = (x2 - x1, y2 - y1)
        point_vec = (px - x1, py - y1)
        
        line_len_sq = line_vec[0]**2 + line_vec[1]**2
        
        if line_len_sq == 0:
            return math.sqrt(point_vec[0]**2 + point_vec[1]**2)
        
        t = max(0, min(1, (point_vec[0]*line_vec[0] + point_vec[1]*line_vec[1]) / line_len_sq))
        
        closest_x = x1 + t * line_vec[0]
        closest_y = y1 + t * line_vec[1]
        
        dx = px - closest_x
        dy = py - closest_y
        
        return math.sqrt(dx**2 + dy**2)
    
    def decide_action(self, track_segments):
        """Prend une décision basée sur les capteurs et le modèle ML"""
        if self.crashed:
            return 0, 0
        
        sensor_data = self.get_sensor_data(track_segments)
        
        sin_angle = math.sin(math.radians(self.angle))
        cos_angle = math.cos(math.radians(self.angle))
        inputs = sensor_data + [self.speed / self.max_speed, sin_angle, cos_angle]
        
        if random.random() < 0.1:  
            throttle = random.random()
            steering = random.random() * 2 - 1
        else:
            X = np.array([inputs])
            prediction = self.model.predict(X)[0]
            
            throttle = max(0, min(1, prediction[0]))
            steering = max(-1, min(1, prediction[1]))
        
        return throttle, steering
    
    def update(self, track_segments, checkpoints):
        """Met à jour la position de la voiture"""
        if self.crashed:
            self.crash_time += 1
            if self.crash_time > 40:  
                self.respawn(checkpoints)
            return
        
        old_x, old_y = self.x, self.y
        
        throttle, steering = self.decide_action(track_segments)
        
        if throttle > 0.3:
            self.speed = min(self.speed + self.acceleration, self.max_speed)
        else:
            self.speed = max(self.speed - self.deceleration * 2, 0)
        
        self.angle += steering * self.turn_speed * (1 + self.speed / self.max_speed)
        self.angle = self.angle % 360
        
        rad_angle = math.radians(self.angle)
        self.x += math.cos(rad_angle) * self.speed
        self.y += math.sin(rad_angle) * self.speed
        
        distance = math.sqrt((self.x - old_x)**2 + (self.y - old_y)**2)
        self.total_distance += distance
        
        if not self.is_on_track(self.x, self.y, track_segments):
            self.crashed = True
            self.crash_time = 0
            self.speed = 0
            
            reward = -10
            self.rewards.append(reward)
        else:
            checkpoint_reward = self.check_checkpoints(checkpoints)
            
            reward = (self.speed / self.max_speed * 0.1) + (distance * 0.5) + checkpoint_reward
            
            sensor_data = self.get_sensor_data(track_segments)
            sin_angle = math.sin(math.radians(self.angle))
            cos_angle = math.cos(math.radians(self.angle))
            inputs = sensor_data + [self.speed / self.max_speed, sin_angle, cos_angle]
            
            self.training_data.append(inputs)
            self.training_targets.append([throttle, steering])
            self.rewards.append(reward)
            
            if self.total_distance > 0:
                distance_per_lap = 2000  
                self.progress = self.lap + min((self.total_distance % distance_per_lap) / distance_per_lap, 0.99)
            
            self.train_counter += 1
            if self.train_counter >= 50:
                self.retrain_model()
                self.train_counter = 0
    
    def check_checkpoints(self, checkpoints):
        """Vérifie si la voiture a passé un checkpoint"""
        reward = 0
        
        for i, (cx, cy, radius) in enumerate(checkpoints):
            distance = math.sqrt((self.x - cx)**2 + (self.y - cy)**2)
            
            if distance <= radius + 10:
                if i == (self.last_checkpoint + 1) % len(checkpoints):
                    self.last_checkpoint = i
                    self.checkpoint_counter += 1
                    reward = 20  
                    
                    if i == 0 and self.checkpoint_counter >= len(checkpoints):
                        self.lap += 1
                        self.progress = self.lap + self.checkpoint_counter / len(checkpoints)
                        self.checkpoint_counter = 0
                        reward = 50  
                        
                        self.retrain_model()
                
                break
        
        return reward
    
    def respawn(self, checkpoints):
        """Réapparaît après un crash"""
        self.crashed = False
        self.speed = 2 
        
        if self.last_checkpoint < len(checkpoints):
            cx, cy, radius = checkpoints[self.last_checkpoint]
            self.x = cx + (random.random() - 0.5) * 20
            self.y = cy + (random.random() - 0.5) * 20
            
            next_idx = (self.last_checkpoint + 1) % len(checkpoints)
            nx, ny, _ = checkpoints[next_idx]
            dx = nx - cx
            dy = ny - cy
            self.angle = math.degrees(math.atan2(dy, dx))
            
        self.last_x = self.x
        self.last_y = self.y

class F1Game:
    """Classe principale du jeu"""
    
    def __init__(self):
        self.cars = []
        self.track_segments = []
        self.checkpoints = []
        self.max_laps = 3
        self.game_time = 0
        self.game_started = False
    
    def add_car(self, car):
        """Ajoute une voiture au jeu"""
        self.cars.append(car)
    
    def create_track(self):
        """Crée un circuit simple avec des virages"""
        self.track_segments = []
        self.checkpoints = []
        
        width = 100
        
        self.track_segments.append((50, 400, 600, 400, width))
        self.track_segments.append((600, 400, 600, 100, width))
        self.track_segments.append((600, 100, 50, 100, width))
        self.track_segments.append((50, 100, 50, 400, width))

        self.checkpoints = [
            (100, 400, 40),
            (600, 400, 40),
            (600, 100, 40),
            (50, 100, 40)    
        ]
    
    def update(self):
        """Met à jour l'état du jeu"""
        if not self.game_started:
            return  
        
        self.game_time += 1
        
        for car in self.cars:
            car.update(self.track_segments, self.checkpoints)
            
            if not car.crashed and car.speed < 0.5:
                car.speed = min(car.speed + 0.1, 2.0)
    
    def reset(self):
        """Réinitialise le jeu"""
        self.game_time = 0
        self.game_started = False
        
        for i, car in enumerate(self.cars):
            car.x = 100 + i * 40
            car.y = 300 + (i % 3) * 10
            car.angle = 90
            car.speed = 2 + random.random() * 2
            car.lap = 0
            car.progress = 0
            car.last_checkpoint = 0
            car.checkpoint_counter = 0
            car.crashed = False
            car.crash_time = 0
            car.total_distance = 0
            car.last_x = car.x
            car.last_y = car.y
            car.train_counter = 0
            
            car.init_model()