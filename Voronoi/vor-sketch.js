{
    // canvas setup
    const width = 825, height = 825;
    const svg = d3.select("#voronoi_visual")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // creating a points array using d3 library
    let points = d3.range(1000).map(() => [randomGaussian(width/2, width/6),
                                           randomGaussian(height/2, height/6)]);

    function setup() {
        svg.selectAll("*").remove();

        // compute Delaunay and Voronoi diagram
        const delaunay = d3.Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        const cellGroup = svg.append("g")
            .attr("class", "cells");

        //const color = d3.scaleOrdinal(d3.schemeCategory10);
        const color = d3.scaleLinear()
            .domain([0, height])
            .range(["rgb(255, 2, 57)", "rgb(22, 110, 226)"]); // blue to pink (you can change this)

        // draw Voronoi cells
        cellGroup.selectAll("path")
            .data(points)
            .join("path")
            .attr("d", (_, i) => voronoi.renderCell(i))
            .attr("fill", (_, i) => color(points[i][1]))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .on("mouseover", function () {
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

        // draw points
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

    // reset and randomize functions
    function emptyTree() {
        points = [];
        setup();
    }

    function randomGaussian(mean, sd) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // avoid zero
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return num * sd + mean;
    }

    function randomTree() {
        points = d3.range(1000).map(() => [randomGaussian(width/2, width/6),
                                          randomGaussian(height/2, height/6)]);
        setup();
    }

    // add 20 random points
    function addMultiplePoints() {
        const newPoints = d3.range(100).map(() => [
            randomGaussian(width/2, width/6),
            randomGaussian(height/2, height/6)
        ]);
        points.push(...newPoints);
        setup();
    }

    function distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
        }

    function kNearest(q, k) {
    return points
        .map(p => ({ p, d: distance(p, q) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, k)
        .map(obj => obj.p);
    }

    svg.on("click", function (event) {
        const [x, y] = d3.pointer(event);
        const newPoint = [x, y];
        points.push(newPoint);

        // Redraw Voronoi
        setup();

        // Get the index of the new point and its cell path
        const i = points.length - 1;
        const delaunay = d3.Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        const cellPath = voronoi.renderCell(i);

        // Animate expanding circle clipped to the cell shape
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

        // Animate the radius
        circle.transition()
            .duration(8000)
            .ease(d3.easeCubicOut)
            .attr("r", 1000) // enough to cover even large cells
            .on("end", () => {
                circle.remove();
                svg.select(`#${clipId}`).remove(); // clean up clipPath
            });
    });

    // draw initial Voronoi
    setup();

    // button event listeners
    document.getElementById("reset").addEventListener("click", emptyTree);
    document.getElementById("random-points").addEventListener("click", randomTree);
    document.getElementById("add-multiple").addEventListener("click", addMultiplePoints);
    document.getElementById("query-btn").addEventListener("click", kNearest);
}
