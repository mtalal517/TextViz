document.addEventListener('DOMContentLoaded', function () {
    // set the dimensions
    var sides = { top: 10, right: 10, bottom: 10, left: 10 },
        width = 450 - sides.left - sides.right,
        height = 450 - sides.top - sides.bottom;

    var svg = d3.select("#graph1").append('svg')
        .attr('width', width + sides.left + sides.right)
        .attr('height', height + sides.top + sides.bottom)
        .append('g')
        .attr("transform", "translate(" + sides.left + "," + sides.top + ")");

    // Create tooltip
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let wordCloudGroup;
    let wordElements;
    let words;
    let colorScale;
    let zoomBehavior;
    
    // Load data from the JSON file
    d3.json("/WC").then(function (data) {
        words = data;
        
        // Set up the word cloud
        createWordCloud(data);
        
        // Set up zoom behavior
        zoomBehavior = d3.zoom()
            .scaleExtent([0.5, 3])
            .on("zoom", function(event) {
                wordCloudGroup.attr("transform", event.transform);
            });
        
        svg.call(zoomBehavior);
        
        // Set up event listeners for buttons
        document.getElementById('zoom-in-cloud').addEventListener('click', function() {
            zoomIn();
        });
        
        document.getElementById('zoom-out-cloud').addEventListener('click', function() {
            zoomOut();
        });
        
        // Listen for context changes
        document.addEventListener('contextChanged', function(e) {
            updateHighlighting(e.detail.context);
        });
    }).catch(function (error) {
        console.error('Error loading word cloud data:', error);
    });

    function createWordCloud(data) {
        // Define a vibrant color scale based on frequency
        colorScale = d3.scaleSequential()
            .domain([d3.min(data, d => d.Frequency), d3.max(data, d => d.Frequency)])
            .interpolator(d3.interpolateViridis); // This gives a nice blue-purple-yellow gradient

        var layout = d3.layout.cloud()
            .size([width, height])
            .words(data.map(function (d) { return { text: d.Word, size: +d.Frequency, originalSize: +d.Frequency }; }))
            .padding(5)
            .rotate(function () { return ~~(Math.random() * 2) * 50; })
            .fontSize(function (d) { return d.size * 1.5 + 10; })
            .on('end', draw);

        // Start the layout to generate the word cloud
        layout.start();
    }

    // Define the draw function to render the word cloud
    function draw(cloudWords) {
        // Remove previous word cloud if it exists
        svg.selectAll("g").remove();
        
        wordCloudGroup = svg.append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        wordElements = wordCloudGroup.selectAll("text")
            .data(cloudWords)
            .enter().append("text")
            .classed("word-cloud-text", true)
            .style("font-size", function (d) { return d.size + "px"; })
            .style("fill", function (d) { return colorScale(d.originalSize); })
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.2)")
            .attr("transform", function (d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function (d) { return d.text; })
            .on("mouseover", function (event, d) {
                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html("Word: " + d.text + "<br/>Frequency: " + d.originalSize)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");

                // Temporary highlight
                d3.select(this).classed("word-hover", true)
                    .style("fill", "#FF4500") // Bright orange-red for hover state
                    .style("font-weight", "bold")
                    .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.3)");
                
                // Update focus indicator
                showFocusIndicator(this);
            })
            .on("mouseout", function () {
                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);

                // Remove temporary highlight if not selected
                if (d3.select(this).classed("text-highlight") === false) {
                    d3.select(this).classed("word-hover", false)
                        .style("fill", function (d) { return colorScale(d.originalSize); })
                        .style("font-weight", "normal")
                        .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.2)");
                }
                
                // Hide focus indicator
                hideFocusIndicator();
            })
            .on("click", function (event, d) {
                // Update the shared context when a word is clicked
                if (visualizationContext.selectedWord === d.text) {
                    // If already selected, deselect it
                    visualizationContext.selectedWord = null;
                } else {
                    // Select the new word
                    visualizationContext.selectedWord = d.text;
                }
                visualizationContext.updateVisualizations();
            });
            
        // Add a subtle background rectangle to make text pop
        wordCloudGroup.insert("rect", ":first-child")
            .attr("width", width)
            .attr("height", height)
            .attr("x", -width/2)
            .attr("y", -height/2)
            .attr("fill", "rgba(255,255,255,0.1)")
            .attr("rx", 10);
    }

    // Update highlighting based on the current context
    function updateHighlighting(context) {
        if (!wordElements) return;
        
        // Reset all highlights first
        wordElements.classed("text-highlight", false)
            .style("fill", function (d) { return colorScale(d.originalSize); })
            .style("font-weight", "normal")
            .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.2)");
        
        // Apply new highlights based on context
        if (context.selectedWord) {
            wordElements.filter(function(d) { return d.text === context.selectedWord; })
                .classed("text-highlight", true)
                .style("fill", "#FF4500") // Bright orange-red
                .style("font-weight", "bold")
                .style("text-shadow", "2px 2px 6px rgba(0,0,0,0.4)");
        } else if (context.selectedMovie) {
            // Check if any words from this movie's title are in the cloud
            // This would require access to movie title data or a pre-computed mapping
            wordElements.filter(function(d) {
                // Example: check if word appears in the selected movie title
                return context.selectedMovie.toLowerCase().includes(d.text.toLowerCase());
            })
            .classed("text-highlight", true)
            .style("fill", "#FF4500") // Bright orange-red
            .style("font-weight", "bold")
            .style("text-shadow", "2px 2px 6px rgba(0,0,0,0.4)");
        }
    }
    
    // Focus+Context helper functions
    function showFocusIndicator(element) {
        let bbox = element.getBBox();
        let ctm = element.getCTM();
        
        // Remove any existing focus indicator
        d3.select(".focus-indicator").remove();
        
        // Create a focus indicator
        svg.append("rect")
            .attr("class", "focus-indicator")
            .attr("x", bbox.x + ctm.e - 5)
            .attr("y", bbox.y + ctm.f - 5)
            .attr("width", bbox.width + 10)
            .attr("height", bbox.height + 10)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", "none")
            .style("stroke", "#FF4500") // Bright orange-red
            .style("stroke-width", 2)
            .style("stroke-dasharray", "5,5")
            .style("opacity", 0.8);
    }
    
    function hideFocusIndicator() {
        d3.select(".focus-indicator").remove();
    }

    // Zoom functions
    function zoomIn() {
        svg.transition()
            .duration(750)
            .call(zoomBehavior.scaleBy, 1.3);
    }
    
    function zoomOut() {
        svg.transition()
            .duration(750)
            .call(zoomBehavior.scaleBy, 0.7);
    }
});