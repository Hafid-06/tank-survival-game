import * as BABYLON from "@babylonjs/core";

// Configures global scene lighting, skybox, and ground
export function createEnvironment(scene) {
    scene.clearColor = new BABYLON.Color3(0.0, 0.0, 0.0); 
    scene.fogMode = BABYLON.Scene.FOGMODE_NONE;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(20, 40, 20);
    dirLight.intensity = 0.8;

    // Setup shadow generator for realistic environment depth
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    // Create skybox with equi-rectangular texture
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000.0}, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false; 
    skyboxMaterial.reflectionTexture = new BABYLON.EquiRectangularCubeTexture("/decor/sky.jpg", scene, 1024);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;

    // Setup ground with tiled texture
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 150, height: 150 }, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = new BABYLON.Texture("/decor/ground.jpg", scene);
    groundMat.diffuseTexture.uScale = 15;
    groundMat.diffuseTexture.vScale = 15;
    groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); 
    ground.material = groundMat;
    ground.receiveShadows = true;

    return shadowGenerator;
}

// Populates the scene with models and invisible collision hitboxes
export function createObstacles(scene, shadowGenerator) {
    const obstacles = [];
    const barrels = [];

    // Spawn rocks with random variations
    for (let i = 0; i < 8; i++) {
        const rockHitbox = BABYLON.MeshBuilder.CreateSphere("rockHitbox", { 
            diameter: 1.2 + Math.random() * 1.2, segments: 6 
        }, scene);
        rockHitbox.position.x = (Math.random() * 80) - 40;
        rockHitbox.position.z = (Math.random() * 80) - 40;
        rockHitbox.position.y = 0.6;
        rockHitbox.scaling.x = 0.8 + Math.random() * 0.4;
        rockHitbox.scaling.y = 0.5 + Math.random() * 0.3;
        rockHitbox.scaling.z = 0.8 + Math.random() * 0.4;
        rockHitbox.rotation.y = Math.random() * Math.PI;
        rockHitbox.isVisible = false; // Hitbox is invisible for physics
        
        BABYLON.SceneLoader.ImportMesh("", "", "decor/stone.glb", scene, (meshes) => {
            if (rockHitbox.isDisposed()) { meshes.forEach(m => m.dispose()); return; }
            const rockModel = meshes[0];
            rockModel.parent = rockHitbox;
            rockModel.position = new BABYLON.Vector3(0, -0.6, 0); 
            rockModel.rotationQuaternion = null; 
            rockModel.scaling.setAll(0.05); 
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
        });
        obstacles.push(rockHitbox);
    }

    // Spawn decorative trees
    for (let i = 0; i < 5; i++) {
        const xPos = (Math.random() * 80) - 40;
        const zPos = (Math.random() * 80) - 40;
        BABYLON.SceneLoader.ImportMesh("", "", "decor/tree.glb", scene, (meshes) => {
            const treeModel = meshes[0];
            treeModel.position = new BABYLON.Vector3(xPos, 5, zPos); 
            treeModel.rotationQuaternion = null; 
            treeModel.scaling.setAll(4.0); 
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
        });
    }

    // Spawn barrels with collision logic
    function spawnBarrels() {
        for (let i = 0; i < 5; i++) {
            const barrelHitbox = BABYLON.MeshBuilder.CreateCylinder("barrelHitbox", { diameter: 1.2, height: 1.5 }, scene);
            barrelHitbox.position.x = (Math.random() * 80) - 40;
            barrelHitbox.position.z = (Math.random() * 80) - 40;
            barrelHitbox.position.y = 0.75;
            barrelHitbox.isVisible = false; 
            BABYLON.SceneLoader.ImportMesh("", "", "decor/nuclear_barrel.glb", scene, (meshes) => {
                if (barrelHitbox.isDisposed()) { meshes.forEach(m => m.dispose()); return; }
                const barrelModel = meshes[0];
                barrelModel.parent = barrelHitbox;
                barrelModel.position = new BABYLON.Vector3(-1.5, -0.75, 0); 
                barrelModel.rotationQuaternion = null; 
                barrelModel.scaling.setAll(50.0); 
                meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
            });
            barrels.push(barrelHitbox);
            obstacles.push(barrelHitbox); 
        }
    }
    spawnBarrels();

    // Spawn complex building models with precise hitbox matching
    function spawnHouse(x, z, yRotation = 0) {
        BABYLON.SceneLoader.ImportMesh("", "", "decor/house.glb", scene, (meshes) => {
            const houseModel = meshes[0];
            houseModel.position = new BABYLON.Vector3(x, 0, z);
            houseModel.rotationQuaternion = null;
            houseModel.rotation.y = yRotation;
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
            const houseHitbox = BABYLON.MeshBuilder.CreateBox("houseHitbox", { width: 13, height: 7.35, depth: 9.96 }, scene);
            houseHitbox.parent = houseModel;
            houseHitbox.position = new BABYLON.Vector3(-3, 3.67, 0); 
            houseHitbox.isVisible = false; 
            obstacles.push(houseHitbox);
        });
    }
    spawnHouse(30, 30, Math.PI / 4);

    function spawnDestroyedCar(x, z, yRotation = 0) {
        BABYLON.SceneLoader.ImportMesh("", "", "decor/destroyed_car.glb", scene, (meshes) => {
            const carModel = meshes[0];
            carModel.position = new BABYLON.Vector3(x, 0, z);
            carModel.rotationQuaternion = null;
            carModel.rotation.y = yRotation;
            carModel.scaling.setAll(0.2); 
            const carHitbox = BABYLON.MeshBuilder.CreateBox("carHitbox", { width: 4.0, height: 10.0, depth: 30.0 }, scene);
            carHitbox.parent = carModel;
            carHitbox.position = new BABYLON.Vector3(0, 5, 0); 
            carHitbox.isVisible = false; 
            obstacles.push(carHitbox);
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
        });
    }
    spawnDestroyedCar(-20, 15, Math.PI / 3);
    spawnDestroyedCar(15, -25, -Math.PI / 6);

    function spawnDestroyedBus(x, z, yRotation = 0) {
        BABYLON.SceneLoader.ImportMesh("", "", "decor/destroyed_bus.glb", scene, (meshes) => {
            const busModel = meshes[0];
            busModel.position = new BABYLON.Vector3(x, 0, z);
            busModel.rotationQuaternion = null;
            busModel.rotation.y = yRotation;
            busModel.scaling.setAll(1.0); 
            const busHitbox = BABYLON.MeshBuilder.CreateBox("busHitbox", { width: 15.0, height: 3.5, depth: 3.0 }, scene);
            busHitbox.parent = busModel;
            busHitbox.position = new BABYLON.Vector3(0, 1.75, 0); 
            busHitbox.isVisible = false; 
            obstacles.push(busHitbox);
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
        });
    }
    spawnDestroyedBus(-10, -30, Math.PI / 2);

    // Populate level boundaries using a loop
    function spawnFence(x, z, yRotation) {
        BABYLON.SceneLoader.ImportMesh("", "", "decor/fence.glb", scene, (meshes) => {
            const fenceModel = meshes[0];
            fenceModel.position = new BABYLON.Vector3(x, 0, z);
            fenceModel.rotationQuaternion = null;
            fenceModel.rotation.y = yRotation;
            const fenceHitbox = BABYLON.MeshBuilder.CreateBox("fenceHitbox", { width: 3.55, height: 2.48, depth: 0.36 }, scene);
            fenceHitbox.position = new BABYLON.Vector3(x, 1.24, z);
            fenceHitbox.rotation.y = yRotation;
            fenceHitbox.isVisible = false; 
            obstacles.push(fenceHitbox);
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
        });
    }
    const fenceWidth = 3.55; 
    for (let i = -75; i <= 75; i += fenceWidth) {
        spawnFence(i, 75, 0); spawnFence(i, -75, 0); 
        spawnFence(-75, i, Math.PI / 2); spawnFence(75, i, Math.PI / 2); 
    }

    function spawnGuard(x, z, yRotation) {
        BABYLON.SceneLoader.ImportMesh("", "", "decor/guard.glb", scene, (meshes) => {
            const guardModel = meshes[0];
            guardModel.position = new BABYLON.Vector3(x, 0, z);
            guardModel.rotationQuaternion = null;
            guardModel.rotation.y = yRotation;
            const guardHitbox = BABYLON.MeshBuilder.CreateBox("guardHitbox", { width: 50.77, height: 9.48, depth: 3 }, scene);
            guardHitbox.parent = guardModel;
            guardHitbox.position = new BABYLON.Vector3(-4, 4.74, 0); 
            guardHitbox.isVisible = false;
            obstacles.push(guardHitbox);
            meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
        });
    }
    spawnGuard(0, 75, 0); spawnGuard(0, -75, Math.PI); 
    spawnGuard(-75, 0, -Math.PI / 2); spawnGuard(75, 0, Math.PI / 2); 

    return { obstacles, barrels };
}