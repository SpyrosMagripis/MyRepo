const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const pauseBtn = document.getElementById('pause-btn');

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
    let cleared = 0;
    grid = grid.filter(row => {
        if (row.every(cell => cell)) {
            cleared++;
            return false;
        }
        return true;
    });
    while (grid.length < ROWS) {
        grid.unshift(Array(COLS).fill(0));
    }
    if (cleared > 0) {
        score += cleared * 100;
        lines += cleared;
        level = 1 + Math.floor(lines / 10);
        dropInterval = 1000 - (level - 1) * 100;
        clearInterval(dropTimer);
        dropTimer = setInterval(tick, dropInterval);
        updateScore();
    }
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
    while (canMove(0,1,rotation)) {
        currentY++;
    }
    placePiece();
    removeFullLines();
    spawnPiece();
}
function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
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
            break;
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

startGame();
