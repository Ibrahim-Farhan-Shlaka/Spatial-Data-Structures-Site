    //canvas setup
    const width = 825, height = 825;
    const svg = d3.select("#voronoi_visual")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    //creating a points array using d3 library
    let points = d3.range(1000).map(() => [randomGaussian(width/2, width/6),randomGaussian(height/2, height/6)]);

    function setup() {
        svg.selectAll("*").remove();

        //compute Delaunay and Voronoi diagram
        const delaunay = d3.Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        const cellGroup = svg.append("g")
            .attr("class", "cells");

        const color = d3.scaleLinear()
            .domain([0, height])
            .range(["rgb(255, 2, 57)", "rgb(22, 110, 226)"]); //colors

        //draw Voronoi cells
        cellGroup.selectAll("path")
            .data(points)
            .join("path")
            .attr("d", (_, i) => voronoi.renderCell(i))
            .attr("fill", (_, i) => color(points[i][1]))
            .attr("stroke", "black") //og line color
            .attr("stroke-width", 1)
            .on("mouseover", function () { //hovered line color
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "white")
                    .attr("stroke-width", 3);
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1);
            });

        //draw points
        svg.append("g")
            .selectAll("circle")
            .data(points)
            .join("circle")
            .attr("cx", d => d[0])
            .attr("cy", d => d[1])
            .attr("r", 3)
            .attr("fill", "rgba(0,0,0)")
            .call(d3.drag()
                .on("drag", function (event, d) {
                    d[0] = Math.max(0, Math.min(width, event.x));
                    d[1] = Math.max(0, Math.min(height, event.y));
                    setup();
                }));
    }

    //reset and randomize functions
    function emptyTree() {
        points = [];
        setup();
    }

    function randomGaussian(mean, sd) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); //avoid zero
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return num * sd + mean;
    }

    function randomTree() {
        points = d3.range(1000).map(() => [randomGaussian(width/2, width/6),randomGaussian(height/2, height/6)]);
        setup();
    }

    //add 20 random points using gaussian random
    function addMultiplePoints() {
        const newPoints = d3.range(100).map(() => [randomGaussian(width/2, width/6),randomGaussian(height/2, height/6)]);
        points.push(...newPoints);
        setup();
    }

    function distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
        }

    //havent implemented yet
    function kNearest(q, k) {
        return points
            .map((p, index) => ({ p, index, d: distance(p, q) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, k);
    }

    svg.on("click", function (event) {
    const [x, y] = d3.pointer(event);

    if (event.shiftKey) {
        // Perform k-NN query and highlight
        const k = 5; // adjust as needed
        const neighbors = kNearest([x, y], k);

        // Remove any old highlights
        svg.selectAll(".knn-highlight").remove();

        // Draw highlight circles
        svg.append("g")
            .attr("class", "knn-highlight")
            .selectAll("circle")
            .data(neighbors)
            .join("circle")
            .attr("cx", d => d.p[0])
            .attr("cy", d => d.p[1])
            .attr("r", 7)
            .attr("fill", "none")
            .attr("stroke", "lime")
            .attr("stroke-width", 2)
            .attr("pointer-events", "none");

        svg.append("circle")
            .attr("class", "knn-highlight")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 5)
            .attr("fill", "orange")
            .attr("stroke", "black")
            .attr("stroke-width", 1);

    } else {//add point

        const newPoint = [x, y];
        points.push(newPoint);
        setup();
        const i = points.length - 1;
        const delaunay = d3.Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        const cellPath = voronoi.renderCell(i);
        const clipId = `clip-${Date.now()}`;

        svg.append("clipPath")
            .attr("id", clipId)
            .append("path")
            .attr("d", cellPath);

        const circle = svg.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 0)
            .attr("fill", "rgba(0, 0, 0, 0.46)")
            .attr("clip-path", `url(#${clipId})`);

        circle.transition()
            .duration(8000)
            .ease(d3.easeCubicOut)
            .attr("r", 1000)
            .on("end", () => {
                circle.remove();
                svg.select(`#${clipId}`).remove();
            });
    }
});

    svg.on("contextmenu", function (event) {
        event.preventDefault();
    const [x, y] = d3.pointer(event);

    // Find the index of the closest point to the click
    const delaunay = d3.Delaunay.from(points);
    const i = delaunay.find(x, y);

    if (i !== undefined) {
        points.splice(i, 1); // Remove the clicked cell's point
        setup();             // Recompute diagram
    }
    });

    //draw
    setup();

    //listeners
    document.getElementById("reset").addEventListener("click", emptyTree);
    document.getElementById("random-points").addEventListener("click", randomTree);
    document.getElementById("add-multiple").addEventListener("click", addMultiplePoints);