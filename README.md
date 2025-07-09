# Spatial-Data-Structures-Site
The growing demand for spatial computing in systems such as GPS and game engines has increased the use of spatial data structures and as such the need for effective
educational tools that teach spatial data structures. While these
structures (KD-Trees, R-Trees, Quadtrees, etc.) are important
to modern systems, their mathematical and abstract nature
creates significant learning barriers. We present an interactive
web-based application that combines visual animation and
real-time structure manipulation to simplify spatial data organization for users to learn. Our tool implements six key
structures with dynamic partitioning visualizations and query
operation overlays to teach learners across many skill levels.

## Site demo release = https://spatialdatastructures.netlify.app/

# Algorithms :
1. **KD-Tree** = binary space-partitioning tree that recursively splits data along different alternating dimensions
2. **R-Tree** = R-trees organize spatial data using bounding rectangles, and are widely used for spatial access methods.
3. **Quadtree** = : Quad-trees recursively divide a 2D space into four quadrants or regions. Each region of a quadtree is like a bucket with a threshold; once a region exceeds that threshold (in terms of point count), it splits into four smaller regions
4. **Grid file** = Dynamic Grid Files divide space into a grid of cells, each pointing to a bucket of records (points that contain information).
5. **Voronoi Diagrams** = : Voronoi diagrams partition space based on the closest distance to a set of given points.
6. **Space Filling Curves** = Space-Filling Curves, like the Z-curve (or Morton order), map multi-dimensional data to one dimension while preserving spatial locality to some extent

# Used languages and libraries :
1. **Html** = Site structure.
2. **Css** = Site styling.
3. **javascript** = for all backend processes, including all the algorithms
   1. D3.js = for some of the visualisation.
   2. P5.js = for some of the visualisation.

# IMPORTANT :
- Some browsers seem to have issues running the voronoi and space filling curve algorithms, if youre facing any such issues please try a different browser.
# Thank you :)
