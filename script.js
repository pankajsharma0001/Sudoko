// Game state
let gameState = {
    difficulty: 'easy',
    board: [],
    solution: [],
    initialBoard: [],
    selectedCell: null,
    startTime: null,
    timerInterval: null,
    elapsedTime: 0,
    hintsUsed: 0,
    gamesPlayed: 0,
    bestTimes: {
        easy: null,
        medium: null,
        hard: null
    },
    isSolving: false,
    aiInterval: null,
    aiStep: 0,
    solvedByAI: false
};

// DOM Elements
const homePage = document.getElementById('home-page');
const gamePage = document.getElementById('game-page');
const sudokuBoard = document.getElementById('sudoku-board');
const difficultyDisplay = document.getElementById('difficulty-display');
const timerElement = document.getElementById('timer');
const gameCompleteModal = document.getElementById('game-complete-modal');
const completionTime = document.getElementById('completion-time');
const completionDifficulty = document.getElementById('completion-difficulty');
const gamesPlayedElement = document.getElementById('games-played');
const bestTimeElement = document.getElementById('best-time');
const hintsUsedElement = document.getElementById('hints-used');
const aiSolvingModal = document.getElementById('ai-solving-modal');
const aiStepCount = document.getElementById('ai-step-count');
const aiCurrentCell = document.getElementById('ai-current-cell');

// Initialize the game
function init() {
    loadStatistics();
    setupEventListeners();
    initModals();
}

// Load statistics from localStorage
function loadStatistics() {
    const stats = JSON.parse(localStorage.getItem('sudokuStats')) || {};
    gameState.gamesPlayed = stats.gamesPlayed || 0;
    gameState.bestTimes = stats.bestTimes || { easy: null, medium: null, hard: null };
    gameState.hintsUsed = stats.hintsUsed || 0;
    
    updateStatisticsDisplay();
}

// Save statistics to localStorage
function saveStatistics() {
    const stats = {
        gamesPlayed: gameState.gamesPlayed,
        bestTimes: gameState.bestTimes,
        hintsUsed: gameState.hintsUsed
    };
    localStorage.setItem('sudokuStats', JSON.stringify(stats));
}

// Update statistics display
function updateStatisticsDisplay() {
    gamesPlayedElement.textContent = gameState.gamesPlayed;
    hintsUsedElement.textContent = gameState.hintsUsed;
    
    const bestTime = gameState.bestTimes[gameState.difficulty];
    bestTimeElement.textContent = bestTime ? formatTime(bestTime) : '--:--';
}

// Set up event listeners
function setupEventListeners() {
    // Home page buttons
    document.getElementById('easy-btn').addEventListener('click', () => startGame('easy'));
    document.getElementById('medium-btn').addEventListener('click', () => startGame('medium'));
    document.getElementById('hard-btn').addEventListener('click', () => startGame('hard'));
    
    // Game page buttons
    document.getElementById('check-btn').addEventListener('click', checkBoard);
    document.getElementById('hint-btn').addEventListener('click', provideHint);
    document.getElementById('solve-btn').addEventListener('click', startAISolving);
    document.getElementById('new-game-btn').addEventListener('click', () => startGame(gameState.difficulty));
    document.getElementById('home-btn').addEventListener('click', goHome);
    document.getElementById('erase-btn').addEventListener('click', eraseCell);
    
    // Desktop buttons
    document.getElementById('new-game-btn-desktop').addEventListener('click', () => startGame(gameState.difficulty));
    document.getElementById('home-btn-desktop').addEventListener('click', goHome);
    
    // Number buttons (mobile only)
    document.querySelectorAll('.number-btn').forEach(btn => {
        if (btn.id !== 'erase-btn') {
            btn.addEventListener('click', () => {
                const number = parseInt(btn.getAttribute('data-number'));
                fillCell(number);
            });
        }
    });
    
    // Game complete modal buttons
    document.getElementById('play-again-btn').addEventListener('click', () => {
        gameCompleteModal.classList.add('hidden');
        startGame(gameState.difficulty);
    });
    document.getElementById('go-home-btn').addEventListener('click', () => {
        gameCompleteModal.classList.add('hidden');
        goHome();
    });
    document.getElementById('review-solution-btn').addEventListener('click', reviewSolution);
    
    // AI solving modal buttons
    document.getElementById('pause-ai-btn').addEventListener('click', pauseAISolving);
    document.getElementById('stop-ai-btn').addEventListener('click', stopAISolving);
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyPress);

}

// Review Solution function
function reviewSolution() {
    // Hide the completion modal
    gameCompleteModal.classList.add('hidden');
    gameState.isSolving = false;
    
    // Highlight the solution for review
    highlightSolution();
    
    // Show a message that user can now review the solution
    setTimeout(() => {
        showMessageModal(
            'Review Solution', 
            'You can now review the completed solution. Compare your notes with the AI\'s solution!',
            'info'
        );
    }, 500);
}

// Highlight the solution for review
function highlightSolution() {
    // Remove any existing highlights
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('solution-highlight', 'user-correct', 'user-incorrect');
    });
    
    // Highlight cells that were filled by AI vs user
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            
            if (gameState.initialBoard[i][j] === 0) { // If it was an empty cell originally
                if (gameState.solvedByAI) {
                    // If AI solved, highlight all AI-filled cells
                    cell.classList.add('solution-highlight');
                } else {
                    // If user solved, check if user's input matches solution
                    if (gameState.board[i][j] === gameState.solution[i][j]) {
                        cell.classList.add('user-correct');
                    } else {
                        cell.classList.add('user-incorrect');
                    }
                }
            }
        }
    }
}

// Start a new game
function startGame(difficulty) {
    // Stop AI solving if active
    if (gameState.isSolving) {
        stopAISolving();
    }
    
    gameState.difficulty = difficulty;
    gameState.hintsUsed = 0;
    gameState.selectedCell = null;
    gameState.solvedByAI = false;
    gameState.isSolving = false;
    
    // Update UI
    homePage.classList.add('hidden');
    gamePage.classList.remove('hidden');
    
    // Set difficulty display
    difficultyDisplay.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    difficultyDisplay.className = `px-3 py-1 rounded-full text-white font-medium ${
        difficulty === 'easy' ? 'bg-green-500' : 
        difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
    }`;
    
    // Generate puzzle
    generatePuzzle(difficulty);
    
    // Start timer
    startTimer();
    
    // Update statistics
    updateStatisticsDisplay();
}

// Generate a complete Sudoku board
function generateCompleteBoard() {
    const board = Array(9).fill().map(() => Array(9).fill(0));
    
    // Fill diagonal 3x3 boxes (they are independent)
    for (let i = 0; i < 9; i += 3) {
        fillBox(board, i, i);
    }
    
    // Solve the rest of the board
    solveSudoku(board);
    return board;
}

// Fill a 3x3 box with random numbers
function fillBox(board, row, col) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(numbers);
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            board[row + i][col + j] = numbers.pop();
        }
    }
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Sudoku solver using backtracking
function solveSudoku(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                
                for (let num of numbers) {
                    if (isValidPlacement(board, row, col, num)) {
                        board[row][col] = num;
                        
                        if (solveSudoku(board)) {
                            return true;
                        }
                        
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// Check if a number can be placed at given position
function isValidPlacement(board, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num) return false;
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
        if (board[x][col] === num) return false;
    }
    
    // Check 3x3 box
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxRowStart + i][boxColStart + j] === num) return false;
        }
    }
    
    return true;
}

// Remove numbers to create the puzzle based on difficulty
function removeNumbers(board, difficulty) {
    const cellsToRemove = {
        easy: 35,   // Leave 46 numbers
        medium: 45, // Leave 36 numbers  
        hard: 55    // Leave 26 numbers
    };
    
    const cells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            cells.push([i, j]);
        }
    }
    
    shuffleArray(cells);
    
    const puzzle = JSON.parse(JSON.stringify(board));
    let removed = 0;
    const targetRemoved = cellsToRemove[difficulty];
    
    for (let [i, j] of cells) {
        if (removed >= targetRemoved) break;
        
        const temp = puzzle[i][j];
        puzzle[i][j] = 0;
        
        // Check if puzzle still has unique solution
        if (hasUniqueSolution(JSON.parse(JSON.stringify(puzzle)))) {
            removed++;
        } else {
            puzzle[i][j] = temp;
        }
    }
    
    return puzzle;
}

// Check if puzzle has unique solution
function hasUniqueSolution(board) {
    const solutions = [];
    solveForUniqueness(JSON.parse(JSON.stringify(board)), solutions);
    return solutions.length === 1;
}

// Solve and count solutions for uniqueness check
function solveForUniqueness(board, solutions) {
    if (solutions.length > 1) return; // Stop if we found more than one solution
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValidPlacement(board, row, col, num)) {
                        board[row][col] = num;
                        solveForUniqueness(board, solutions);
                        board[row][col] = 0;
                    }
                }
                return;
            }
        }
    }
    solutions.push(JSON.parse(JSON.stringify(board)));
}

// Generate a Sudoku puzzle
function generatePuzzle(difficulty) {
    // Generate complete solution
    const solution = generateCompleteBoard();
    
    // Create puzzle by removing numbers
    const puzzle = removeNumbers(solution, difficulty);
    
    gameState.solution = solution;
    gameState.board = JSON.parse(JSON.stringify(puzzle));
    gameState.initialBoard = JSON.parse(JSON.stringify(puzzle));
    
    renderBoard();
}

// Render the Sudoku board
function renderBoard() {
    sudokuBoard.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const row = document.createElement('div');
        row.className = 'board-row flex';
        
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell flex items-center justify-center border-gray-300';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            if (gameState.board[i][j] !== 0) {
                cell.textContent = gameState.board[i][j];
                cell.classList.add('given');
            }
            
            cell.addEventListener('click', () => selectCell(i, j));
            row.appendChild(cell);
        }
        
        sudokuBoard.appendChild(row);
    }
}

// Select a cell
function selectCell(row, col) {
    if (gameState.isSolving) return;
    
    // Deselect previous cell
    if (gameState.selectedCell) {
        const prevCell = document.querySelector(
            `[data-row="${gameState.selectedCell.row}"][data-col="${gameState.selectedCell.col}"]`
        );
        if (prevCell) {
            prevCell.classList.remove('selected');
            removeHighlights();
        }
    }
    
    // Select new cell if it's not a given number
    if (gameState.initialBoard[row][col] === 0) {
        gameState.selectedCell = { row, col };
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('selected');
        
        highlightRelatedCells(row, col);
    } else {
        gameState.selectedCell = null;
    }
    
    updateNumberButtons();
}

// Highlight related cells (same row, column, and box)
function highlightRelatedCells(row, col) {
    // Highlight same row
    for (let c = 0; c < 9; c++) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${c}"]`);
        if (c !== col) cell.classList.add('highlight');
    }
    
    // Highlight same column
    for (let r = 0; r < 9; r++) {
        const cell = document.querySelector(`[data-row="${r}"][data-col="${col}"]`);
        if (r !== row) cell.classList.add('highlight');
    }
    
    // Highlight same 3x3 box
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    
    for (let r = boxRowStart; r < boxRowStart + 3; r++) {
        for (let c = boxColStart; c < boxColStart + 3; c++) {
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (r !== row || c !== col) cell.classList.add('highlight');
        }
    }
}

// Remove highlights from all cells
function removeHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlight');
    });
}

// Update number buttons based on selected cell
function updateNumberButtons() {
    document.querySelectorAll('.number-btn').forEach(btn => {
        if (btn.id !== 'erase-btn') {
            btn.classList.remove('selected');
        }
    });
    
    if (gameState.selectedCell && gameState.board[gameState.selectedCell.row][gameState.selectedCell.col] !== 0) {
        const value = gameState.board[gameState.selectedCell.row][gameState.selectedCell.col];
        const numberBtn = document.querySelector(`[data-number="${value}"]`);
        if (numberBtn) {
            numberBtn.classList.add('selected');
        }
    }
}

// Fill the selected cell with a number
function fillCell(number) {
    if (!gameState.selectedCell || gameState.isSolving) return;
    
    const { row, col } = gameState.selectedCell;
    
    if (gameState.initialBoard[row][col] === 0) {
        gameState.board[row][col] = number;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.textContent = number;
        cell.classList.add('user-input');
        cell.classList.remove('error');
        
        if (!isValidMove(row, col, number)) {
            cell.classList.add('error');
        }
        
        if (isBoardComplete()) {
            completeGame();
        }
        
        updateNumberButtons();
    }
}

// Erase the selected cell
function eraseCell() {
    if (!gameState.selectedCell || gameState.isSolving) return;
    
    const { row, col } = gameState.selectedCell;
    
    if (gameState.initialBoard[row][col] === 0) {
        gameState.board[row][col] = 0;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.textContent = '';
        cell.classList.remove('user-input', 'error');
        
        updateNumberButtons();
    }
}

// Check if a move is valid
function isValidMove(row, col, number) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (c !== col && gameState.board[row][c] === number) {
            return false;
        }
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
        if (r !== row && gameState.board[r][col] === number) {
            return false;
        }
    }
    
    // Check 3x3 box
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    
    for (let r = boxRowStart; r < boxRowStart + 3; r++) {
        for (let c = boxColStart; c < boxColStart + 3; c++) {
            if (r !== row && c !== col && gameState.board[r][c] === number) {
                return false;
            }
        }
    }
    
    return true;
}

// Check if the board is complete AND correct
function isBoardComplete() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (gameState.board[i][j] === 0 || gameState.board[i][j] !== gameState.solution[i][j]) {
                return false;
            }
        }
    }
    return true;
}

// Check the board for errors
function checkBoard() {
    if (gameState.isSolving) return;
    
    let hasErrors = false;
    let isComplete = true;
    let wrongCells = 0;
    let emptyCells = 0;
    
    // First, remove all existing error highlights
    document.querySelectorAll('.cell.error').forEach(cell => {
        cell.classList.remove('error');
    });
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            const value = gameState.board[i][j];
            
            // Check if cell is empty
            if (value === 0) {
                isComplete = false;
                emptyCells++;
                continue;
            }
            
            // Check if the value matches the solution
            if (value !== gameState.solution[i][j]) {
                cell.classList.add('error');
                hasErrors = true;
                wrongCells++;
            }
        }
    }
    
    // Show appropriate message in modal
    if (hasErrors) {
        showMessageModal(
            'Errors Found',
            `Found ${wrongCells} incorrect cells${emptyCells > 0 ? ` and ${emptyCells} empty cells` : ''}.`,
            'error'
        );
    } else if (!isComplete) {
        showMessageModal(
            'Good Progress!',
            `All filled cells are correct! ${emptyCells} cells left to complete the puzzle.`,
            'warning'
        );
    } else {
        // Only complete game if board is complete AND has no errors
        showMessageModal(
            'Congratulations!',
            'You have successfully solved the puzzle!',
            'success'
        );
        setTimeout(() => {
            completeGame();
        }, 2000);
    }
}

// Provide a hint
function provideHint() {
    if (gameState.isSolving) return;
    
    if (!gameState.selectedCell) {
        showMessageModal(
            'Select a Cell',
            'Please select an empty cell first to get a hint!',
            'warning'
        );
        return;
    }
    
    const { row, col } = gameState.selectedCell;
    
    if (gameState.board[row][col] === 0) {
        gameState.board[row][col] = gameState.solution[row][col];
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.textContent = gameState.solution[row][col];
        cell.classList.add('user-input');
        cell.classList.remove('error');
        
        cell.classList.add('pulse');
        setTimeout(() => {
            cell.classList.remove('pulse');
        }, 1000);
        
        gameState.hintsUsed++;
        hintsUsedElement.textContent = gameState.hintsUsed;
        
        if (isBoardComplete()) {
            completeGame();
        }
    } else {
        showMessageModal(
            'Cell Already Filled',
            'Please select an empty cell to get a hint!',
            'warning'
        );
    }
}

// Start AI solving
function startAISolving() {
    if (gameState.isSolving) return;
    
    // Show confirmation modal
    showConfirmModal(
        'AI Solve Puzzle',
        'Are you sure you want the AI to solve the puzzle step by step?',
        () => {
            // Yes callback
            startAISolvingProcess();
        },
        () => {
            // No callback - do nothing
        }
    );
}

// Show confirmation modal with Yes/No buttons - FIXED VERSION
function showConfirmModal(title, content, onConfirm, onCancel) {
    const modal = document.getElementById('message-modal');
    const icon = document.getElementById('message-icon');
    const titleEl = document.getElementById('message-title');
    const contentEl = document.getElementById('message-content');
    const okBtn = document.getElementById('message-ok-btn');
    
    // Set content
    titleEl.textContent = title;
    contentEl.textContent = content;
    icon.innerHTML = '<i class="fas fa-question-circle"></i>';
    icon.className = 'text-6xl mb-4 text-yellow-500';
    
    // Store original button HTML to restore later
    const originalButtonHTML = okBtn.outerHTML;
    
    // Replace single button with two buttons
    const buttonsHTML = `
        <div class="flex space-x-4">
            <button id="confirm-yes" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition">
                Yes
            </button>
            <button id="confirm-no" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition">
                No
            </button>
        </div>
    `;
    
    okBtn.outerHTML = buttonsHTML;
    
    // Add event listeners
    document.getElementById('confirm-yes').addEventListener('click', () => {
        // COMPLETELY remove the modal first
        modal.classList.add('hidden');
        
        // Force a reflow to ensure the modal is gone
        void modal.offsetHeight;
        
        // Restore button and call callback
        restoreOriginalModalButton(originalButtonHTML);
        if (onConfirm) onConfirm();
    });
    
    document.getElementById('confirm-no').addEventListener('click', () => {
        // COMPLETELY remove the modal first
        modal.classList.add('hidden');
        
        // Force a reflow to ensure the modal is gone
        void modal.offsetHeight;
        
        // Restore button and call callback
        restoreOriginalModalButton(originalButtonHTML);
        if (onCancel) onCancel();
    });
    
    // Show modal
    modal.classList.remove('hidden');
}

// Restore original OK button after confirmation modal
function restoreOriginalModalButton(originalHTML) {
    const buttonContainer = document.querySelector('#message-modal .flex');
    if (buttonContainer) {
        buttonContainer.outerHTML = originalHTML;
        // Re-attach event listener to the new OK button
        document.getElementById('message-ok-btn').addEventListener('click', hideMessageModal);
    }
}

// Make sure hideMessageModal properly hides everything
function hideMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.classList.add('hidden');
    
    // Force a reflow
    void modal.offsetHeight;
}

function startAISolvingProcess() {
    // Double-check that message modal is completely hidden
    const messageModal = document.getElementById('message-modal');
    messageModal.classList.add('hidden');
    
    // Force hide any other potential overlays
    document.querySelectorAll('.fixed.inset-0.bg-black').forEach(modal => {
        if (modal.id !== 'ai-solving-modal') {
            modal.classList.add('hidden');
        }
    });
    
    // Now show the AI modal
    gameState.isSolving = true;
    gameState.aiStep = 0;
    aiSolvingModal.classList.remove('hidden');
    aiStepCount.textContent = gameState.aiStep;
    
    document.getElementById('check-btn').disabled = true;
    document.getElementById('hint-btn').disabled = true;
    document.getElementById('solve-btn').disabled = true;
    
    solveStepByStep();
}


// Solve the board step by step
function solveStepByStep() {
    let currentRow = 0;
    let currentCol = 0;
    
    gameState.aiInterval = setInterval(() => {
        while (currentRow < 9 && gameState.initialBoard[currentRow][currentCol] !== 0) {
            currentCol++;
            if (currentCol >= 9) {
                currentCol = 0;
                currentRow++;
            }
        }
        
        if (currentRow >= 9) {
            clearInterval(gameState.aiInterval);
            gameState.isSolving = true;
            completeGame(); // This will handle setting solvedByAI correctly
            return;
        }
        
        gameState.board[currentRow][currentCol] = gameState.solution[currentRow][currentCol];
        
        const cell = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
        cell.textContent = gameState.solution[currentRow][currentCol];
        cell.classList.add('user-input', 'ai-solving');
        
        setTimeout(() => {
            cell.classList.remove('ai-solving');
        }, 500);
        
        gameState.aiStep++;
        aiStepCount.textContent = gameState.aiStep;
        aiCurrentCell.textContent = `(${currentRow+1},${currentCol+1})`;
        
        currentCol++;
        if (currentCol >= 9) {
            currentCol = 0;
            currentRow++;
        }
    }, 300);
}

// Pause AI solving
function pauseAISolving() {
    if (gameState.isSolving) {
        clearInterval(gameState.aiInterval);
        gameState.isSolving = false;
        document.getElementById('pause-ai-btn').innerHTML = '<i class="fas fa-play mr-2"></i>Resume';
        document.getElementById('pause-ai-btn').classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        document.getElementById('pause-ai-btn').classList.add('bg-green-500', 'hover:bg-green-600');
    } else {
        gameState.isSolving = true;
        solveStepByStep();
        document.getElementById('pause-ai-btn').innerHTML = '<i class="fas fa-pause mr-2"></i>Pause';
        document.getElementById('pause-ai-btn').classList.remove('bg-green-500', 'hover:bg-green-600');
        document.getElementById('pause-ai-btn').classList.add('bg-yellow-500', 'hover:bg-yellow-600');
    }
}

// Stop AI solving
function stopAISolving() {
    clearInterval(gameState.aiInterval);
    gameState.isSolving = false;
    aiSolvingModal.classList.add('hidden');
    
    document.getElementById('check-btn').disabled = false;
    document.getElementById('hint-btn').disabled = false;
    document.getElementById('solve-btn').disabled = false;
}

// Complete the game
function completeGame() {
    clearInterval(gameState.timerInterval);

    gameState.solvedByAI = gameState.isSolving;

    if (gameState.isSolving) {
        stopAISolving();
        gameState.isSolving = false;
    }

    console.log('Solved by AI:', gameState.solvedByAI);
    gameState.gamesPlayed++;
    
    const currentTime = gameState.elapsedTime;
    const bestTime = gameState.bestTimes[gameState.difficulty];
    
    if (!bestTime || currentTime < bestTime) {
        gameState.bestTimes[gameState.difficulty] = currentTime;
    }
    
    saveStatistics();
    
    // Safely update elements that exist
    if (completionTime) completionTime.textContent = formatTime(currentTime);
    if (completionDifficulty) completionDifficulty.textContent = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);

    // Update completion message and show appropriate buttons
    const completionMessage = document.getElementById('completion-message');
    const solvedBy = document.getElementById('solved-by');
    const reviewBtn = document.getElementById('review-solution-btn');

    console.log('Review button found:', reviewBtn);
    console.log('Completion message found:', completionMessage);
    console.log('Solved by found:', solvedBy);

    if (completionMessage) {
        completionMessage.textContent = gameState.solvedByAI 
            ? "The AI has solved the puzzle!" 
            : "Congratulations! You've solved the puzzle.";
    }
    
    if (solvedBy) {
        solvedBy.textContent = gameState.solvedByAI ? "AI" : "You";
    }
    
    if (reviewBtn) {
        if (gameState.solvedByAI) {
            reviewBtn.classList.remove('hidden');
            console.log('Showing review button');
        } else {
            reviewBtn.classList.add('hidden');
            console.log('Hiding review button');
        }
    }

    gameCompleteModal.classList.remove('hidden');
}

// Start the timer
function startTimer() {
    gameState.startTime = new Date();
    gameState.elapsedTime = 0;
    updateTimerDisplay();
    
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime = Math.floor((new Date() - gameState.startTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

// Update the timer display
function updateTimerDisplay() {
    timerElement.textContent = formatTime(gameState.elapsedTime);
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Go back to home page
function goHome() {
    if (gameState.isSolving) {
        stopAISolving();
    }
    
    // Reset all game state flags
    gameState.isSolving = false;
    gameState.solvedByAI = false;
    gameState.selectedCell = null;

    clearInterval(gameState.timerInterval);
    gamePage.classList.add('hidden');
    homePage.classList.remove('hidden');
}

// Handle keyboard input
function handleKeyPress(e) {
    if (!gameState.selectedCell || gameState.isSolving) return;
    
    const { key } = e;
    
    if (/^[1-9]$/.test(key)) {
        fillCell(parseInt(key));
    }
    else if (key.startsWith('Arrow')) {
        e.preventDefault();
        
        let { row, col } = gameState.selectedCell;
        
        switch (key) {
            case 'ArrowUp': row = Math.max(0, row - 1); break;
            case 'ArrowDown': row = Math.min(8, row + 1); break;
            case 'ArrowLeft': col = Math.max(0, col - 1); break;
            case 'ArrowRight': col = Math.min(8, col + 1); break;
        }
        
        selectCell(row, col);
    }
    else if (key === 'Backspace' || key === 'Delete') {
        eraseCell();
    }
}

// Modal Management
function showMessageModal(title, content, type = 'info') {
    const modal = document.getElementById('message-modal');
    const icon = document.getElementById('message-icon');
    const titleEl = document.getElementById('message-title');
    const contentEl = document.getElementById('message-content');
    
    // Set content
    titleEl.textContent = title;
    contentEl.textContent = content;
    
    // Set icon and color based on type
    icon.className = 'text-6xl mb-4';
    switch(type) {
        case 'success':
            icon.innerHTML = '<i class="fas fa-check-circle"></i>';
            icon.classList.add('message-success');
            break;
        case 'error':
            icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            icon.classList.add('message-error');
            break;
        case 'warning':
            icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            icon.classList.add('message-warning');
            break;
        default:
            icon.innerHTML = '<i class="fas fa-info-circle"></i>';
            icon.classList.add('message-info');
    }
    
    // Show modal
    modal.classList.remove('hidden');
}

function hideMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.classList.add('hidden');
}

// Initialize modal events
function initModals() {
    // Message modal OK button
    document.getElementById('message-ok-btn').addEventListener('click', hideMessageModal);
    
    // Close modal when clicking backdrop
    document.getElementById('message-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideMessageModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideMessageModal();
        }
    });
}

// ===== PWA SETUP =====
let deferredPrompt;

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(registration) {
        console.log('✅ ServiceWorker registered with scope:', registration.scope);
      })
      .catch(function(error) {
        console.log('❌ ServiceWorker registration failed:', error);
      });
  });
}

// Install Prompt Handling
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('🟢 beforeinstallprompt event fired');
  e.preventDefault();
  deferredPrompt = e;
  showInstallPromo();
});

function showInstallPromo() {
  const installPromo = document.getElementById('install-promo');
  if (installPromo && deferredPrompt) {
    console.log('📱 Showing install promo');
    installPromo.classList.remove('hidden');
  }
}

function installApp() {
  if (deferredPrompt) {
    console.log('🚀 Triggering install prompt');
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted install');
        const installPromo = document.getElementById('install-promo');
        if (installPromo) {
          installPromo.classList.add('hidden');
        }
      } else {
        console.log('❌ User dismissed install');
      }
      deferredPrompt = null;
    });
  } else {
    console.log('⚠️ No deferred prompt available');
  }
}

// Track successful installation
window.addEventListener('appinstalled', (evt) => {
  console.log('🎉 App was installed successfully!');
});

// Make function globally available
window.installApp = installApp;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', init);