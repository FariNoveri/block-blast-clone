const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const preview1 = document.getElementById('preview1');
const preview2 = document.getElementById('preview2');
const preview3 = document.getElementById('preview3');

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

let gameState = {
    grid: Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)),
    score: 0,
    bestScore: parseInt(localStorage.getItem('blockBlastBest') || '0'),
    lines: 0,
    nextBlocks: [],
    selectedBlock: null,
    selectedBlockIndex: -1,
    isGameOver: false,
    isDragging: false,
    dragGhost: null,
    highlightCells: []
};

const blockShapes = [
    [[1]], // Single block
    [[1, 1]], // 2-block horizontal
    [[1], [1]], // 2-block vertical
    [[1, 1, 1]], // 3-block horizontal
    [[1], [1], [1]], // 3-block vertical
    [[1, 1], [1, 1]], // Square
    [[1, 1, 1], [1, 0, 0]], // L-shape
    [[1, 1, 1], [0, 0, 1]], // Reverse L
    [[1, 1, 0], [0, 1, 1]], // Z-shape
    [[0, 1, 1], [1, 1, 0]], // S-shape
    [[1, 1, 1], [0, 1, 0]], // T-shape
    [[1, 1, 1, 1]], // 4-block line
    [[1], [1], [1], [1]], // 4-block vertical
    [[1, 1, 1, 1, 1]], // 5-block line
];

function initGame() {
    updateDisplay();
    generateNextBlocks();
    drawGrid();
    drawPreviews();
}

function rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            rotated[j][rows - 1 - i] = shape[i][j];
        }
    }
    
    return rotated;
}

function rotateSelectedBlock() {
    if (gameState.selectedBlock && gameState.selectedBlockIndex !== -1) {
        const rotatedShape = rotateShape(gameState.selectedBlock.shape);
        gameState.selectedBlock.shape = rotatedShape;
        gameState.nextBlocks[gameState.selectedBlockIndex].shape = rotatedShape;
        drawPreviews();
        clearHighlights();
    }
}

function createDragGhost(block, x, y) {
    const ghost = document.createElement('canvas');
    ghost.className = 'drag-ghost';
    ghost.width = 100;
    ghost.height = 100;
    ghost.style.left = (x - 50) + 'px';
    ghost.style.top = (y - 50) + 'px';
    
    const ctx = ghost.getContext('2d');
    const shape = block.shape;
    const color = block.color;
    
    const blockWidth = shape[0].length;
    const blockHeight = shape.length;
    const cellSize = Math.min(80 / blockWidth, 80 / blockHeight);
    
    const startX = (ghost.width - blockWidth * cellSize) / 2;
    const startY = (ghost.height - blockHeight * cellSize) / 2;
    
    for (let row = 0; row < blockHeight; row++) {
        for (let col = 0; col < blockWidth; col++) {
            if (shape[row][col]) {
                const cellX = startX + col * cellSize;
                const cellY = startY + row * cellSize;
                
                ctx.fillStyle = color;
                ctx.fillRect(cellX, cellY, cellSize, cellSize);
                
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX, cellY, cellSize, cellSize);
            }
        }
    }
    
    document.body.appendChild(ghost);
    return ghost;
}

function updateDragGhost(x, y) {
    if (gameState.dragGhost) {
        gameState.dragGhost.style.left = (x - 50) + 'px';
        gameState.dragGhost.style.top = (y - 50) + 'px';
    }
}

function removeDragGhost() {
    if (gameState.dragGhost) {
        document.body.removeChild(gameState.dragGhost);
        gameState.dragGhost = null;
    }
}

function highlightGridCells(shape, startRow, startCol, isValid) {
    clearHighlights();
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const gridRow = startRow + row;
                const gridCol = startCol + col;
                
                if (gridRow >= 0 && gridRow < GRID_SIZE && gridCol >= 0 && gridCol < GRID_SIZE) {
                    const highlight = document.createElement('div');
                    highlight.className = isValid ? 'grid-cell-highlight' : 'grid-cell-highlight grid-cell-invalid';
                    
                    const rect = canvas.getBoundingClientRect();
                    highlight.style.left = (rect.left + gridCol * CELL_SIZE + 3) + 'px';
                    highlight.style.top = (rect.top + gridRow * CELL_SIZE + 3) + 'px';
                    highlight.style.width = (CELL_SIZE - 6) + 'px';
                    highlight.style.height = (CELL_SIZE - 6) + 'px';
                    
                    document.body.appendChild(highlight);
                    gameState.highlightCells.push(highlight);
                }
            }
        }
    }
}

function clearHighlights() {
    gameState.highlightCells.forEach(highlight => {
        if (highlight.parentNode) {
            document.body.removeChild(highlight);
        }
    });
    gameState.highlightCells = [];
}

function generateNextBlocks() {
    gameState.nextBlocks = [];
    for (let i = 0; i < 3; i++) {
        const shape = blockShapes[Math.floor(Math.random() * blockShapes.length)];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        gameState.nextBlocks.push({ shape, color });
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            
            if (gameState.grid[row][col] === 0) {
                ctx.fillStyle = '#34495e';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            } else {
                ctx.fillStyle = gameState.grid[row][col];
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Add shine effect
                const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function drawPreviews() {
    const previews = [preview1, preview2, preview3];
    
    previews.forEach((canvas, index) => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (gameState.nextBlocks[index]) {
            const block = gameState.nextBlocks[index];
            const shape = block.shape;
            const color = block.color;
            
            const blockWidth = shape[0].length;
            const blockHeight = shape.length;
            const cellSize = Math.min(60 / blockWidth, 60 / blockHeight);
            
            const startX = (canvas.width - blockWidth * cellSize) / 2;
            const startY = (canvas.height - blockHeight * cellSize) / 2;
            
            for (let row = 0; row < blockHeight; row++) {
                for (let col = 0; col < blockWidth; col++) {
                    if (shape[row][col]) {
                        const x = startX + col * cellSize;
                        const y = startY + row * cellSize;
                        
                        ctx.fillStyle = color;
                        ctx.fillRect(x, y, cellSize, cellSize);
                        
                        ctx.strokeStyle = '#2c3e50';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x, y, cellSize, cellSize);
                    }
                }
            }
        }
        
        // Highlight selected block
        if (gameState.selectedBlockIndex === index) {
            canvas.style.borderColor = '#ffd700';
            canvas.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
        } else {
            canvas.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            canvas.style.boxShadow = 'none';
        }
    });
}

function canPlaceBlock(shape, startRow, startCol) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newRow = startRow + row;
                const newCol = startCol + col;
                
                if (newRow < 0 || newRow >= GRID_SIZE || 
                    newCol < 0 || newCol >= GRID_SIZE ||
                    gameState.grid[newRow][newCol] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placeBlock(shape, color, startRow, startCol) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                gameState.grid[startRow + row][startCol + col] = color;
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    
    // Check rows
    for (let row = 0; row < GRID_SIZE; row++) {
        if (gameState.grid[row].every(cell => cell !== 0)) {
            gameState.grid[row].fill(0);
            linesCleared++;
        }
    }
    
    // Check columns
    for (let col = 0; col < GRID_SIZE; col++) {
        let columnFull = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            if (gameState.grid[row][col] === 0) {
                columnFull = false;
                break;
            }
        }
        if (columnFull) {
            for (let row = 0; row < GRID_SIZE; row++) {
                gameState.grid[row][col] = 0;
            }
            linesCleared++;
        }
    }
    
    if (linesCleared > 0) {
        gameState.score += linesCleared * 100;
        gameState.lines += linesCleared;
        
        // Bonus for multiple lines
        if (linesCleared > 1) {
            gameState.score += linesCleared * 50;
        }
    }
}

function checkGameOver() {
    for (let blockIndex = 0; blockIndex < gameState.nextBlocks.length; blockIndex++) {
        const block = gameState.nextBlocks[blockIndex];
        if (block) {
            for (let row = 0; row <= GRID_SIZE - block.shape.length; row++) {
                for (let col = 0; col <= GRID_SIZE - block.shape[0].length; col++) {
                    if (canPlaceBlock(block.shape, row, col)) {
                        return false;
                    }
                }
            }
        }
    }
    return true;
}

function updateDisplay() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('bestScore').textContent = gameState.bestScore;
    document.getElementById('lines').textContent = gameState.lines;
}

function gameOver() {
    gameState.isGameOver = true;
    
    if (gameState.score > gameState.bestScore) {
        gameState.bestScore = gameState.score;
        localStorage.setItem('blockBlastBest', gameState.bestScore.toString());
    }
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').style.display = 'flex';
    updateDisplay();
}

function restartGame() {
    gameState = {
        grid: Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)),
        score: 0,
        bestScore: parseInt(localStorage.getItem('blockBlastBest') || '0'),
        lines: 0,
        nextBlocks: [],
        selectedBlock: null,
        selectedBlockIndex: -1,
        isGameOver: false,
        isDragging: false,
        dragGhost: null,
        highlightCells: []
    };
    
    clearHighlights();
    removeDragGhost();
    document.getElementById('gameOver').style.display = 'none';
    initGame();
}

// Event listeners
canvas.addEventListener('click', (e) => {
    if (gameState.isGameOver || !gameState.selectedBlock || gameState.isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    
    if (canPlaceBlock(gameState.selectedBlock.shape, row, col)) {
        placeBlock(gameState.selectedBlock.shape, gameState.selectedBlock.color, row, col);
        
        // Add points for placing block
        gameState.score += gameState.selectedBlock.shape.flat().filter(cell => cell).length * 10;
        
        // Remove used block
        gameState.nextBlocks[gameState.selectedBlockIndex] = null;
        gameState.selectedBlock = null;
        gameState.selectedBlockIndex = -1;
        
        clearLines();
        clearHighlights();
        
        // Check if all blocks are used
        if (gameState.nextBlocks.every(block => block === null)) {
            generateNextBlocks();
        }
        
        drawGrid();
        drawPreviews();
        updateDisplay();
        
        if (checkGameOver()) {
            gameOver();
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (gameState.selectedBlock && !gameState.isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        
        const isValid = canPlaceBlock(gameState.selectedBlock.shape, row, col);
        highlightGridCells(gameState.selectedBlock.shape, row, col, isValid);
    }
});

canvas.addEventListener('mouseleave', () => {
    if (!gameState.isDragging) {
        clearHighlights();
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    rotateSelectedBlock();
});

// Rotate button
document.getElementById('rotateBtn').addEventListener('click', rotateSelectedBlock);

// Preview canvas event listeners
[preview1, preview2, preview3].forEach((canvas, index) => {
    canvas.addEventListener('click', () => {
        if (gameState.isGameOver || !gameState.nextBlocks[index]) return;
        
        gameState.selectedBlock = gameState.nextBlocks[index];
        gameState.selectedBlockIndex = index;
        drawPreviews();
        clearHighlights();
    });
    
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameState.nextBlocks[index]) {
            gameState.selectedBlock = gameState.nextBlocks[index];
            gameState.selectedBlockIndex = index;
            drawPreviews();
            rotateSelectedBlock();
        }
    });
    
    // Drag and drop functionality
    canvas.addEventListener('mousedown', (e) => {
        if (gameState.isGameOver || !gameState.nextBlocks[index]) return;
        
        gameState.isDragging = true;
        gameState.selectedBlock = gameState.nextBlocks[index];
        gameState.selectedBlockIndex = index;
        
        canvas.classList.add('dragging');
        gameState.dragGhost = createDragGhost(gameState.selectedBlock, e.clientX, e.clientY);
        
        drawPreviews();
        e.preventDefault();
    });
});

// Global mouse events for drag and drop
document.addEventListener('mousemove', (e) => {
    if (gameState.isDragging && gameState.dragGhost) {
        updateDragGhost(e.clientX, e.clientY);
        
        // Check if over canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const col = Math.floor(x / CELL_SIZE);
            const row = Math.floor(y / CELL_SIZE);
            
            const isValid = canPlaceBlock(gameState.selectedBlock.shape, row, col);
            highlightGridCells(gameState.selectedBlock.shape, row, col, isValid);
        } else {
            clearHighlights();
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (gameState.isDragging) {
        gameState.isDragging = false;
        removeDragGhost();
        
        // Remove dragging class from all previews
        [preview1, preview2, preview3].forEach(canvas => {
            canvas.classList.remove('dragging');
        });
        
        // Check if dropped on canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height && gameState.selectedBlock) {
            const col = Math.floor(x / CELL_SIZE);
            const row = Math.floor(y / CELL_SIZE);
            
            if (canPlaceBlock(gameState.selectedBlock.shape, row, col)) {
                placeBlock(gameState.selectedBlock.shape, gameState.selectedBlock.color, row, col);
                
                // Add points for placing block
                gameState.score += gameState.selectedBlock.shape.flat().filter(cell => cell).length * 10;
                
                // Remove used block
                gameState.nextBlocks[gameState.selectedBlockIndex] = null;
                gameState.selectedBlock = null;
                gameState.selectedBlockIndex = -1;
                
                clearLines();
                
                // Check if all blocks are used
                if (gameState.nextBlocks.every(block => block === null)) {
                    generateNextBlocks();
                }
                
                drawGrid();
                drawPreviews();
                updateDisplay();
                
                if (checkGameOver()) {
                    gameOver();
                }
            }
        }
        
        clearHighlights();
    }
});

// Initialize game
initGame();