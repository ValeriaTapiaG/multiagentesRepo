'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';

import vsGLSL from './shaders/vs_phong.glsl?raw'
import fsGLSL from './shaders/fs_phong.glsl?raw'

// Define the Object3D class to represent 3D objects
class Object3D {
  constructor(id, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], color = [1.0, 1.0, 1.0, 1.0]) {
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.color = color;
    this.matrix = twgl.m4.create();

 // Inicializar posición anterior para calcular la dirección
 this.previousPosition = [...position];
}

// Método para actualizar la posición y calcular la rotación
updatePosition(newPosition) {
  const direction = this.calculateDirection(newPosition);
  this.rotation[1] = direction;  // Cambiar a rotación sobre el eje Y (horizontal)
  this.position = newPosition;   // Actualizar la posición
  this.updateMatrix();  // Actualizar la matriz con la nueva rotación
}

// Método para calcular la dirección (ángulo de rotación) basado en el movimiento
calculateDirection(newPosition) {
  const dx = newPosition[0] - this.previousPosition[0];
  const dz = newPosition[2] - this.previousPosition[2];

  // Calcular el ángulo usando atan2 para obtener la dirección en radianes
  const angle = Math.atan2(dz, dx);  // atan2 devuelve el ángulo en radianes

  // Normalizar el ángulo en el rango -π a π
  const normalizedAngle = this.normalizeAngle(angle);

  // Actualizar la posición anterior
  this.previousPosition = [...newPosition];

  return normalizedAngle;
}

// Función para normalizar el ángulo dentro del rango -π a π
normalizeAngle(angle) {
  if (angle > Math.PI) {
    return angle - 2 * Math.PI;
  } else if (angle < -Math.PI) {
    return angle + 2 * Math.PI;
  }
  return angle;
}

// Actualizar la matriz con la nueva rotación
updateMatrix() {
  this.matrix = twgl.m4.identity(); // Resetear la matriz
  this.matrix = twgl.m4.translate(this.matrix, this.position); // Aplicar la posición
  this.matrix = twgl.m4.rotateY(this.matrix, this.rotation[1]); // Rotación sobre el eje Y (horizontal)
  this.matrix = twgl.m4.scale(this.matrix, this.scale); // Aplicar el escalado
}
}

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store agents and obstacles
const agents = [];
const obstacles = [];
const destinations = [];
const trafficLights = []; 

// Initialize WebGL-related variables
let gl, programInfo, agentArrays, obstacleArrays, destinationsArrays, trafficLightsArrays, agentsBufferInfo, obstaclesBufferInfo, destinationsBufferInfo, trafficLightsBufferInfo,  agentsVao, obstaclesVao, destinationsVao, trafficLightsVao;

// Define the camera position
let cameraPosition = {x:0, y: 40, z: 0};

// Initialize the frame count
let frameCount = 0;

// Define the data object
let data = {
  NAgents: 500,
  width: 100,
  height: 100
};

const lightPosition = [15, 15, 15]; // Sigue siendo vec3
const ambientLight = [0.3, 0.3, 0.3, 1.0]; // Ahora es vec4
const diffuseLight = [1.0, 1.0, 1.0, 1.0]; // vec4
const specularLight = [1.0, 1.0, 1.0, 1.0]; // vec4

const ambientColor = [0.5, 0.5, 0.5, 1.0]; // vec4
const diffuseColor = [0.8, 0.0, 0.0, 1.0]; // vec4
const specularColor = [1.0, 1.0, 1.0, 1.0]; // vec4
const shininess = 32.0; // Sigue siendo float

// Main function to initialize and run the application
async function main() {
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');

  // Create the program information using the vertex and fragment shaders
  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Generate the agent and obstacle data
  agentArrays = await loadObj("./car.obj");
  obstacleArrays = await loadObj("./building.obj");
  destinationsArrays = await loadObj("./destination.obj");
  trafficLightsArrays = await loadObj("./trafficlight.obj");


  // Create buffer information from the agent and obstacle data
  agentsBufferInfo = twgl.createBufferInfoFromArrays(gl, agentArrays);
  obstaclesBufferInfo = twgl.createBufferInfoFromArrays(gl, obstacleArrays);
  destinationsBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationsArrays);
  trafficLightsBufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightsArrays);


  // Create vertex array objects (VAOs) from the buffer information
  agentsVao = twgl.createVAOFromBufferInfo(gl, programInfo, agentsBufferInfo);
  obstaclesVao = twgl.createVAOFromBufferInfo(gl, programInfo, obstaclesBufferInfo);
  destinationsVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationsBufferInfo);
  trafficLightsVao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightsBufferInfo);

  // Set up the user interface
  await setupUI();

  // Initialize the agents model
  await initAgentsModel();

  // Get the agents and obstacles
  await getAgents();
  await getObstacles();
  await getDestinations();
  await getTraffic_Light();

  // Draw the scene
  await drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo, trafficLightsVao, trafficLightsBufferInfo);
}



/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
  try {
    // Send a POST request to the agent server to initialize the model
    let response = await fetch(agent_server_uri + "init", {
      method: 'POST', 
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    })

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON and log the message
      let result = await response.json()
      // console.log(result)
      data.width = result.width
      data.height = result.height
    }
      
  } catch (error) {
    // Log any errors that occur during the request
    console.log(error)    
  }
}

/*
 * Retrieves the current positions of all agents from the agent server.
 */
async function getAgents() {
  try {
    // Send a GET request to the agent server to retrieve the agent positions
    let response = await fetch(agent_server_uri + "getAgents");

    // Check if the response was successful
    if (response.ok) {
      // Parse the response as JSON
      let result = await response.json();
      //  agents=[];
      

      // Check if the agents array is empty
      if (agents.length === 0) {
        // Create new agents and add them to the agents array
        result.positions.forEach (agent => {
          const color = [0.0, 1.0, 0.0, 1.0]; // Verde claro para agentes
          const newAgent = new Object3D(agent.id, [agent.x, agent.y, agent.z], [0, 0, 0], [0.5, 0.5, 0.5], color);
          agents.push(newAgent);
        })
      } else {
        // Update the positions of existing agents
        for (const agent of result.positions) {
          const current_agent = agents.find((object3d) => object3d.id === agent.id);

          // Check if the agent exists in the agents array
          if (current_agent !== undefined) {
            // Update the agent's position
            const newPosition = [agent.x, agent.y, agent.z];
            current_agent.position = newPosition;

            // Calculate direction and update rotation
            current_agent.updatePosition(newPosition); // Update rotation based on movement
          } else {
            // Si es un nuevo agente, añadirlo con color
            const color = [Math.random(), Math.random(), Math.random(), 1.0]; // Color aleatorio
            const newAgent = new Object3D(agent.id, [agent.x, agent.y, agent.z], [0, 0, 0], [0.5, 0.5, 0.5], color);
            agents.push(newAgent);
          }
        }
      }
    }

    
  } catch (error) {
    // Log any errors that occur during the request
    console.log("Error fetching agents:", error);
  }
}

            const color = [Math.random(), Math.random(), Math.random(), 1.0]; // Color aleatorio

/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getObstacles() {
  try {
    const response = await fetch(agent_server_uri + "getObstacles");

    if (response.ok) {
      const result = await response.json();
      obstacles.length = 0; // Limpia el arreglo para evitar duplicados

      for (const obstacle of result.positions) {
        const color = [0.96, 0.96, 0.86, 1.0]; // Beige (F5F5DC)
        const newObstacle = new Object3D(obstacle.id, [obstacle.x, obstacle.y, obstacle.z], [0, 0, 0], [1, 1, 1], color);
        obstacles.push(newObstacle);
      }
      // console.log("Obstacles:", obstacles);
    }
  } catch (error) {
    console.log("Error fetching obstacles:", error);
  }
}


async function getDestinations() {
  try {
    const response = await fetch(agent_server_uri + "getDestinations");

    if (response.ok) {
      const result = await response.json();
      destinations.length = 0; // Limpia el arreglo para evitar duplicados

      for (const destination of result.positions) {
        const color = [1.0, 0.71, 0.76, 1.0]; // Rosa claro
        const newDestination = new Object3D(destination.id, [destination.x, destination.y, destination.z], [0, 0, 0], [1, 1, 1], color);
        destinations.push(newDestination);
      }
      // console.log("Destinations:", destinations);
    }
  } catch (error) {
    console.error("Error fetching destinations:", error);
  }
}

function getTrafficLightColor(state) {
  // Si el estado es verdadero (verde), devuelve verde, si es falso (rojo), devuelve rojo
  return state ? [0.0, 1.0, 0.0, 1.0] : [1.0, 0.0, 0.0, 1.0]; // RGB para verde y rojo con alfa 1.0
}

async function getTraffic_Light() {
  try {
    const response = await fetch(agent_server_uri + "getTraffic_Light");

    if (response.ok) {
      const result = await response.json();
      trafficLights.length = 0; // Limpia el arreglo para evitar duplicados

      for (const trafficLight of result.positions) {
        // Obtener el color del semáforo basado en su estado
        const color = getTrafficLightColor(trafficLight.state);

        // Crear un nuevo Object3D para cada semáforo
        const newtrafficLight = new Object3D(
          trafficLight.id, // ID único
          [trafficLight.x, trafficLight.y, trafficLight.z], // Posición
          [0, 0, 0], // Rotación (puedes ajustarlo si es necesario)
          [1, 1, 1], // Escala (ajustar si es necesario)
          color // Color basado en el estado del semáforo
        );

        // Agregar el semáforo al arreglo de semáforos
        trafficLights.push(newtrafficLight);
      }
    }
  } catch (error) {
    console.log("Error fetching trafficLights:", error);
  }
}


/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
  try {
    // Send a request to the agent server to update the agent positions
    let response = await fetch(agent_server_uri + "update")
    let result = await response.json()
    const arrivedP = document.querySelector("#arrived")
    const currentP = document.querySelector("#current")
    arrivedP.textContent= result.total_arrived
    currentP.textContent= agents.length
  

    console.log(result) 

    // Check if the response was successful
    if(response.ok){
      // Retrieve the updated agent positions
      await getAgents()
      await getTraffic_Light()
      // Log a message indicating that the agents have been updated
      // console.log("Updated agents")
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

async function drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo, trafficLightsVao, trafficLightsBufferInfo) {
    // Resize the canvas to match the display size
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set the clear color and enable depth testing
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);

    // Clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the program
    gl.useProgram(programInfo.program);

    // Set up the view-projection matrix
    const viewProjectionMatrix = setupWorldView(gl);

    // Set the distance for rendering
    const distance = 1

    // Draw the agents
    drawAgents(distance, agentsVao, agentsBufferInfo, viewProjectionMatrix)    
    // Draw the obstacles
    drawObstacles(distance, obstaclesVao, obstaclesBufferInfo, viewProjectionMatrix)
    // Draw the obstacles
    drawDestinations(distance, destinationsVao, destinationsBufferInfo, viewProjectionMatrix)
    // Draw the trafficLight
    drawTrafficLights(distance, trafficLightsVao, trafficLightsBufferInfo, viewProjectionMatrix)

    // Increment the frame count
    frameCount++

    // Update the scene every 30 frames
    if(frameCount%30 == 0){
      frameCount = 0
      await update()
    } 

    // Request the next frame
    requestAnimationFrame(()=>drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo, trafficLightsVao, trafficLightsBufferInfo))
}

function drawAgents(distance, agentsVao, agentsBufferInfo, viewProjectionMatrix) {
  gl.bindVertexArray(agentsVao);
  
  for (const agent of agents) {
    const cube_trans = twgl.v3.create(...agent.position);
    const cube_scale = twgl.v3.create(...agent.scale);

    agent.matrix = twgl.m4.translate(twgl.m4.identity(), cube_trans);
    agent.matrix = twgl.m4.rotateX(agent.matrix, agent.rotation[0]);
    agent.matrix = twgl.m4.rotateY(agent.matrix, agent.rotation[1]);
    agent.matrix = twgl.m4.rotateZ(agent.matrix, agent.rotation[2]);
    agent.matrix = twgl.m4.scale(agent.matrix, cube_scale);

    const uniforms = {
        u_world: agent.matrix,
        u_worldInverseTransform: twgl.m4.transpose(twgl.m4.inverse(agent.matrix)),
        u_worldViewProjection: twgl.m4.multiply(viewProjectionMatrix, agent.matrix),
        u_lightWorldPosition: lightPosition,
        u_ambientLight: ambientLight,
        u_diffuseLight: diffuseLight,
        u_specularLight: specularLight,
        u_ambientColor: ambientColor,
        u_diffuseColor: agent.color,
        u_specularColor: specularColor,
        u_shininess: shininess,
    };

    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, agentsBufferInfo);
}

}

function drawObstacles(distance, obstaclesVao, obstaclesBufferInfo, viewProjectionMatrix) {
  // Bind the vertex array object for obstacles
  gl.bindVertexArray(obstaclesVao);
  
  // Iterate over the obstacles
  for (const obstacle of obstacles) {
    const cube_trans = twgl.v3.create(...obstacle.position);
    const cube_scale = twgl.v3.create(...obstacle.scale);
  
    obstacle.matrix = twgl.m4.translate(twgl.m4.identity(), cube_trans);
    obstacle.matrix = twgl.m4.rotateX(obstacle.matrix, obstacle.rotation[0]);
    obstacle.matrix = twgl.m4.rotateY(obstacle.matrix, obstacle.rotation[1]);
    obstacle.matrix = twgl.m4.rotateZ(obstacle.matrix, obstacle.rotation[2]);
    obstacle.matrix = twgl.m4.scale(obstacle.matrix, cube_scale);
  
    const uniforms = {
      u_world: obstacle.matrix,
      u_worldInverseTransform: twgl.m4.transpose(twgl.m4.inverse(obstacle.matrix)),
      u_worldViewProjection: twgl.m4.multiply(viewProjectionMatrix, obstacle.matrix),
      u_lightWorldPosition: lightPosition,
      u_ambientLight: ambientLight,
      u_diffuseLight: diffuseLight,
      u_specularLight: specularLight,
      u_ambientColor: ambientColor,
      u_diffuseColor: obstacle.color, // Usa el color específico del obstáculo
      u_specularColor: specularColor,
      u_shininess: shininess,
    };
  
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, obstaclesBufferInfo);
  }
  
}

function drawDestinations(distance, destinationsVao, destinationsBufferInfo, viewProjectionMatrix) {
  gl.bindVertexArray(destinationsVao);
    
  for (const destination of destinations) {
      const translation = twgl.v3.create(...destination.position);
      const scale = twgl.v3.create(...destination.scale);

      destination.matrix = twgl.m4.translate(twgl.m4.identity(), translation);
      destination.matrix = twgl.m4.rotateX(destination.matrix, destination.rotation[0]);
      destination.matrix = twgl.m4.rotateY(destination.matrix, destination.rotation[1]);
      destination.matrix = twgl.m4.rotateZ(destination.matrix, destination.rotation[2]);
      destination.matrix = twgl.m4.scale(destination.matrix, scale);
      
      const uniforms = {
        u_world: destination.matrix,
        u_worldInverseTransform: twgl.m4.transpose(twgl.m4.inverse(destination.matrix)),
        u_worldViewProjection: twgl.m4.multiply(viewProjectionMatrix, destination.matrix),
        u_lightWorldPosition: lightPosition,
        u_ambientLight: ambientLight,
        u_diffuseLight: diffuseLight,
        u_specularLight: specularLight,
        u_ambientColor: ambientColor,
        u_diffuseColor: destination.color,
        u_specularColor: specularColor,
        u_shininess: shininess,
    };
    
    
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, destinationsBufferInfo);
  }
}

function drawTrafficLights(distance, trafficLightsVao, trafficLightsBufferInfo, viewProjectionMatrix) {
  // Bind the vertex array object for trafficLights
  gl.bindVertexArray(trafficLightsVao);
  
  // Iterate over the trafficLights
  for (const trafficLight of trafficLights) {
    const cube_trans = twgl.v3.create(...trafficLight.position);
    const cube_scale = twgl.v3.create(...trafficLight.scale);
  
    trafficLight.matrix = twgl.m4.translate(twgl.m4.identity(), cube_trans);
    trafficLight.matrix = twgl.m4.rotateX(trafficLight.matrix, trafficLight.rotation[0]);
    trafficLight.matrix = twgl.m4.rotateY(trafficLight.matrix, trafficLight.rotation[1]);
    trafficLight.matrix = twgl.m4.rotateZ(trafficLight.matrix, trafficLight.rotation[2]);
    trafficLight.matrix = twgl.m4.scale(trafficLight.matrix, cube_scale);
  
    const uniforms = {
      u_world: trafficLight.matrix,
      u_worldInverseTransform: twgl.m4.transpose(twgl.m4.inverse(trafficLight.matrix)),
      u_worldViewProjection: twgl.m4.multiply(viewProjectionMatrix, trafficLight.matrix),
      u_lightWorldPosition: lightPosition,
      u_ambientLight: ambientLight,
      u_diffuseLight: diffuseLight,
      u_specularLight: specularLight,
      u_ambientColor: ambientColor,
      u_diffuseColor: trafficLight.color,
      u_specularColor: specularColor,
      u_shininess: shininess,
    };
  
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, trafficLightsBufferInfo);
  }
  
}

function setupWorldView(gl) {
  // Set the field of view (FOV) in radians
  const fov = 45 * Math.PI / 180;

  // Calculate the aspect ratio of the canvas
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  // Create the projection matrix
  const projectionMatrix = twgl.m4.perspective(fov, aspect, 0.1, 100);

  // Set the target position (scene center)
  const target = [data.width / 2, 0, data.height / 2];

  // Set the up vector
  // const up = [0, 1, 0];
  const up = [0, 0, -1];

  // Calculate the camera position and convert it to an array
  const camPos = [cameraPosition.x + target[0], cameraPosition.y, cameraPosition.z + target[2]];

  // Create the camera matrix
  const cameraMatrix = twgl.m4.lookAt(camPos, target, up);

  // Calculate the view matrix
  const viewMatrix = twgl.m4.inverse(cameraMatrix);

  // Combine projection and view matrices
  const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

  // Log the full view-projection matrix

  // Return the matrix for further use
  return viewProjectionMatrix;
}

/*
 * Sets up the user interface (UI) for the camera position.
 */
/*
 * Sets up the user interface (UI) for the camera, lights, and colors.
 */
async function setupUI() {
  // Create a new GUI instance
  const gui = new GUI();

  // Camera Position Controls
  // const posFolder = gui.addFolder('Camera Position');
  // posFolder.add(cameraPosition, 'x', -50, 50).onChange(value => {
  //     cameraPosition.x = value;
  // });
  // posFolder.add(cameraPosition, 'y', -50, 50).onChange(value => {
  //     cameraPosition.y = value;
  // });
  // posFolder.add(cameraPosition, 'z', -50, 50).onChange(value => {
  //     cameraPosition.z = value;
  // });

  // // Light Controls
  // const lightFolder = gui.addFolder('Light Settings');
  // lightFolder.add(lightPosition, 0, -50, 50).name('Light X').onChange(value => {
  //     lightPosition[0] = value;
  // });
  // lightFolder.add(lightPosition, 1, -50, 50).name('Light Y').onChange(value => {
  //     lightPosition[1] = value;
  // });
  // lightFolder.add(lightPosition, 2, -50, 50).name('Light Z').onChange(value => {
  //     lightPosition[2] = value;
  // });

  // const ambientFolder = lightFolder.addFolder('Ambient Light');
  // ambientFolder.add(ambientLight, 0, 0, 1).name('R').onChange(value => {
  //     ambientLight[0] = value;
  // });
  // ambientFolder.add(ambientLight, 1, 0, 1).name('G').onChange(value => {
  //     ambientLight[1] = value;
  // });
  // ambientFolder.add(ambientLight, 2, 0, 1).name('B').onChange(value => {
  //     ambientLight[2] = value;
  // });

  // const diffuseFolder = lightFolder.addFolder('Diffuse Light');
  // diffuseFolder.add(diffuseLight, 0, 0, 1).name('R').onChange(value => {
  //     diffuseLight[0] = value;
  // });
  // diffuseFolder.add(diffuseLight, 1, 0, 1).name('G').onChange(value => {
  //     diffuseLight[1] = value;
  // });
  // diffuseFolder.add(diffuseLight, 2, 0, 1).name('B').onChange(value => {
  //     diffuseLight[2] = value;
  // });

  // const specularFolder = lightFolder.addFolder('Specular Light');
  // specularFolder.add(specularLight, 0, 0, 1).name('R').onChange(value => {
  //     specularLight[0] = value;
  // });
  // specularFolder.add(specularLight, 1, 0, 1).name('G').onChange(value => {
  //     specularLight[1] = value;
  // });
  // specularFolder.add(specularLight, 2, 0, 1).name('B').onChange(value => {
  //     specularLight[2] = value;
  // });

  // // Material Colors
  // const colorFolder = gui.addFolder('Material Colors');
  // const ambientColorFolder = colorFolder.addFolder('Ambient Color');
  // ambientColorFolder.add(ambientColor, 0, 0, 1).name('R').onChange(value => {
  //     ambientColor[0] = value;
  // });
  // ambientColorFolder.add(ambientColor, 1, 0, 1).name('G').onChange(value => {
  //     ambientColor[1] = value;
  // });
  // ambientColorFolder.add(ambientColor, 2, 0, 1).name('B').onChange(value => {
  //     ambientColor[2] = value;
  // });

  // const diffuseColorFolder = colorFolder.addFolder('Diffuse Color');
  // diffuseColorFolder.add(diffuseColor, 0, 0, 1).name('R').onChange(value => {
  //     diffuseColor[0] = value;
  // });
  // diffuseColorFolder.add(diffuseColor, 1, 0, 1).name('G').onChange(value => {
  //     diffuseColor[1] = value;
  // });
  // diffuseColorFolder.add(diffuseColor, 2, 0, 1).name('B').onChange(value => {
  //     diffuseColor[2] = value;
  // });

  // const specularColorFolder = colorFolder.addFolder('Specular Color');
  // specularColorFolder.add(specularColor, 0, 0, 1).name('R').onChange(value => {
  //     specularColor[0] = value;
  // });
  // specularColorFolder.add(specularColor, 1, 0, 1).name('G').onChange(value => {
  //     specularColor[1] = value;
  // });
  // specularColorFolder.add(specularColor, 2, 0, 1).name('B').onChange(value => {
  //     specularColor[2] = value;
  // });

  // Render Scene After UI Updates
  gui.onChange(() => {
      drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo, trafficLightsVao, trafficLightsBufferInfo);
  });
}


function generateData(size) {
    let arrays =
    {
        a_position: {
                numComponents: 3,
                data: [
                  // Front Face
                  -0.5, -0.5,  0.5,
                  0.5, -0.5,  0.5,
                  0.5,  0.5,  0.5,
                 -0.5,  0.5,  0.5,

                 // Back face
                 -0.5, -0.5, -0.5,
                 -0.5,  0.5, -0.5,
                  0.5,  0.5, -0.5,
                  0.5, -0.5, -0.5,

                 // Top face
                 -0.5,  0.5, -0.5,
                 -0.5,  0.5,  0.5,
                  0.5,  0.5,  0.5,
                  0.5,  0.5, -0.5,

                 // Bottom face
                 -0.5, -0.5, -0.5,
                  0.5, -0.5, -0.5,
                  0.5, -0.5,  0.5,
                 -0.5, -0.5,  0.5,

                 // Right face
                  0.5, -0.5, -0.5,
                  0.5,  0.5, -0.5,
                  0.5,  0.5,  0.5,
                  0.5, -0.5,  0.5,

                 // Left face
                 -0.5, -0.5, -0.5,
                 -0.5, -0.5,  0.5,
                 -0.5,  0.5,  0.5,
                 -0.5,  0.5, -0.5
                ].map(e => size * e)
            },
        a_color: {
                numComponents: 4,
                data: [
                  // Front face
                    1, 0, 0, 1, // v_1
                    1, 0, 0, 1, // v_1
                    1, 0, 0, 1, // v_1
                    1, 0, 0, 1, // v_1
                  // Back Face
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                  // Top Face
                    0, 0, 1, 1, // v_3
                    0, 0, 1, 1, // v_3
                    0, 0, 1, 1, // v_3
                    0, 0, 1, 1, // v_3
                  // Bottom Face
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                  // Right Face
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                  // Left Face
                    1, 0, 1, 1, // v_6
                    1, 0, 1, 1, // v_6
                    1, 0, 1, 1, // v_6
                    1, 0, 1, 1, // v_6
                ]
            },
        indices: {
                numComponents: 3,
                data: [
                  0, 1, 2,      0, 2, 3,    // Front face
                  4, 5, 6,      4, 6, 7,    // Back face
                  8, 9, 10,     8, 10, 11,  // Top face
                  12, 13, 14,   12, 14, 15, // Bottom face
                  16, 17, 18,   16, 18, 19, // Right face
                  20, 21, 22,   20, 22, 23  // Left face
                ]
            }
    };

    return arrays;
}

function generateObstacleData(size){ 

    let arrays =
    {
        a_position: {
                numComponents: 3,
                data: [
                  // Front Face
                  -0.5, -0.5,  0.5,
                  0.5, -0.5,  0.5,
                  0.5,  0.5,  0.5,
                 -0.5,  0.5,  0.5,

                 // Back face
                 -0.5, -0.5, -0.5,
                 -0.5,  0.5, -0.5,
                  0.5,  0.5, -0.5,
                  0.5, -0.5, -0.5,

                 // Top face
                 -0.5,  0.5, -0.5,
                 -0.5,  0.5,  0.5,
                  0.5,  0.5,  0.5,
                  0.5,  0.5, -0.5,

                 // Bottom face
                 -0.5, -0.5, -0.5,
                  0.5, -0.5, -0.5,
                  0.5, -0.5,  0.5,
                 -0.5, -0.5,  0.5,

                 // Right face
                  0.5, -0.5, -0.5,
                  0.5,  0.5, -0.5,
                  0.5,  0.5,  0.5,
                  0.5, -0.5,  0.5,

                 // Left face
                 -0.5, -0.5, -0.5,
                 -0.5, -0.5,  0.5,
                 -0.5,  0.5,  0.5,
                 -0.5,  0.5, -0.5
                ].map(e => size * e)
            },
        a_color: {
                numComponents: 4,
                data: [
                  // Front face
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                  // Back Face
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                  // Top Face
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                  // Bottom Face
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                  // Right Face
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                  // Left Face
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                ]
            },
        indices: {
                numComponents: 3,
                data: [
                  0, 1, 2,      0, 2, 3,    // Front face
                  4, 5, 6,      4, 6, 7,    // Back face
                  8, 9, 10,     8, 10, 11,  // Top face
                  12, 13, 14,   12, 14, 15, // Bottom face
                  16, 17, 18,   16, 18, 19, // Right face
                  20, 21, 22,   20, 22, 23  // Left face
                ]
            }
    };
    return arrays;
}

async function loadObj(url) {
  let obj = {
      a_position: {
          numComponents: 3,
          data: [ ]
      },
      a_color: {
          numComponents: 4,
          data: [ ]
      },
      a_normal: {
          numComponents: 3,
          data: [ ]
      },
      a_texCoord: {
          numComponents: 2,
          data: [ ]
      }
  };
  try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.text();
      const vertices = [];
      const normals = [];
      const texCoords = [];
      const faces = [];
      const lines = content.split('\n');
      for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('v ')) {
              const [, x, y, z] = trimmedLine.split(/\s+/).map(Number);
              vertices.push([x, y, z]);
          } else if (trimmedLine.startsWith('vn ')) {
              const [, nx, ny, nz] = trimmedLine.split(/\s+/).map(Number);
              normals.push([nx, ny, nz]);
          } else if (trimmedLine.startsWith('vt ')) {
              const [, u, v] = trimmedLine.split(/\s+/).map(Number);
              texCoords.push([u, v]);
          } else if (trimmedLine.startsWith('f ')) {
              const faceData = trimmedLine
                  .substring(2)
                  .split(/\s+/)
                  .map((vertex) => {
                      const [vIdx, tIdx, nIdx] = vertex.split('/').map((i) => parseInt(i) - 1);
                      return { vIdx, tIdx, nIdx };
                  });
              faces.push(faceData);
          }
      }
      for (const face of faces) {
          for (const vertex of face) {
              const position = vertices[vertex.vIdx];
              obj.a_position.data.push(...position);
              if (vertex.nIdx !== undefined && normals[vertex.nIdx]) {
                  obj.a_normal.data.push(...normals[vertex.nIdx]);
              } else {
                  obj.a_normal.data.push(0, 0, 0);
              }
              if (vertex.tIdx !== undefined && texCoords[vertex.tIdx]) {
                  obj.a_texCoord.data.push(...texCoords[vertex.tIdx]);
              } else {
                  obj.a_texCoord.data.push(0, 0);
              }
              obj.a_color.data.push(1.0, 1.0, 1.0, 1.0);
          }
      }
      return {
          a_position: obj.a_position,
          a_normal: obj.a_normal,
          a_color: obj.a_color,
          a_texCoord: obj.a_texCoord,
      }
  } catch (error) {
      console.error('Error reading the file', error);
  }
}

main()