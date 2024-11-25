'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';

// Define the vertex shader code, using GLSL 3.00
const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;

uniform mat4 u_transforms;
uniform mat4 u_matrix;

out vec4 v_color;

void main() {
gl_Position = u_matrix * a_position;
v_color = a_color;
}
`;

// Define the fragment shader code, using GLSL 3.00
const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
outColor = v_color;
}
`;

// Define the Object3D class to represent 3D objects
class Object3D {
  constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,1,1]){
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = twgl.m4.create();
  }
}

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store agents and obstacles
const agents = [];
const obstacles = [];
const destinations = [];

// Initialize WebGL-related variables
let gl, programInfo, agentArrays, obstacleArrays, destinationsArrays, agentsBufferInfo, obstaclesBufferInfo, destinationsBufferInfo, agentsVao, obstaclesVao, destinationsVao;

// Define the camera position
let cameraPosition = {x:0, y:25, z:25};

// Initialize the frame count
let frameCount = 0;

// Define the data object
let data = {
  NAgents: 500,
  width: 100,
  height: 100
};

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


  // Create buffer information from the agent and obstacle data
  agentsBufferInfo = twgl.createBufferInfoFromArrays(gl, agentArrays);
  obstaclesBufferInfo = twgl.createBufferInfoFromArrays(gl, obstacleArrays);
  destinationsBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationsArrays);


  // Create vertex array objects (VAOs) from the buffer information
  agentsVao = twgl.createVAOFromBufferInfo(gl, programInfo, agentsBufferInfo);
  obstaclesVao = twgl.createVAOFromBufferInfo(gl, programInfo, obstaclesBufferInfo);
  destinationsVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationsBufferInfo);


  // Set up the user interface
  await setupUI();

  // Initialize the agents model
  await initAgentsModel();

  // Get the agents and obstacles
  await getAgents();
  await getObstacles();
  await getDestinations();

  // Draw the scene
  await drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo);
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
      console.log(result)
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
    let response = await fetch(agent_server_uri + "getAgents") 

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON
      let result = await response.json()

      // Log the agent positions
      console.log(result.positions)

      // Check if the agents array is empty
      if(agents.length == 0){
        // Create new agents and add them to the agents array
        for (const agent of result.positions) {
          const newAgent = new Object3D(agent.id, [agent.x, agent.y, agent.z])
          agents.push(newAgent)
        }
        // Log the agents array
        console.log("Agents:", agents)

      } else {
        // Update the positions of existing agents
        for (const agent of result.positions) {
          const current_agent = agents.find((object3d) => object3d.id == agent.id)

          // Check if the agent exists in the agents array
          if(current_agent != undefined){
            // Update the agent's position
            current_agent.position = [agent.x, agent.y, agent.z]
          }
        }
      }
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getObstacles() {
  try {
    // Send a GET request to the agent server to retrieve the obstacle positions
    let response = await fetch(agent_server_uri + "getObstacles") 

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON
      let result = await response.json()

      // Create new obstacles and add them to the obstacles array
      for (const obstacle of result.positions) {
        const newObstacle = new Object3D(obstacle.id, [obstacle.x, obstacle.y, obstacle.z])
        obstacles.push(newObstacle)
      }
      // Log the obstacles array
      console.log("Obstacles:", obstacles)
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

async function getDestinations() {
  try {
      const response = await fetch(agent_server_uri + "getDestinations");
      if (response.ok) {
          const result = await response.json();
          const positions = result.positions;

          if (destinations.length === 0) {
              // Inicializa la lista de destinos si está vacía
              for (const destination of positions) {
                  destinations.push(new Object3D(destination.id, [destination.x, destination.y, destination.z]));
              }
          } else {
              // Actualiza las posiciones de los destinos existentes
              for (const destination of positions) {
                  const currentDestination = destinations.find(d => d.id === destination.id);
                  if (currentDestination) {
                      currentDestination.position = [destination.x, destination.y, destination.z];
                  }
              }
          }
      }
  } catch (error) {
      console.error("Error fetching destinations:", error);
  }
}

/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
  try {
    // Send a request to the agent server to update the agent positions
    let response = await fetch(agent_server_uri + "update") 

    // Check if the response was successful
    if(response.ok){
      // Retrieve the updated agent positions
      await getAgents()
      // Log a message indicating that the agents have been updated
      console.log("Updated agents")
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

/*
 * Draws the scene by rendering the agents and obstacles.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {Object} programInfo - The program information.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for obstacles.
 * @param {Object} obstaclesBufferInfo - The buffer information for obstacles.
 */
async function drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo) {
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

    // Increment the frame count
    frameCount++

    // Update the scene every 30 frames
    if(frameCount%30 == 0){
      frameCount = 0
      // await update()
    } 

    // Request the next frame
    requestAnimationFrame(()=>drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo,  destinationsVao, destinationsBufferInfo))
}

/*
 * Draws the agents.
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawAgents(distance, agentsVao, agentsBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for agents
    gl.bindVertexArray(agentsVao);

    // Iterate over the agents
    for(const agent of agents){

      // Create the agent's transformation matrix
      const cube_trans = twgl.v3.create(...agent.position);
      const cube_scale = twgl.v3.create(...agent.scale);

      // Calculate the agent's matrix
      agent.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      agent.matrix = twgl.m4.rotateX(agent.matrix, agent.rotation[0]);
      agent.matrix = twgl.m4.rotateY(agent.matrix, agent.rotation[1]);
      agent.matrix = twgl.m4.rotateZ(agent.matrix, agent.rotation[2]);
      agent.matrix = twgl.m4.scale(agent.matrix, cube_scale);

      // Set the uniforms for the agent
      let uniforms = {
          u_matrix: agent.matrix,
      }

      // Set the uniforms and draw the agent
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, agentsBufferInfo);
      
    }
}

      
/*
 * Draws the obstacles.
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for obstacles.
 * @param {Object} obstaclesBufferInfo - The buffer information for obstacles.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawObstacles(distance, obstaclesVao, obstaclesBufferInfo, viewProjectionMatrix){


    // Bind the vertex array object for obstacles
    gl.bindVertexArray(obstaclesVao);

    // Iterate over the obstacles
    for(const obstacle of obstacles){
      // Create the obstacle's transformation matrix
      const cube_trans = twgl.v3.create(...obstacle.position);
      const cube_scale = twgl.v3.create(...obstacle.scale);

      // Calculate the obstacle's matrix
      obstacle.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      obstacle.matrix = twgl.m4.rotateX(obstacle.matrix, obstacle.rotation[0]);
      obstacle.matrix = twgl.m4.rotateY(obstacle.matrix, obstacle.rotation[1]);
      obstacle.matrix = twgl.m4.rotateZ(obstacle.matrix, obstacle.rotation[2]);
      obstacle.matrix = twgl.m4.scale(obstacle.matrix, cube_scale);

      // Set the uniforms for the obstacle
      let uniforms = {
          u_matrix: obstacle.matrix,
      }    
      // Set the uniforms and draw the obstacle
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, obstaclesBufferInfo);
      
    }
}

function drawDestinations(distance, destinationsVao, destinationsBufferInfo, viewProjectionMatrix) {
  gl.bindVertexArray(destinationsVao);

  for (const destination of destinations) {
      const translation = twgl.v3.create(...destination.position);
      const scale = twgl.v3.create(...destination.scale);

      destination.matrix = twgl.m4.translate(viewProjectionMatrix, translation);
      destination.matrix = twgl.m4.rotateX(destination.matrix, destination.rotation[0]);
      destination.matrix = twgl.m4.rotateY(destination.matrix, destination.rotation[1]);
      destination.matrix = twgl.m4.rotateZ(destination.matrix, destination.rotation[2]);
      destination.matrix = twgl.m4.scale(destination.matrix, scale);

      const uniforms = {
          u_matrix: destination.matrix,
      };

      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, destinationsBufferInfo);
  }
}

/*
 * Sets up the world view by creating the view-projection matrix.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @returns {Float32Array} The view-projection matrix.
 */
function setupWorldView(gl) {
    // Set the field of view (FOV) in radians
    const fov = 45 * Math.PI / 180;

    // Calculate the aspect ratio of the canvas
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Create the projection matrix
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

    // Set the target position
    const target = [data.width/2, 0, data.height/2];

    // Set the up vector
    const up = [0, 1, 0];

    // Calculate the camera position
    const camPos = twgl.v3.create(cameraPosition.x + data.width/2, cameraPosition.y, cameraPosition.z+data.height/2)

    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);

    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);
    // Return the view-projection matrix
    return viewProjectionMatrix;
}

/*
 * Sets up the user interface (UI) for the camera position.
 */
async function setupUI() {
    // Create a new GUI instance
    const gui = new GUI();

    // Create a folder for the camera position
    const posFolder = gui.addFolder('Position:')

    // Add a slider for the x-axis
    posFolder.add(cameraPosition, 'x', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.x = value
        });

    // Add a slider for the y-axis
    posFolder.add( cameraPosition, 'y', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.y = value
        });

    // Add a slider for the z-axis
    posFolder.add( cameraPosition, 'z', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.z = value
        });
        await drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo, destinationsVao, destinationsBufferInfo)

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

function generateObstacleData(size){ //aqui pongo lo del .obj

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
