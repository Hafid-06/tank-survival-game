import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

import { GameState, EnemyState, Constants } from "./gameState.js";
import { AudioManager } from "./audioManager.js";
import { createEnvironment, createObstacles } from "./environment.js";
import { createExplosion, createDashParticles } from "./particles.js";
import { createUI } from "./ui.js";
import { createAlly } from "./ally.js";

// Main scene orchestrator: handles game initialization, logic, and rendering
export function createScene(engine, canvas) {
    const scene = new BABYLON.Scene(engine);
    const audioManager = new AudioManager(scene);
    const shadowGenerator = createEnvironment(scene);
    const { obstacles, barrels } = createObstacles(scene, shadowGenerator);

    function getRandomPatrolTarget() {
        return new BABYLON.Vector3((Math.random() * 80) - 40, 0, (Math.random() * 80) - 40);
    }

    // Setup player tank model and physics box
    const tank = BABYLON.MeshBuilder.CreateBox("tank", { width: 2, height: 1.5, depth: 3 }, scene);
    tank.position.y = 0.75;
    tank.isVisible = false; 

    BABYLON.SceneLoader.ImportMesh("", "/models/", "tank.glb", scene, (meshes) => {
        const tankModel = meshes[0];
        tankModel.parent = tank; 
        tankModel.scaling.setAll(0.6); 
        tankModel.rotationQuaternion = null; 
        tankModel.rotation.y = -Math.PI / 2; 
        tankModel.position.y = -0.75; 
        meshes.forEach(m => shadowGenerator.addShadowCaster(m, true));
    });

    // Create dust trail effect behind the tank
    const dustParticles = new BABYLON.ParticleSystem("dust", 200, scene);
    dustParticles.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/cloud.png", scene);
    dustParticles.emitter = tank; 
    dustParticles.minEmitBox = new BABYLON.Vector3(-1, -0.5, -1.5); 
    dustParticles.maxEmitBox = new BABYLON.Vector3(1, -0.5, 1.5);
    dustParticles.color1 = new BABYLON.Color4(0.4, 0.3, 0.2, 0.4); 
    dustParticles.color2 = new BABYLON.Color4(0.5, 0.4, 0.3, 0.2);
    dustParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    dustParticles.minSize = 0.5; dustParticles.maxSize = 1.5;
    dustParticles.minLifeTime = 0.2; dustParticles.maxLifeTime = 0.8;
    dustParticles.emitRate = 0; 
    dustParticles.direction1 = new BABYLON.Vector3(-0.5, 0.5, -0.5);
    dustParticles.direction2 = new BABYLON.Vector3(0.5, 1, 0.5);
    dustParticles.gravity = new BABYLON.Vector3(0, -2, 0);
    dustParticles.start();

    // Define UI menu button behaviors
    const uiCallbacks = {
        onPlay: () => {
            GameState.isGameStarted = true;
            ui.menuContainer.isVisible = false;
            ui.hudContainer.isVisible = true;
            audioManager.setupAudioContextUnlock();
            audioManager.playSound("backgroundMusic");
            if (GameState.isTesterMode) {
                GameState.coinsCount = 100;
                GameState.unlockedAmmo = { base: true, smg: true, missile: true, heavy: true };
                ui.coinsText.text = "COINS: 100";
                ui.updateAmmoUI();
            }
        },
        onPauseToggle: () => {
            if (GameState.isGameOver) return; 
            GameState.isPaused = !GameState.isPaused;
            ui.pauseMenu.isVisible = GameState.isPaused;
            ui.pauseBtn.textBlock.text = GameState.isPaused ? "▶ RESUME" : "⏸ PAUSE";
            if (GameState.isPaused) {
                audioManager.stopSound("backgroundMusic");
            } else {
                audioManager.playSound("backgroundMusic");
            }
        },
        onResume: () => {
            GameState.isPaused = false;
            ui.pauseMenu.isVisible = false;
            ui.pauseBtn.textBlock.text = "⏸ PAUSE";
            audioManager.playSound("backgroundMusic");
        },
        onMenu: () => {
            GameState.isPaused = false;
            GameState.isGameStarted = false;
            ui.pauseMenu.isVisible = false;
            ui.pauseBtn.textBlock.text = "⏸ PAUSE";
            ui.hudContainer.isVisible = false;
            ui.menuContainer.isVisible = true;
            audioManager.stopSound("backgroundMusic");
            resetGame();
        },
        onRetry: () => {
            resetGame();
            GameState.isGameStarted = true;
            GameState.isGameOver = false;
            ui.gameOverMenu.isVisible = false;
            audioManager.playSound("backgroundMusic");
        }
    };

    const ui = createUI(scene, audioManager, uiCallbacks);

    const bullets = [];
    const enemyBullets = [];
    let dashParticles = null;
    let bonusSpawnTimer = 0;
    let allyTank = null;

    // Helper for explosive area-of-effect weapon damage
    function applyAoEDamage(pos, radius, damage) {
        enemies.forEach((en, index) => {
            if (BABYLON.Vector3.Distance(pos, en.position) <= radius) {
                en.hp -= damage;
                if (en.hp <= 0) {
                    killEnemy(index, en);
                } else {
                    ui.showFloatingText("HIT!", en.position.clone());
                    en.getChildMeshes().forEach(m => { if (m.material) { const orig = m.material.emissiveColor ? m.material.emissiveColor.clone() : new BABYLON.Color3(0,0,0); m.material.emissiveColor = new BABYLON.Color3(1, 0, 0); setTimeout(() => { if (m.material) m.material.emissiveColor = orig; }, 150); } });
                }
            }
        });
    }

    // Bullet physics and effect creator
    function spawnBulletHelper(pos, rot, ammoType) {
        let b;
        let mat = new BABYLON.StandardMaterial("bulletMat", scene);
        
        if (ammoType === 'smg') {
            b = BABYLON.MeshBuilder.CreateBox("bullet", {width: 0.1, height: 0.1, depth: 1.0}, scene);
            mat.emissiveColor = new BABYLON.Color3(1, 1, 0); 
            const trail = new BABYLON.ParticleSystem("trail", 50, scene);
            trail.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
            trail.emitter = b; trail.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0); trail.color2 = new BABYLON.Color4(1, 0.1, 0, 1.0); trail.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
            trail.minSize = 0.1; trail.maxSize = 0.3; trail.minLifeTime = 0.1; trail.maxLifeTime = 0.2; trail.emitRate = 200;
            trail.createPointEmitter(new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(0, 0, -1));
            trail.minEmitPower = 1; trail.maxEmitPower = 2; trail.updateSpeed = 0.02; trail.start();
            b.trail = trail;
            b.velocity = new BABYLON.Vector3(Math.sin(rot), 0, Math.cos(rot)).scale(40);
        } else if (ammoType === 'missile') {
            b = BABYLON.MeshBuilder.CreateCylinder("bullet", {diameter: 0.2, height: 1.5}, scene);
            mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); mat.specularColor = new BABYLON.Color3(1, 1, 1); 
            const trail = new BABYLON.ParticleSystem("trail", 200, scene);
            trail.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
            trail.emitter = b; trail.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0); trail.color2 = new BABYLON.Color4(0.2, 0.2, 0.2, 0.8); trail.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
            trail.minSize = 0.2; trail.maxSize = 0.6; trail.minLifeTime = 0.2; trail.maxLifeTime = 0.5; trail.emitRate = 400;
            trail.createPointEmitter(new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, -1, 0));
            trail.minEmitPower = 2; trail.maxEmitPower = 5; trail.updateSpeed = 0.02; trail.start();
            b.trail = trail;
            b.velocity = new BABYLON.Vector3(Math.sin(rot), 0.5, Math.cos(rot)).scale(20);
            b.gravity = -15;
        } else if (ammoType === 'heavy') {
            b = BABYLON.MeshBuilder.CreateSphere("bullet", {diameter: 1.0}, scene);
            mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); mat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            const trail = new BABYLON.ParticleSystem("trail", 100, scene);
            trail.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/cloud.png", scene);
            trail.emitter = b; trail.color1 = new BABYLON.Color4(0.4, 0.4, 0.4, 0.5); trail.color2 = new BABYLON.Color4(0.1, 0.1, 0.1, 0.2); trail.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
            trail.minSize = 0.5; trail.maxSize = 1.2; trail.minLifeTime = 0.3; trail.maxLifeTime = 0.8; trail.emitRate = 100;
            trail.createSphereEmitter(0.5); trail.minEmitPower = 0; trail.maxEmitPower = 0.5; trail.updateSpeed = 0.02; trail.start();
            b.trail = trail;
            b.velocity = new BABYLON.Vector3(Math.sin(rot), 0, Math.cos(rot)).scale(30);
        } else {
            b = BABYLON.MeshBuilder.CreateSphere("bullet", {diameter: 0.5}, scene);
            mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3); mat.emissiveColor = new BABYLON.Color3(0, 0, 0); 
            b.velocity = new BABYLON.Vector3(Math.sin(rot), 0, Math.cos(rot)).scale(40);
        }

        b.position = pos.clone(); b.position.y += 1;
        b.rotationQuaternion = ammoType === 'missile' ? BABYLON.Quaternion.RotationYawPitchRoll(rot, Math.PI / 2, 0) : BABYLON.Quaternion.RotationYawPitchRoll(rot, 0, 0);
        b.material = mat; b.ammoType = ammoType; bullets.push(b);
        audioManager.playSound(ammoType === 'smg' ? "smgShoot" : "shoot");
    }

    function fireBullet() { spawnBulletHelper(tank.position, tank.rotation.y, GameState.currentAmmo); }

    function fireEnemyBullet(enemy) {
        const bullet = BABYLON.MeshBuilder.CreateSphere("acid", { diameter: 0.6 }, scene);
        bullet.position = enemy.position.clone(); bullet.position.y += 1.5; 
        bullet.direction = tank.position.subtract(bullet.position).normalize();
        
        const mat = new BABYLON.StandardMaterial("acidMat", scene);
        mat.emissiveColor = new BABYLON.Color3(0.2, 1.0, 0.2); 
        mat.diffuseColor = new BABYLON.Color3(0.1, 0.8, 0.1);
        mat.alpha = 0.8;
        bullet.material = mat; 
        
        const trail = new BABYLON.ParticleSystem("acidTrail", 100, scene);
        trail.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
        trail.emitter = bullet;
        trail.color1 = new BABYLON.Color4(0.2, 1.0, 0.2, 0.8);
        trail.color2 = new BABYLON.Color4(0.8, 1.0, 0.2, 0.4);
        trail.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        trail.minSize = 0.2; trail.maxSize = 0.5;
        trail.minLifeTime = 0.2; trail.maxLifeTime = 0.5;
        trail.emitRate = 150;
        trail.createSphereEmitter(0.3);
        trail.updateSpeed = 0.02;
        trail.start();
        bullet.trail = trail;

        enemyBullets.push(bullet);
    }

    let coinContainer = null;
    const activeCoins = [];
    BABYLON.SceneLoader.LoadAssetContainer("/models/", "coin.glb", scene, (container) => { coinContainer = container; });

    const spawnCoinAt = (pos) => {
        if (!coinContainer) return;
        const entries = coinContainer.instantiateModelsToScene();
        const coin = entries.rootNodes[0];
        coin.scaling.setAll(0.1); coin.position = pos.clone(); coin.position.y = 1.0; coin.rotationQuaternion = null;
        const hitbox = BABYLON.MeshBuilder.CreateBox("coinHitbox", {size: 1.5}, scene); hitbox.position = coin.position; hitbox.isVisible = false;
        coin.hitbox = hitbox; activeCoins.push({mesh: coin, hitbox: hitbox, lifespan: 60.0}); 
    };

    const dropCoins = (pos, isBoss) => {
        let count = isBoss ? 5 : 1;
        for (let i = 0; i < count; i++) {
            let p = pos.clone();
            if (isBoss) { p.x += (Math.random() * 4) - 2; p.z += (Math.random() * 4) - 2; }
            spawnCoinAt(p);
        }
    };

    const powerUps = [];
    const spawnPowerUp = () => {
        if (!GameState.isGameStarted) return;
        const type = Math.floor(Math.random() * 4); 
        let color, name;
        if (type === 0) { color = BABYLON.Color3.Yellow(); name = "Machine Gun !"; }
        if (type === 1) { color = BABYLON.Color3.Red(); name = "LIFE +1"; }
        if (type === 2) { color = BABYLON.Color3.Teal(); name = "FREEZE !"; }
        if (type === 3) { color = BABYLON.Color3.Purple(); name = "Max speed !"; }
        const box = BABYLON.MeshBuilder.CreateBox("bonus", {size: 1.5}, scene);
        box.position.x = (Math.random() * 80) - 40; box.position.z = (Math.random() * 80) - 40; box.position.y = 20; 
        const mat = new BABYLON.StandardMaterial("bonusMat", scene); mat.emissiveColor = color; box.material = mat;
        box.bonusType = type; box.bonusName = name;
        scene.registerBeforeRender(() => { if (!GameState.isPaused) { box.rotation.y += 0.05; box.rotation.x += 0.05; }});
        powerUps.push(box);
    };

    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, tank, scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 5;  
    camera.upperRadiusLimit = 30; 
    camera.upperBetaLimit = Math.PI / 2.1; 
    camera.inputs.attached.pointers.buttons = [0, 2];
    camera.inertia = 0.8; 
    let cameraShakeIntensity = 0;
    let originalCameraRadius = camera.radius;

    // Use event.code for cross-layout keyboard compatibility (AZERTY/QWERTY)
    const inputMap = {};
    scene.onKeyboardObservable.add((kb) => {
        const code = kb.event.code;
        if (kb.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            inputMap[code] = true;
            if (code === "Escape" && GameState.isGameStarted && !GameState.isGameOver) {
                uiCallbacks.onPauseToggle();
            }
            if (code === "Digit1" && GameState.unlockedAmmo.base) { GameState.currentAmmo = 'base'; ui.updateAmmoUI(); }
            if (code === "Digit2" && GameState.unlockedAmmo.smg) { GameState.currentAmmo = 'smg'; ui.updateAmmoUI(); }
            if (code === "Digit3" && GameState.unlockedAmmo.missile) { GameState.currentAmmo = 'missile'; ui.updateAmmoUI(); }
            if (code === "Digit4" && GameState.unlockedAmmo.heavy) { GameState.currentAmmo = 'heavy'; ui.updateAmmoUI(); }
        }
        if (kb.type === BABYLON.KeyboardEventTypes.KEYUP) inputMap[code] = false;
    });

    // Enemy AI initialization
    const enemies = [];
    let zombieContainer = null, baseRunAnim = null, baseAttackAnim = null, loadedCount = 0;
    
    BABYLON.SceneLoader.LoadAssetContainer("/models/", "zombie_run.glb", scene, (container) => {
        zombieContainer = container; 
        if (container.animationGroups && container.animationGroups.length > 0) baseRunAnim = container.animationGroups[0];
        checkAllLoaded();
    });
    BABYLON.SceneLoader.ImportMesh("", "/models/", "zombie_attack.glb", scene, (meshes, particleSystems, skeletons, animationGroups) => {
        meshes[0].position.y = -1000; meshes.forEach(m => m.isVisible = false); 
        if (animationGroups.length > 0) { baseAttackAnim = animationGroups[0]; baseAttackAnim.stop(); }
        checkAllLoaded();
    });

    let bossContainer = null;
    BABYLON.SceneLoader.LoadAssetContainer("/models/", "zombie_boss.glb", scene, (container) => { bossContainer = container; }, null, () => {});
    let kamikazeContainer = null;
    BABYLON.SceneLoader.LoadAssetContainer("/models/", "zombie_kamikaze.glb", scene, (container) => { kamikazeContainer = container; }, null, () => {});

    function checkAllLoaded() { loadedCount++; if (loadedCount === 2) for (let i = 0; i < 8; i++) spawnEnemy(); }

    // Spawn logic with difficulty scaling (Game Director pattern)
    function spawnEnemy(forcedType) {
        if (!zombieContainer) return;
        let type = 'rusher', hp = 1, scale = 1.5, attackDist = 2.3; 
        const roll = Math.random();
        
        let probBoss = GameState.currentWave >= 5 ? Math.min(0.6, (GameState.currentWave - 4) * 0.05) : 0.0;
        let probKamikaze = GameState.currentWave >= 7 ? Math.min(0.2, 0.15 + (GameState.currentWave - 7) * 0.01) : 0;

        if (forcedType === 'charger' || roll < probBoss) { type = 'charger'; hp = 3 + Math.max(0, Math.floor((GameState.currentWave - 5) / 2)); scale = 2.2; } 
        else if (GameState.currentWave >= 5 && roll > 0.7) { type = 'spitter'; hp = 1; scale = 1.3; attackDist = 15.0; } 
        else if (GameState.currentWave >= 7 && roll >= (0.8 - probKamikaze) && roll <= 0.8) { type = 'kamikaze'; hp = 1; scale = 1.2; attackDist = 3.0; } 
        else if (GameState.currentWave >= 3 && roll >= 0.2 && roll < 0.45) { type = 'flanker'; }

        let entries, isBossMesh = false, isKamikazeMesh = false;
        if (type === 'charger' && bossContainer) { entries = bossContainer.instantiateModelsToScene(); isBossMesh = true; } 
        else if (type === 'kamikaze' && kamikazeContainer) { entries = kamikazeContainer.instantiateModelsToScene(); isKamikazeMesh = true; } 
        else { entries = zombieContainer.instantiateModelsToScene(); }

        const zombie = entries.rootNodes[0]; 
        zombie.enemyType = type; zombie.hp = hp; zombie.attackDist = attackDist; zombie.scaling.setAll(scale);
        zombie.aiState = EnemyState.PATROL; zombie.patrolTarget = getRandomPatrolTarget(); zombie.stateTimer = 0;
        zombie.flankDirection = Math.random() < 0.5 ? 1 : -1; zombie.attackTimer = 0.5;
        zombie.getChildMeshes().forEach(mesh => { if (mesh.material) mesh.material.transparencyMode = 0; });
        const angle = Math.random() * Math.PI * 2, distance = 25 + Math.random() * 20; 
        zombie.position = new BABYLON.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
        const hitbox = BABYLON.MeshBuilder.CreateBox("zombieHitbox", { width: 1.5, height: 2, depth: 1.5 }, scene);
        hitbox.parent = zombie; hitbox.position.y = 1; hitbox.isVisible = false; zombie.hitbox = hitbox;
        shadowGenerator.addShadowCaster(zombie, true);

        const getCoreName = (name) => {
            let n = name.toLowerCase(); if (n.includes(':')) n = n.split(':').pop();
            if (n.startsWith('armature_')) n = n.replace('armature_', ''); return n;
        };
        const mapAnim = (sourceAnim, name) => {
            if (!sourceAnim) return null;
            return sourceAnim.clone(name + "_" + Math.random(), (oldTarget) => {
                if (oldTarget.name === "__root__") return zombie;
                let coreName = getCoreName(oldTarget.name);
                let foundNode = zombie.getDescendants(false).find(node => getCoreName(node.name) === coreName || node.name === oldTarget.name);
                return foundNode || oldTarget;
            });
        };

        if (isBossMesh || isKamikazeMesh) { zombie.runAnim = mapAnim(baseRunAnim, "run"); if (zombie.runAnim) zombie.runAnim.play(true); } 
        else if (entries.animationGroups && entries.animationGroups.length > 0) { zombie.runAnim = entries.animationGroups[0]; zombie.runAnim.play(true); }
        zombie.attackAnim = mapAnim(baseAttackAnim, "attack"); zombie.currentAnim = "run"; enemies.push(zombie);
    }

    const killEnemy = (index, en) => {
        let points = (en.enemyType === 'flanker') ? 15 : (en.enemyType === 'charger' ? 25 : (en.enemyType === 'kamikaze' ? 20 : 10));
        GameState.score += points; ui.scoreText.text = "SCORE: " + GameState.score;
        if (GameState.score > GameState.highScore) { 
            GameState.highScore = GameState.score; localStorage.setItem('tankSurvivalHighScore', GameState.highScore.toString()); 
            ui.highScoreText.text = "HIGH SCORE: " + GameState.highScore; ui.menuHighScoreText.text = "🏆 HIGH SCORE: " + GameState.highScore; 
        }
        ui.showFloatingText("+" + points, en.position.clone()); createExplosion(scene, en.position.clone()); 
        dropCoins(en.position.clone(), en.enemyType === 'charger');
        en.hitbox.dispose(); if (en.runAnim) en.runAnim.dispose(); if (en.attackAnim) en.attackAnim.dispose(); en.dispose(); enemies.splice(index, 1); spawnEnemy();
    };

    const triggerDamageEffect = () => {
        ui.damageOverlay.alpha = 0.5;
        let fadeOut = setInterval(() => { ui.damageOverlay.alpha -= 0.05; if (ui.damageOverlay.alpha <= 0) { ui.damageOverlay.alpha = 0; clearInterval(fadeOut); } }, 30);
        cameraShakeIntensity = 0.8;
    };

    const resetGame = () => {
        if (GameState.score > GameState.highScore) {
            GameState.highScore = GameState.score; localStorage.setItem('tankSurvivalHighScore', GameState.highScore.toString());
            ui.highScoreText.text = "HIGH SCORE: " + GameState.highScore; ui.menuHighScoreText.text = "🏆 HIGH SCORE: " + GameState.highScore;
        }
        GameState.lives = 3; GameState.score = 0; GameState.coinsCount = 0; GameState.currentWave = 1;
        GameState.unlockedAmmo = { base: true, smg: false, missile: false, heavy: false }; GameState.currentAmmo = 'base'; ui.updateAmmoUI();
        ui.buySmgBtn.textBlock.text = "BUY"; ui.buySmgBtn.background = "green";
        ui.buyMissileBtn.textBlock.text = "BUY"; ui.buyMissileBtn.background = "green";
        ui.buyHeavyBtn.textBlock.text = "BUY"; ui.buyHeavyBtn.background = "green";
        ui.livesText.text = "LIVES: " + Math.max(0, GameState.lives); ui.livesText.color = "#008800";
        ui.scoreText.text = "SCORE: " + GameState.score; ui.coinsText.text = "COINS: " + GameState.coinsCount; ui.waveText.text = "WAVE: 1";
        tank.position = new BABYLON.Vector3(0, 0.6, 0); tank.rotation = new BABYLON.Vector3(0, 0, 0);
        GameState.tankVelocity = 0; GameState.tankTurnVelocity = 0; GameState.rapidFireActive = false; GameState.speedBoostActive = false; GameState.enemiesFrozen = false;
        GameState.isGameOver = false; ui.gameOverMenu.isVisible = false; ui.bonusText.text = ""; ui.damageOverlay.alpha = 0;
        GameState.dashActive = false; GameState.dashCooldown = 0; GameState.dashTimer = 0; ui.dashText.text = "DASH: READY"; ui.dashText.color = "Cyan";
        GameState.globalZombieSoundCooldown = 0;
        
        if (dashParticles) { dashParticles.dispose(); dashParticles = null; }
        if (allyTank) { allyTank.dispose(); allyTank = null; } 
        GameState.unlockedAlly = false;
        if (ui.allyBtn) { ui.allyBtn.textBlock.text = "BUY ALLY TANK (100 coins)"; ui.allyBtn.background = "blue"; }
        audioManager.stopAll();

        for (let i = enemies.length - 1; i >= 0; i--) { enemies[i].hitbox.dispose(); if (enemies[i].runAnim) enemies[i].runAnim.dispose(); if (enemies[i].attackAnim) enemies[i].attackAnim.dispose(); enemies[i].dispose(); } enemies.length = 0; 
        for (let i = bullets.length - 1; i >= 0; i--) { if(bullets[i].trail) bullets[i].trail.dispose(); bullets[i].dispose(); } bullets.length = 0;
        for (let i = enemyBullets.length - 1; i >= 0; i--) { if(enemyBullets[i].trail) { enemyBullets[i].trail.dispose(); } enemyBullets[i].dispose(); } enemyBullets.length = 0;
        for (let i = powerUps.length - 1; i >= 0; i--) { powerUps[i].dispose(); } powerUps.length = 0;
        for (let i = activeCoins.length - 1; i >= 0; i--) { activeCoins[i].mesh.dispose(); activeCoins[i].hitbox.dispose(); } activeCoins.length = 0;
        if (loadedCount === 2) for(let i=0; i<8; i++) spawnEnemy();
    };

    let shootCooldown = 0;

    // Main game loop: update movement, input, AI, collisions, and state
    scene.onBeforeRenderObservable.add(() => {
        const dt = engine.getDeltaTime() / 1000;

        if (!GameState.isGameStarted || GameState.isPaused || GameState.isGameOver) { 
            audioManager.stopSound("tankEngine"); 
            audioManager.stopSound("tankIdle"); 
            audioManager.stopSound("zombieSound"); 
            if (GameState.isGameOver) audioManager.stopSound("backgroundMusic");
            return; 
        }

        if (GameState.unlockedAlly && !allyTank) {
            allyTank = createAlly(scene, new BABYLON.Vector3(5, 0, 5), ui.advancedTexture, (pos, rot) => spawnBulletHelper(pos, rot, GameState.currentAmmo));
        }

        if (allyTank) {
            if (allyTank.isAlive) {
                allyTank.update(enemies, dt, scene);
            } else {
                let pos = allyTank.mesh.position.clone();
                allyTank.dispose();
                allyTank = null;
                GameState.unlockedAlly = false;
                createExplosion(scene, pos);
                audioManager.playSound("explosion");
                if (ui.allyBtn) {
                    ui.allyBtn.textBlock.text = "BUY ALLY TANK (100 coins)";
                    ui.allyBtn.background = "blue";
                }
            }
        }

        bonusSpawnTimer += dt;
        if (bonusSpawnTimer >= 15) {
            spawnPowerUp();
            bonusSpawnTimer = 0;
        }

        let newWave = Math.floor(GameState.score / 50) + 1;
        if (newWave > GameState.currentWave) { GameState.currentWave = newWave; ui.waveText.text = "WAVE: " + GameState.currentWave; ui.showWave(GameState.currentWave); }
        let zombieSpeedMax = Math.min(9, 3.5 + (GameState.currentWave * 0.5));
        if (cameraShakeIntensity > 0) { camera.radius = originalCameraRadius + (Math.random() - 0.5) * cameraShakeIntensity * 2; cameraShakeIntensity -= dt * 3; } else camera.radius = originalCameraRadius;

        // Player Dash (Shift)
        if ((inputMap["ShiftLeft"] || inputMap["ShiftRight"]) && GameState.dashCooldown <= 0 && !GameState.dashActive) {
            GameState.dashActive = true; GameState.dashTimer = Constants.DASH_DURATION; GameState.dashCooldown = Constants.DASH_COOLDOWN;
            dashParticles = createDashParticles(scene, tank); ui.dashText.text = "DASH!"; ui.dashText.color = "Yellow"; GameState.tankVelocity = GameState.speedBoostActive ? 40 : 25; 
        }
        if (GameState.dashActive) {
            GameState.dashTimer -= dt;
            if (GameState.dashTimer <= 0) { GameState.dashActive = false; if (dashParticles) { dashParticles.stop(); setTimeout(() => { if (dashParticles) { dashParticles.dispose(); dashParticles = null; } }, 500); } }
        }
        if (GameState.dashCooldown > 0) {
            GameState.dashCooldown -= dt;
            if (!GameState.dashActive) { ui.dashText.text = "DASH: " + Math.ceil(GameState.dashCooldown) + "s"; ui.dashText.color = "Gray"; }
            if (GameState.dashCooldown <= 0) { ui.dashText.text = "DASH: READY"; ui.dashText.color = "Cyan"; }
        }

        // Movement logic
        let maxSpeed = GameState.speedBoostActive ? 16 : 8; if (GameState.dashActive) maxSpeed = GameState.speedBoostActive ? 40 : 25; 
        if (inputMap["KeyQ"] || inputMap["KeyA"]) GameState.tankTurnVelocity -= Constants.TURN_ACCEL * dt; else if (inputMap["KeyD"]) GameState.tankTurnVelocity += Constants.TURN_ACCEL * dt;
        else { if (GameState.tankTurnVelocity > 0) { GameState.tankTurnVelocity -= Constants.TURN_FRICTION * dt; if (GameState.tankTurnVelocity < 0) GameState.tankTurnVelocity = 0; } if (GameState.tankTurnVelocity < 0) { GameState.tankTurnVelocity += Constants.TURN_FRICTION * dt; if (GameState.tankTurnVelocity > 0) GameState.tankTurnVelocity = 0; } }
        if (GameState.tankTurnVelocity > Constants.MAX_TURN) GameState.tankTurnVelocity = Constants.MAX_TURN; if (GameState.tankTurnVelocity < -Constants.MAX_TURN) GameState.tankTurnVelocity = -Constants.MAX_TURN;
        
        if (inputMap["KeyZ"] || inputMap["KeyW"]) GameState.tankVelocity += Constants.ACCELERATION * dt; else if (inputMap["KeyS"]) GameState.tankVelocity -= Constants.ACCELERATION * dt;
        else { if (GameState.tankVelocity > 0) { GameState.tankVelocity -= Constants.FRICTION * dt; if (GameState.tankVelocity < 0) GameState.tankVelocity = 0; } if (GameState.tankVelocity < 0) { GameState.tankVelocity += Constants.FRICTION * dt; if (GameState.tankVelocity > 0) GameState.tankVelocity = 0; } }
        if (GameState.tankVelocity > maxSpeed) GameState.tankVelocity = maxSpeed; if (GameState.tankVelocity < -maxSpeed * 0.8) GameState.tankVelocity = -maxSpeed * 0.8; 

        let isMoving = Math.abs(GameState.tankVelocity) > 0.5 || Math.abs(GameState.tankTurnVelocity) > 0.1;
        if (Math.abs(GameState.tankVelocity) > 2) dustParticles.emitRate = 150 * (Math.abs(GameState.tankVelocity) / maxSpeed); else dustParticles.emitRate = 0; 

        if (isMoving) { audioManager.stopSound("tankIdle"); audioManager.playSound("tankEngine"); } else { audioManager.stopSound("tankEngine"); audioManager.playSound("tankIdle"); }

        tank.rotation.y += GameState.tankTurnVelocity * dt;
        if (Math.abs(GameState.tankVelocity) > 0.1) {
            let targetAlpha = -tank.rotation.y - (Math.PI / 2), diff = targetAlpha - camera.alpha;
            while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; camera.alpha += diff * 0.05;
        }

        // Collision logic for obstacles
        const triggerBarrelExplosion = (barrel) => {
            audioManager.playSound("explosion"); createExplosion(scene, barrel.position.clone());
            if (BABYLON.Vector3.Distance(barrel.position, tank.position) <= 5.0) {
                GameState.lives -= 1; ui.livesText.text = "LIVES: " + Math.max(0, GameState.lives);
                if (GameState.lives === 2) ui.livesText.color = "orange"; else if (GameState.lives <= 1) ui.livesText.color = "red"; triggerDamageEffect();
                if (GameState.lives <= 0) { GameState.isGameOver = true; ui.gameOverMenu.isVisible = true; audioManager.playSound("gameOver"); audioManager.stopSound("backgroundMusic"); }
            }
            for (let z = enemies.length - 1; z >= 0; z--) { if (BABYLON.Vector3.Distance(barrel.position, enemies[z].position) <= 5.0) killEnemy(z, enemies[z]); }
            const obsIndex = obstacles.indexOf(barrel); if (obsIndex > -1) obstacles.splice(obsIndex, 1);
            const bIndex = barrels.indexOf(barrel); if (bIndex > -1) barrels.splice(bIndex, 1); barrel.dispose();
        };
        
        const oldX = tank.position.x, oldZ = tank.position.z;
        tank.position.x += GameState.tankVelocity * Math.sin(tank.rotation.y) * dt;
        for (let obstacle of obstacles) { if (tank.intersectsMesh(obstacle, true)) { if (barrels.includes(obstacle)) triggerBarrelExplosion(obstacle); else { tank.position.x = oldX; GameState.tankVelocity *= 0.9; } break; } }
        tank.position.z += GameState.tankVelocity * Math.cos(tank.rotation.y) * dt;
        for (let obstacle of obstacles) { if (tank.intersectsMesh(obstacle, true)) { if (barrels.includes(obstacle)) triggerBarrelExplosion(obstacle); else { tank.position.z = oldZ; GameState.tankVelocity *= 0.9; } break; } }

        // Shooting logic (Spacebar)
        shootCooldown -= dt; let limit = GameState.rapidFireActive ? 0.05 : (GameState.currentAmmo === 'smg' ? 0.1 : (GameState.currentAmmo === 'missile' ? 0.6 : (GameState.currentAmmo === 'heavy' ? 1.0 : 0.3)));
        if (inputMap["Space"] && shootCooldown <= 0) { fireBullet(); shootCooldown = limit; }

        // Coin collection and lifecycle
        for (let i = activeCoins.length - 1; i >= 0; i--) {
            const c = activeCoins[i]; c.lifespan -= dt;
            if (c.lifespan <= 0) { c.hitbox.dispose(); c.mesh.dispose(); activeCoins.splice(i, 1); continue; }
            if (c.lifespan <= 3.0) { c.mesh.getChildMeshes().forEach(m => { m.isVisible = Math.floor(c.lifespan * 10) % 2 === 0; }); } else { c.mesh.rotation.y += 0.05; }
            if (c.hitbox.intersectsMesh(tank, false)) { GameState.coinsCount++; ui.coinsText.text = "COINS: " + GameState.coinsCount; audioManager.playSound("getCoin"); c.hitbox.dispose(); c.mesh.dispose(); activeCoins.splice(i, 1); }
        }

        // Projectile collision management
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            if (b.ammoType === 'missile') {
                b.velocity.y += b.gravity * dt;
                b.position.addInPlace(b.velocity.scale(dt));
                b.lookAt(b.position.add(b.velocity));
                if (b.position.y <= 0) {
                    createExplosion(scene, b.position.clone());
                    audioManager.playSound("explosion");
                    applyAoEDamage(b.position, 8, 2);
                    if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); }
                    b.dispose(); bullets.splice(i, 1); continue;
                }
            } else {
                b.position.addInPlace(b.velocity.scale(dt));
            }

            if (b.position.length() > 150 || (b.ammoType !== 'missile' && b.position.y < -10)) { if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); bullets.splice(i, 1); }
            else {
                let hitDecor = false;
                for (let k = barrels.length - 1; k >= 0; k--) {
                    const barrel = barrels[k];
                    if (b.intersectsMesh(barrel, false)) { 
                        triggerBarrelExplosion(barrel); 
                        if (b.ammoType === 'missile' || b.ammoType === 'heavy') { createExplosion(scene, b.position.clone()); audioManager.playSound("explosion"); applyAoEDamage(b.position, 8, 2); }
                        if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); bullets.splice(i, 1); hitDecor = true; break; 
                    }
                }
                if (hitDecor) continue;
                for (let obs of obstacles) {
                    if (!barrels.includes(obs) && b.intersectsMesh(obs, false)) {
                        createExplosion(scene, b.position.clone()); if (b.ammoType === 'missile' || b.ammoType === 'heavy') { audioManager.playSound("explosion"); applyAoEDamage(b.position, 8, 2); }
                        if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); bullets.splice(i, 1); hitDecor = true; break;
                    }
                }
            }
        }

        // Enemy projectile tracking
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i]; b.position.addInPlace(b.direction.scale(15 * dt)); 
            if (b.position.length() > 150) { if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); enemyBullets.splice(i, 1); }
            else {
                if (b.intersectsMesh(tank, false)) {
                    GameState.lives -= 1; ui.livesText.text = "LIVES: " + Math.max(0, GameState.lives);
                    if (GameState.lives === 2) ui.livesText.color = "orange"; else if (GameState.lives <= 1) ui.livesText.color = "red"; triggerDamageEffect(); createExplosion(scene, b.position.clone()); if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); enemyBullets.splice(i, 1);
                    if (GameState.lives <= 0) { GameState.isGameOver = true; ui.gameOverMenu.isVisible = true; audioManager.playSound("gameOver"); audioManager.stopSound("backgroundMusic"); } continue;
                }
                for (let obs of obstacles) { if (b.intersectsMesh(obs, false)) { createExplosion(scene, b.position.clone()); if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); enemyBullets.splice(i, 1); break; } }
            }
        }

        // Bonus pickup effects
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i]; if (p.position.y > 1) p.position.y -= 5 * dt;
            if (p.intersectsMesh(tank, false)) {
                ui.bonusText.text = p.bonusName; setTimeout(() => ui.bonusText.text = "", 2000); audioManager.playSound("bonus");
                if (p.bonusType === 0) { GameState.rapidFireActive = true; setTimeout(() => GameState.rapidFireActive = false, 5000); }
                if (p.bonusType === 1) { GameState.lives++; ui.livesText.text = "LIVES: " + GameState.lives; }
                if (p.bonusType === 2) {
                    GameState.enemiesFrozen = true; enemies.forEach(e => { if (e.runAnim) e.runAnim.pause(); if (e.attackAnim) e.attackAnim.pause(); });
                    setTimeout(() => { GameState.enemiesFrozen = false; enemies.forEach(e => { if (e.currentAnim === "run" && e.runAnim) e.runAnim.play(true); if (e.currentAnim === "attack" && e.attackAnim) e.attackAnim.play(true); }); }, 3000);
                }
                if (p.bonusType === 3) { GameState.speedBoostActive = true; setTimeout(() => GameState.speedBoostActive = false, 5000); }
                p.dispose(); powerUps.splice(i, 1);
            }
        }

        if (GameState.globalZombieSoundCooldown > 0) GameState.globalZombieSoundCooldown -= dt;

        // Enemy AI Logic: Patrolling and Target Pursuit (Finite State Machine)
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (!GameState.enemiesFrozen) {
                if (GameState.globalZombieSoundCooldown <= 0 && Math.random() < 0.005) { GameState.globalZombieSoundCooldown = 3.0 + Math.random() * 10.0; audioManager.playSound("zombieSound", enemy.hitbox); }

                let distToTank = BABYLON.Vector3.Distance(enemy.position, tank.position);
                let distToAlly = (allyTank && allyTank.isAlive) ? BABYLON.Vector3.Distance(enemy.position, allyTank.mesh.position) : 999;
                let target = (allyTank && allyTank.isAlive && distToAlly < distToTank) ? allyTank.mesh : tank;
                let distanceToTarget = (target === tank) ? distToTank : distToAlly;

                enemy.stateTimer += dt;
                
                switch (enemy.aiState) {
                    case EnemyState.PATROL: if (distanceToTarget < 25 || enemy.enemyType === 'charger' || enemy.enemyType === 'kamikaze') { enemy.aiState = EnemyState.CHASE; enemy.stateTimer = 0; } break;
                    case EnemyState.CHASE: if (distanceToTarget > 35 && enemy.enemyType !== 'charger' && enemy.enemyType !== 'kamikaze') { enemy.aiState = EnemyState.PATROL; enemy.patrolTarget = getRandomPatrolTarget(); enemy.stateTimer = 0; } break;
                }

                let fsmDir = new BABYLON.Vector3(0, 0, 0), currentSpeed = zombieSpeedMax;
                if (enemy.aiState === EnemyState.PATROL) {
                    let toTarget = enemy.patrolTarget.subtract(enemy.position); toTarget.y = 0; if (toTarget.length() < 2) enemy.patrolTarget = getRandomPatrolTarget();
                    fsmDir = toTarget.normalize(); currentSpeed = zombieSpeedMax * 0.4; 
                } else fsmDir = target.position.subtract(enemy.position).normalize();
                if (enemy.enemyType === 'kamikaze') currentSpeed = zombieSpeedMax * 1.5; 

                const attackDist = enemy.attackDist || 2.3; 
                if (distanceToTarget <= attackDist) {
                    if (enemy.enemyType === 'kamikaze') {
                        createExplosion(scene, enemy.position.clone()); audioManager.playSound("explosion");
                        if (target === tank) {
                            GameState.lives -= 1; ui.livesText.text = "LIVES: " + Math.max(0, GameState.lives);
                            if (GameState.lives === 2) ui.livesText.color = "orange"; else if (GameState.lives <= 1) ui.livesText.color = "red"; triggerDamageEffect();
                        } else {
                            allyTank.takeDamage(10);
                        }
                        enemy.hitbox.dispose(); if (enemy.runAnim) enemy.runAnim.dispose(); if (enemy.attackAnim) enemy.attackAnim.dispose(); enemy.dispose(); enemies.splice(i, 1); spawnEnemy();
                        if (GameState.lives <= 0) { GameState.isGameOver = true; ui.gameOverMenu.isVisible = true; audioManager.playSound("gameOver"); audioManager.stopSound("backgroundMusic"); } continue; 
                    }
                    currentSpeed = 0; 
                    if (enemy.currentAnim !== "attack") { if (enemy.runAnim) enemy.runAnim.stop(); if (enemy.attackAnim) enemy.attackAnim.play(true); enemy.currentAnim = "attack"; }
                    enemy.attackTimer -= dt;
                    if (enemy.attackTimer <= 0) {
                        if (enemy.enemyType === 'spitter') { fireEnemyBullet(enemy); enemy.attackTimer = 2.5; } else {
                            if (target === tank) {
                                GameState.lives -= 1; ui.livesText.text = "LIVES: " + Math.max(0, GameState.lives);
                                if (GameState.lives === 2) ui.livesText.color = "orange"; else if (GameState.lives <= 1) ui.livesText.color = "red"; triggerDamageEffect(); enemy.attackTimer = 1.5; 
                                if (GameState.lives <= 0) { GameState.isGameOver = true; ui.gameOverMenu.isVisible = true; audioManager.playSound("gameOver"); audioManager.stopSound("backgroundMusic"); return; }
                            } else {
                                allyTank.takeDamage(1); enemy.attackTimer = 1.5;
                            }
                        }
                    }
                } else {
                    if (enemy.currentAnim !== "run") { if (enemy.attackAnim) enemy.attackAnim.stop(); if (enemy.runAnim) enemy.runAnim.play(true); enemy.currentAnim = "run"; }
                    enemy.attackTimer = 0.5; 
                }
                
                const oldEnemyX = enemy.position.x, oldEnemyZ = enemy.position.z;
                enemy.position.x += fsmDir.x * currentSpeed * dt;
                for (let obs of obstacles) { if (enemy.hitbox.intersectsMesh(obs, false) && !barrels.includes(obs)) { enemy.position.x = oldEnemyX; enemy.position.z += Math.sign(fsmDir.z || 1) * currentSpeed * dt * 0.5; break; } }
                enemy.position.z += fsmDir.z * currentSpeed * dt;
                for (let obs of obstacles) { if (enemy.hitbox.intersectsMesh(obs, false) && !barrels.includes(obs)) { enemy.position.z = oldEnemyZ; enemy.position.x += Math.sign(fsmDir.x || 1) * currentSpeed * dt * 0.5; break; } }
                enemy.position.y = 0; enemy.lookAt(enemy.aiState === EnemyState.PATROL ? enemy.position.add(fsmDir) : target.position); 
            }

            let enemyDead = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j];
                if (b.intersectsMesh(enemy.hitbox, true)) {
                    let isAoE = (b.ammoType === 'missile' || b.ammoType === 'heavy'), dmg = (b.ammoType === 'heavy') ? 5 : (b.ammoType === 'missile' ? 2 : (b.ammoType === 'smg' ? 1 : 1)), radius = (b.ammoType === 'heavy') ? 8.0 : 4.0, impactPos = b.position.clone();
                    if(b.trail) { b.trail.stop(); setTimeout(()=>b.trail.dispose(), 500); } b.dispose(); bullets.splice(j, 1);
                    if (isAoE) {
                        createExplosion(scene, impactPos); audioManager.playSound("explosion"); enemy.hp -= dmg;
                        for (let k = enemies.length - 1; k >= 0; k--) {
                            if (k !== i) { 
                                let other = enemies[k];
                                if (BABYLON.Vector3.Distance(impactPos, other.position) <= radius) {
                                    other.hp -= dmg;
                                    if (other.hp <= 0) { killEnemy(k, other); if (k < i) i--; } else {
                                        ui.showFloatingText("HIT!", other.position.clone());
                                        other.getChildMeshes().forEach(m => { if (m.material) { const orig = m.material.emissiveColor ? m.material.emissiveColor.clone() : new BABYLON.Color3(0,0,0); m.material.emissiveColor = new BABYLON.Color3(1, 0, 0); setTimeout(() => { if (m.material) m.material.emissiveColor = orig; }, 150); } });
                                    }
                                }
                            }
                        }
                    } else { enemy.hp -= dmg; }
                    if (enemy.hp <= 0) { killEnemy(i, enemy); enemyDead = true; } else {
                        ui.showFloatingText("HIT!", enemy.position.clone());
                        enemy.getChildMeshes().forEach(m => { if (m.material) { const origEmissive = m.material.emissiveColor ? m.material.emissiveColor.clone() : new BABYLON.Color3(0,0,0); m.material.emissiveColor = new BABYLON.Color3(1, 0, 0); setTimeout(() => { if (m.material) m.material.emissiveColor = origEmissive; }, 150); } });
                    }
                    break;
                }
            }
            if (enemyDead) continue; 
            
            if (enemy.hitbox.intersectsMesh(tank, true) && Math.abs(GameState.tankVelocity) > 1.0) {
                let damage = (enemy.enemyType === 'charger' || enemy.enemyType === 'kamikaze') ? 2 : 1;
                GameState.lives -= damage; ui.livesText.text = "LIVES: " + Math.max(0, GameState.lives);
                if (GameState.lives >= 3) ui.livesText.color = "#008800"; else if (GameState.lives === 2) ui.livesText.color = "orange"; else if (GameState.lives >= 1) ui.livesText.color = "red";
                triggerDamageEffect(); killEnemy(i, enemy);
                if (GameState.lives <= 0) { GameState.isGameOver = true; ui.gameOverMenu.isVisible = true; audioManager.playSound("gameOver"); audioManager.stopSound("backgroundMusic"); return; }
            }
        }
    });

    return scene;
}