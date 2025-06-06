const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const pauseBtn = document.getElementById('pause-btn');
const musicBtn = document.getElementById('music-btn');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let score = 0;
let lines = 0;
let level = 1;
let dropInterval = 1000;
let dropTimer;
let isPaused = false;
let lastMoveHardDrop = false;

// music setup
let audioCtx;
let musicInterval;
const notes = [261.63, 329.63, 392.0, 329.63]; // simple melody

const tetrominoes = {
    I: [
        [[0,0],[1,0],[2,0],[3,0]],
        [[2,-1],[2,0],[2,1],[2,2]],
        [[0,1],[1,1],[2,1],[3,1]],
        [[1,-1],[1,0],[1,1],[1,2]]
    ],
    J: [
        [[0,0],[0,1],[1,1],[2,1]],
        [[1,0],[2,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[1,2],[0,2]]
    ],
    L: [
        [[2,0],[0,1],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,1],[0,2]],
        [[0,0],[1,0],[1,1],[1,2]]
    ],
    O: [
        [[1,0],[2,0],[1,1],[2,1]],
        [[1,0],[2,0],[1,1],[2,1]],
        [[1,0],[2,0],[1,1],[2,1]],
        [[1,0],[2,0],[1,1],[2,1]]
    ],
    S: [
        [[1,0],[2,0],[0,1],[1,1]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[1,1],[2,1],[0,2],[1,2]],
        [[0,0],[0,1],[1,1],[1,2]]
    ],
    T: [
        [[1,0],[0,1],[1,1],[2,1]],
        [[1,0],[1,1],[2,1],[1,2]],
        [[0,1],[1,1],[2,1],[1,2]],
        [[1,0],[0,1],[1,1],[1,2]]
    ],
    Z: [
        [[0,0],[1,0],[1,1],[2,1]],
        [[2,0],[1,1],[2,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,2]],
        [[1,0],[0,1],[1,1],[0,2]]
    ]
};

const colors = {
    I: '#0ff',
    J: '#f70',
    L: '#ff0',
    O: '#0f0',
    S: '#00f',
    T: '#f0f',
    Z: '#f00'
};

let currentPiece;
let currentX = 3;
let currentY = 0;
let rotation = 0;

function drawBoard() {
    board.innerHTML = '';
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (grid[y][x]) {
                cell.style.backgroundColor = grid[y][x];
            }
            board.appendChild(cell);
        }
    }
}

function randomPiece() {
    const keys = Object.keys(tetrominoes);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return { shape: tetrominoes[key], color: colors[key], key };
}

function canMove(offsetX, offsetY, newRotation) {
    const shape = currentPiece.shape[newRotation];
    return shape.every(([x,y]) => {
        const newX = currentX + x + offsetX;
        const newY = currentY + y + offsetY;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
        if (newY >= 0 && grid[newY][newX]) return false;
        return true;
    });
}

function placePiece() {
    currentPiece.shape[rotation].forEach(([x,y]) => {
        const boardX = currentX + x;
        const boardY = currentY + y;
        if (boardY >= 0) {
            grid[boardY][boardX] = currentPiece.color;
        }
    });
}

function removeFullLines() {
    const rowsToClear = [];
    const rowData = [];
    for (let y = 0; y < ROWS; y++) {
        if (grid[y].every(cell => cell)) {
            rowsToClear.push(y);
            rowData.push({ index: y, cells: [...grid[y]] });
        }
    }
    if (rowsToClear.length === 0) return [];
    rowsToClear.sort((a, b) => a - b);
    for (let i = rowsToClear.length - 1; i >= 0; i--) {
        grid.splice(rowsToClear[i], 1);
    }
    while (grid.length < ROWS) {
        grid.unshift(Array(COLS).fill(0));
    }
    score += rowsToClear.length * 100;
    lines += rowsToClear.length;
    level = 1 + Math.floor(lines / 10);
    dropInterval = 1000 - (level - 1) * 100;
    clearInterval(dropTimer);
    dropTimer = setInterval(tick, dropInterval);
    updateScore();
    return rowData;
}

function showLineBreakEffect(rows) {
    rows.forEach(row => {
        const effect = document.createElement('div');
        effect.classList.add('row-effect');
        effect.style.top = `${row.index * BLOCK_SIZE}px`;
        for (let x = 0; x < COLS; x++) {
            const frag = document.createElement('div');
            frag.classList.add('fragment');
            frag.style.backgroundColor = row.cells[x] || '#555';
            effect.appendChild(frag);
        }
        board.appendChild(effect);
        setTimeout(() => board.removeChild(effect), 400);
    });
}

function updateScore() {
    scoreEl.textContent = `Score: ${score}`;
    linesEl.textContent = `Lines: ${lines}`;
    levelEl.textContent = `Level: ${level}`;
}

function drawPiece() {
    currentPiece.shape[rotation].forEach(([x,y]) => {
        const boardX = currentX + x;
        const boardY = currentY + y;
        if (boardY >= 0) {
            const index = boardY * COLS + boardX;
            const cell = board.children[index];
            cell.style.backgroundColor = currentPiece.color;
        }
    });
}

function spawnPiece() {
    currentPiece = randomPiece();
    currentX = 3;
    currentY = -1;
    rotation = 0;
    if (!canMove(0, 1, rotation)) {
        alert('Game Over!');
        clearInterval(dropTimer);
    }
}

function tick() {
    if (isPaused) return;
    if (canMove(0, 1, rotation)) {
        currentY++;
    } else {
        placePiece();
        removeFullLines();
        spawnPiece();
    }
    drawBoard();
    drawPiece();
}

function startGame() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    updateScore();
    spawnPiece();
    drawBoard();
    dropTimer = setInterval(tick, dropInterval);
}

function moveLeft() {
    if (canMove(-1, 0, rotation)) currentX--;
}
function moveRight() {
    if (canMove(1, 0, rotation)) currentX++;
}
function rotate() {
    const newRotation = (rotation + 1) % 4;
    if (canMove(0, 0, newRotation)) rotation = newRotation;
}
function softDrop() {
    if (canMove(0, 1, rotation)) {
        currentY++;
    } else {
        placePiece();
        removeFullLines();
        spawnPiece();
    }
}
function hardDrop() {
    lastMoveHardDrop = true;
    while (canMove(0,1,rotation)) {
        currentY++;
    }
    placePiece();
    const cleared = removeFullLines();
    lastMoveHardDrop = false;
    spawnPiece();
    drawBoard();
    drawPiece();
    if (cleared.length > 0) {
        showLineBreakEffect(cleared);
    }
}
function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function playNote(freq, duration) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
}

function startMusic() {
    if (musicInterval) return;
    let i = 0;
    musicInterval = setInterval(() => {
        playNote(notes[i], 250);
        i = (i + 1) % notes.length;
    }, 300);
}

function stopMusic() {
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (isPaused) return;
    switch(e.key) {
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        case 'ArrowUp':
            rotate();
            break;
        case 'ArrowDown':
            softDrop();
            break;
        case ' ': // Space
            hardDrop();
            return;
        case 'p':
        case 'P':
            togglePause();
            return;
        default:
            return;
    }
    drawBoard();
    drawPiece();
});

pauseBtn.addEventListener('click', togglePause);
musicBtn.addEventListener('click', () => {
    if (musicInterval) {
        stopMusic();
        musicBtn.textContent = 'Music On';
    } else {
        startMusic();
        musicBtn.textContent = 'Music Off';
    }
});

startGame();
