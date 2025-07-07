//canvas setup
const container = document.getElementById('kdtree_visual');
const canvas = document.createElement('canvas');
canvas.width = 750;
canvas.height = 750;
canvas.style.border = '1px solid #ccc';
container.appendChild(canvas);
const ctx = canvas.getContext('2d');
const bounds = { xMin: 0, xMax: canvas.width, yMin: 0, yMax: canvas.height };

const treecontainer = document.getElementById('tree-canvas');
const treeCanvas = document.createElement('canvas');
treeCanvas.width = 750;
treeCanvas.height = 750;
treeCanvas.style.border = '1px solid #ccc';
treecontainer.appendChild(treeCanvas);
const treeCtx = treeCanvas.getContext('2d');
const treebounds = { xMin: 0, xMax: treeCanvas.width, yMin: 0, yMax: treeCanvas.height };

let Mode = false;
let queryPoint = null;
let Results = [];

let dragging = false;
let dragStart = null;
let dragEnd = null;
let selectionBox = null;
let visitedNodes = [];

//creating 10 random points to fill the tree with, will let user choose how many later
points = Array(10).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height
}));

//making the kdtee at the start
function kdTreeConstruction(points, depth = 0) {
    //returns if there are no points, in case user pressed clear tree
    if (points.length === 0) return null;

    //acis default is x, checks depth to change it to y
    let axis = 'x';
    if(depth%2 == 0)
        axis = 'x';
    else
        axis = 'y';

    //all points get sorted by axis, and median point is calculated to send to the recursive part of the function
    points.sort((a, b) => a[axis] - b[axis]);
    const median = Math.floor(points.length / 2);

    //recursively calls itself to build left and right parts of the subtrees inside the tree
    return {
        point: points[median],
        axis: axis,
        left: kdTreeConstruction(points.slice(0, median), depth + 1),
        right: kdTreeConstruction(points.slice(median + 1), depth + 1)
    };
}

function drawGridAndAxes() {
    const opacity = 0.7;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.setLineDash([5, 5]); // dotted lines
    ctx.lineWidth = 1;

    const step = 25;  // grid cell size

    // Draw vertical grid lines
    for (let x = step; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = step; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    //draw X axis
    ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw Y axis
    ctx.strokeStyle = `rgba(0, 128, 0, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.setLineDash([]);
}

//initialising the tree
let kdTree = kdTreeConstruction(points);

//drawing the tree
function drawKDTree(node, depth = 0, bounds = { xMin: 0, xMax: canvas.width, yMin: 0, yMax: canvas.height }) {
  if (!node) return;
    const { x, y } = node.point;
    const axis = node.axis;

    // Draw partition line
    ctx.strokeStyle = axis === 'x' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (axis === 'x') {
        ctx.moveTo(x, bounds.yMin);
        ctx.lineTo(x, bounds.yMax);
    } else {
        ctx.moveTo(bounds.xMin, y);
        ctx.lineTo(bounds.xMax, y);
    }
    ctx.stroke();
    ctx.setLineDash([]); // reset dash

    // Draw point
    if(depth % 2 == 0){
        color = 'green';
    } else {
        color = 'red'
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Recursive calls for left and right subtree with updated bounds
    if (axis === 'x') {
        drawKDTree(node.left, depth + 1, {
            xMin: bounds.xMin,
            xMax: x,
            yMin: bounds.yMin,
            yMax: bounds.yMax
        });
        drawKDTree(node.right, depth + 1, {
            xMin: x,
            xMax: bounds.xMax,
            yMin: bounds.yMin,
            yMax: bounds.yMax
        });
    } else {
        drawKDTree(node.left, depth + 1, {
            xMin: bounds.xMin,
            xMax: bounds.xMax,
            yMin: bounds.yMin,
            yMax: y
        });
        drawKDTree(node.right, depth + 1, {
            xMin: bounds.xMin,
            xMax: bounds.xMax,
            yMin: y,
            yMax: bounds.yMax
        });
    }
}

//function to insert a node
function insertKDNode(node, point, depth = 0) {
    if (!node) {
        return {
            point,
            axis: depth % 2 === 0 ? 'x' : 'y',
            left: null,
            right: null
        };
    }
    const axis = node.axis;
    if (point[axis] < node.point[axis]) {
        node.left = insertKDNode(node.left, point, depth + 1);
    } else {
        node.right = insertKDNode(node.right, point, depth + 1);
    }
    return node;
}

//function for kNN search
function findKNearest(node, target, k, depth = 0, heap = []) {
    if (!node) return [];

    const axis = depth % 2 === 0 ? 'x' : 'y';
    const dist = distance(target, node.point);

    if (heap.length < k) {
        heap.push({ point: node.point, dist });
        heap.sort((a, b) => b.dist - a.dist);
    } else if (dist < heap[0].dist) {
        heap[0] = { point: node.point, dist };
        heap.sort((a, b) => b.dist - a.dist);
    }

    const next = target[axis] < node.point[axis] ? node.left : node.right;
    const other = target[axis] < node.point[axis] ? node.right : node.left;

    findKNearest(next, target, k, depth + 1, heap);

    const diff = Math.abs(target[axis] - node.point[axis]);
    if (heap.length < k || diff < heap[0].dist) {
        findKNearest(other, target, k, depth + 1, heap);
    }

    return heap.map(h => h.point);
}

//simple distance calculating function
function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

//drawing function
function draw() {
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridAndAxes();
    drawKDTree(kdTree);

    //Draw the selection rectangle if dragging
    if (dragStart && dragEnd) {
        const x = Math.min(dragStart.x, dragEnd.x);
        const y = Math.min(dragStart.y, dragEnd.y);
        const w = Math.abs(dragStart.x - dragEnd.x);
        const h = Math.abs(dragStart.y - dragEnd.y);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }

    //Draw query point and lines (for k-NN)
    if (queryPoint) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(queryPoint.x, queryPoint.y, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,0,0,0.6)';
        ctx.setLineDash([5, 5]);
        Results.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(queryPoint.x, queryPoint.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        });
        ctx.setLineDash([]);
    }

    //Draw result points (for range or k-NN)
    if (Results && Results.length > 0) {
        ctx.fillStyle = 'blue';
        Results.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    // Draw persistent selection box (if any)
    if (selectionBox) {
    const x = selectionBox.minX;
    const y = selectionBox.minY;
    const w = selectionBox.maxX - selectionBox.minX;
    const h = selectionBox.maxY - selectionBox.minY;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    }

    treeCtx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
    drawKDTreeStructure(treeCtx, kdTree, treeCanvas.width / 2, 40, 150, 60, 0, Results);
}

// Find node with minimum coordinate on given axis in subtree rooted at node
function findMin(node, axis, depth = 0) {
    if (!node) return null;
    
    const currentAxis = node.axis;
    
    if (currentAxis === axis) {
        if (!node.left) {
            return node;
        }
        return findMin(node.left, axis, depth + 1);
    } else {
        const leftMin = findMin(node.left, axis, depth + 1);
        const rightMin = findMin(node.right, axis, depth + 1);

        let minNode = node;
        if (leftMin && leftMin.point[axis] < minNode.point[axis]) minNode = leftMin;
        if (rightMin && rightMin.point[axis] < minNode.point[axis]) minNode = rightMin;

        return minNode;
    }
}

function* animatedRangeQueryKDTree(node, rect, depth = 0) {
  if (!node) return;

  const axis = depth % 2 === 0 ? 'x' : 'y';
  const { minX, maxX, minY, maxY } = rect;
  const { x, y } = node.point;

  // Yield current node to animate visit
  yield { type: "visit", node, depth };

  // Check if inside range
  if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
    yield { type: "found", node, depth };
  }

  // Decide whether to visit left/right based on axis
  if ((axis === 'x' && minX <= x) || (axis === 'y' && minY <= y)) {
    yield* animatedRangeQueryKDTree(node.left, rect, depth + 1);
  }

  if ((axis === 'x' && maxX >= x) || (axis === 'y' && maxY >= y)) {
    yield* animatedRangeQueryKDTree(node.right, rect, depth + 1);
  }
}

async function runAnimatedRangeQuery(rect) {
  const gen = animatedRangeQueryKDTree(kdTree, rect);
  let step = gen.next();

  Results = [];
  visitedNodes = [];

  while (!step.done) {
    const { type, node } = step.value;

    if (type === "visit") {
      visitedNodes.push(node.point);
    }

    if (type === "found") {
      Results.push(node.point);
    }

    draw();
    await new Promise(r => setTimeout(r, 850));
    step = gen.next();
  }

  draw();
}

//listener for reset button
document.getElementById('reset').addEventListener('click', () => {
    points = [];
    kdTree = null;

    // Clear query state
    queryPoint = null;
    Results = [];

    draw();
});

//listener for random points button, rebuilds tree with new random points
document.getElementById('random-points').addEventListener('click', () => {

    points = [];
    let i = 0, point;

    // Clear query state
    queryPoint = null;
    Results = [];

    for(i = 0; i < 10; i++){
        point = {x: Math.random() * canvas.width,
                     y: Math.random() * canvas.height};
        points.unshift(point);
        kdTree = insertKDNode(kdTree, point);
    }
    kdTree = kdTreeConstruction(points);
    draw();
});

//listener to batch add points
document.getElementById('add-multiple').addEventListener('click', () => {
    for(let i = 0; i < 5; i++){
        let point = {x: Math.random() * canvas.width,
                     y: Math.random() * canvas.height};
        points.unshift(point);
        kdTree = insertKDNode(kdTree, point);}

    // Clear query state
    queryPoint = null;
    Results = [];

    draw();
});

document.getElementById('query-btn').addEventListener('click', () => {
    Mode = true;
});

//listener for knn query and adding points
canvas.addEventListener('click', (event) => { 
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (selectionBox) {
        selectionBox = null;
        Results = [];
        queryPoint = null;
        draw();
        return; // don't add point
    }

    if (Mode) {
        queryPoint = { x, y };
        Results = findKNearest(kdTree, queryPoint, 5); 
        Mode = false;
    } else {

        if (!Mode && selectionBox) {
        // prevent adding points when a selection box exists
        return;
        }

        points.unshift({ x, y });
        kdTree = insertKDNode(kdTree, { x, y });

        // Clear query state
        queryPoint = null;
        Results = [];
    }

    draw();
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  dragging = true;
});

canvas.addEventListener('mouseup', () => {
  if (dragStart && dragEnd) {
    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minY = Math.min(dragStart.y, dragEnd.y);
    const maxY = Math.max(dragStart.y, dragEnd.y);
    selectionBox = { minX, maxX, minY, maxY };
  }

  dragging = false;
  dragStart = null;
  dragEnd = null;

  draw(); // redraw with persistent box
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (dragging) {
    dragEnd = { x: mouseX, y: mouseY };

    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minY = Math.min(dragStart.y, dragEnd.y);
    const maxY = Math.max(dragStart.y, dragEnd.y);

    const rangeRect = { minX, minY, maxX, maxY };

    runAnimatedRangeQuery(rangeRect);
  }
});

draw();

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});


//STRUCTURE PART
function drawKDTreeStructure(ctx, node, x, y, dx, dy, depth = 0, highlightPoints = []) {
    if (!node) return;

    const isVisited = visitedNodes.some(p =>
  Math.abs(p.x - node.point.x) < 1e-6 &&
  Math.abs(p.y - node.point.y) < 1e-6
);

const isFound = highlightPoints.some(p =>
  Math.abs(p.x - node.point.x) < 1e-6 &&
  Math.abs(p.y - node.point.y) < 1e-6
);

let color = isFound
  ? "blue"
  : isVisited
  ? "orange"
  : (depth % 2 === 0 ? "green" : "red");

    // Draw current node
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'black';
    ctx.font = "15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(depth % 2 === 0 ? "Y" : "X", x, y + 6);

    // Draw children
    if (node.left) {
        ctx.beginPath();
        ctx.moveTo(x, y + 11);
        ctx.lineTo(x - dx, y + dy);
        ctx.stroke();
        drawKDTreeStructure(ctx, node.left, x - dx, y + dy, dx / 2, dy, depth + 1, highlightPoints);
    }

    if (node.right) {
        ctx.beginPath();
        ctx.moveTo(x, y + 11);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        drawKDTreeStructure(ctx, node.right, x + dx, y + dy, dx / 2, dy, depth + 1, highlightPoints);
    }
}