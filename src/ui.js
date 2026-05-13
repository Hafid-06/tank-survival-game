// src/ui.js
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { GameState } from "./gameState.js";

export function createUI(scene, audioManager, callbacks) {
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    const waveNotify = new GUI.TextBlock();
    waveNotify.text = "";
    waveNotify.color = "white";
    waveNotify.fontSize = 56;
    waveNotify.fontWeight = "bold";
    waveNotify.outlineWidth = 3;
    waveNotify.outlineColor = "black";
    waveNotify.alpha = 0;
    waveNotify.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    waveNotify.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    waveNotify.isPointerBlocker = false;
    advancedTexture.addControl(waveNotify);

    function showWave(n) {
        try {
            waveNotify.text = "WAVE " + n;
            waveNotify.alpha = 1.0;
            setTimeout(() => {
                let a = 1.0;
                const interval = setInterval(() => {
                    a -= 0.05;
                    waveNotify.alpha = Math.max(0, a);
                    if (a <= 0) { clearInterval(interval); waveNotify.text = ""; }
                }, 50);
            }, 2000);
        } catch (e) { }
    }

    const hudContainer = new GUI.Rectangle();
    hudContainer.thickness = 0;
    hudContainer.isVisible = false;
    advancedTexture.addControl(hudContainer);

    const damageOverlay = new GUI.Rectangle();
    damageOverlay.width = "100%";
    damageOverlay.height = "100%";
    damageOverlay.background = "red";
    damageOverlay.alpha = 0;
    damageOverlay.thickness = 0;
    damageOverlay.zIndex = -1;
    hudContainer.addControl(damageOverlay);

    const howToPanel = new GUI.Rectangle();
    howToPanel.width = "560px";
    howToPanel.height = "720px";
    howToPanel.cornerRadius = 20;
    howToPanel.color = "White";
    howToPanel.thickness = 3;
    howToPanel.background = "rgba(10,10,10,0.95)";
    howToPanel.isVisible = false;
    howToPanel.zIndex = 200;
    advancedTexture.addControl(howToPanel);

    const howToTitle = new GUI.TextBlock();
    howToTitle.text = "HOW TO PLAY";
    howToTitle.color = "White";
    howToTitle.fontSize = 34;
    howToTitle.top = "-300px";
    howToTitle.fontWeight = "bold";
    howToTitle.height = "80px";
    howToPanel.addControl(howToTitle);

    const howToText = new GUI.TextBlock();
    howToText.text = "Movement: Z Q S D or W A S D\nShoot: SPACE\nDash: SHIFT\nPause/Menu: ESC\n\nObjective: Survive enemy waves by killing zombies.\n\nWeapons (Shop):\n• Classic: Normal shot\n• SMG: Very fast fire, low damage\n• Missile: Area damage (4m radius)\n• Heavy: Huge area damage (8m radius)\n\nBonuses (Crates):\n• 🟨 Machine Gun\n• 🟥 Life +1\n• 🟦 Freeze\n• 🟪 Max Speed";
    howToText.color = "LightGray";
    howToText.fontSize = 20;
    howToText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    howToText.textWrapping = true;
    howToText.width = "500px";
    howToText.top = "0px";
    howToText.height = "520px";
    howToPanel.addControl(howToText);

    const howToClose = GUI.Button.CreateSimpleButton("howToClose", "CLOSE");
    howToClose.width = "180px";
    howToClose.height = "48px";
    howToClose.color = "white";
    howToClose.cornerRadius = 12;
    howToClose.background = "#666";
    howToClose.top = "300px";
    howToClose.onPointerClickObservable.add(() => {
        howToPanel.isVisible = false;
        if (GameState.isGameStarted) pauseMenu.isVisible = GameState.isPaused;
        else menuContainer.isVisible = true;
    });
    howToPanel.addControl(howToClose);

    const settingsPanel = new GUI.Rectangle();
    settingsPanel.width = "460px";
    settingsPanel.height = "300px";
    settingsPanel.cornerRadius = 16;
    settingsPanel.color = "White";
    settingsPanel.thickness = 2;
    settingsPanel.background = "rgba(6,6,6,0.95)";
    settingsPanel.isVisible = false;
    settingsPanel.zIndex = 200;
    advancedTexture.addControl(settingsPanel);

    const settingsTitle = new GUI.TextBlock();
    settingsTitle.text = "SETTINGS";
    settingsTitle.color = "White";
    settingsTitle.fontSize = 30;
    settingsTitle.top = "-120px";
    settingsTitle.fontWeight = "bold";
    settingsTitle.height = "50px";
    settingsPanel.addControl(settingsTitle);

    const volLabel = new GUI.TextBlock();
    volLabel.text = "Volume: " + Math.round(audioManager.settings.masterVolume * 100) + "%";
    volLabel.color = "LightGray";
    volLabel.fontSize = 18;
    volLabel.top = "-40px";
    volLabel.left = "-80px";
    volLabel.width = "260px";
    volLabel.height = "30px";
    volLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    settingsPanel.addControl(volLabel);

    const volumeSlider = new GUI.Slider();
    volumeSlider.minimum = 0;
    volumeSlider.maximum = 1;
    volumeSlider.value = audioManager.settings.masterVolume;
    volumeSlider.width = "320px";
    volumeSlider.height = "20px";
    volumeSlider.top = "-10px";
    volumeSlider.background = "rgba(255,255,255,0.12)"; 
    volumeSlider.color = "white"; 
    volumeSlider.thumbWidth = 14; 
    volumeSlider.isPointerBlocker = true;
    volumeSlider.onValueChangedObservable.add(function(value) {
        audioManager.settings.masterVolume = value;
        volLabel.text = "Volume: " + Math.round(value * 100) + "%";
        audioManager.applySettings();
        audioManager.saveSettings();
    });
    settingsPanel.addControl(volumeSlider);

    const muteBtn = GUI.Button.CreateSimpleButton("muteBtn", audioManager.settings.muted ? "🔈 MUTE: ON" : "🔊 MUTE: OFF");
    muteBtn.width = "180px";
    muteBtn.height = "44px";
    muteBtn.color = "white";
    muteBtn.cornerRadius = 12;
    muteBtn.background = "#555";
    muteBtn.top = "50px";
    muteBtn.onPointerClickObservable.add(() => {
        audioManager.settings.muted = !audioManager.settings.muted;
        muteBtn.textBlock.text = audioManager.settings.muted ? "🔈 MUTE: ON" : "🔊 MUTE: OFF";
        audioManager.applySettings();
        audioManager.saveSettings();
    });
    settingsPanel.addControl(muteBtn);

    const settingsClose = GUI.Button.CreateSimpleButton("settingsClose", "CLOSE");
    settingsClose.width = "160px";
    settingsClose.height = "44px";
    settingsClose.color = "white";
    settingsClose.cornerRadius = 12;
    settingsClose.background = "#666";
    settingsClose.top = "120px";
    settingsClose.onPointerClickObservable.add(() => {
        settingsPanel.isVisible = false;
        if (GameState.isGameStarted) pauseMenu.isVisible = GameState.isPaused;
        else menuContainer.isVisible = true;
    });
    settingsPanel.addControl(settingsClose);

    const topPanel = new GUI.Rectangle();
    topPanel.width = "300px";
    topPanel.height = "170px"; 
    topPanel.cornerRadius = 20; 
    topPanel.color = "Black"; 
    topPanel.thickness = 1; 
    topPanel.background = "rgba(255, 255, 255, 0.5)"; 
    topPanel.top = "20px";
    topPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    topPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    topPanel.left = "20px"; 
    hudContainer.addControl(topPanel);

    const scoreText = new GUI.TextBlock();
    scoreText.text = "SCORE: 0";
    scoreText.color = "Black"; 
    scoreText.fontSize = 24;
    scoreText.fontWeight = "bold";
    scoreText.top = "-55px";
    scoreText.height = "40px";
    topPanel.addControl(scoreText);

    const highScoreText = new GUI.TextBlock();
    highScoreText.text = "HIGH SCORE: " + GameState.highScore;
    highScoreText.color = "Gold";
    highScoreText.fontSize = 20;
    highScoreText.fontWeight = "bold";
    highScoreText.top = "-25px";
    highScoreText.height = "30px";
    topPanel.addControl(highScoreText);

    const livesText = new GUI.TextBlock();
    livesText.text = "LIVES: 3";
    livesText.color = "#008800"; 
    livesText.fontSize = 24;
    livesText.fontWeight = "bold";
    livesText.top = "10px";
    livesText.height = "40px";
    topPanel.addControl(livesText);

    const coinsText = new GUI.TextBlock();
    coinsText.text = "COINS: 0";
    coinsText.color = "GoldenRod"; 
    coinsText.fontSize = 24;
    coinsText.fontWeight = "bold";
    coinsText.top = "50px";
    coinsText.height = "40px";
    topPanel.addControl(coinsText);

    const bonusInfoBtn = GUI.Button.CreateSimpleButton("bonusInfoBtn", "BONUS INFO");
    bonusInfoBtn.width = "160px";
    bonusInfoBtn.height = "40px";
    bonusInfoBtn.color = "white";
    bonusInfoBtn.cornerRadius = 10;
    bonusInfoBtn.background = "rgba(50, 50, 50, 0.7)";
    bonusInfoBtn.top = "200px";
    bonusInfoBtn.left = "20px";
    bonusInfoBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    bonusInfoBtn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    bonusInfoBtn.zIndex = 10;
    hudContainer.addControl(bonusInfoBtn);

    const bonusInfoPanel = new GUI.Rectangle();
    bonusInfoPanel.width = "400px";
    bonusInfoPanel.height = "320px";
    bonusInfoPanel.cornerRadius = 20;
    bonusInfoPanel.color = "White";
    bonusInfoPanel.thickness = 3;
    bonusInfoPanel.background = "rgba(10,10,10,0.95)";
    bonusInfoPanel.isVisible = false;
    bonusInfoPanel.zIndex = 200;
    advancedTexture.addControl(bonusInfoPanel);

    const bonusInfoTitle = new GUI.TextBlock();
    bonusInfoTitle.text = "BONUS EFFECTS";
    bonusInfoTitle.color = "Gold";
    bonusInfoTitle.fontSize = 26;
    bonusInfoTitle.top = "-110px";
    bonusInfoTitle.fontWeight = "bold";
    bonusInfoPanel.addControl(bonusInfoTitle);

    const bonusInfoText = new GUI.TextBlock();
    bonusInfoText.text = "🟨 Yellow: Machine Gun (Fast fire)\n\n🟥 Red: Life +1 (Restores a life)\n\n🟦 Blue: Freeze (Freezes zombies)\n\n🟪 Purple: Max Speed (Fast movement)";
    bonusInfoText.color = "LightGray";
    bonusInfoText.fontSize = 18;
    bonusInfoText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    bonusInfoText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    bonusInfoText.width = "360px";
    bonusInfoText.top = "-10px";
    bonusInfoPanel.addControl(bonusInfoText);

    const bonusInfoClose = GUI.Button.CreateSimpleButton("bonusInfoClose", "CLOSE");
    bonusInfoClose.width = "160px";
    bonusInfoClose.height = "44px";
    bonusInfoClose.color = "white";
    bonusInfoClose.cornerRadius = 12;
    bonusInfoClose.background = "#666";
    bonusInfoClose.top = "110px";
    bonusInfoClose.onPointerClickObservable.add(() => {
        bonusInfoPanel.isVisible = false;
        if (!pauseMenu.isVisible && !shopPanel.isVisible) GameState.isPaused = false;
    });
    bonusInfoPanel.addControl(bonusInfoClose);

    bonusInfoBtn.onPointerClickObservable.add(() => {
        if (!GameState.isGameOver) {
            bonusInfoPanel.isVisible = true;
            GameState.isPaused = true;
        }
    });

    const shopBtn = GUI.Button.CreateSimpleButton("shopBtn", "SHOP");
    shopBtn.width = "160px";
    shopBtn.height = "40px";
    shopBtn.color = "white";
    shopBtn.cornerRadius = 10;
    shopBtn.background = "rgba(0, 100, 0, 0.8)";
    shopBtn.top = "250px";
    shopBtn.left = "20px";
    shopBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    shopBtn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    shopBtn.zIndex = 10;
    hudContainer.addControl(shopBtn);

    const shopPanel = new GUI.Rectangle();
    shopPanel.width = "500px";
    shopPanel.height = "480px"; 
    shopPanel.cornerRadius = 20;
    shopPanel.color = "White";
    shopPanel.thickness = 3;
    shopPanel.background = "rgba(10,10,10,0.95)";
    shopPanel.isVisible = false;
    shopPanel.zIndex = 200;
    advancedTexture.addControl(shopPanel);

    const shopTitle = new GUI.TextBlock();
    shopTitle.text = "GUN SHOP";
    shopTitle.color = "Gold";
    shopTitle.fontSize = 28;
    shopTitle.top = "-190px";
    shopTitle.fontWeight = "bold";
    shopPanel.addControl(shopTitle);

    const shopStack = new GUI.StackPanel();
    shopStack.top = "-20px";
    shopPanel.addControl(shopStack);

    const shopMessage = new GUI.TextBlock();
    shopMessage.text = "";
    shopMessage.color = "red";
    shopMessage.fontSize = 18;
    shopMessage.fontWeight = "bold";
    shopMessage.top = "160px";
    shopMessage.height = "30px";
    shopMessage.isPointerBlocker = false;
    shopPanel.addControl(shopMessage);

    function createShopItem(name, cost, ammoType, description) {
        let container = new GUI.Rectangle();
        container.width = "460px"; container.height = "90px"; container.thickness = 0;
        container.background = "rgba(40, 40, 40, 0.8)"; container.cornerRadius = 8; container.paddingBottom = "10px";
        
        let text = new GUI.TextBlock();
        text.text = name + " - " + description + "\nCost: " + cost + " coins";
        text.color = "white"; text.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        text.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER; text.width = "100%"; 
        text.paddingLeft = "15px"; text.paddingRight = "120px"; text.textWrapping = true; text.fontSize = 14; text.isPointerBlocker = false;
        container.addControl(text);

        let btn = GUI.Button.CreateSimpleButton("buy_" + ammoType, "BUY");
        btn.width = "100px"; btn.height = "40px"; btn.color = "white"; btn.background = "green";
        btn.cornerRadius = 5; btn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT; btn.left = "-15px";
        btn.onPointerClickObservable.add(() => {
            if (!GameState.unlockedAmmo[ammoType]) {
                if (GameState.coinsCount >= cost) {
                    GameState.coinsCount -= cost;
                    coinsText.text = "COINS: " + GameState.coinsCount;
                    GameState.unlockedAmmo[ammoType] = true;
                    GameState.currentAmmo = ammoType;
                    btn.textBlock.text = "OWNED";
                    btn.background = "gray";
                    updateAmmoUI();
                    shopMessage.text = ""; 
                } else {
                    shopMessage.text = "❌ You don't have enough coins!";
                    setTimeout(() => { if (shopMessage.text !== "") shopMessage.text = ""; }, 2000);
                }
            }
        });
        container.addControl(btn);
        shopStack.addControl(container);
        return btn;
    }

    const buySmgBtn = createShopItem("Machine Gun (SMG)", 10, "smg", "Very fast fire");
    const buyMissileBtn = createShopItem("Missile", 30, "missile", "Area damage (4m radius, 2 Dmg)");
    const buyHeavyBtn = createShopItem("Heavy Cannon", 50, "heavy", "Huge area damage (8m radius, 5 Dmg)");

    const shopCloseBtn = GUI.Button.CreateSimpleButton("shopCloseBtn", "CLOSE");
    shopCloseBtn.width = "160px"; shopCloseBtn.height = "44px"; shopCloseBtn.color = "white";
    shopCloseBtn.cornerRadius = 12; shopCloseBtn.background = "#666"; shopCloseBtn.top = "190px";
    shopCloseBtn.onPointerClickObservable.add(() => {
        shopPanel.isVisible = false;
        if (!pauseMenu.isVisible && !bonusInfoPanel.isVisible) GameState.isPaused = false;
    });
    shopPanel.addControl(shopCloseBtn);

    shopBtn.onPointerClickObservable.add(() => {
        if (!GameState.isGameOver) { shopPanel.isVisible = true; GameState.isPaused = true; }
    });

    const ammoContainer = new GUI.Rectangle();
    ammoContainer.width = "580px"; ammoContainer.height = "60px"; ammoContainer.cornerRadius = 15;
    ammoContainer.color = "White"; ammoContainer.thickness = 2; ammoContainer.background = "rgba(10, 10, 10, 0.8)";
    ammoContainer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM; ammoContainer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER; ammoContainer.top = "-20px";
    hudContainer.addControl(ammoContainer);

    const ammoBanner = new GUI.StackPanel();
    ammoBanner.isVertical = false; ammoBanner.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    ammoContainer.addControl(ammoBanner);

    function createAmmoBtn(id, text, type) {
        let btn = GUI.Button.CreateSimpleButton(id, text);
        btn.width = "135px"; btn.height = "40px"; btn.color = "white"; btn.cornerRadius = 8;
        btn.fontFamily = "Arial"; btn.fontWeight = "bold"; btn.fontSize = 14; btn.paddingLeft = "5px"; btn.paddingRight = "5px";
        btn.onPointerClickObservable.add(() => {
            if (GameState.unlockedAmmo[type]) { GameState.currentAmmo = type; updateAmmoUI(); }
        });
        ammoBanner.addControl(btn);
        return btn;
    }

    const btnBase = createAmmoBtn("btnBase", "1. BASE", "base");
    const btnSmg = createAmmoBtn("btnSmg", "2. SMG", "smg");
    const btnMissile = createAmmoBtn("btnMissile", "3. MISSILE", "missile");
    const btnHeavy = createAmmoBtn("btnHeavy", "4. HEAVY", "heavy");

    function updateAmmoUI() {
        const setBtnStyle = (btn, type) => {
            if (GameState.currentAmmo === type) {
                btn.background = "rgba(255, 140, 0, 0.9)"; btn.color = "White"; btn.thickness = 3;
            } else if (GameState.unlockedAmmo[type]) {
                btn.background = "rgba(60, 60, 60, 0.8)"; btn.color = "LightGray"; btn.thickness = 1;
            } else {
                btn.background = "rgba(20, 20, 20, 0.5)"; btn.color = "DimGray"; btn.thickness = 1;
            }
        };
        setBtnStyle(btnBase, 'base'); setBtnStyle(btnSmg, 'smg'); setBtnStyle(btnMissile, 'missile'); setBtnStyle(btnHeavy, 'heavy');
    }
    updateAmmoUI();

    const wavePanel = new GUI.Rectangle();
    wavePanel.width = "200px"; wavePanel.height = "60px"; wavePanel.cornerRadius = 20; wavePanel.color = "Black";
    wavePanel.thickness = 2; wavePanel.background = "rgba(255, 0, 0, 0.2)"; wavePanel.top = "20px";
    wavePanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP; wavePanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT; wavePanel.left = "-20px"; 
    hudContainer.addControl(wavePanel);

    const waveText = new GUI.TextBlock();
    waveText.text = "WAVE: 1"; waveText.color = "DarkRed"; waveText.fontSize = 30; waveText.fontWeight = "bold"; waveText.height = "40px";
    wavePanel.addControl(waveText);

    const dashPanel = new GUI.Rectangle();
    dashPanel.width = "200px"; dashPanel.height = "60px"; dashPanel.cornerRadius = 20; dashPanel.color = "Black";
    dashPanel.thickness = 2; dashPanel.background = "rgba(0, 255, 255, 0.3)"; dashPanel.top = "100px";
    dashPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP; dashPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT; dashPanel.left = "-20px"; 
    hudContainer.addControl(dashPanel);

    const dashText = new GUI.TextBlock();
    dashText.text = "DASH: READY"; dashText.color = "Cyan"; dashText.fontSize = 24; dashText.fontWeight = "bold"; dashText.height = "40px";
    dashPanel.addControl(dashText);

    const bonusText = new GUI.TextBlock();
    bonusText.text = ""; bonusText.color = "Gold"; bonusText.fontSize = 40; bonusText.fontWeight = "bold"; bonusText.top = "-100px"; bonusText.height = "60px";
    hudContainer.addControl(bonusText);

    // Game Over Menu
    const gameOverMenu = new GUI.Rectangle();
    gameOverMenu.width = "460px"; gameOverMenu.height = "360px"; gameOverMenu.cornerRadius = 20; gameOverMenu.color = "DarkRed";
    gameOverMenu.thickness = 4; gameOverMenu.background = "rgba(20, 0, 0, 0.95)"; gameOverMenu.isVisible = false; gameOverMenu.zIndex = 150; 
    hudContainer.addControl(gameOverMenu);

    const gameOverTitle = new GUI.TextBlock();
    gameOverTitle.text = "ZOMBIES\nGOT YOU!"; gameOverTitle.color = "Red"; gameOverTitle.fontSize = 42; gameOverTitle.fontWeight = "bold";
    gameOverTitle.top = "-100px"; gameOverTitle.height = "120px"; gameOverMenu.addControl(gameOverTitle);

    const gameOverButtonsPanel = new GUI.StackPanel();
    gameOverButtonsPanel.width = "280px"; gameOverButtonsPanel.isVertical = true; gameOverButtonsPanel.top = "50px";
    gameOverMenu.addControl(gameOverButtonsPanel);

    const retryBtn = GUI.Button.CreateSimpleButton("retryBtn", "RETRY");
    retryBtn.width = "260px"; retryBtn.height = "52px"; retryBtn.color = "white"; retryBtn.cornerRadius = 12;
    retryBtn.background = "green"; retryBtn.fontSize = 22; retryBtn.fontWeight = "bold";
    retryBtn.onPointerClickObservable.add(callbacks.onRetry);
    gameOverButtonsPanel.addControl(retryBtn);

    const menuBtnGO = GUI.Button.CreateSimpleButton("menuBtnGO", "MENU");
    menuBtnGO.width = "260px"; menuBtnGO.height = "46px"; menuBtnGO.color = "white"; menuBtnGO.cornerRadius = 10;
    menuBtnGO.background = "#333"; menuBtnGO.fontSize = 18; menuBtnGO.fontWeight = "bold"; menuBtnGO.paddingTop = "10px";
    menuBtnGO.onPointerClickObservable.add(callbacks.onMenu);
    gameOverButtonsPanel.addControl(menuBtnGO);

    // Pause Menu
    const pauseMenu = new GUI.Rectangle();
    pauseMenu.width = "400px"; pauseMenu.height = "360px"; pauseMenu.cornerRadius = 20; pauseMenu.color = "White";
    pauseMenu.thickness = 3; pauseMenu.background = "rgba(0, 0, 0, 0.9)"; pauseMenu.isVisible = false; pauseMenu.zIndex = 100; 
    hudContainer.addControl(pauseMenu);

    const pauseTitle = new GUI.TextBlock();
    pauseTitle.text = "PAUSE"; pauseTitle.color = "White"; pauseTitle.fontSize = 40; pauseTitle.fontWeight = "bold";
    pauseTitle.top = "-120px"; pauseTitle.height = "60px"; pauseMenu.addControl(pauseTitle);

    const pauseButtonsPanel = new GUI.StackPanel();
    pauseButtonsPanel.width = "280px"; pauseButtonsPanel.isVertical = true; pauseButtonsPanel.top = "40px";
    pauseMenu.addControl(pauseButtonsPanel);

    const resumeBtn = GUI.Button.CreateSimpleButton("resumeBtn", "▶ RESUME");
    resumeBtn.width = "260px"; resumeBtn.height = "52px"; resumeBtn.color = "white"; resumeBtn.cornerRadius = 12;
    resumeBtn.background = "green"; resumeBtn.fontSize = 22; resumeBtn.fontWeight = "bold";
    resumeBtn.onPointerClickObservable.add(callbacks.onResume);
    pauseButtonsPanel.addControl(resumeBtn);

    const howToBtnPause = GUI.Button.CreateSimpleButton("howToBtnPause", "❓ HOW TO PLAY");
    howToBtnPause.width = "260px"; howToBtnPause.height = "46px"; howToBtnPause.color = "white"; howToBtnPause.cornerRadius = 10;
    howToBtnPause.background = "#333"; howToBtnPause.fontSize = 18;
    howToBtnPause.onPointerClickObservable.add(() => { howToPanel.isVisible = true; pauseMenu.isVisible = false; GameState.isPaused = true; });
    pauseButtonsPanel.addControl(howToBtnPause);

    const quitBtn = GUI.Button.CreateSimpleButton("quitBtn", "🏠 MENU");
    quitBtn.width = "260px"; quitBtn.height = "46px"; quitBtn.color = "white"; quitBtn.cornerRadius = 10;
    quitBtn.background = "darkred"; quitBtn.fontSize = 18; quitBtn.fontWeight = "bold";
    quitBtn.onPointerClickObservable.add(callbacks.onMenu);
    pauseButtonsPanel.addControl(quitBtn);

    const settingsBtnPause = GUI.Button.CreateSimpleButton("settingsBtnPause", "⚙️ SETTINGS");
    settingsBtnPause.width = "260px"; settingsBtnPause.height = "46px"; settingsBtnPause.color = "white"; settingsBtnPause.cornerRadius = 10;
    settingsBtnPause.background = "#444"; settingsBtnPause.fontSize = 18;
    settingsBtnPause.onPointerClickObservable.add(() => { settingsPanel.isVisible = true; pauseMenu.isVisible = false; GameState.isPaused = true; });
    pauseButtonsPanel.addControl(settingsBtnPause);

    const pauseBtn = GUI.Button.CreateSimpleButton("pauseBtn", "⏸ PAUSE");
    pauseBtn.width = "150px"; pauseBtn.height = "50px"; pauseBtn.color = "white"; pauseBtn.cornerRadius = 15;
    pauseBtn.background = "rgba(100, 100, 100, 0.7)"; pauseBtn.top = "20px"; pauseBtn.fontSize = 20; pauseBtn.fontWeight = "bold";
    pauseBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP; pauseBtn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER; pauseBtn.zIndex = 10; 
    pauseBtn.onPointerClickObservable.add(callbacks.onPauseToggle);
    hudContainer.addControl(pauseBtn);

    // Main Menu
    const menuContainer = new GUI.Rectangle();
    menuContainer.background = "rgba(0, 0, 0, 0.8)"; menuContainer.thickness = 0;
    advancedTexture.addControl(menuContainer);

    const titleText = new GUI.TextBlock();
    titleText.text = "TANK SURVIVAL"; titleText.color = "White"; titleText.fontSize = 60; titleText.fontWeight = "bold";
    titleText.top = "-150px"; titleText.height = "80px"; menuContainer.addControl(titleText);

    const menuHighScoreText = new GUI.TextBlock();
    menuHighScoreText.text = "🏆 HIGH SCORE: " + GameState.highScore; menuHighScoreText.color = "Gold"; menuHighScoreText.fontSize = 30;
    menuHighScoreText.fontWeight = "bold"; menuHighScoreText.top = "-80px"; menuHighScoreText.height = "50px";
    menuContainer.addControl(menuHighScoreText);

    const instructionsText = new GUI.TextBlock();
    instructionsText.text = "ZQSD or WASD to move - SPACE to shoot\nSHIFT to dash - ESC to pause\nSurvive the waves!";    
    instructionsText.color = "LightGray"; instructionsText.fontSize = 24; instructionsText.top = "-20px"; instructionsText.height = "120px";
    menuContainer.addControl(instructionsText);

    const playBtn = GUI.Button.CreateSimpleButton("playBtn", "PLAY");
    playBtn.width = "200px"; playBtn.height = "60px"; playBtn.color = "white"; playBtn.cornerRadius = 20;
    playBtn.background = "green"; playBtn.top = "100px"; playBtn.fontSize = 30; playBtn.fontWeight = "bold";
    playBtn.onPointerClickObservable.add(callbacks.onPlay);
    menuContainer.addControl(playBtn);

    const howToBtnMenu = GUI.Button.CreateSimpleButton("howToBtnMenu", "❓ HOW TO PLAY");
    howToBtnMenu.width = "180px"; howToBtnMenu.height = "48px"; howToBtnMenu.color = "white"; howToBtnMenu.cornerRadius = 12;
    howToBtnMenu.background = "#333"; howToBtnMenu.top = "180px"; howToBtnMenu.fontSize = 18;
    howToBtnMenu.onPointerClickObservable.add(() => { howToPanel.isVisible = true; menuContainer.isVisible = false; });
    menuContainer.addControl(howToBtnMenu);

    const settingsBtnMenu = GUI.Button.CreateSimpleButton("settingsBtnMenu", "⚙️ SETTINGS");
    settingsBtnMenu.width = "180px"; settingsBtnMenu.height = "48px"; settingsBtnMenu.color = "white"; settingsBtnMenu.cornerRadius = 12;
    settingsBtnMenu.background = "#444"; settingsBtnMenu.top = "240px"; settingsBtnMenu.fontSize = 18;
    settingsBtnMenu.onPointerClickObservable.add(() => { settingsPanel.isVisible = true; menuContainer.isVisible = false; });
    menuContainer.addControl(settingsBtnMenu);

    function showFloatingText(text, position) {
        const dummy = BABYLON.MeshBuilder.CreateBox("dummy", {size: 0.1}, scene);
        dummy.position = position.clone(); dummy.position.y += 2; dummy.isVisible = false;
        const label = new GUI.TextBlock(); label.text = text; label.color = "Yellow"; label.fontSize = 30; label.fontWeight = "bold";
        label.outlineWidth = 3; label.outlineColor = "Black";
        advancedTexture.addControl(label); label.linkWithMesh(dummy);
        let alpha = 1.0;
        const floatAnim = scene.onBeforeRenderObservable.add(() => {
            if (GameState.isPaused) return; 
            dummy.position.y += 0.05; alpha -= 0.02; label.alpha = alpha;
            if (alpha <= 0) { scene.onBeforeRenderObservable.remove(floatAnim); label.dispose(); dummy.dispose(); }
        });
    }

    return {
        advancedTexture, hudContainer, menuContainer, pauseMenu, gameOverMenu,
        scoreText, highScoreText, livesText, coinsText, waveText, dashText, bonusText,
        damageOverlay, waveNotify, shopMessage,
        buySmgBtn, buyMissileBtn, buyHeavyBtn, pauseBtn, menuHighScoreText,
        showWave, showFloatingText, updateAmmoUI
    };
}