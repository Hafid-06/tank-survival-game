// src/main.js
import * as BABYLON from "@babylonjs/core";
import { createScene } from "./scene.js";

window.addEventListener("DOMContentLoaded", async () => {
    // 1. Récupère le canvas dans le fichier HTML
    const canvas = document.getElementById("renderCanvas");
    if (!canvas) {
        console.error("Canvas non trouvé !");
        return;
    }

    // 2. Initialise le moteur BabylonJS
    const engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        disableWebGL2Support: false
    });

    // 3. Crée la scène à partir du module scene.js
    const scene = createScene(engine, canvas);

    // 4. Lance la boucle de rendu principale
    engine.runRenderLoop(() => {
        scene.render();
    });

    // 5. Gère le redimensionnement de la fenêtre
    window.addEventListener("resize", () => {
        engine.resize();
    });
});