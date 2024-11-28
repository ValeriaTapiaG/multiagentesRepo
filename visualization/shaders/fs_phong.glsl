#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_cameraDirection;
in vec3 v_lightDirection;

// Light
 uniform vec4 u_ambientLight;
 uniform vec4 u_diffuseLight;
 uniform vec4 u_specularLight;
 uniform vec4 u_emissiveColor;

// Object material
 uniform vec4 u_ambientColor;
 uniform vec4 u_diffuseColor;
 uniform vec4 u_specularColor;
 uniform float u_shininess;
        
out vec4 outColor;

void main() {
    vec4 ambient = u_ambientLight * u_ambientColor;

    // Difuse component
    // Normalize the vectors
    vec3 normalVector = normalize(v_normal);
    vec3 lightVector = normalize(v_lightDirection);
    vec3 cameraVector = normalize(v_cameraDirection);
    float lambert = dot(normalVector, lightVector);
    vec4 diffuse = vec4(0, 0, 0, 1);

    vec3 color = u_diffuseColor.rgb; // Color base

    // Si el semáforo está encendido (verde o rojo), sumamos el color de emisión
    color += u_emissiveColor.rgb;

    outColor = vec4(color, 1.0);

    // Validate that the light is in front of the object
    if (lambert > 0.0){
        diffuse = u_diffuseLight * u_diffuseColor * lambert;
    }

    // Specular component
    vec3 v_reflected = 2.0 * normalVector * dot(normalVector, lightVector) - lightVector;

    vec4 specular = vec4(0, 0, 0, 1);

    // Validate that the light is in front of the object
    if (lambert > 0.0){
        specular = u_specularColor * u_specularLight * pow(max(dot(cameraVector, v_reflected), 0.0), u_shininess);
        }
    
    outColor = ambient + diffuse + specular;


}
