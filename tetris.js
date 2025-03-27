const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const lineClearInfo = document.getElementById('line-clear-info');

// テトロミノの形状と色
const TETROMINOES = [
    {
        shape: [[1, 1, 1, 1]], // I型
        color: '#00f0f0'
    },
    {
        shape: [[1, 1], [1, 1]], // O型
        color: '#f0f000'
    },
    {
        shape: [[0, 1, 0], [1, 1, 1]], // T型
        color: '#a000f0'
    },
    {
        shape: [[1, 1, 0], [0, 1, 1]], // S型
        color: '#00ff00'
    },
    {
        shape: [[0, 1, 1], [1, 1, 0]], // Z型
        color: '#ff0000'
    },
    {
        shape: [[1, 0, 0], [1, 1, 1]], // J型
        color: '#0000ff'
    },
    {
        shape: [[0, 0, 1], [1, 1, 1]], // L型
        color: '#ffa500'
    }
];

// 色エフェクト用の色配列
const FLASH_COLORS = [
    '#FFFFFF', // 白
    '#FF0000', // 赤
    '#FFFF00', // 黄
    '#00FF00', // 緑
    '#0000FF', // 青
    '#FF00FF'  // マゼンタ
];

let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let currentPiece = null;
let score = 0;
let level = 1;
let gameLoop = null;
let isAutoPlay = false;
let autoPlayInterval = null;

// ラインが消える演出用の変数
let clearingLines = [];
let clearAnimation = null;
let clearAnimationStep = 0;

function initializeGame() {
    // ゲーム状態の完全リセット
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    level = 1;
    clearingLines = [];

    // タイマーの完全クリア
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    if (clearAnimation) {
        clearInterval(clearAnimation);
        clearAnimation = null;
    }
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }

    // UI表示をリセット
    lineClearInfo.style.display = 'none';
    updateGameInfo();

    // 新しいピースの生成
    currentPiece = null;
    spawnNewPiece();

    // ゲームループの再開始
    gameLoop = setInterval(() => {
        // ライン消去アニメーション中は落下を一時停止
        if (clearingLines.length > 0) {
            return;
        }

        if (canMove(0, 1)) {
            currentPiece.y++;
        } else {
            mergePiece();
            checkLines();
            // アニメーション中でなければ次のピースを生成
            if (clearingLines.length === 0) {
                spawnNewPiece();
            }
        }
        drawBoard();
        drawPiece();
    }, 1000 / (level * 1.5));

    // 自動操作モードを継続する場合
    if (isAutoPlay && !autoPlayInterval) {
        autoPlayInterval = setInterval(executeAutoPlay, 500);
    }

    // 画面を再描画
    drawBoard();
    drawPiece();
}

function spawnNewPiece() {
    const piece = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    currentPiece = {
        shape: piece.shape,
        color: piece.color,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };

    if (!canMove(0, 0)) {
        gameOver();
    }
}

function drawBoard() {
    // 背景を描画
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッドラインを描画
    ctx.strokeStyle = '#222';
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // ゴーストピースの描画
    if (currentPiece && !clearingLines.length) {
        const ghostPiece = calculateGhostPosition();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = ghostPiece.color;
        ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillRect(
                        (ghostPiece.x + x) * BLOCK_SIZE,
                        (ghostPiece.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
        ctx.globalAlpha = 1.0;
    }

    // 通常のブロック描画
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                // ライン消去アニメーション中の行は描画しない（アニメーション関数で別途描画）
                if (clearingLines.includes(y)) {
                    continue;
                }

                ctx.fillStyle = board[y][x];
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        }
    }
}

function calculateGhostPosition() {
    const ghost = {
        ...currentPiece,
        y: currentPiece.y
    };

    while (canMove(0, 1, ghost)) {
        ghost.y++;
    }
    return ghost;
}

function canMove(offsetX, offsetY, piece = currentPiece) {
    return piece.shape.every((row, y) => {
        return row.every((value, x) => {
            if (!value) return true;
            const newX = piece.x + x + offsetX;
            const newY = piece.y + y + offsetY;
            return (
                newX >= 0 &&
                newX < BOARD_WIDTH &&
                newY < BOARD_HEIGHT &&
                !board[newY][newX]
            );
        });
    });
}

function drawPiece() {
    if (!currentPiece || clearingLines.length > 0) return;

    ctx.fillStyle = currentPiece.color;
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillRect(
                    (currentPiece.x + x) * BLOCK_SIZE,
                    (currentPiece.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

function rotatePiece() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );

    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;
    if (!canMove(0, 0)) {
        currentPiece.shape = previousShape;
    }
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        });
    });
}

function checkLines() {
    // 既にアニメーション中なら何もしない
    if (clearingLines.length > 0) return;

    // 消去対象のラインを検出
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell)) {
            clearingLines.push(y);
        }
    }

    // 消去対象のラインがあればアニメーションを開始
    if (clearingLines.length > 0) {
        clearAnimationStep = 0;
        if (clearAnimation) clearInterval(clearAnimation);

        // UI表示を更新
        lineClearInfo.style.display = 'block';
        lineClearInfo.textContent = `${clearingLines.length}ライン消去中!`;

        // アニメーション開始
        clearAnimation = setInterval(animateClearLines, 100);
        return; // アニメーション中は次のピース生成を待機
    }
}

// ライン消去アニメーション
function animateClearLines() {
    // アニメーションステップを進める
    clearAnimationStep++;

    // 全体の盤面を描画
    drawBoard();

    // アニメーション効果（10ステップ）
    if (clearAnimationStep <= 10) {
        // 点滅色を決定（ステップごとに色を切り替え）
        const colorIndex = (clearAnimationStep - 1) % FLASH_COLORS.length;
        const flashColor = FLASH_COLORS[colorIndex];

        // 消去対象のラインをカラフルに点滅表示
        clearingLines.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                ctx.fillStyle = flashColor;
                // ブロックサイズを少し大きくして目立たせる
                ctx.fillRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    } else {
        // アニメーション終了、実際に消去処理を行う
        clearInterval(clearAnimation);
        clearAnimation = null;

        // UI表示を更新
        lineClearInfo.style.display = 'none';

        // 消したライン数に応じてスコア加算（テトリスは高得点）
        let linesCleared = clearingLines.length;
        let lineBonus = 0;

        if (linesCleared === 1) lineBonus = 100;
        else if (linesCleared === 2) lineBonus = 300;
        else if (linesCleared === 3) lineBonus = 500;
        else if (linesCleared === 4) lineBonus = 800; // テトリス

        score += lineBonus * level;
        level = Math.floor(score / 1000) + 1;
        updateGameInfo();

        // ラインを上から順に処理するためにソート
        clearingLines.sort((a, b) => a - b);

        // ラインを消去して上から詰める
        clearingLines.forEach((lineY, i) => {
            // 既に消した行数を考慮して位置を調整
            const adjustedY = lineY + i;
            board.splice(adjustedY, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
        });

        // 消去完了後、次のピースを生成
        clearingLines = [];
        spawnNewPiece();
    }

    // 現在のピースを描画
    drawPiece();
}

function updateGameInfo() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
}

function gameOver() {
    // 全てのタイマーを停止
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    if (clearAnimation) {
        clearInterval(clearAnimation);
        clearAnimation = null;
        lineClearInfo.style.display = 'none';
    }

    // ゲームオーバーメッセージ表示
    alert(`ゲームオーバー！ スコア: ${score}`);

    // ゲームを完全にリセットして新しいゲームを開始
    setTimeout(() => {
        initializeGame();
    }, 100); // 少し遅延を入れて状態が確実にクリアされるようにする
}

// ハードドロップ関数（一気に落下）
function hardDrop() {
    // ライン消去アニメーション中や自動操作中は実行しない
    if (clearingLines.length > 0 || !currentPiece) return;

    // 一番下まで落とす
    while (canMove(0, 1)) {
        currentPiece.y++;
    }

    // 接地後の処理
    mergePiece();
    checkLines();
    // アニメーション中でなければ次のピースを生成
    if (clearingLines.length === 0) {
        spawnNewPiece();
    }

    drawBoard();
    drawPiece();
}

// 自動操作用関数
function getAutoPilotMove() {
    // 全ての可能な配置（回転×位置）をシミュレーションして評価
    let bestScore = -Infinity;
    let bestMove = { rotations: 0, translation: 0 };

    // 最大4回の回転を試す
    for (let rotations = 0; rotations < 4; rotations++) {
        // 元のピースを複製
        let testPiece = {
            ...currentPiece,
            shape: JSON.parse(JSON.stringify(currentPiece.shape))
        };

        // 試しに回転
        for (let r = 0; r < rotations; r++) {
            const rotated = testPiece.shape[0].map((_, i) =>
                testPiece.shape.map(row => row[i]).reverse()
            );
            testPiece.shape = rotated;
        }

        // 左端から右端まで移動させてみる
        for (let x = -testPiece.x; x < BOARD_WIDTH; x++) {
            // ピースを複製して移動
            let movedPiece = {
                ...testPiece,
                x: testPiece.x + x
            };

            // 移動可能かチェック
            if (!canMove(0, 0, movedPiece)) {
                continue;
            }

            // 一番下まで落とす
            let dropDistance = 0;
            while (canMove(0, dropDistance + 1, movedPiece)) {
                dropDistance++;
            }
            movedPiece.y += dropDistance;

            // 配置した結果をシミュレーション
            let simBoard = board.map(row => [...row]);
            movedPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value && movedPiece.y + y < BOARD_HEIGHT) {
                        simBoard[movedPiece.y + y][movedPiece.x + x] = movedPiece.color;
                    }
                });
            });

            // 評価関数
            const score = evaluateBoard(simBoard, movedPiece);

            if (score > bestScore) {
                bestScore = score;
                bestMove = { rotations, translation: x };
            }
        }
    }

    return bestMove;
}

// 盤面の評価関数
function evaluateBoard(simulatedBoard, placedPiece) {
    let score = 0;

    // 1. 完成したラインの数
    let completedLines = 0;
    let consecutiveLines = 0;
    let lastLineComplete = false;

    for (let y = 0; y < BOARD_HEIGHT; y++) {
        if (simulatedBoard[y].every(cell => cell)) {
            completedLines++;

            if (lastLineComplete) {
                consecutiveLines++;
            } else {
                consecutiveLines = 1;
            }

            lastLineComplete = true;
        } else {
            lastLineComplete = false;
        }
    }

    // テトリス（4ライン消し）にボーナス
    if (consecutiveLines === 4) {
        score += 600; // テトリス消しは高く評価
    } else if (consecutiveLines === 3) {
        score += 300;
    } else if (consecutiveLines === 2) {
        score += 200;
    } else {
        score += completedLines * 100;
    }

    // 2. 隙間と穴の評価（より厳しく）
    let holes = 0;
    let adjacentHoles = 0;
    let holeDepth = 0;
    let blocksAboveHoles = 0;

    // 各列のブロック分布を計算
    let columnBlocks = Array(BOARD_WIDTH).fill(0);
    let columnHoles = Array(BOARD_WIDTH).fill(0);
    let columnDepths = Array(BOARD_WIDTH).fill(0);

    for (let x = 0; x < BOARD_WIDTH; x++) {
        let blockFound = false;
        let columnDepth = 0;

        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (simulatedBoard[y][x]) {
                blockFound = true;
                columnBlocks[x]++;
            } else if (blockFound) {
                holes++;
                columnHoles[x]++;
                columnDepth++;

                // 穴の上にあるブロック数
                for (let above = 0; above < y; above++) {
                    if (simulatedBoard[above][x]) {
                        blocksAboveHoles++;
                    }
                }
            }
        }

        columnDepths[x] = columnDepth;
    }

    // 隣接する穴のペナルティ
    for (let x = 0; x < BOARD_WIDTH - 1; x++) {
        if (columnHoles[x] > 0 && columnHoles[x + 1] > 0) {
            adjacentHoles += Math.min(columnHoles[x], columnHoles[x + 1]);
        }
    }

    // 深い穴のペナルティ
    for (let x = 0; x < BOARD_WIDTH; x++) {
        holeDepth += columnDepths[x];
    }

    // 穴と隙間への大きなペナルティ
    score -= holes * 60;
    score -= adjacentHoles * 30;
    score -= holeDepth * 20;
    score -= blocksAboveHoles * 15;

    // 3. 高さの評価（低く安定した状態を優先）
    let heights = [];
    let totalHeight = 0;
    let maxHeight = 0;

    for (let x = 0; x < BOARD_WIDTH; x++) {
        let height = BOARD_HEIGHT;
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (simulatedBoard[y][x]) {
                height = y;
                break;
            }
        }
        heights.push(height);
        totalHeight += (BOARD_HEIGHT - height);
        maxHeight = Math.max(maxHeight, BOARD_HEIGHT - height);
    }

    // 高さに比例したペナルティ
    score -= totalHeight * 5;

    // 最大高さへのペナルティ（高すぎるとゲームオーバーリスク）
    score -= Math.pow(maxHeight, 1.5) * 4;

    // 4. バランスと効率的な積み方の評価
    let heightDiff = 0;
    for (let i = 0; i < heights.length - 1; i++) {
        heightDiff += Math.abs(heights[i] - heights[i + 1]);
    }

    // 高さの差に対するペナルティ
    score -= heightDiff * 8;

    // 5. 接地面の評価（隙間なく積まれているかどうか）
    let surfaceSmoothnessScore = 0;
    for (let x = 0; x < BOARD_WIDTH; x++) {
        let blockCount = 0;

        // 配置されるピースの各ブロックがどれだけ既存のブロックに接するか
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                let nx = x + dx;
                let ny = heights[x] + dy;

                if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                    if (simulatedBoard[ny][nx]) {
                        blockCount++;
                    }
                }
            }
        }

        surfaceSmoothnessScore += blockCount;
    }

    score += surfaceSmoothnessScore * 5;

    // 6. 特殊な配置のボーナス
    // I型ピースによる4ライン消しの可能性
    const isIBlock = placedPiece && placedPiece.shape.length === 1 && placedPiece.shape[0].length === 4;

    if (completedLines === 4 && isIBlock) {
        score += 200; // I型で4ライン消しした場合の特別ボーナス
    }

    // 端が高く中央が低い「盆地」形状を少し評価
    let wellShapedScore = 0;
    if (heights[0] < heights[1] && heights[BOARD_WIDTH - 1] < heights[BOARD_WIDTH - 2]) {
        let centerHeightAvg = 0;
        for (let i = 2; i < BOARD_WIDTH - 2; i++) {
            centerHeightAvg += heights[i];
        }
        centerHeightAvg /= (BOARD_WIDTH - 4);

        if (centerHeightAvg > heights[0] && centerHeightAvg > heights[BOARD_WIDTH - 1]) {
            wellShapedScore = 50;
        }
    }

    score += wellShapedScore;

    return score;
}

// 自動操作の実行
function executeAutoPlay() {
    if (!isAutoPlay || !currentPiece || clearingLines.length > 0) return;

    const move = getAutoPilotMove();

    // 回転の実行
    for (let i = 0; i < move.rotations; i++) {
        rotatePiece();
    }

    // 左右移動の実行
    const targetX = currentPiece.x + move.translation;
    const moveInterval = setInterval(() => {
        if (currentPiece.x < targetX && canMove(1, 0)) {
            currentPiece.x++;
        } else if (currentPiece.x > targetX && canMove(-1, 0)) {
            currentPiece.x--;
        } else {
            clearInterval(moveInterval);
            // ハードドロップを実行
            hardDrop();
        }
        drawBoard();
        drawPiece();
    }, 50);
}

// 自動操作の切り替え
function toggleAutoPlay() {
    isAutoPlay = !isAutoPlay;
    const autoPlayButton = document.getElementById('auto-play');
    autoPlayButton.textContent = `自動操作: ${isAutoPlay ? 'オン' : 'オフ'}`;

    if (isAutoPlay) {
        autoPlayButton.classList.add('active');
        if (!autoPlayInterval) {
            autoPlayInterval = setInterval(executeAutoPlay, 500);
        }
    } else {
        autoPlayButton.classList.remove('active');
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }
}

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false
};

// キー状態管理
document.addEventListener('keydown', (event) => {
    if (isAutoPlay && event.key !== 'a' && event.key !== 'A') {
        event.preventDefault();
        return;
    }

    // ライン消去アニメーション中は操作を無効化
    if (clearingLines.length > 0) {
        event.preventDefault();
        return;
    }

    switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowDown':
            if (!keys[event.key]) {
                handleMove(event.key);
                keys[event.key] = true;
            }
            event.preventDefault();
            break;
        case 'ArrowUp': // 上矢印キーでハードドロップ
            hardDrop();
            event.preventDefault();
            break;
        case ' ':
            rotatePiece();
            drawBoard();
            drawPiece();
            event.preventDefault();
            break;
        case 'a':
        case 'A':
            toggleAutoPlay();
            event.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowDown':
            keys[event.key] = false;
            break;
    }
});

// 移動処理用インターバル
setInterval(() => {
    // ライン消去アニメーション中は移動を無効化
    if (clearingLines.length > 0) return;

    Object.entries(keys).forEach(([key, isPressed]) => {
        if (isPressed) {
            handleMove(key);
        }
    });
}, 100);

function handleMove(key) {
    switch (key) {
        case 'ArrowLeft':
            if (canMove(-1, 0)) currentPiece.x--;
            break;
        case 'ArrowRight':
            if (canMove(1, 0)) currentPiece.x++;
            break;
        case 'ArrowDown':
            if (canMove(0, 1)) currentPiece.y++;
            break;
    }
    drawBoard();
    drawPiece();
}

// 自動操作ボタンイベント
document.getElementById('auto-play').addEventListener('click', toggleAutoPlay);

// 初回のゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});
