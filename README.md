# TANK SURVIVAL

## Group
Group members: 

- EL JAGHAOUI Abdelhafid
- BACHA Hiba

## How to run the game: 

- `npm install`

- `npm run dev`

- Then open the link shown in your terminal (usually `http://localhost:5173/`)

## Project Structure

```text
Tank_Survival/
├── public/          # Static assets (3D models, music, textures).
├── src/
│   ├── main.js          # Entry point: Initializes the engine and render loop.
│   ├── scene.js         # Orchestrator: Connects modules and manages game logic.
│   ├── gameState.js     # Data: Centralizes score, lives, and game states.
│   ├── audioManager.js  # Audio: Manages loading and playing of all sounds.
│   ├── environment.js   # 3D Universe: Creates lights, sky, ground, and obstacles.
│   ├── particles.js     # Visual effects: Manages explosions and particles.
│   └── ui.js            # Interface: Displays the HUD, menus, shop, and buttons.
├── index.html       # Main page: Contains the game canvas (display area).
└── package.json     # Configuration: Lists dependencies (Babylon.js, Vite) and scripts.
```
    
## Description
A simple arcade-style survival game where the player controls a tank to eliminate waves of zombies.

## Controls
- Movement: ZQSD or WASD
- Shoot: Space
- Dash: Shift
- Pause: Esc

## Objective
Eliminate as many zombies as possible to get the highest score and collect coins to buy upgrades.