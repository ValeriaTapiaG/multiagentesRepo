# model.py

from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import Car, Road, Traffic_Light, Destination, Obstacle  # Explicit imports
import json
import random
import heapq  # Import heapq for A* implementation

class CityModel(Model):
    """ 
        Creates a model based on a city map.

        Args:
            N: Number of agents in the simulation (no se usa actualmente)
    """
    def __init__(self, N):
        # Call the base class constructor
        super().__init__()

        # Load the map dictionary. Maps characters to agents.
        dataDictionary = json.load(open("city_files/mapDictionary.json"))

        self.traffic_lights = []

        # Load the map file. Each character represents an agent.
        with open('city_files/2024_base.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)
            self.grid = MultiGrid(self.width, self.height, torus=False)  # Grid without torus
            self.schedule = RandomActivation(self)  # Random agent activation

            # Iterate through each character in the map and create the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row.strip()):
                    pos = (c, self.height - r - 1)
                    if col in [">", "<", "v", "^"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col])
                        self.grid.place_agent(agent, pos)
                        self.schedule.add(agent)  # Add Road agents to the schedule if they have step methods

                    elif col in ["S", "s"]:
                        agent = Traffic_Light(f"tl_{r*self.width+c}", self, False if col == "S" else True, int(dataDictionary[col]))
                        self.grid.place_agent(agent, pos)
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, pos)
                        self.schedule.add(agent)

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, pos)
                        self.schedule.add(agent)

        # Define the coordinates of the four corners
        self.corners = [
            (0, 0),  # Bottom Left
            # (self.width - 1, 0),  # Bottom Right
            # (0, self.height - 1),  # Top Left
            # (self.width - 1, self.height - 1)  # Top Right
        ]

        # Initialize step counter
        self.step_count = 0

        # Create a car in each corner at the start
        self.create_cars_in_corners()

        self.running = True

    def step(self):
        '''Advance the model by one step.'''
        self.schedule.step()
        self.step_count += 1

        # Every 10 steps, create a new car in each available corner
        if self.step_count % 10 == 0:
            self.create_cars_in_corners()

    def create_cars_in_corners(self):
        """
        Creates a new car in each available corner.
        """
        for corner in self.corners:
            cell_agents = self.grid.get_cell_list_contents([corner])
            occupied = any(isinstance(agent, Car) for agent in cell_agents)

            if not occupied:
                # Create a new car
                car_id = f"car_{self.step_count //10}_{corner}"
                car = Car(car_id, self, corner)
                self.grid.place_agent(car, corner)
                self.schedule.add(car)
            #     print(f"Se creó un nuevo coche: {car_id} en {corner}")
            # else:
            #     print(f"Esquina {corner} ya está ocupada. No se puede crear un coche aquí.")