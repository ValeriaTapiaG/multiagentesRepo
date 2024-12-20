# agent.py

from mesa import Agent
import heapq  # Import heapq for A* implementation

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
            # print(f"Semáforo {self.unique_id} cambiado a {'verde' if self.state else 'rojo'}")

class Destination(Agent):
    """
    Destination agent. Where each car should go.
    """
    def __init__(self, unique_id, model,direction="Left"):
        super().__init__(unique_id, model)
        self.direction = direction

    # def checkAgent(self):
    #     cell_contents = self.model.grid.get_cell_contents(self.pos)
    #     for agent in cell_contents:
    #         if isinstance(agent, Car):
    #             self.model.agentsArrived += 1

    def step(self):
        # self.checkAgent()
        pass

class Obstacle(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Car(Agent):
    """
    Agent that moves towards destination using the direction of the Road.
    Attributes:
        unique_id: Agent's ID 
    """
    def __init__(self, unique_id, model, pos):
        """
        Creates a new car agent.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
        """
        super().__init__(unique_id, model)
        self.assign_destination()
        # print()
        # print( "destinoooo", self.destination.get_position())
        self.path = self.a_star_search(pos, self.destination.pos)
        
    def assign_destination(self):
        """Assign a random Destination agent as the car's destination."""
        destinations = [agent for agent in self.model.schedule.agents if isinstance(agent, Destination)]
        if destinations:
            self.destination = self.model.random.choice(destinations)
            # print(f"Coche {self.unique_id} asignado a destino {self.destination.pos}")
        else:
            print("No hay destinos disponibles para asignar.")
    
    def step(self):
        """Move the car along its path."""
        # print(self.path)
        self.move()

    def heuristic(self, a, b):
        """Calculate the Manhattan distance between two points a and b."""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    def get_neighbors(self, pos):
        x, y = pos
        neighbors = []

        current_next_cell_contents = self.model.grid.get_cell_list_contents([pos])
        # print(f"Contenido actual en {pos}: {current_next_cell_contents}")

        current_direction = None

        for obj in current_next_cell_contents:
            if isinstance(obj, Road):  
                current_direction = obj.direction
        if current_direction:
            # Get all neighbors (Moore neighborhood)
            all_neighbors = self.model.grid.get_neighborhood(pos, moore=True, include_center=False)
            # print(f"Dirección permitida en {pos}: {current_direction}")
            # print(f"Todos los vecinos posibles: {all_neighbors}")

            if current_direction == 'Left':
                neighbors = [(nx, ny) for nx, ny in all_neighbors if nx < x]
            elif current_direction == 'Right':
                neighbors = [(nx, ny) for nx, ny in all_neighbors if nx > x]
            elif current_direction == 'Up':
                neighbors = [(nx, ny) for nx, ny in all_neighbors if ny > y]
            elif current_direction == 'Down':
                neighbors = [(nx, ny) for nx, ny in all_neighbors if ny < y]
            elif current_direction == 'Vertical':
                neighbors = [(nx, ny) for nx, ny in all_neighbors if nx == x]
            elif current_direction == 'Horizontal':
                neighbors = [(nx, ny) for nx, ny in all_neighbors if ny == y]
            elif current_direction == 'Any':
                neighbors = all_neighbors
        else:
            # If the current cell does not contain a road, get all neighbors
            neighbors = self.model.grid.get_neighborhood(pos, moore=True, include_center=False)

        # print(f"Vecinos retornados desde {pos}: {neighbors}")
        return neighbors


    def es_camino_despejado(self, entorno, posicion_actual, posicion_siguiente):
        """
        Determina si el camino está despejado para moverse de posicion_actual a posicion_siguiente.
        
        Args:
            entorno (Grid): El mapa o estructura que representa el entorno.
            posicion_actual (tuple): Las coordenadas actuales del agente.
            posicion_siguiente (tuple): Las coordenadas a las que el agente desea moverse.
        
        Returns:
            bool: True si el camino está despejado, False en caso contrario.
        """
        # 1. Verificación de Obstáculos
        # print(f"Verificando si el camino está despejado de {posicion_actual} a {posicion_siguiente}")
        contenido_siguiente = entorno.get_cell_list_contents([posicion_siguiente])
        contenido_actual = entorno.get_cell_list_contents([posicion_actual])
        for agente in contenido_siguiente:
            if isinstance(agente, Obstacle):
                return False  # Obstáculo encontrado
            elif isinstance(agente, Traffic_Light):
                print("Taffic Light: ", agente.pos)
                print("posicion_actual: ", contenido_actual[0])
                

        # 2. Verificación de Destinos No Permitidos
        for agente in contenido_siguiente:
            if isinstance(agente, Destination) and agente != self.destination:
                return False  # Destino no permitido
        
        # 3. Verificación de Direcciones de la Carretera
        # Trayendo la carretera sobre la que está el agente
        current_road = next(filter(lambda obj: isinstance(obj, Road), self.model.grid.get_cell_list_contents([posicion_actual])), None)
        next_road = next(filter(lambda obj: isinstance(obj, Road), self.model.grid.get_cell_list_contents([posicion_siguiente])), None)



        if current_road:
            # Función interna para verificar si la dirección es válida
            def is_valid_direction(road, x, y, nx, ny):
                directions = {
                    "Left": nx < x,
                    "Right": nx > x,
                    "Up": ny > y,
                    "Down": ny < y,
                    "Vertical": nx == x,
                    "Horizontal": ny == y
                }
                return directions.get(road.direction, True)

            x, y = posicion_actual
            nx, ny = posicion_siguiente

            # Validar la dirección de la carretera actual
            if not is_valid_direction(current_road, x, y, nx, ny):
                return False

            # Validar la dirección de la siguiente carretera solo si next_road no es None
            if next_road is not None and not is_valid_direction(next_road, x, y, nx, ny):
                return False

        # El camino está despejado si ninguna de las condiciones anteriores se cumple
        return True


    def move(self):
        if not self.path:
            self.model.grid.remove_agent(self)
            self.model.schedule.remove(self)
            self.model.total_arrived += 1
            # print(f"Car {self.unique_id} has reached its destination and has been removed.")
        else:

            next_move = self.path[0]
            #validar si es un semaforo y su estado
            #traer los agentes que existen en una coordenada 
            current_cell_agents = self.model.grid.get_cell_list_contents(self.pos)
            is_on_traffic_light = any(isinstance(agent, Traffic_Light) for agent in current_cell_agents)
            # if is_on_traffic_light:

            for agent in self.model.grid.get_cell_list_contents(next_move):
                if isinstance(agent,Traffic_Light):
                    if agent.state==False:
                        return

                elif isinstance(agent,Car):
                    return
            self.path.pop(0)
            self.model.grid.move_agent(self, next_move)



    def a_star_search(self, start, goal):
        # print(f"Inicio A* desde {start} hasta {goal}")
        open_set = []
        heapq.heappush(open_set, (0, start))
        came_from = {}
        g_score = {start: 0}
        f_score = {start: self.heuristic(start, goal)}

        while open_set:
            current = heapq.heappop(open_set)[1]
            # print(f"Explorando {current}")

            if current == goal:
                # print("dentro del iffff")
                # Reconstruct path
                path = []
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                path.reverse()
                # print('Goal reached')
                return path  # List of positions from start to goal

            for neighbor in self.get_neighbors(current):
                if not self.es_camino_despejado(self.model.grid, current, neighbor):
                    # print(f"Camino bloqueado de {current} a {neighbor}")
                    continue

                # print('Path clear:', current, '->', neighbor)
                tentative_g_score = g_score[current] + 1  # Assuming cost=1 for movement
                if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score_neighbor = tentative_g_score + self.heuristic(neighbor, goal)
                    f_score[neighbor] = f_score_neighbor
                    heapq.heappush(open_set, (f_score_neighbor, neighbor))
                    # print(f"Añadido a open_set: {neighbor} con f_score={f_score_neighbor}")

        # print("No se encontró un camino al objetivo.")
        return []  # No path found
