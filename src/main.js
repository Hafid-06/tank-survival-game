import * as BABYLON from "@babylonjs/core";
import { DracoCompression } from "@babylonjs/core";
import { createScene } from "./scene.js";

DracoCompression.Configuration = {
    decoder: {
        wasmUrl: "https://cdn.babylonjs.com/draco_wasm_wrapper_gltf.js",
        wasmBinaryUrl: "https://cdn.babylonjs.com/draco_decoder_gltf.wasm",
        fallbackUrl: "https://cdn.babylonjs.com/draco_decoder_gltf.js",
    }
};

window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("renderCanvas");
    if (!canvas) {
        console.error("Canvas not found !");
        return;
    }

    const engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        disableWebGL2Support: false
    });

    const scene = createScene(engine, canvas);

    scene.whenReadyAsync().then(() => {
        const loader = document.getElementById("loading-screen");
        if (loader) loader.style.display = "none";
        
        engine.runRenderLoop(() => {
            scene.render();
        });
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
});