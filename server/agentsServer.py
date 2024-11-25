# agentsServer.py

from agent import *
from model import CityModel
from mesa.visualization import CanvasGrid
from mesa.visualization.ModularVisualization import ModularServer

def agent_portrayal(agent):
    # Define cómo se representa visualmente cada tipo de agente
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
        portrayal["Layer"] = 2  # Capa superior para que sea visible sobre los coches
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
            "Layer": 1,  # Capa superior para que esté encima de Road y otros agentes en Layer 0
            "w": 0.8,
            "h": 0.8
        }

    return portrayal

# Definir las dimensiones de la cuadrícula basadas en el archivo del mapa
width = 0
height = 0

# Leer el archivo de mapa para obtener las dimensiones
with open('city_files/2022_base.txt') as baseFile:
    lines = baseFile.readlines()
    width = len(lines[0].strip())
    height = len(lines)

# Definir los parámetros del modelo (N no se usa actualmente)
model_params = {"N": 5}

print(width, height)
grid = CanvasGrid(agent_portrayal, width, height, 500, 500)

# Eliminar o comentar el ChartModule para evitar el error de datacollector
# chart = ChartModule([{"Label": "Número de Coches", "Color": "Pink"}],
#                     data_collector_name='datacollector')

server = ModularServer(
    CityModel,
    [grid],  # Remover 'chart' de la lista de módulos
    "Traffic Base",
    model_params
)

server.port = 8521  # El puerto por defecto
server.launch()
