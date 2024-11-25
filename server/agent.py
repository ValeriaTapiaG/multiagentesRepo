# agent.py

from mesa import Agent
import random

class Car(Agent):
    """
    Agent that moves towards destination using the direction of the Road.
    Attributes:
        unique_id: Agent's ID 
    """
    def __init__(self, unique_id, model):
        """
        Creates a new car agent.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
        """
        super().__init__(unique_id, model)
        # Puedes agregar más atributos aquí si es necesario

    def move(self):
        """ 
        Moves the agent in the direction specified by the current Road cell,
        respetando el estado de los semáforos.
        """        
        current_pos = self.pos
        cell_agents = self.model.grid.get_cell_list_contents([current_pos])
        road = None

        # Identificar la Road actual y su dirección
        for agent in cell_agents:
            if isinstance(agent, Road):
                road = agent
                break

        if road is None:
            print(f"Coche {self.unique_id} está en una celda sin Road. No puede moverse.")
            return  # No hay Road en la celda actual

        # Determinar la dirección de movimiento basada en la Road
        direction = road.direction.lower()  # Convertir a minúsculas para consistencia

        # Mapeo de direcciones a desplazamientos (dx, dy)
        direction_mapping = {
            "up": (0, 1),
            "down": (0, -1),
            "left": (-1, 0),
            "right": (1, 0)
        }

        if direction not in direction_mapping:
            print(f"Coche {self.unique_id} tiene una dirección de Road inválida: {road.direction}")
            return  # Dirección inválida

        dx, dy = direction_mapping[direction]
        new_position = (current_pos[0] + dx, current_pos[1] + dy)

        # Verificar si la nueva posición está dentro de los límites de la cuadrícula
        if self.model.grid.out_of_bounds(new_position):
            print(f"Coche {self.unique_id} intentó moverse fuera de los límites: {new_position}")
            return

        target_agents = self.model.grid.get_cell_list_contents([new_position])
        # Verificar que la nueva posición tiene Road y no está ocupada por otro Car
        has_road = any(isinstance(agent, Road) for agent in target_agents)
        has_car = any(isinstance(agent, Car) for agent in target_agents)

        if not has_road:
            print(f"Coche {self.unique_id} no puede moverse a {new_position}: No hay Road.")
            return

        if has_car:
            print(f"Coche {self.unique_id} no puede moverse a {new_position}: Coche ya presente.")
            return

        # Verificar si hay un semáforo en la nueva posición
        traffic_light = None
        for agent in target_agents:
            if isinstance(agent, Traffic_Light):
                traffic_light = agent
                break

        if traffic_light:
            if not traffic_light.state:
                # Semáforo en rojo
                print(f"Coche {self.unique_id} se detiene en semáforo rojo en {new_position}.")
                return  # No mover al coche
            else:
                # Semáforo en verde
                print(f"Coche {self.unique_id} avanza en semáforo verde en {new_position}.")

        # Mover el coche a la nueva posición
        self.model.grid.move_agent(self, new_position)
        print(f"Coche {self.unique_id} moviéndose a {new_position} en dirección {direction}")

    def step(self):
        """ 
        Moves the car in the allowed direction.
        """
        self.move()

class Traffic_Light(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, unique_id, model, state=False, timeToChange=10):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many steps should the traffic light change color 
        """
        self.state = state
        self.timeToChange = timeToChange

    def step(self):
        """ 
        Changes the state (green or red) of the traffic light based on timeToChange.
        """
        if self.model.schedule.steps % self.timeToChange == 0:
            self.state = not self.state
            print(f"Semáforo {self.unique_id} cambiado a {'verde' if self.state else 'rojo'}")

class Destination(Agent):
    """
    Destination agent. Where each car should go.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Obstacle(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, unique_id, model, direction="Left"):
        """
        Creates a new road.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            direction: Direction where the cars can move
        """
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass
