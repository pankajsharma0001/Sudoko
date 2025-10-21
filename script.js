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
    hintsRemaining: 3,
    coins: 10, 
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
    checkDailyBonus();
}

// Load statistics from localStorage
function loadStatistics() {
    const stats = JSON.parse(localStorage.getItem('sudokuStats')) || {};
    gameState.gamesPlayed = stats.gamesPlayed || 0;
    gameState.bestTimes = stats.bestTimes || { easy: null, medium: null, hard: null };
    gameState.hintsUsed = stats.hintsUsed || 0;
    gameState.hintsRemaining = stats.hintsRemaining !== undefined ? stats.hintsRemaining : 3;
    gameState.coins = stats.coins !== undefined ? stats.coins : 10;

    updateStatisticsDisplay();
}

// Save statistics to localStorage
function saveStatistics() {
    const stats = {
        gamesPlayed: gameState.gamesPlayed,
        bestTimes: gameState.bestTimes,
        hintsUsed: gameState.hintsUsed,
        hintsRemaining: gameState.hintsRemaining,
        coins: gameState.coins
    };
    localStorage.setItem('sudokuStats', JSON.stringify(stats));
}

// Update statistics display
function updateStatisticsDisplay() {
    gamesPlayedElement.textContent = gameState.gamesPlayed;
    hintsUsedElement.textContent = gameState.hintsUsed;
    
    const bestTime = gameState.bestTimes[gameState.difficulty];
    bestTimeElement.textContent = bestTime ? formatTime(bestTime) : '--:--';

    updateHintButton();
}

// Update hint button display
function updateHintButton() {
    const hintBtns = document.querySelectorAll('#hint-btn-mobile, #hint-btn-desktop');
    
    hintBtns.forEach(hintBtn => {
        if (hintBtn) {
            hintBtn.innerHTML = `<i class="fas fa-lightbulb mr-2"></i>Hint (${gameState.hintsRemaining})`;
            
            if (gameState.hintsRemaining <= 0) {
                hintBtn.disabled = true;
                hintBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                hintBtn.disabled = false;
                hintBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    });
    
    // Update coins display for desktop and mobile
    const coinsDisplay = document.getElementById('coins-display');
    const mobileCoinsDisplay = document.getElementById('mobile-coins-display');
    
    if (coinsDisplay) {
        coinsDisplay.textContent = gameState.coins;
    }
    if (mobileCoinsDisplay) {
        mobileCoinsDisplay.textContent = gameState.coins;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Home page buttons
    document.getElementById('easy-btn').addEventListener('click', () => startGame('easy'));
    document.getElementById('medium-btn').addEventListener('click', () => startGame('medium'));
    document.getElementById('hard-btn').addEventListener('click', () => startGame('hard'));
    
    // Game page buttons - MOBILE
    document.getElementById('check-btn-mobile').addEventListener('click', checkBoard);
    document.getElementById('hint-btn-mobile').addEventListener('click', provideHint);
    document.getElementById('solve-btn-mobile').addEventListener('click', startAISolving);
    document.getElementById('get-hints-btn-mobile').addEventListener('click', showGetHintsModal);
    
    // Game page buttons - DESKTOP  
    document.getElementById('check-btn-desktop').addEventListener('click', checkBoard);
    document.getElementById('hint-btn-desktop').addEventListener('click', provideHint);
    document.getElementById('solve-btn-desktop').addEventListener('click', startAISolving);
    document.getElementById('get-hints-btn-desktop').addEventListener('click', showGetHintsModal);
    
    // New Game and Home buttons - MOBILE
    document.getElementById('new-game-btn-mobile').addEventListener('click', () => startGame(gameState.difficulty));
    document.getElementById('home-btn-mobile').addEventListener('click', goHome);
    
    // New Game and Home buttons - DESKTOP
    document.getElementById('new-game-btn-desktop').addEventListener('click', () => startGame(gameState.difficulty));
    document.getElementById('home-btn-desktop').addEventListener('click', goHome);
    
    // Erase button - MOBILE
    document.getElementById('erase-btn-mobile').addEventListener('click', eraseCell);
    
    // Number buttons (mobile only)
    document.querySelectorAll('.number-btn').forEach(btn => {
        if (!btn.id.includes('erase')) {
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

// Show Get Hints modal - FIXED VERSION
function showGetHintsModal() {
    const modal = document.getElementById('message-modal');
    const icon = document.getElementById('message-icon');
    const titleEl = document.getElementById('message-title');
    const contentEl = document.getElementById('message-content');
    const okBtn = document.getElementById('message-ok-btn');
    
    // Store original button HTML to restore later
    const originalButtonHTML = okBtn.outerHTML;
    
    // Set content
    titleEl.textContent = 'Get More Hints';
    contentEl.innerHTML = `You have ${gameState.coins} coins available.<br><br>
        <strong>Options:</strong><br>
        • Watch ad: Get 2 free hints<br>
        • Buy with coins: 5 coins = 3 hints<br>
        • Daily reward: Come back tomorrow!`;
    
    // Set icon
    icon.innerHTML = '<i class="fas fa-lightbulb"></i>';
    icon.className = 'text-6xl mb-4 text-yellow-500';
    
    // Replace OK button with hint options
    okBtn.outerHTML = `
        <div class="space-y-3" id="hint-options-container">
            <button id="watch-ad-btn" class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition">
                <i class="fas fa-tv mr-2"></i>Watch Ad (2 Hints)
            </button>
            <button id="buy-hints-btn" class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 rounded-lg transition ${gameState.coins < 5 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-coins mr-2"></i>Buy Hints (5 Coins = 3 Hints)
            </button>
            <button id="close-hints-btn" class="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition">
                Cancel
            </button>
        </div>
    `;
    
    // Add event listeners for the new buttons
    document.getElementById('watch-ad-btn').addEventListener('click', function() {
        restoreOriginalModalButton(originalButtonHTML);
        getFreeHints();
    });
    
    document.getElementById('buy-hints-btn').addEventListener('click', function() {
        if (gameState.coins >= 5) {
            restoreOriginalModalButton(originalButtonHTML);
            buyHintsWithCoins();
        }
    });
    
    document.getElementById('close-hints-btn').addEventListener('click', function() {
        restoreOriginalModalButton(originalButtonHTML);
        // hideMessageModal();
    });
    
    // Show modal
    modal.classList.remove('hidden');
}

// Restore original OK button after hint modal
function restoreOriginalModalButton(originalHTML) {
    const hintContainer = document.getElementById('hint-options-container');
    if (hintContainer) {
        hintContainer.outerHTML = originalHTML;
        // Re-attach event listener to the new OK button
        document.getElementById('message-ok-btn').addEventListener('click', hideMessageModal);
    }
}

// Get free hints (simulate watching ad)
function getFreeHints() {
    gameState.hintsRemaining += 2;
    saveStatistics();
    updateStatisticsDisplay();
    hideMessageModal();
    
    showMessageModal(
        'Hints Added!',
        'You received 2 free hints! You now have ' + gameState.hintsRemaining + ' hints remaining.',
        'success'
    );
}

// Buy hints with coins
function buyHintsWithCoins() {
    if (gameState.coins >= 5) {
        gameState.coins -= 5;
        gameState.hintsRemaining += 3;
        saveStatistics();
        updateStatisticsDisplay();
        hideMessageModal();
        
        showMessageModal(
            'Purchase Successful!',
            'You bought 3 hints! You now have ' + gameState.hintsRemaining + ' hints remaining and ' + gameState.coins + ' coins left.',
            'success'
        );
    } else {
        showMessageModal(
            'Not Enough Coins',
            'You need 5 coins to buy hints. Complete puzzles to earn more coins!',
            'error'
        );
    }
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
    
    // Check if hints are available
    if (gameState.hintsRemaining <= 0) {
        showMessageModal(
            'No Hints Left',
            `You've used all your hints! Complete puzzles to earn more hints or get free hints.`,
            'warning'
        );
        return;
    }

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
        gameState.hintsRemaining--;

        updateStatisticsDisplay();
        
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

// Restore original OK button after hint modal - FIXED VERSION
function restoreOriginalModalButton(originalHTML) {
    const hintContainer = document.getElementById('hint-options-container');
    if (hintContainer) {
        hintContainer.outerHTML = originalHTML;
        // Re-attach event listener to the new OK button
        document.getElementById('message-ok-btn').addEventListener('click', hideMessageModal);
    } else {
        // Fallback: directly reset the modal structure
        const modalContent = document.querySelector('#message-modal .bg-white');
        if (modalContent) {
            const lastChild = modalContent.lastElementChild;
            if (lastChild && lastChild.id !== 'message-ok-btn') {
                lastChild.outerHTML = originalHTML;
                document.getElementById('message-ok-btn').addEventListener('click', hideMessageModal);
            }
        }
    }
    
    // Always hide the modal after restoring
    hideMessageModal();
}

// Hide message modal - ROBUST VERSION
function hideMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.classList.add('hidden');
    
    // Force a reflow
    void modal.offsetHeight;
    
    // Clean up any hint options container that might be left
    const hintContainer = document.getElementById('hint-options-container');
    if (hintContainer) {
        hintContainer.remove();
    }
}

function startAISolvingProcess() {
    // Double-check that message modal is completely hidden
    const messageModal = document.getElementById('message-modal');
    messageModal.classList.add('hidden');
    
    // Now show the AI modal
    gameState.isSolving = true;
    gameState.aiStep = 0;
    aiSolvingModal.classList.remove('hidden');
    aiStepCount.textContent = gameState.aiStep;
    
    // Set pause button to initial "Pause" state
    const pauseBtn = document.getElementById('pause-ai-btn');
    pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause';
    pauseBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
    pauseBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');

    // Disable buttons for both mobile and desktop
    const buttonsToDisable = [
        'check-btn-mobile', 'hint-btn-mobile', 'solve-btn-mobile', 'get-hints-btn-mobile',
        'check-btn-desktop', 'hint-btn-desktop', 'solve-btn-desktop', 'get-hints-btn-desktop'
    ];
    buttonsToDisable.forEach(id => {
        const btn = document.getElementById(id);
         if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    
    solveStepByStep();
}


// Solve the board step by step
function solveStepByStep() {
    // Clear any existing interval first
    if (gameState.aiInterval) {
        clearInterval(gameState.aiInterval);
    }

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

// Pause AI solving - FIXED VERSION
function pauseAISolving() {
    const pauseBtn = document.getElementById('pause-ai-btn');
    
    if (gameState.isSolving) {
        // Currently solving, so pause it
        clearInterval(gameState.aiInterval);
        gameState.isSolving = false;
        
        // Update button to show "Resume"
        pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Resume';
        pauseBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        pauseBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    } else {
        // Currently paused, so resume it
        gameState.isSolving = true;
        
        // Update button to show "Pause"
        pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause';
        pauseBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
        pauseBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
        
        // Restart the solving process
        solveStepByStep();
    }
}

// Stop AI solving
function stopAISolving() {
    clearInterval(gameState.aiInterval);
    gameState.isSolving = false;
    aiSolvingModal.classList.add('hidden');
    
     // Enable buttons for both mobile and desktop
    const buttonsToEnable = [
        'check-btn-mobile', 'hint-btn-mobile', 'solve-btn-mobile', 'get-hints-btn-mobile',
        'check-btn-desktop', 'hint-btn-desktop', 'solve-btn-desktop', 'get-hints-btn-desktop'
    ];
    buttonsToEnable.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
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
    
    // Reward player for completing puzzle (unless AI solved it)
    if (!gameState.solvedByAI) {
        const rewardHints = 1;
        const rewardCoins = gameState.difficulty === 'easy' ? 2 : 
                           gameState.difficulty === 'medium' ? 3 : 5;
        
        gameState.hintsRemaining += rewardHints;
        gameState.coins += rewardCoins;
        
        // Show reward message
        setTimeout(() => {
            showMessageModal(
                'Reward Earned!',
                `You earned ${rewardHints} hint${rewardHints > 1 ? 's' : ''} and ${rewardCoins} coins for completing the ${gameState.difficulty} puzzle!`,
                'success'
            );
        }, 1000);
    }

    saveStatistics();
    
    // Safely update elements that exist
    if (completionTime) completionTime.textContent = formatTime(currentTime);
    if (completionDifficulty) completionDifficulty.textContent = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);

    // Update completion message and show appropriate buttons
    const completionMessage = document.getElementById('completion-message');
    const solvedBy = document.getElementById('solved-by');
    const reviewBtn = document.getElementById('review-solution-btn');

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
        } else {
            reviewBtn.classList.add('hidden');
        }
    }

    gameCompleteModal.classList.remove('hidden');
    updateStatisticsDisplay();
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

// Add daily login bonus
function checkDailyBonus() {
    const lastLogin = localStorage.getItem('lastLoginDate');
    const today = new Date().toDateString();
    
    if (lastLogin !== today) {
        const dailyBonus = 5; // 5 coins daily
        gameState.coins += dailyBonus;
        localStorage.setItem('lastLoginDate', today);
        saveStatistics();
        
        showMessageModal(
            'Daily Bonus!',
            `You received ${dailyBonus} coins as daily login bonus!`,
            'success'
        );
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

    // Ensure we have the OK button
    const okBtn = document.getElementById('message-ok-btn');
    if (!okBtn) {
        // Restore the OK button if it's missing
        const container = document.querySelector('#message-modal .bg-white');
        if (container) {
            const lastChild = container.lastElementChild;
            if (lastChild && lastChild.id !== 'message-ok-btn') {
                lastChild.outerHTML = `
                    <button id="message-ok-btn" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-lg transition">
                        OK
                    </button>
                `;
            }
        }
    }
    
    // Re-attach event listener
    const newOkBtn = document.getElementById('message-ok-btn');
    if (newOkBtn) {
        newOkBtn.replaceWith(newOkBtn.cloneNode(true)); // Remove existing listeners
        document.getElementById('message-ok-btn').addEventListener('click', hideMessageModal);
    }
    
    // Show modal
    modal.classList.remove('hidden');
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