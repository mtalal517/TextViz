document.addEventListener('DOMContentLoaded', function () {
    const width = 800;
    const height = 500;
    
    // Performance flag - set to true for highest performance (fewer visual effects)
    const highPerformanceMode = true;
    
    // Max number of nodes to display for better performance
    const MAX_NODES = 150;
    
    // Create SVG container for the force-directed graph
    const svg = d3.select("#graph3")
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Create a gradient background only if not in high-performance mode
    const defs = svg.append("defs");
    if (!highPerformanceMode) {
        const gradient = defs.append("linearGradient")
            .attr("id", "graph-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(41, 128, 185, 0.1)");

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(142, 68, 173, 0.1)");

        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "url(#graph-gradient)");
    }

    // Create a group for all graph elements
    const g = svg.append("g");

    // Create tooltip with simpler styling for better performance
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.9)")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none");

    // Define a simpler color palette for better performance
    const genreColors = {
        "action": "#e41a1c",
        "comedy": "#377eb8",
        "drama": "#4daf4a",
        "horror": "#984ea3",
        "romance": "#ff7f00",
        "sci-fi": "#ffff33",
        "thriller": "#a65628",
        "default": "#999999"
    };

    // Variables to store data and elements for linking
    let nodes = [];
    let links = [];
    let nodeElements;
    let linkElements;
    let simulation;
    let zoomBehavior;
    let currentLayout = "force";
    
    // Track if simulation is active to avoid unnecessary rendering
    let simulationActive = true;

    // Set up zoom behavior
    zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
    
    svg.call(zoomBehavior);

    // Load and process data
    d3.json("/FDA").then(function (graph) {
        // Filter data for better performance
        processGraphData(graph);
        
        // Set up force simulation with optimized parameters
        initializeSimulation();
        
        // Add event listeners for graph controls
        document.getElementById('zoom-in-graph').addEventListener('click', zoomIn);
        document.getElementById('zoom-out-graph').addEventListener('click', zoomOut);
        document.getElementById('toggle-layout').addEventListener('click', toggleLayout);
        
        // Listen for context changes
        document.addEventListener('contextChanged', function(e) {
            updateHighlighting(e.detail.context);
        });
        
        // Only run simulation for 3 seconds then stop for better performance
        setTimeout(() => {
            if (simulation) {
                simulation.stop();
                simulationActive = false;
                console.log("Force simulation stopped to improve performance");
            }
        }, 3000);
        
    }).catch(function (error) {
        console.error('Error loading force-directed graph data:', error);
    });

    function processGraphData(graph) {
        // If we have too many nodes, filter to show only the most important ones
        if (graph.nodes.length > MAX_NODES) {
            // Sort nodes by some importance metric (using rating if available)
            const sortedNodes = [...graph.nodes].sort((a, b) => {
                // Prioritize nodes with rating
                if (a.rating && !b.rating) return -1;
                if (!a.rating && b.rating) return 1;
                // If both have ratings, use rating
                if (a.rating && b.rating) return b.rating - a.rating;
                // Otherwise just keep original order
                return 0;
            });
            
            // Take only MAX_NODES
            nodes = sortedNodes.slice(0, MAX_NODES);
            
            // Create a set of node IDs for quick lookup
            const nodeIds = new Set(nodes.map(node => node.id));
            
            // Filter links to only include connections between our filtered nodes
            links = graph.links.filter(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                return nodeIds.has(sourceId) && nodeIds.has(targetId);
            });
            
            console.log(`Filtered graph data from ${graph.nodes.length} to ${nodes.length} nodes for better performance`);
        } else {
            nodes = graph.nodes;
            links = graph.links;
        }
    }

    function initializeSimulation() {
        // Set up force simulation with optimized parameters
        simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-80).distanceMax(200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX(width / 2).strength(0.07))
            .force("y", d3.forceY(height / 2).strength(0.07))
            .alphaDecay(0.05) // Faster cooling for better performance
            .velocityDecay(0.4); // More friction for stability
        
        // Create links with simplified styling
        linkElements = g.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.sqrt(d.weight || 1) || 1);

        // Create nodes with simplified styling
        nodeElements = g.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("class", "node")
            .attr("r", d => getNodeSize(d))
            .attr("fill", d => getNodeColor(d))
            .style("stroke", "#fff")
            .style("stroke-width", 1.5)
            .call(drag(simulation))
            .on("mouseover", nodeMouseOver)
            .on("mouseout", nodeMouseOut)
            .on("click", nodeClick);
            
        // Create simplified legend
        if (!highPerformanceMode) {
            createSimpleLegend();
        }
        
        // Use requestAnimationFrame for more efficient updates
        let rafId;
        simulation.on("tick", () => {
            // Cancel any existing animation frame
            if (rafId) cancelAnimationFrame(rafId);
            
            // Schedule a new animation frame
            rafId = requestAnimationFrame(updatePositions);
        });
    }

    function updatePositions() {
        // Update link positions
        linkElements
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        // Update node positions with boundary constraints
        nodeElements
            .attr("cx", d => d.x = Math.max(5, Math.min(width - 5, d.x)))
            .attr("cy", d => d.y = Math.max(5, Math.min(height - 5, d.y)));
    }
    
    function getNodeSize(d) {
        // Simplified sizing based on rating
        if (d.rating) {
            return 3 + (d.rating / 10) * 5;  // Smaller scale for better performance
        }
        return 5;
    }
    
    function getNodeColor(d) {
        // Simplified coloring
        if (d.genres && d.genres.length > 0) {
            const primaryGenre = d.genres[0].toLowerCase();
            return genreColors[primaryGenre] || genreColors.default;
        }
        return genreColors.default;
    }
    
    function nodeMouseOver(event, d) {
        // Skip fancy effects in high-performance mode
        if (!highPerformanceMode) {
            // Highlight connected nodes only when simulation is not active
            if (!simulationActive) {
                highlightConnections(d);
            }
        }
        
        // Show tooltip with basic information
        tooltip.transition()
            .duration(highPerformanceMode ? 0 : 200)
            .style("opacity", 0.9);
        
        tooltip.html(`<b>${d.id}</b>${d.rating ? `<br>Rating: ${d.rating}` : ''}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }
    
    function nodeMouseOut() {
        // Hide tooltip
        tooltip.transition()
            .duration(highPerformanceMode ? 0 : 500)
            .style("opacity", 0);
        
        // Remove highlights if not in high-performance mode
        if (!highPerformanceMode && !simulationActive) {
            nodeElements.style("opacity", 0.8);
            linkElements.style("opacity", 0.6);
        }
    }
    
    function nodeClick(event, d) {
        // Toggle selection state
        const wasSelected = d3.select(this).classed("selected");
        
        // Clear all selections
        nodeElements.classed("selected", false)
            .attr("r", node => getNodeSize(node));
        
        // If wasn't selected before, select it now
        if (!wasSelected) {
            d3.select(this).classed("selected", true)
                .attr("r", getNodeSize(d) * 1.3);
            
            // Update shared context
            if (visualizationContext) {
                visualizationContext.selectedMovie = d.id;
                visualizationContext.updateVisualizations();
            }
            
            // Show connected nodes
            if (!highPerformanceMode && !simulationActive) {
                highlightConnections(d);
            }
        } else {
            // Clear selection in shared context
            if (visualizationContext) {
                visualizationContext.selectedMovie = null;
                visualizationContext.updateVisualizations();
            }
        }
        
        // Prevent event from propagating
        event.stopPropagation();
    }
    
    function highlightConnections(node) {
        // Find connected nodes and links
        const connectedLinks = links.filter(link => 
            link.source.id === node.id || link.target.id === node.id
        );
        
        const connectedNodeIds = connectedLinks.map(link => 
            link.source.id === node.id ? link.target.id : link.source.id
        );
        
        // Dim all nodes and links
        nodeElements.style("opacity", 0.2);
        linkElements.style("opacity", 0.1);
        
        // Highlight the selected node and its connections
        nodeElements.filter(d => d.id === node.id || connectedNodeIds.includes(d.id))
            .style("opacity", 1);
        
        linkElements.filter(link => link.source.id === node.id || link.target.id === node.id)
            .style("opacity", 1)
            .style("stroke", "#ff5722");
    }
    
    // Simplified drag behavior
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            simulationActive = true;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) {
                simulation.alphaTarget(0);
                // Stop simulation after a short time to improve performance
                setTimeout(() => {
                    simulation.stop();
                    simulationActive = false;
                }, 1000);
            }
            
            // Either pin the node or release it
            if (highPerformanceMode) {
                // Pin nodes for better performance
                // Keep d.fx and d.fy set
            } else {
                // Release nodes in regular mode
                d.fx = null;
                d.fy = null;
            }
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
    
    // Update highlighting based on the current context
    function updateHighlighting(context) {
        if (!nodeElements || !linkElements) return;
        
        // Reset all highlights first
        nodeElements.classed("highlight", false)
            .style("opacity", 0.8)
            .attr("r", d => getNodeSize(d));
        
        linkElements.classed("highlight", false)
            .style("opacity", 0.6)
            .style("stroke", "#999")
            .style("stroke-width", d => Math.sqrt(d.weight || 1) || 1);
        
        // Apply new highlights based on context
        if (context.selectedMovie) {
            // Highlight the selected movie node
            nodeElements.filter(d => d.id === context.selectedMovie)
                .classed("highlight", true)
                .style("opacity", 1)
                .attr("r", d => getNodeSize(d) * 1.3);
            
            // Skip highlight connections in high-performance mode
            if (!highPerformanceMode && !simulationActive) {
                const selectedNode = nodes.find(d => d.id === context.selectedMovie);
                if (selectedNode) {
                    highlightConnections(selectedNode);
                }
            }
        } else if (context.selectedWord) {
            // Highlight nodes that contain the selected word in their title
            nodeElements.filter(d => d.id.toLowerCase().includes(context.selectedWord.toLowerCase()))
                .classed("highlight", true)
                .style("opacity", 1)
                .attr("r", d => getNodeSize(d) * 1.3);
        }
    }
    
    function toggleLayout() {
        // Only toggle if simulation is active or can be reactivated
        if (simulation) {
            // Restart simulation
            simulation.restart();
            simulationActive = true;
            
            if (currentLayout === "force") {
                // Switch to radial layout
                currentLayout = "radial";
                
                // Update button text
                document.getElementById("toggle-layout").textContent = "Force Layout";
                
                // Apply radial layout
                simulation
                    .force("r", d3.forceRadial(function(d) {
                        // Group nodes by first letter of id
                        const firstLetter = d.id.charAt(0).toLowerCase();
                        // Map the letter to a radius
                        const letterIndex = Math.min(firstLetter.charCodeAt(0) - 97, 25); // 'a' starts at 97
                        return 50 + letterIndex * 8;
                    }).strength(0.8))
                    .force("charge", d3.forceManyBody().strength(-50).distanceMax(150))
                    .alpha(1).restart();
                
            } else {
                // Switch to force layout
                currentLayout = "force";
                
                // Update button text
                document.getElementById("toggle-layout").textContent = "Radial Layout";
                
                // Remove radial force and apply standard forces
                simulation
                    .force("r", null)
                    .force("charge", d3.forceManyBody().strength(-80).distanceMax(200))
                    .force("center", d3.forceCenter(width / 2, height / 2))
                    .alpha(1).restart();
            }
            
            // Stop after 2 seconds
            setTimeout(() => {
                simulation.stop();
                simulationActive = false;
            }, 2000);
        }
    }
    
    function createSimpleLegend() {
        // Create a simplified legend with just a few main genres
        const mainGenres = ["action", "comedy", "drama", "horror"];
        
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, 20)`);
        
        legend.append("rect")
            .attr("width", 80)
            .attr("height", mainGenres.length * 20 + 10)
            .attr("fill", "rgba(0, 0, 0, 0.2)")
            .attr("rx", 5);
        
        mainGenres.forEach((genre, i) => {
            const item = legend.append("g")
                .attr("transform", `translate(10, ${i * 20 + 15})`);
            
            item.append("circle")
                .attr("r", 5)
                .attr("fill", genreColors[genre]);
            
            item.append("text")
                .attr("x", 10)
                .attr("y", 4)
                .text(genre)
                .style("font-size", "10px")
                .style("fill", "white");
        });
    }
    
    // Efficient zoom functions
    function zoomIn() {
        svg.transition()
            .duration(highPerformanceMode ? 0 : 750)
            .call(zoomBehavior.scaleBy, 1.3);
    }
    
    function zoomOut() {
        svg.transition()
            .duration(highPerformanceMode ? 0 : 750)
            .call(zoomBehavior.scaleBy, 0.7);
    }
});