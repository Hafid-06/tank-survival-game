// Centralized state management: stores player stats, unlockables, and active power-ups
export const GameState = {
    isGameStarted: false,
    isPaused: false,
    isGameOver: false,
    isTesterMode: false,
    
    score: 0,
    lives: 3,
    currentWave: 1,
    highScore: parseInt(localStorage.getItem('tankSurvivalHighScore')) || 0,
    
    coinsCount: 0,
    
    rapidFireActive: false,
    speedBoostActive: false,
    enemiesFrozen: false,
    
    tankVelocity: 0,
    tankTurnVelocity: 0,
    
    dashActive: false,
    dashCooldown: 0,
    dashTimer: 0,
    
    globalZombieSoundCooldown: 0,
    
    unlockedAmmo: { base: true, smg: false, missile: false, heavy: false },
    currentAmmo: 'base',
    unlockedAlly: false
};

// Possible states for the enemy AI Finite State Machine (FSM)
export const EnemyState = {
    PATROL: 'patrol',
    CHASE: 'chase',
    FLANK: 'flank',
    CHARGE: 'charge'
};

// Configurable game balance parameters
export const Constants = {
    DASH_DURATION: 0.7,
    DASH_COOLDOWN: 5.0,
    ACCELERATION: 70,
    FRICTION: 10,
    TURN_ACCEL: 10,
    TURN_FRICTION: 15,
    MAX_TURN: 3
};