const container = document.getElementById('space_visual');
const tooltip = document.getElementById('tooltip');
const canvas = document.createElement('canvas');
canvas.width = 750;
canvas.height = 750;
canvas.style.border = '1px solid #ccc';
container.appendChild(canvas);
const ctx = canvas.getContext("2d");

let size = canvas.width;
let gridSize = 16;
let cellSize = size / gridSize;
let points = [];

function bits(x, y) {
  let z = 0;
  for (let i = 0; i < 16; i++) {
    z |= ((x >> i) & 1) << (2 * i);
    z |= ((y >> i) & 1) << (2 * i + 1);
  }
  return z;
}

function generatePoints() {
  let pts = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const morton = bits(x, y);
      pts.push({ x, y, morton });
    }
  }
  return pts.sort((a, b) => a.morton - b.morton);
}

let hoveredPoint = null;
let selectedPoints = [];
let dragging = false;
let dragStart = null;
let dragEnd = null;

function rangeQuery(minX, minY, maxX, maxY) {
  selectedPoints = points.filter(p =>
    p.x >= minX && p.x <= maxX &&
    p.y >= minY && p.y <= maxY
  );
}

function drawCurve() {
  
  ctx.clearRect(0, 0, size, size);
  drawQuadtreeGrid(4);
  const treeDepth = Math.log2(gridSize);
  renderMortonTree('space_tree', treeDepth);

  // draw curve lines
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const px = points[i].x * cellSize + cellSize / 2;
    const py = points[i].y * cellSize + cellSize / 2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // draw points
  for (const point of points) {
    const px = point.x * cellSize + cellSize / 2;
    const py = point.y * cellSize + cellSize / 2;

    const isHovered = hoveredPoint === point;
    const isSelected = selectedPoints.includes(point);
    const radius = isHovered ? 8 : 4;

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "lime" : "rgba(213, 34, 73)";
    ctx.fill();
  }

  // draw selection rectangle
  if (dragging && dragStart && dragEnd) {
    const x = Math.min(dragStart.x, dragEnd.x);
    const y = Math.min(dragStart.y, dragEnd.y);
    const w = Math.abs(dragEnd.x - dragStart.x);
    const h = Math.abs(dragEnd.y - dragStart.y);

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
}

//mouse move
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  hoveredPoint = null;

  if (dragging) {
    dragEnd = { x: mouseX, y: mouseY };

    //convert to cell coords
    const minX = Math.floor(Math.min(dragStart.x, dragEnd.x) / cellSize);
    const minY = Math.floor(Math.min(dragStart.y, dragEnd.y) / cellSize);
    const maxX = Math.floor(Math.max(dragStart.x, dragEnd.x) / cellSize);
    const maxY = Math.floor(Math.max(dragStart.y, dragEnd.y) / cellSize);

    rangeQuery(minX, minY, maxX, maxY);
    drawCurve();
    return;
  }

  for (const point of points) {
    const px = point.x * cellSize + cellSize / 2;
    const py = point.y * cellSize + cellSize / 2;
    const dx = mouseX - px;
    const dy = mouseY - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) {
      hoveredPoint = point;
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
      tooltip.innerHTML = `(${point.x}, ${point.y})<br>Morton: ${point.morton}`;
      tooltip.style.display = 'block';
      break;
    }
  }

  if (!hoveredPoint) {
    tooltip.style.display = 'none';
  }

  drawCurve();
});

canvas.addEventListener('mouseleave', () => {
  hoveredPoint = null;
  tooltip.style.display = 'none';
  drawCurve();
});

//mouse down
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  dragStart = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  dragEnd = null;
  dragging = true;
});

//mouse up
canvas.addEventListener('mouseup', (e) => {
  dragging = false;
  dragStart = null;
  dragEnd = null;
  drawCurve();
});

//listener for cell size
document.getElementById('cellSize').addEventListener('input', (e) => {
  if(parseInt(e.target.value) < 9){
  gridSize = Math.pow(2, parseInt(e.target.value));
  cellSize = size / gridSize;
  points = generatePoints();
  selectedPoints = [];
  drawCurve();}
});

function drawQuadtreeGrid(depth = 4, x = 0, y = 0, w = size, h = size, level = 0) {

  if (level >= depth){
    return;
  } 

  const halfW = w / 2;
  const halfH = h / 2;

  //draw subdivision lines
  ctx.strokeStyle = `rgba(0, 255, 0, ${1 - level / (depth*0.9)})`;
  ctx.lineWidth = 0.5;
  
  //vertical and horizontal midlines
  ctx.beginPath();
  ctx.moveTo(x + halfW, y);
  ctx.lineTo(x + halfW, y + h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + halfH);
  ctx.lineTo(x + w, y + halfH);
  ctx.stroke();

  //recursively draw for 4 quadrants
  drawQuadtreeGrid(depth, x, y, halfW, halfH, level + 1);                 //topleft
  drawQuadtreeGrid(depth, x + halfW, y, halfW, halfH, level + 1);         //topright
  drawQuadtreeGrid(depth, x, y + halfH, halfW, halfH, level + 1);         //bottomleft
  drawQuadtreeGrid(depth, x + halfW, y + halfH, halfW, halfH, level + 1); //bottomright
}

//conmstructin the tree
function buildMortonTree(maxDepth = 4) {
  function recurse(prefix, depth) {
    const node = {
      name: prefix || 'root'
    };

    if (depth < maxDepth) {
      node.children = [];
      for (let i = 0; i < 4; i++) {
        const childPrefix = prefix + i.toString(2).padStart(2, '0');
        node.children.push(recurse(childPrefix, depth + 1));
      }
    }

    return node;
  }

  return recurse('', 0);
}

//function to draw tree visualisation
function renderMortonTree(containerId, depth = 4) {

  const data = buildMortonTree(depth);
  const width = 750;
  const height = 750;

  const root = d3.hierarchy(data);

  //create a tree layout with fixed size
  const treeLayout = d3.tree().size([width, height - 100]);
  treeLayout(root);
  d3.select(`#${containerId}`).selectAll("*").remove();
  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#111");

  const g = svg.append("g");

  //edges
  g.selectAll("line")
    .data(root.links())
    .enter()
    .append("line")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.5);

  //nodes
  g.selectAll("circle")
    .data(root.descendants())
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("fill", d => d.children ? "#0ff" : "#ff0");

  //labels
  g.selectAll("text")
    .data(root.descendants())
    .enter()
    .append("text")
    .attr("x", d => d.x + 6)
    .attr("y", d => d.y + 4)
    .attr("fill", "#fff")
    .attr("font-size", "10px")
    .text(d => d.data.name);
}

points = generatePoints();
drawCurve();