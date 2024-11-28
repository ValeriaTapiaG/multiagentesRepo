# agentsServer.py

from agent import Car, Road, Traffic_Light, Destination, Obstacle  # Explicit imports
from model import CityModel
from mesa.visualization import CanvasGrid
from mesa.visualization.ModularVisualization import ModularServer

def agent_portrayal(agent):
    # Define how each agent type is visually represented
    if agent is None:
        return

    portrayal = {
        "Shape": "rect",
        "Filled": True,
        "Layer": 1,
        "w": 1,
        "h": 1
    }

    if isinstance(agent, Road):
        portrayal["Color"] = "grey"
        portrayal["Layer"] = 0

    elif isinstance(agent, Destination):
        portrayal = {
            "Shape": "circle",
            "Color": "lightgreen",
            "Filled": True,
            "Layer": 0,
            "r": 0.5
        }

    elif isinstance(agent, Traffic_Light):
        portrayal["Color"] = "red" if not agent.state else "green"
        portrayal["Layer"] = 2  # Upper layer to be visible above cars
        portrayal["w"] = 0.8
        portrayal["h"] = 0.8

    elif isinstance(agent, Obstacle):
        portrayal["Color"] = "cadetblue"
        portrayal["Layer"] = 0
        portrayal["w"] = 0.8
        portrayal["h"] = 0.8

    elif isinstance(agent, Car):
        portrayal = {
            "Shape": "rect",
            "Color": "pink",
            "Filled": True,
            "Layer": 1,  # Upper layer to be above Road and other agents on Layer 0
            "w": 0.8,
            "h": 0.8
        }

    return portrayal

# Define grid dimensions based on the map file
width = 0
height = 0

# Read the map file to get dimensions
with open('city_files/2024_base.txt') as baseFile:
    lines = baseFile.readlines()
    width = len(lines[0].strip())
    height = len(lines)

# Define model parameters (N is not currently used)
model_params = {"N": 5}

print(width, height)
grid = CanvasGrid(agent_portrayal, width, height, 500, 500)

# Remove or comment out the ChartModule to avoid datacollector errors
# chart = ChartModule([{"Label": "Número de Coches", "Color": "Pink"}],
#                     data_collector_name='datacollector')

server = ModularServer(
    CityModel,
    [grid],  # Remove 'chart' from the list of modules
    "Traffic Base",
    model_params
)

server.port = 8521  # Default port
server.launch()
