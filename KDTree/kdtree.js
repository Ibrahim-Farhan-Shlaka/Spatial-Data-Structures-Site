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

let queryMode = false;
let queryPoint = null;
let queryResults = [];

let insertedPoints = [];

document.getElementById('query-btn').addEventListener('click', () => {
    queryMode = true;
    queryPoint = null;
    queryResults = [];
});

//creating 10 random points to fill the tree with, will let user choose how many later
points = Array(10).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height
}));

//function to add a point
function addPoints(points){
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    points.push({ x, y });
    insertedPoints.push({ x, y });
}

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

    // Draw X axis (horizontal line in middle)
    ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;  // Red for X axis
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // keep dotted for axis too
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw Y axis (vertical line in middle)
    ctx.strokeStyle = `rgba(0, 128, 0, ${opacity})`;  // Green for Y axis
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.setLineDash([]); // reset line dash after done
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
    // Hue: 0 = red, 240 = blue
    const hue = (1 - depth / (insertedPoints.length - 1)) * 270;
    const color = `hsl(${hue}, 100%, 50%)`;

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

function findKNearest(node, target, k, depth = 0, heap = []) {
    if (!node) return [];

    const axis = depth % 2 === 0 ? 'x' : 'y';
    const dist = distance(target, node.point);

    if (heap.length < k) {
        heap.push({ point: node.point, dist });
        heap.sort((a, b) => b.dist - a.dist); // max heap by distance
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

function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridAndAxes();
    drawKDTree(kdTree);
    if (queryPoint) {
    // draw query point
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(queryPoint.x, queryPoint.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // draw dotted lines to result points
    ctx.strokeStyle = 'rgba(255,0,0,0.6)';
    ctx.setLineDash([5, 5]);
    queryResults.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(queryPoint.x, queryPoint.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // highlight result points
    ctx.fillStyle = 'blue';
    queryResults.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
    }
    treeCtx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
    drawKDTreeStructure(treeCtx, kdTree, treeCanvas.width / 2, 40, 150, 60);
}

//listener for reset button
document.getElementById('reset').addEventListener('click', () => {
    points = [];
    kdTree = null;
    draw();
});

//listener for random points button, rebuilds tree with new random points
document.getElementById('random-points').addEventListener('click', () => {
    points = Array(10).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height
    }));
    kdTree = kdTreeConstruction(points);
    draw();
});

document.getElementById('add-multiple').addEventListener('click', () => {
    for(let i = 0; i < 20; i++)
        points.unshift({x: Math.random() * canvas.width, y: Math.random() * canvas.height});
    kdTree = kdTreeConstruction(points);
    draw();
});

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (queryMode) {
        queryPoint = { x, y };
        queryResults = findKNearest(kdTree, queryPoint, 5); 
        queryMode = false;
    } else {
    points.unshift({ x, y }); // if you want to keep the array updated
    kdTree = insertKDNode(kdTree, { x, y });

    insertedPoints.push({x,y});

    }

    draw(); // redraw everything
});

draw();

//#################################################################
//STRUCTURE PART

function drawKDTreeStructure(ctx, node, x, y, dx, dy, depth = 0) {
    if (!node) return;

    // Draw current node
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = depth % 2 === 0 ? "green" : "red";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'black';
    ctx.font = "15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(depth % 2 === 0 ? "Y" : "X", x, y + 6);

    //ctx.fillStyle = 'black';
    //ctx.font = "15px sans-serif";
    //ctx.textAlign = "center";
    //ctx.fillText(`[${(x).toFixed(0)}, ${(y).toFixed(0)}]`, x + 50, y);

    // Draw lines and recurse
    if (node.left) {
        ctx.beginPath();
        ctx.moveTo(x, y + 11);
        ctx.lineTo(x - dx, y + dy);
        ctx.stroke();
        drawKDTreeStructure(ctx, node.left, x - dx, y + dy, dx / 2, dy, depth + 1);
    }

    if (node.right) {
        ctx.beginPath();
        ctx.moveTo(x, y + 11);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        drawKDTreeStructure(ctx, node.right, x + dx, y + dy, dx / 2, dy, depth + 1);
    }
}