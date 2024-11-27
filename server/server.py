from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel, Car, Traffic_Light, Destination, Obstacle, Road

# Size of the board:
cityModel = None

# This application will be used to interact with WebGL
app = Flask("Traffic example")
cors = CORS(app, origins=['http://localhost'])

# This route will be used to send the parameters of the simulation to the server.
# The servers expects a POST request with the parameters in a.json.
@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    global cityModel

    if request.method == 'POST':
        try:

            print(request.json)

            # Create the model using the parameters sent by the application
            cityModel = CityModel(5)

            # Return a message to saying that the model was created successfully
            return jsonify({"message":"Parameters recieved, model initiated.", "width": cityModel.width, "height": cityModel.height})

        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500

# This route will be used to get the positions of the agents
@app.route('/getAgents', methods=['GET'])
@cross_origin()
def getAgents():
    global cityModel

    if request.method == 'GET':
        # Get the positions of the agents and return them to WebGL in JSON.json.t.
        # Note that the positions are sent as a list of dictionaries, where each dictionary has the id and position of an agent.
        # The y coordinate is set to 1, since the agents are in a 3D world. The z coordinate corresponds to the row (y coordinate) of the grid in mesa.
        try:
            agentPositions = []
            for content, (x, z) in cityModel.grid.coord_iter():
                for agent in content: 
                    if isinstance(agent, Car):
                        agentPositions.append({"id": str(agent.unique_id), "x": x, "y": 1, "z": z})
            return jsonify({'positions': agentPositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with agent positions"}), 500



# This route will be used to get the positions of the obstacles
@app.route('/getObstacles', methods=['GET'])
@cross_origin()
def getObstacles():
    global cityModel

    if request.method == 'GET':
        try:
        # Get the positions of the obstacles and return them to WebGL in JSON.json.t.
        # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of an obstacle.
            obstaclesPositions = []
            for a, (x, z) in cityModel.grid.coord_iter(): 
                for agent in a: 
                    if isinstance(agent, Obstacle):
                        obstaclesPositions.append({"id": str(agent.unique_id), "x": x, "y":1, "z":z})
            return jsonify({'positions':obstaclesPositions})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error with obstacle positions"}), 500
        
@app.route('/getDestinations', methods=['GET'])
@cross_origin()
def getDestinations():
    global cityModel

    if request.method == 'GET':
        try:
            destinationPositions = []
            for content, (x, z) in cityModel.grid.coord_iter():
                for agent in content:
                    if isinstance(agent, Destination):
                        destinationPositions.append({
                            "id": str(agent.unique_id), "x": x, "y": 1, "z": z})
            return jsonify({'positions': destinationPositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with destination positions"}), 500


# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global cityModel
    if request.method == 'GET':
        try:
        # Update the model and return a message to WebGL saying that the model was updated successfully
            cityModel.step()
            return jsonify({'message':f'Model updated'})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error during step."}), 500


if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)
