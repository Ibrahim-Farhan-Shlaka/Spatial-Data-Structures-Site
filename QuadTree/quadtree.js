class Point{
    constructor(x,y){
        this.x = x;
        this.y = y;}}

class Rectangle {
    constructor(x,y,w,h){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h; }

    //checks if a certain point is within boundaries    
    contains(point){
        return(point.x >= this.x - this.w &&
            point.x <= this.x + this.w &&
            point.y >= this.y - this.h &&
            point.y <= this.y +this.h);}

    //finds out if the given range intersects or not
    intersects(range){
        return !(range.x - range.w > this.x + this.w ||
            range.x + range.w < this.x - this.w ||
            range.y - range.h > this.y + this.h ||
            range.y + range.h < this.y - this.h );
    }
}

class quadTree {
    constructor(boundary, n){
        this.boundary = boundary;
        this.capacity = n;
        this.points = [];
        this.divided = false;
    }

    //function to divide a quad into 4 pieces
    subdivide(){
        let x = this.boundary.x;
        let y = this.boundary.y;
        let w = this.boundary.w;
        let h = this.boundary.h;

        let ne = new Rectangle(x + w/2, y - h/2, w/2, h/2);
        let nw = new Rectangle(x - w/2, y - h/2, w/2, h/2);
        let se = new Rectangle(x + w/2, y + h/2, w/2, h/2);
        let sw = new Rectangle(x - w/2, y + h/2, w/2, h/2);
        
        this.northwest = new quadTree(nw, this.capacity);
        this.northeast = new quadTree(ne, this.capacity);
        this.southwest = new quadTree(sw, this.capacity);
        this.southeast = new quadTree(se, this.capacity);

        this.divided = true;
    }

    merge(){
        
    }

    insert(point){

        //if point is not in boundary, leave
        if (!this.boundary.contains(point)){
            return false;
        }

        //if point causes overflow, subdivide
        if(this.points.length < this.capacity){
            this.points.push(point);
            return true;
        } else {//if its not divided then you can divide it
            if(!this.divided){ 
            this.subdivide();
            }
            if(this.northeast.insert(point)){
                return true;
            }
            else if(this.northwest.insert(point)){
                return true;
            }
            else if(this.southeast.insert(point)){ 
                return true;
            }
            else if(this.southwest.insert(point)){
                return true;
            }
        }
    }

    delete(point){
        //need to make function that merges nearby blocks with current block
        //if minimum capacity is passed
        this.points.pop(point);
    }

    //function to check if dots in a window intersect with it recursively
    query(range, found){
        if(!found){
            found = [];
        }

        //if it intersects then push points into a found array
        if(!this.boundary.intersects(range)){
            //empty array
            return;
        } else {
            for(let p of this.points){
                if(range.contains(p)){
                    found.push(p);
                }
            }

            //if theres more subsections go into them recursively
            if(this.divided){
                this.northwest.query(range, found);
                this.northeast.query(range, found);
                this.southeast.query(range, found);
                this.southwest.query(range, found);
            }
        }
        return found;
    }

    //function to draw the boundaries in the quadtree recursively
    show() {
        stroke(255);
        strokeWeight(1);
        noFill();
        rectMode(CENTER);
        rect(this.boundary.x, this.boundary.y, this.boundary.w*2, this.boundary.h*2);
        if(this.divided){
            this.northwest.show();
            this.northeast.show();
            this.southeast.show();
            this.southwest.show();
        }
        for(let p of this.points){
            strokeWeight(3);
            point(p.x, p.y);
        }
    }
}

let BUCKET_CAPACITY = 3;
let qtree;
let mouseInCanvas = false;
let allPoints = [];
let lastMouseX = 0;
let lastMouseY = 0;
let showWindowRange = false;

let isDragging = false;
let dragStart = null;
let dragEnd = null;
let queriedPoints = [];
let animatingQuery = false;

//class to get height and width of parent element to match the quadtree canvas size to
class Utils {
    static elementWidth(element) {
      return (
        element.clientWidth -
        parseFloat(window.getComputedStyle(element, null).getPropertyValue("padding-left")) -
        parseFloat(window.getComputedStyle(element, null).getPropertyValue("padding-right"))
      );
    }
    static elementHeight(element) {
      return (
        element.clientHeight -
        parseFloat(window.getComputedStyle(element, null).getPropertyValue("padding-top")) -
        parseFloat(window.getComputedStyle(element, null).getPropertyValue("padding-bottom"))
      );
    }
}

function setup() {
    // Create p5 canvas inside #quadtree_visual div
    const p5Div = document.getElementById("quadtree_visual");
    const p5Canvas = createCanvas(Utils.elementWidth(p5Div), Utils.elementHeight(p5Div));
    p5Canvas.parent(p5Div);

    let rectX = Utils.elementWidth(p5Div) / 2;
    let rectY = Utils.elementHeight(p5Div) / 2;
    let boundary = new Rectangle(rectX, rectY, rectX, rectY);
    qtree = new quadTree(boundary, BUCKET_CAPACITY);

    //Insert points
    for (let i = 0; i < 100; i++) {
        let x = randomGaussian(rectX, rectX / 3);
        let y = randomGaussian(rectY, rectY / 3);
        let p = new Point(x,y);
        qtree.insert(p);
        allPoints.push(p);
    }

    //Mouse tracking on canvas
    const canvas = document.querySelector("#quadtree_visual canvas");

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // left click
            isDragging = true;
            dragStart = { x: e.offsetX, y: e.offsetY };
            dragEnd = { x: e.offsetX, y: e.offsetY };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            dragEnd = { x: e.offsetX, y: e.offsetY };
        }
    });

    canvas.addEventListener('mouseup', async (e) => {
        if (isDragging) {
            isDragging = false;

            const x = (dragStart.x + dragEnd.x) / 2;
            const y = (dragStart.y + dragEnd.y) / 2;
            const w = Math.abs(dragEnd.x - dragStart.x) / 2;
            const h = Math.abs(dragEnd.y - dragStart.y) / 2;
            const range = new Rectangle(x, y, w, h);

            animatingQuery = true;
            queriedPoints = [];
            await animateQuery(qtree, range);
            animatingQuery = false;
        }
    });
}

function deleteNearestPoint(x, y, threshold = 50) {
    let closestIndex = -1;
    let closestDist = Infinity;

    for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];
        const d = dist(p.x, p.y, x, y);
        if (d < closestDist && d < threshold) {
            closestDist = d;
            closestIndex = i;
        }
    }

    if (closestIndex !== -1) {
        allPoints.splice(closestIndex, 1);
        rebuildQuadtree();
    }
}

function rebuildQuadtree() {
    const p5Div = document.getElementById("quadtree_visual");
    const rectX = Utils.elementWidth(p5Div) / 2;
    const rectY = Utils.elementHeight(p5Div) / 2;
    const boundary = new Rectangle(rectX, rectY, rectX, rectY);
    qtree = new quadTree(boundary, BUCKET_CAPACITY);

    for (const p of allPoints) {
        qtree.insert(p);
    }
}

//function to draw the quadtree
function draw() {
    background(0);
    qtree.show();

    if (mouseIsPressed && mouseButton === LEFT) {
        if (!allPoints.some(p => dist(p.x, p.y, mouseX, mouseY) < 2)) {
            let p = new Point(mouseX, mouseY);
            qtree.insert(p);
            allPoints.push(p);
        }
    }

    if (isDragging && dragStart && dragEnd) {
        stroke(255, 0, 85);
        rectMode(CORNERS);
        rect(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
    }

    if (queriedPoints.length > 0) {
        for (let p of queriedPoints) {
            stroke(0, 255, 0);
            strokeWeight(5);
            point(p.x, p.y);
        }
    }

    drawQuadTreeStructure(qtree, "quadtree-canvas", queriedPoints);
}

//function to clear the quadtree using a button
function newTree(){
   allPoints = []; // clear all stored points
   //Clear the current Quadtree
   let p5Div = document.getElementById("quadtree_visual");
   let rectX = Utils.elementWidth(p5Div)/2;
   let rectY = Utils.elementHeight(p5Div)/2;
   let boundary = new Rectangle(rectX, rectY, rectX, rectY);
   
   //Create a new empty Quadtree
   qtree = new quadTree(boundary, BUCKET_CAPACITY);
   
   //Redraw the canvas
   redraw();
}

//fucntion to rerun the tree point generation
function randomTree(){
   allPoints = []; // clear all stored points 
   //Clear the current Quadtree
   let p5Div = document.getElementById("quadtree_visual");
   let rectX = Utils.elementWidth(p5Div)/2;
   let rectY = Utils.elementHeight(p5Div)/2;
   let boundary = new Rectangle(rectX, rectY, rectX, rectY);
   
   //Create a new empty Quadtree
   qtree = new quadTree(boundary, BUCKET_CAPACITY);
   
   //add some initial random points
   for (let i = 0; i < 600; i++) {
     let x = randomGaussian(rectX, rectX/3);
     let y = randomGaussian(rectY, rectY/3);
     let p = new Point(x, y);
     qtree.insert(p);
     allPoints.push(p);
   }
   redraw();
}

document.getElementById('cellSize').addEventListener('input', (e) => {
  if(  parseInt(e.target.value) < 2) return;
  BUCKET_CAPACITY = parseInt(e.target.value);
  
  allPoints = []; // clear all stored points 
   //Clear the current Quadtree
   let p5Div = document.getElementById("quadtree_visual");
   let rectX = Utils.elementWidth(p5Div)/2;
   let rectY = Utils.elementHeight(p5Div)/2;
   let boundary = new Rectangle(rectX, rectY, rectX, rectY);
   
   //Create a new empty Quadtree
   qtree = new quadTree(boundary, BUCKET_CAPACITY);
   
   //add some initial random points
   for (let i = 0; i < 600; i++) {
     let x = randomGaussian(rectX, rectX/3);
     let y = randomGaussian(rectY, rectY/3);
     let p = new Point(x, y);
     qtree.insert(p);
     allPoints.push(p);
   }
   redraw();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateQuery(node, range) {
    if (!node.boundary.intersects(range)) return;

    // Highlight current node
    stroke(255, 255, 0);
    strokeWeight(2);
    noFill();
    rectMode(CENTER);
    rect(node.boundary.x, node.boundary.y, node.boundary.w * 2, node.boundary.h * 2);
    await sleep(300);

    for (let p of node.points) {
        if (range.contains(p)) {
            queriedPoints.push(p);
        }
    }

    if (node.divided) {
        await animateQuery(node.northwest, range);
        await animateQuery(node.northeast, range);
        await animateQuery(node.southwest, range);
        await animateQuery(node.southeast, range);
    }
}


//function to draw the quadtree tree visualisation
function drawQuadTreeStructure(qtree, canvasId, highlightPoints = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !qtree) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodeRadius = 14;
    const verticalSpacing = 70;
    const minHorizontalSpacing = 20;
    const highlightedSet = new Set(highlightPoints.map(p => `${p.x},${p.y}`));

    // Calculate subtree width recursively
    function getSubtreeWidth(node) {
        if (!node.divided) return nodeRadius * 2;
        const children = [node.northwest, node.northeast, node.southwest, node.southeast];
        let width = 0;
        for (let child of children) {
            width += getSubtreeWidth(child) + minHorizontalSpacing;
        }
        return width - minHorizontalSpacing;
    }

    // Draw the node and recurse
    function drawNode(node, x, y) {
        // Highlight node if it contains a highlighted point
        const containsHighlight = node.points.some(p => highlightedSet.has(`${p.x},${p.y}`));
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = containsHighlight ? "#33cc33" : "#ffffff"; // green if highlight, white otherwise
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.stroke();

        // Draw point count label
        ctx.fillStyle = "#000";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.points.length, x, y + 4);

        if (node.divided) {
            const children = [node.northwest, node.northeast, node.southwest, node.southeast];
            const widths = children.map(getSubtreeWidth);
            const totalWidth = widths.reduce((sum, w) => sum + w, 0) + minHorizontalSpacing * (children.length - 1);

            let currentX = x - totalWidth / 2;

            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const w = widths[i];
                const childX = currentX + w / 2;
                const childY = y + verticalSpacing;

                // Draw connection line
                ctx.beginPath();
                ctx.moveTo(x, y + nodeRadius);
                ctx.lineTo(childX, childY - nodeRadius);
                ctx.stroke();

                drawNode(child, childX, childY);
                currentX += w + minHorizontalSpacing;
            }
        }
    }

    function getTreeHeight(node) {
        if (!node.divided) return 1;
        return 1 + Math.max(
            getTreeHeight(node.northwest),
            getTreeHeight(node.northeast),
            getTreeHeight(node.southwest),
            getTreeHeight(node.southeast)
        );
    }

    // Scale to fit in canvas
    const treeWidth = getSubtreeWidth(qtree);
    const treeHeight = getTreeHeight(qtree) * verticalSpacing + 2 * nodeRadius;
    const scaleX = canvas.width / (treeWidth + 40);
    const scaleY = canvas.height / (treeHeight + 40);
    const scale = Math.min(scaleX, scaleY);

    ctx.save();
    ctx.translate(canvas.width / 2, 40);
    ctx.scale(scale, scale);
    ctx.translate(-treeWidth / 2, 0);

    drawNode(qtree, treeWidth / 2, 0);
    ctx.restore();
}

