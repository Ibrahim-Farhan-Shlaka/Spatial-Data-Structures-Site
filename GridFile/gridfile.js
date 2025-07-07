const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const margin = 50;

const gridWidth = canvasWidth - margin;
const gridHeight = canvasHeight - margin;
const gridX = margin;
const gridY = 0;

const bgColor = '#1a1a1a';
const axisColor = '#ffffff';
const textColor = '#ffffff';
const gridColor = '#444444';
const highlightColor = 'rgba(255, 0, 47, 0.28)';

let cellSize = 100;
let gridSize = 100;
let points = [];
let hoveredCell = null;

let xScales = [1, gridSize + 1];
let yScales = [1, gridSize + 1];

let cells = [{
    xRange: [1, gridSize + 1],
    yRange: [1, gridSize + 1],
    points: []
}];

let BUCKET_CAPACITY = 4;
let lastSplitDirection = 'horizontal';

let animations = [];
const ANIMATION_DURATION = 600;

function drawGrid() {
    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw main grid area
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(gridX, gridY, gridWidth, gridHeight);
    
    // Draw vertical axis (left bar)
    ctx.fillStyle = '#252525';
    ctx.fillRect(0, 0, margin, gridHeight);
    
    // Draw horizontal axis (bottom bar)
    ctx.fillStyle = '#252525';
    ctx.fillRect(gridX, gridHeight, gridWidth, margin);
    
    // Draw permanent grid lines (non-animated)
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Draw x-scale lines
    xScales.forEach(x => {
        const posX = gridX + ((x-1)/gridSize) * gridWidth;
        if (!animations.some(a => a.direction === 'vertical' && Math.abs(a.x - posX) < 0.1)) {
            ctx.beginPath();
            ctx.moveTo(posX, gridY);
            ctx.lineTo(posX, gridY + gridHeight);
            ctx.stroke();
        }
    });

    // Draw y-scale lines
    yScales.forEach(y => {
        const posY = gridY + ((y-1)/gridSize) * gridHeight;
        if (!animations.some(a => a.direction === 'horizontal' && Math.abs(a.y - posY) < 0.1)) {
            ctx.beginPath();
            ctx.moveTo(gridX, posY);
            ctx.lineTo(gridX + gridWidth, posY);
            ctx.stroke();
        }
    });

    // Highlight hovered cell (behind animations)
    if (hoveredCell && !animations.length) {
        const x1 = gridX + ((hoveredCell.xRange[0]-1)/gridSize * gridWidth);
        const x2 = gridX + ((hoveredCell.xRange[1]-1)/gridSize * gridWidth);
        const y1 = gridY + ((hoveredCell.yRange[0]-1)/gridSize * gridHeight);
        const y2 = gridY + ((hoveredCell.yRange[1]-1)/gridSize * gridHeight);
        
        ctx.fillStyle = highlightColor;
        ctx.fillRect(x1, y1, x2-x1, y2-y1);
    }

    // Draw axis labels (top layer)
    ctx.fillStyle = textColor;
    ctx.font = '20px Audiowide';
    ctx.textAlign = 'center';
    
    // Vertical label (Y)
    ctx.save();
    ctx.translate(25, gridHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y', 0, 0);
    ctx.restore();
    
    // Horizontal label (X)
    ctx.fillText('X', gridX + gridWidth / 2, gridHeight + 35);
    
    // Draw border around main grid (top layer)
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX, gridY, gridWidth, gridHeight);

    // Draw animations (topmost layer)
    if (animations.length) {
        const now = performance.now();
        animations = animations.filter(anim => {
            const elapsed = now - anim.startTime;
            const progress = Math.min(1, elapsed / ANIMATION_DURATION);
            
            ctx.strokeStyle = anim.color || '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            if (anim.direction === 'vertical') {
                ctx.moveTo(anim.x, gridY);
                ctx.lineTo(anim.x, gridY + gridHeight * progress);
            } else {
                ctx.moveTo(gridX, anim.y);
                ctx.lineTo(gridX + gridWidth * progress, anim.y);
            }
            
            ctx.stroke();
            return progress < 1;
        });

        if (animations.length) {
            requestAnimationFrame(drawGrid);
        }
    }
    
    // Always draw points (on top of everything)
    drawPoints();
}

function findCell(x, y) {
    return cells.findIndex(c => 
        x >= c.xRange[0] && x < c.xRange[1] &&
        y >= c.yRange[0] && y < c.yRange[1]
    );
}

function splitCell(cellIndex) {
    const cell = cells[cellIndex];
    const points = cell.points;
    
    // Check if cell can be split further
    const canSplitX = (cell.xRange[1] - cell.xRange[0]) > 1;
    const canSplitY = (cell.yRange[1] - cell.yRange[0]) > 1;
    
    if (!canSplitX && !canSplitY) {
        console.log("Cell at minimum size - cannot split further");
        return;
    }
    
    // Determine split direction (alternating, but respecting possible splits)
    let splitX;
    if (!canSplitX) {
        splitX = false;
    } else if (!canSplitY) {
        splitX = true;
    } else {
        splitX = lastSplitDirection === 'horizontal';
    }
    
    if (splitX) {
        // Vertical split
        lastSplitDirection = 'vertical';
        let mid = Math.floor((cell.xRange[0] + cell.xRange[1]) / 2);
        
        // Ensure we're not splitting on existing line
        while (xScales.includes(mid) && mid > cell.xRange[0] && mid < cell.xRange[1]) {
            // Try to find a better split point
            const coords = points.map(p => p.coordX).sort((a,b) => a-b);
            const medianIndex = Math.floor(coords.length/2);
            const candidate = coords[medianIndex];
            
            if (candidate !== mid && candidate > cell.xRange[0] && candidate < cell.xRange[1]) {
                mid = candidate;
                break;
            }
            mid += (mid === cell.xRange[0] ? 1 : -1);
        }
        
        if (xScales.includes(mid) || mid <= cell.xRange[0] || mid >= cell.xRange[1]) {
            console.log("Cannot find valid split point");
            return;
        }
        
        xScales.push(mid);
        xScales.sort((a,b) => a-b);
        
        // Create new cells
        cells.splice(cellIndex, 1);
        cells.push({
            xRange: [cell.xRange[0], mid],
            yRange: [...cell.yRange],
            points: points.filter(p => p.coordX < mid)
        });
        cells.push({
            xRange: [mid, cell.xRange[1]],
            yRange: [...cell.yRange],
            points: points.filter(p => p.coordX >= mid)
        });
        
        //add animation
        const posX = gridX + ((mid-1)/gridSize) * gridWidth;
        animations.push({
            startTime: performance.now(),
            x: posX,
            y: gridY,
            direction: 'vertical',
            color: '#00ffff'
        });
    } else {
        //horizontal split
        lastSplitDirection = 'horizontal';
        let mid = Math.floor((cell.yRange[0] + cell.yRange[1]) / 2);
        
        //check if were not splitting on existing line
        while (yScales.includes(mid) && mid > cell.yRange[0] && mid < cell.yRange[1]) {
            //try to find a better split point
            const coords = points.map(p => p.coordY).sort((a,b) => a-b);
            const medianIndex = Math.floor(coords.length/2);
            const candidate = coords[medianIndex];
            
            if (candidate !== mid && candidate > cell.yRange[0] && candidate < cell.yRange[1]) {
                mid = candidate;
                break;
            }
            mid += (mid === cell.yRange[0] ? 1 : -1);
        }
        
        if (yScales.includes(mid) || mid <= cell.yRange[0] || mid >= cell.yRange[1]) {
            console.log("Cannot find valid split point");
            return;
        }
        
        yScales.push(mid);
        yScales.sort((a,b) => a-b);
        
        //create new cells
        cells.splice(cellIndex, 1);
        cells.push({
            xRange: [...cell.xRange],
            yRange: [cell.yRange[0], mid],
            points: points.filter(p => p.coordY < mid)
        });
        cells.push({
            xRange: [...cell.xRange],
            yRange: [mid, cell.yRange[1]],
            points: points.filter(p => p.coordY >= mid)
        });
        
        const posY = gridY + ((mid-1)/gridSize) * gridHeight;
        animations.push({
            startTime: performance.now(),
            x: gridX,
            y: posY,
            direction: 'horizontal',
            color: '#00ffff'
        });
    }
    
    //for animation
    requestAnimationFrame(drawGrid);
}

function drawPoints() {
    //draw each point and its coordinates
    points.forEach(point => {
        //draw the point
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Audiowide';
        ctx.textAlign = 'left';
        ctx.fillText(`(${point.coordX},${point.coordY})`, point.x + 10, point.y - 10);
    });
}

//function to highlight hovered cell
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (mouseX >= gridX && mouseX <= gridX + gridWidth && 
        mouseY >= gridY && mouseY <= gridY + gridHeight) {
        
        // Calculate grid coordinates
        const coordX = Math.floor(((mouseX - gridX) / gridWidth) * gridSize) + 1;
        const coordY = Math.floor(((mouseY - gridY) / gridHeight) * gridSize) + 1;
        
        hoveredCell = cells.find(c => 
            coordX >= c.xRange[0] && coordX < c.xRange[1] &&
            coordY >= c.yRange[0] && coordY < c.yRange[1]
        );
    } else {
        hoveredCell = null;
    }
    drawGrid();
}

// Initialize the visualization
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', handleMouseMove);
drawGrid();

document.getElementById('reset').addEventListener('click', function() {
    document.getElementById('cellSize').value = 50;
    updateGridSize();
});

function getRandomCoord() {
    return {
        coordX: Math.floor(Math.random() * gridSize) + 1,
        coordY: Math.floor(Math.random() * gridSize) + 1
    };
}

//from grid coord to canvas pixel
function coordToCanvas(x, y) {
    return {
        x: gridX + ((x - 0.5) / gridSize) * gridWidth,
        y: gridY + ((y - 0.5) / gridSize) * gridHeight
    };
}

// Find index of point near given canvas coords
function findPointIndexNear(x, y, radius = 25) {
    return points.findIndex(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        return dx * dx + dy * dy <= radius * radius;
    });
}

// Remove point and update cells
function removePointAtCanvasCoords(canvasX, canvasY) {
    const pointIndex = findPointIndexNear(canvasX, canvasY);
    if (pointIndex === -1) return false;

    const pointToRemove = points[pointIndex];

    // Remove from global points array
    points.splice(pointIndex, 1);

    // Remove from the cell's points array
    cells.forEach(cell => {
        cell.points = cell.points.filter(p => p !== pointToRemove);
    });

    drawGrid();
    return true;
}

// Handle right-click to delete points
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (removePointAtCanvasCoords(mouseX, mouseY)) {
        console.log('Point deleted.');
    }
});

//add 1 point at coords
function addPointAt(coordX, coordY) {
    const cellIndex = findCell(coordX, coordY);
    if (cellIndex === -1) return;

    const { x, y } = coordToCanvas(coordX, coordY);
    const newPoint = { x, y, coordX, coordY };
    points.push(newPoint);
    cells[cellIndex].points.push(newPoint);

    if (cells[cellIndex].points.length > BUCKET_CAPACITY) {
        splitCell(cellIndex);
    }
}

//generate new tree
document.getElementById('random-points').addEventListener('click', () => {
    points = [];
    cells = [{
        xRange: [1, gridSize + 1],
        yRange: [1, gridSize + 1],
        points: []
    }];
    xScales = [1, gridSize + 1];
    yScales = [1, gridSize + 1];
    animations = [];

    for (let i = 0; i < 20; i++) {
        const { coordX, coordY } = getRandomCoord();
        addPointAt(coordX, coordY);
    }

    drawGrid();
});

//add 20 random points
document.getElementById('add-multiple').addEventListener('click', () => {
    for (let i = 0; i < 20; i++) {
        const { coordX, coordY } = getRandomCoord();
        addPointAt(coordX, coordY);
    }
    drawGrid();
});

//function to draw range query rectangle
function handleCanvasClick(e) {

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX >= gridX && clickX <= gridX + gridWidth && 
        clickY >= gridY && clickY <= gridY + gridHeight) {
        
        const coordX = Math.floor(((clickX - gridX) / gridWidth) * gridSize) + 1;
        const coordY = Math.floor(((clickY - gridY) / gridHeight) * gridSize) + 1;
        const cellIndex = findCell(coordX, coordY);
        if (cellIndex === -1) return;

        //if Shift is held query the cell instead of adding a point
        if (e.shiftKey) {

            const cell = cells[cellIndex];
            let data;
            console.clear();
            console.log(`Cell clicked!`);
            data = `Cell clicked!`+'\n';
            console.log(`X Range: ${cell.xRange[0]} to ${cell.xRange[1]}`);
            data += `X Range: ${cell.xRange[0]} to ${cell.xRange[1]}`+'\n';
            console.log(`Y Range: ${cell.yRange[0]} to ${cell.yRange[1]}`);
            data += `Y Range: ${cell.yRange[0]} to ${cell.yRange[1]}`+'\n';
            console.log(`Points in cell (${cell.points.length}):`);
            data += `Points in cell (${cell.points.length}):` + '\n';
            cell.points.forEach((p, i) => {
                console.log(`  ${i + 1}. (X: ${p.coordX}, Y: ${p.coordY})`);
                data += `  ${i + 1}. (X: ${p.coordX}, Y: ${p.coordY})` + '\n';
            });
            document.getElementById('queryResult').innerText = data; 

        } else {

            //otherwise clicking adds a point
            const newPoint = {
                x: clickX,
                y: clickY,
                coordX: coordX,
                coordY: coordY
            };
            points.push(newPoint);
            cells[cellIndex].points.push(newPoint);

            if (cells[cellIndex].points.length > BUCKET_CAPACITY) {
                splitCell(cellIndex);

            }

            drawGrid();
        }
    }
}

//listener that changes the capacity of a cell
document.getElementById('cellSize').addEventListener('input', (e) => {
  BUCKET_CAPACITY = parseInt(e.target.value);
  drawGrid();
});

const slider = document.getElementById('cellSize');
const cellValue = document.getElementById('cellValue');

slider.addEventListener('input', () => {
    cellValue.textContent = "Cell Capacity = ";
});