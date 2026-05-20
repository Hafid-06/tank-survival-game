import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

// Initializes the ally tank, its AI components, and UI indicators
export function createAlly(scene, startPos, advancedTexture, spawnBulletFn) {
    const allyContainer = BABYLON.MeshBuilder.CreateBox("allyContainer", { width: 2, height: 1.5, depth: 3 }, scene);
    allyContainer.position = startPos.clone();
    allyContainer.position.y = 0.0; 
    allyContainer.isVisible = false; 

    // Setup movement dust effect
    const dustParticles = new BABYLON.ParticleSystem("allyDust", 100, scene);
    dustParticles.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/cloud.png", scene);
    dustParticles.emitter = allyContainer;
    dustParticles.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
    dustParticles.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);
    dustParticles.color1 = new BABYLON.Color4(0.4, 0.3, 0.2, 0.4);
    dustParticles.color2 = new BABYLON.Color4(0.5, 0.4, 0.3, 0.2);
    dustParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    dustParticles.minSize = 0.3; dustParticles.maxSize = 0.8;
    dustParticles.emitRate = 0;
    dustParticles.start();

    // Import the 3D model
    BABYLON.SceneLoader.ImportMesh("", "/models/", "ally.glb", scene, (meshes) => {
        const allyModel = meshes[0];
        allyModel.parent = allyContainer;
        allyModel.rotationQuaternion = null;
        allyModel.scaling.setAll(0.5);
        allyModel.position.y = 0.0;
        allyModel.rotation.y = 0; 
    });

    // Create GUI health bar linked to the tank
    let hp = 10;
    const rect = new GUI.Rectangle();
    rect.width = "60px"; rect.height = "10px"; rect.background = "red";
    rect.isVisible = true; advancedTexture.addControl(rect);
    rect.linkWithMesh(allyContainer); rect.linkOffsetY = -50;
    
    const healthBar = new GUI.Rectangle();
    healthBar.width = "60px"; healthBar.height = "10px"; healthBar.background = "green";
    healthBar.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    rect.addControl(healthBar);

    // Ally logic controller
    const allyObj = {
        mesh: allyContainer,
        isAlive: true,
        // AI Logic: Finds closest enemy, moves towards it, and fires
        update: (enemies, dt, scene) => {
            if (!allyObj.isAlive) return;
            let closest = null;
            let minDist = 50;
            enemies.forEach(e => {
                const dist = BABYLON.Vector3.Distance(allyContainer.position, e.position);
                if (dist < minDist) { closest = e; minDist = dist; }
            });

            if (closest) {
                const targetDir = closest.position.subtract(allyContainer.position).normalize();
                const targetRotation = Math.atan2(targetDir.x, targetDir.z);
                allyContainer.rotation.y = BABYLON.Scalar.Lerp(allyContainer.rotation.y, targetRotation, 0.1);
                allyContainer.position.addInPlace(targetDir.scale(3 * dt));
                dustParticles.emitRate = 50; 
                if (minDist < 20 && Math.random() < 0.02) {
                    spawnBulletFn(allyContainer.position, allyContainer.rotation.y);
                }
            } else {
                dustParticles.emitRate = 0;
            }
        },
        // Handles damage, updates UI bar, and triggers death state
        takeDamage: (amount) => {
            hp -= amount;
            healthBar.width = (hp * 6) + "px";
            if (hp <= 0) {
                allyObj.dispose();
                return true;
            }
            return false;
        },
        // Cleanup resources on death
        dispose: () => {
            if (!allyObj.isAlive) return;
            allyObj.isAlive = false;
            rect.dispose();
            dustParticles.dispose();
            allyContainer.dispose();
        }
    };
    return allyObj;
}