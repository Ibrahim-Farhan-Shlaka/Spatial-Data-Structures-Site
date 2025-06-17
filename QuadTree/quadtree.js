class Point{
    constructor(x,y){
        this.x = x;
        this.y = y;
    }
}

class Rectangle {
    constructor(x,y,w,h){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    //checks if a certain point is within boundaries    
    contains(point){
        return(point.x >= this.x - this.w &&
            point.x <= this.x + this.w &&
            point.y >= this.y - this.h &&
            point.y <= this.y +this.h);
    }

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

let qtree;
let mouseInCanvas = false;
let lastMouseX = 0;
let lastMouseY = 0;

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
    qtree = new quadTree(boundary, 3);

    // Insert some points
    for (let i = 0; i < 100; i++) {
        let x = randomGaussian(rectX, rectX / 3);
        let y = randomGaussian(rectY, rectY / 3);
        qtree.insert(new Point(x, y));
    }

    // Mouse tracking on p5 canvas
    const canvas = document.querySelector("#quadtree_visual canvas");
    canvas.addEventListener("mouseenter", () => mouseInCanvas = true);
    canvas.addEventListener("mouseleave", () => mouseInCanvas = false);
    canvas.addEventListener("mousemove", (e) => {
        lastMouseX = e.offsetX;
        lastMouseY = e.offsetY;
    });
}

//function to draw the quadtree
function draw() {
    // Clear and draw quadtree spatial visualization (p5)
    background(0);
    qtree.show();

    if (mouseIsPressed) {
        let p = new Point(mouseX, mouseY);
        qtree.insert(p);
    }

    // Draw query rectangle following mouse
    stroke(255, 0, 85);
    rectMode(CENTER);
    let range = new Rectangle(mouseX, mouseY, 100, 100);
    rect(range.x, range.y, range.w * 2, range.h * 2);

     try {
      let points = qtree.query(range);
      if (points && (Array.isArray(points) || points instanceof Set)) {
        for (let p of points) {
          strokeWeight(6);
          point(p.x, p.y);
        }
      }
    } catch (error) {
     console.error("Query failed:", error);
    }
    // Draw quadtree tree structure in second canvas
    drawQuadTreeStructure(qtree, "quadtree-canvas");
}

//function to clear the quadtree using a button
function newTree(){
   //Clear the current Quadtree
   let p5Div = document.getElementById("quadtree_visual");
   let rectX = Utils.elementWidth(p5Div)/2;
   let rectY = Utils.elementHeight(p5Div)/2;
   let boundary = new Rectangle(rectX, rectY, rectX, rectY);
   
   //Create a new empty Quadtree
   qtree = new quadTree(boundary, 15);
   
   //Redraw the canvas
   redraw();
}

//fucntion to rerun the tree point generation
function randomTree(){
   //Clear the current Quadtree
   let p5Div = document.getElementById("quadtree_visual");
   let rectX = Utils.elementWidth(p5Div)/2;
   let rectY = Utils.elementHeight(p5Div)/2;
   let boundary = new Rectangle(rectX, rectY, rectX, rectY);
   
   //Create a new empty Quadtree
   qtree = new quadTree(boundary, 15);
   
   //Optionally add some initial random points
   for (let i = 0; i < 600; i++) {
     let x = randomGaussian(rectX, rectX/3);
     let y = randomGaussian(rectY, rectY/3);
     let p = new Point(x, y);
     qtree.insert(p);
   }
   
   //Redraw the canvas
   redraw();
}


function drawQuadTreeStructure(qtree, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodeRadius = 14;
    const verticalSpacing = 70;
    const minHorizontalSpacing = 20; // minimum gap between siblings

    // Calculate subtree width recursively
    function getSubtreeWidth(node) {
        if (!node.divided) {
            return nodeRadius * 2; // width for leaf node
        }
        const children = [
            node.northwest,
            node.northeast,
            node.southwest,
            node.southeast,
        ];
        // sum of children's subtree widths + minimum spacing between them
        let width = 0;
        for (let child of children) {
            width += getSubtreeWidth(child) + minHorizontalSpacing;
        }
        // Remove last extra spacing
        width -= minHorizontalSpacing;
        return Math.max(width, nodeRadius * 2);
    }

    // Recursive draw function with dynamic positioning
    function drawNode(node, x, y) {
        // Draw node circle
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.stroke();

        if (node.divided) {
            const children = [
                node.northwest,
                node.northeast,
                node.southwest,
                node.southeast,
            ];

            // Total width of all children subtrees + spacing
            let totalWidth = 0;
            let childWidths = children.map(child => getSubtreeWidth(child));
            childWidths.forEach(w => totalWidth += w);
            totalWidth += minHorizontalSpacing * (children.length - 1);

            // Start X position for first child (left edge)
            let currentX = x - totalWidth / 2;

            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                let w = childWidths[i];

                // Center position for this child node's subtree
                let childX = currentX + w / 2;
                let childY = y + verticalSpacing;

                // Draw line from parent to child
                ctx.beginPath();
                ctx.moveTo(x, y + nodeRadius);
                ctx.lineTo(childX, childY - nodeRadius);
                ctx.stroke();

                // Recursive call to draw the child subtree
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

    // Compute total tree dimensions
    const treeWidth = getSubtreeWidth(qtree);
    const treeHeight = getTreeHeight(qtree) * verticalSpacing + 2 * nodeRadius;

    // Compute scaling factor to fit tree within canvas
    const scaleX = canvas.width / (treeWidth + 40);
    const scaleY = canvas.height / (treeHeight + 40);
    const scale = Math.min(scaleX, scaleY);

    // Apply scaling and translation to center the tree
    ctx.save(); // Save context before transforming
    ctx.translate(canvas.width / 2, 40); // move origin
    ctx.scale(scale, scale); // apply scale
    ctx.translate(-treeWidth / 2, 0); // center horizontally

    // Draw the tree using transformed coordinates
    drawNode(qtree, treeWidth / 2, 0);
    ctx.restore(); // Restore original context
}