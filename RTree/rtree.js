//canvas setup
const container = document.getElementById('rtree_visual');
const canvas = document.createElement('canvas');
canvas.width = 750;
canvas.height = 750;
canvas.style.border = '1px solid #ccc';
container.appendChild(canvas);
const ctx = canvas.getContext('2d');

let queryMode = false;
const k = 5; // change as needed
document.getElementById("query-btn").addEventListener("click", () => {
    queryMode = true;
});

//create rectangles similar to points inide other trees, each rectangle has a different size and shape and position
//w = width, h = height, x = x coordinate, y = y coordinate
function createRect() {
    const w = 20 + Math.random() * 40;
    const h = 20 + Math.random() * 40;
    const x = Math.random() * (canvas.width - w);
    const y = Math.random() * (canvas.height - h);
    return { x, y, w, h };
}

//fuction that computes minimum bounding box
function computeMBB(children) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const c of children) {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x + c.w);
        maxY = Math.max(maxY, c.y + c.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

//information of a node in the rtree
class RTreeNode {

    constructor(level = 0) {
        this.children = [];
        this.leaf = level === 0;
        this.level = level;
        this.mbr = null;
    }

    insert(entry) {
        this.children.push(entry);
        this.mbr = computeMBB(this.children);
    }
}


function buildRTree(rects, maxEntries = 4) {
    // Step 1: create leaf nodes
    let nodes = [];
    for (let i = 0; i < rects.length; i += maxEntries) {
        const leaf = new RTreeNode(0);
        for (const r of rects.slice(i, i + maxEntries)) {
            leaf.insert(r);
        }
        nodes.push({ ...leaf.mbr, child: leaf });
    }

    let level = 1;

    // Step 2: group nodes into higher levels until one root remains
    while (nodes.length > maxEntries) {
        const grouped = [];
        for (let i = 0; i < nodes.length; i += maxEntries) {
            const group = nodes.slice(i, i + maxEntries);
            const node = new RTreeNode(level);
            for (const entry of group) {
                node.insert(entry);
            }
            grouped.push({ ...node.mbr, child: node });
        }
        nodes = grouped;
        level++;
    }

    // Final root node
    const root = new RTreeNode(level);
    for (const entry of nodes) {
        root.insert(entry);
    }
    return root;
}


//draws the bounding rectangles that surround the rectangles inside the tree
function drawRectangle(rect, color = 'white', fill = false, label = '') {

    //line stroke setup
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    //if fill is true it draws the rectangle
    if (fill) {
        ctx.fillStyle = color;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
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

//fucntion for drawing the rtree along with all its children recursively
function drawRtree(node, depth = 0, color = 'green') {

    if (node.children) {
        for (const child of node.children) { //go through all children of a node
            if (child.child) {
                drawRectangle(child, 'white', false);
                drawRtree(child.child, depth + 1);
            } else {
                drawRectangle(child, 'rgba(213, 34, 73, 0.78)', true); //drawing the rectangle in red
            }
        }
    }

}

function drawWrapper(node, depth = 0, color = 'green'){
    drawGridAndAxes();
    drawRtree(node, depth, color);
}

function knnRTreeSearch(node, queryPoint, k, nearest = []) {
    // Distance from point to center of a rectangle
    function rectDistance(rect) {
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        return Math.hypot(cx - queryPoint.x, cy - queryPoint.y);
    }

    // Distance from point to rectangle (MBR)
    function mbrDistance(mbr) {
        const dx = Math.max(mbr.x - queryPoint.x, 0, queryPoint.x - (mbr.x + mbr.w));
        const dy = Math.max(mbr.y - queryPoint.y, 0, queryPoint.y - (mbr.y + mbr.h));
        return Math.hypot(dx, dy);
    }

    if (node.leaf) {
        for (const rect of node.children) {
            const dist = rectDistance(rect);
            nearest.push({ rect, dist });
        }
    } else {
        const sortedChildren = node.children
            .map(c => ({ child: c.child, mbr: c, dist: mbrDistance(c) }))
            .sort((a, b) => a.dist - b.dist);

        for (const { child } of sortedChildren) {
            knnRTreeSearch(child, queryPoint, k, nearest);
        }
    }

    // Keep only top k by distance
    nearest.sort((a, b) => a.dist - b.dist);
    if (nearest.length > k) nearest.length = k;
    return nearest;
}

//listener for reset button
document.getElementById('reset').addEventListener('click', () => {
    rectangles = [];
    rtree = buildRTree(rectangles);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRtree(rtree);
});

//listener for random points button, rebuilds tree with new random points
document.getElementById('random-points').addEventListener('click', () => {
    rectangles = Array(25).fill().map(createRect);
    rtree = buildRTree(rectangles);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWrapper(rtree);
});

//intialisation
let rectangles = Array(25).fill().map(createRect);
let rtree = buildRTree(rectangles);
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawWrapper(rtree);

const treeContainer = document.getElementById('rtree-canvas');
const treeCanvas = document.createElement('canvas');
treeCanvas.width = 750;
treeCanvas.height = 750;
treeCanvas.style.border = '1px solid #ccc';
treeContainer.appendChild(treeCanvas);
const treeCtx = treeCanvas.getContext('2d');

function drawTreeStructure(node) {
    treeCtx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);

    const nodeRadius = 14;
    const verticalSpacing = 80;
    const horizontalSpacing = 60;

    // Assign positions to each node based on tree layout
    let levels = [];

    function traverse(n, depth = 0) {
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(n);
        if (!n.leaf) {
            for (const child of n.children) {
                if (child.child) traverse(child.child, depth + 1);
            }
        }
    }

    traverse(node);

    let positions = new Map();

    // Assign positions to nodes
    levels.forEach((levelNodes, depth) => {
        const y = verticalSpacing + depth * verticalSpacing;
        const totalWidth = (levelNodes.length - 1) * horizontalSpacing;
        levelNodes.forEach((n, i) => {
            const x = (treeCanvas.width - totalWidth) / 2 + i * horizontalSpacing;
            positions.set(n, { x, y });
        });
    });

    // Draw connections
    for (const [n, pos] of positions.entries()) {
        if (!n.leaf) {
            for (const child of n.children) {
                const childNode = child.child;
                if (childNode && positions.has(childNode)) {
                    const childPos = positions.get(childNode);
                    treeCtx.beginPath();
                    treeCtx.moveTo(pos.x, pos.y);
                    treeCtx.lineTo(childPos.x, childPos.y);
                    treeCtx.strokeStyle = '#888';
                    treeCtx.stroke();
                }
            }
        }
    }

    // Draw nodes
    for (const [n, pos] of positions.entries()) {
        treeCtx.beginPath();
        treeCtx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
        treeCtx.fillStyle = n.leaf ? '#d52249' : '#4682b4';
        treeCtx.fill();
        treeCtx.strokeStyle = 'black';
        treeCtx.stroke();

        // Add level text or child count
        treeCtx.fillStyle = 'white';
        treeCtx.font = '10px sans-serif';
        treeCtx.textAlign = 'center';
        treeCtx.fillText(n.children.length, pos.x, pos.y + 3);
    }
}

drawTreeStructure(rtree);

// Optional: Hook it into your random and reset button logic
document.getElementById('random-points').addEventListener('click', () => {
    rectangles = Array(25).fill().map(createRect);
    rtree = buildRTree(rectangles);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWrapper(rtree);
    drawTreeStructure(rtree);
});

document.getElementById('reset').addEventListener('click', () => {
    rectangles = [];
    rtree = buildRTree(rectangles);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWrapper(rtree);
    drawTreeStructure(rtree);
});

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (queryMode) {
        const queryPoint = { x, y };
        const neighbors = knnRTreeSearch(rtree, queryPoint, k);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWrapper(rtree);

        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(queryPoint.x, queryPoint.y, 6, 0, Math.PI * 2);
        ctx.fill();

        neighbors.forEach(({ rect }) => {
            drawRectangle(rect, 'yellow', true);
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(queryPoint.x, queryPoint.y);
            ctx.lineTo(rect.x + rect.w / 2, rect.y + rect.h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        queryMode = false;
    } else {
        const w = 20 + Math.random() * 40;
        const h = 20 + Math.random() * 40;
        const newRect = {
            x: Math.min(x, canvas.width - w),
            y: Math.min(y, canvas.height - h),
            w,
            h
        };
        rectangles.unshift(newRect);
        rtree = buildRTree(rectangles);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWrapper(rtree);
        drawTreeStructure(rtree);
    }
});

document.getElementById('add-multiple').addEventListener('click', () => {
    const temp = Array(25).fill().map(createRect);
    rectangles.push(...temp); // Add to existing array
    rtree = buildRTree(rectangles);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWrapper(rtree);
    drawTreeStructure(rtree);
});