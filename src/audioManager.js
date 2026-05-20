import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

// Handles all game audio: SFX, music, and spatial sound support
export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.settings = { masterVolume: 0.8, muted: false };
        this.sounds = {}; // Babylon.js sound objects
        this.htmlAudios = {}; // HTML5 Audio element fallbacks
        
        // Base volume definitions for consistent balancing
        this.volumes = {
            shoot: 0.8, 
            smgShoot: 0.8, 
            bonus: 1.0, 
            getCoin: 1.0,
            tankEngine: 0.1, 
            tankIdle: 0.3, 
            explosion: 1.0,
            gameOver: 1.0, 
            zombieSound: 0.1,     
            backgroundMusic: 0.2   
        };

        this.loadSettings();
        this.initBabylonSounds();
        this.initHtmlAudios();
        this.setupAudioContextUnlock();
        this.applySettings(); 
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem('tankSurvivalSettings');
            if (raw) this.settings = Object.assign(this.settings, JSON.parse(raw));
        } catch (e) {}
    }

    saveSettings() {
        try { localStorage.setItem('tankSurvivalSettings', JSON.stringify(this.settings)); } catch (e) {}
    }

    // Adjusts volume levels globally based on settings
    applySettings() {
        const vol = this.settings.muted ? 0 : this.settings.masterVolume;
        
        for (const [key, sound] of Object.entries(this.sounds)) {
            const baseVol = this.volumes[key] !== undefined ? this.volumes[key] : 1.0;
            if (sound.babylonSound) sound.babylonSound.setVolume(vol * baseVol);
        }

        for (const [key, audio] of Object.entries(this.htmlAudios)) {
            const baseVol = this.volumes[key] !== undefined ? this.volumes[key] : 1.0;
            audio.element.volume = key === 'explosion' ? Math.min(1.0, vol * baseVol) : vol * baseVol;
        }
    }

    // Loads sounds using Babylon's engine for native 3D/spatial audio support
    initBabylonSounds() {
        const createSound = (name, path, options = {}) => {
            this.sounds[name] = { loaded: false, babylonSound: null };
            this.sounds[name].babylonSound = new BABYLON.Sound(name, path, this.scene, () => {
                this.sounds[name].loaded = true;
            }, { spatialSound: false, ...options });
        };

        createSound("shoot", "/sounds/cannon.mp3", { volume: this.volumes.shoot });
        createSound("smgShoot", "/sounds/SMG.mp3", { volume: this.volumes.smgShoot });
        createSound("bonus", "/sounds/bonus.mp3", { volume: this.volumes.bonus });
        createSound("getCoin", "/sounds/get-coin.mp3", { volume: this.volumes.getCoin });
        createSound("tankEngine", "/sounds/tank.mp3", { volume: this.volumes.tankEngine, loop: true });
        createSound("tankIdle", "/sounds/engine.mp3", { volume: this.volumes.tankIdle, loop: true });
        createSound("explosion", "/sounds/explosion.mp3", { volume: this.volumes.explosion });
        createSound("gameOver", "/sounds/game_over.mp3", { volume: this.volumes.gameOver });
        createSound("zombieSound", "/sounds/zombie_sound.mp3", { volume: this.volumes.zombieSound, spatialSound: true, maxDistance: 40 });
        createSound("backgroundMusic", "/sounds/music.mp3", { volume: this.volumes.backgroundMusic, loop: true });
    }

    // Initializes HTML5 audio elements as a robust fallback system
    initHtmlAudios() {
        const createAudioEl = (name, path, options = {}) => {
            const el = new Audio(path);
            el.preload = 'auto';
            if (options.loop) el.loop = true;
            if (options.volume !== undefined) el.volume = options.volume;
            el.addEventListener('canplaythrough', () => {});
            el.addEventListener('error', (e) => {});
            this.htmlAudios[name] = { element: el };
        };

        createAudioEl("shoot", '/sounds/cannon.mp3', { volume: this.volumes.shoot });
        createAudioEl("smgShoot", '/sounds/SMG.mp3', { volume: this.volumes.smgShoot });
        createAudioEl("bonus", '/sounds/bonus.mp3', { volume: this.volumes.bonus });
        createAudioEl("getCoin", '/sounds/get-coin.mp3', { volume: this.volumes.getCoin });
        createAudioEl("tankEngine", '/sounds/tank.mp3', { loop: true, volume: this.volumes.tankEngine });
        createAudioEl("tankIdle", '/sounds/engine.mp3', { loop: true, volume: this.volumes.tankIdle });
        createAudioEl("explosion", '/sounds/explosion.mp3', { volume: this.volumes.explosion });
        createAudioEl("gameOver", '/sounds/game_over.mp3', { volume: this.volumes.gameOver });
        createAudioEl("zombieSound", '/sounds/zombie_sound.mp3', { volume: this.volumes.zombieSound });
        createAudioEl("backgroundMusic", '/sounds/music.mp3', { loop: true, volume: this.volumes.backgroundMusic });

        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const setupGain = (name, gainValue) => {
                const source = ctx.createMediaElementSource(this.htmlAudios[name].element);
                const gainNode = ctx.createGain();
                gainNode.gain.value = gainValue;
                source.connect(gainNode);
                gainNode.connect(ctx.destination);
            };

            setupGain("shoot", 3.0);
            setupGain("smgShoot", 2.0);
            setupGain("bonus", 5.0);
        } catch (e) {
            console.warn("AudioContext non disponible, utilisation du son standard.");
        }

        try {
            const files = ['cannon.mp3', 'SMG.mp3', 'bonus.mp3', 'get-coin.mp3', 'tank.mp3', 'engine.mp3', 'explosion.mp3', 'game_over.mp3', 'zombie_sound.mp3', 'music.mp3'];
            files.forEach(f => fetch(`/sounds/${f}`, { method: 'HEAD' }).catch(() => {}));
        } catch(e) {}
    }

    // Resumes audio context if suspended by browser autoplay policies
    unlockNow() {
        try {
            const engineObj = this.scene.getEngine();
            const audioEngine = engineObj && (engineObj.audioEngine || (engineObj.getAudioEngine && engineObj.getAudioEngine()));
            if (audioEngine && audioEngine.audioContext && audioEngine.audioContext.state === 'suspended') {
                audioEngine.audioContext.resume().catch(() => {});
            }
        } catch (e) { }
    }

    // Adds event listeners to force audio context unlock on first user interaction
    setupAudioContextUnlock() {
        const unlock = () => {
            this.unlockNow();
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    // Playback logic: supports cloning for rapid-fire effects (overlapping sounds)
    playSound(name, meshToAttach = null) {
        if (this.settings.muted || this.volumes[name] === 0.0) return;
        
        const s = this.sounds[name];
        const html = this.htmlAudios[name];

        if (name === 'smgShoot' || name === 'shoot') {
             if (s && s.loaded && s.babylonSound) {
                let clone = s.babylonSound.clone();
                clone.play();
                setTimeout(() => clone.dispose(), name === 'smgShoot' ? 1000 : 2000);
             } else if (html) {
                let clone = html.element.cloneNode();
                clone.volume = html.element.volume;
                clone.play().catch(() => {});
             }
             return;
        }

        if (s && s.loaded && s.babylonSound) {
            if (meshToAttach) s.babylonSound.attachToMesh(meshToAttach);
            if (!s.babylonSound.isPlaying) {
                s.babylonSound.stop();
                s.babylonSound.play();
            }
        } else if (html) {
            if (html.element.paused) {
                if (name !== 'backgroundMusic') html.element.currentTime = 0;
                html.element.play().catch(() => {});
            }
        }
    }

    stopSound(name) {
        const s = this.sounds[name];
        const html = this.htmlAudios[name];
        
        if (s && s.babylonSound && s.babylonSound.isPlaying) s.babylonSound.pause();
        if (html && !html.element.paused) html.element.pause();
    }

    stopAll() {
        for (const key in this.sounds) this.stopSound(key);
    }
}