# model.py

from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import *
import json
import random

class CityModel(Model):
    """ 
        Creates a model based on a city map.

        Args:
            N: Number of agents in the simulation (no se usa actualmente)
    """
    def __init__(self, N):
        # Llamar al constructor de la clase base
        super().__init__()

        # Carga el diccionario del mapa. Mapea caracteres a agentes.
        dataDictionary = json.load(open("city_files/mapDictionary.json"))

        self.traffic_lights = []

        # Carga el archivo del mapa. Cada carácter representa un agente.
        with open('city_files/2022_base.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)
            self.grid = MultiGrid(self.width, self.height, torus=False)  # Cuadrícula sin torus
            self.schedule = RandomActivation(self)  # Activación aleatoria de agentes

            # Recorre cada carácter del mapa y crea el agente correspondiente.
            for r, row in enumerate(lines):
                for c, col in enumerate(row.strip()):
                    pos = (c, self.height - r - 1)
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col])
                        self.grid.place_agent(agent, pos)

                    elif col in ["S", "s"]:
                        agent = Traffic_Light(f"tl_{r*self.width+c}", self, False if col == "S" else True, int(dataDictionary[col]))
                        self.grid.place_agent(agent, pos)
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, pos)

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, pos)

        # Definir las coordenadas de las cuatro esquinas
        self.corners = [
            (0, 0),  # Inferior Izquierda
            (self.width - 1, 0),  # Inferior Derecha
            (0, self.height - 1),  # Superior Izquierda
            (self.width - 1, self.height - 1)  # Superior Derecha
        ]

        # Inicializar contador de pasos
        self.step_count = 0

        # Crear un coche en cada esquina al inicio
        for corner in self.corners:
            cell_agents = self.grid.get_cell_list_contents([corner])
            if not any(isinstance(agent, Car) for agent in cell_agents):
                car_id = f"car_init_{corner}"
                car = Car(car_id, self)
                self.grid.place_agent(car, corner)
                self.schedule.add(car)
                print(f"Se creó un coche inicial: {car_id} en {corner}")
            else:
                print(f"Esquina {corner} ya está ocupada. No se puede crear un coche aquí.")

        self.running = True

    def step(self):
        '''Advance the model by one step.'''
        self.schedule.step()
        self.step_count += 1

        # Cada 10 pasos, crear un nuevo coche en cada esquina disponible
        if self.step_count % 10 == 0:
            self.create_cars_in_corners()

    def create_cars_in_corners(self):
        """
        Crea un nuevo coche en cada esquina disponible.
        """
        for corner in self.corners:
            cell_agents = self.grid.get_cell_list_contents([corner])
            occupied = any(isinstance(agent, Car) for agent in cell_agents)

            if not occupied:
                # Crear un nuevo coche
                car_id = f"car_{self.step_count //10}_{corner}"
                car = Car(car_id, self)
                self.grid.place_agent(car, corner)
                self.schedule.add(car)
                print(f"Se creó un nuevo coche: {car_id} en {corner}")
            else:
                print(f"Esquina {corner} ya está ocupada. No se puede crear un coche aquí.")
