// src/particles.js
import * as BABYLON from "@babylonjs/core";

export function createExplosion(scene, position) {
    const particleSystem = new BABYLON.ParticleSystem("particles", 200, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    particleSystem.emitter = position; 
    particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
    particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 1.0);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.5;
    particleSystem.minLifeTime = 0.2;
    particleSystem.maxLifeTime = 0.5;
    particleSystem.emitRate = 1000;
    particleSystem.createSphereEmitter(1);
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 5;
    particleSystem.updateSpeed = 0.02;
    particleSystem.start();
    
    setTimeout(() => {
        particleSystem.stop();
        setTimeout(() => { particleSystem.dispose(); }, 1000);
    }, 500);
}

export function createDashParticles(scene, tank) {
    const particleSystem = new BABYLON.ParticleSystem("dashParticles", 500, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    particleSystem.emitter = tank;
    particleSystem.color1 = new BABYLON.Color4(0, 1, 1, 1.0);
    particleSystem.color2 = new BABYLON.Color4(0, 0.5, 1, 1.0);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
    particleSystem.minSize = 0.2;
    particleSystem.maxSize = 0.6;
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.6;
    particleSystem.emitRate = 300;
    particleSystem.createSphereEmitter(0.5);
    particleSystem.minEmitPower = 2;
    particleSystem.maxEmitPower = 5;
    particleSystem.updateSpeed = 0.01;
    particleSystem.start();
    
    return particleSystem;
}