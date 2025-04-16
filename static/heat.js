document.addEventListener('DOMContentLoaded', function () {
  const sides = { top: 50, right: 25, bottom: 30, left: 120 },
      width = 450 - sides.left - sides.right,
      height = 450 - sides.top - sides.bottom;

  const svg = d3.select("#graph2")
      .append("svg")
      .attr("width", width + sides.left + sides.right)
      .attr("height", height + sides.top + sides.bottom)
      .append("g")
      .attr("transform", `translate(${sides.left}, ${sides.top})`);

  // Create tooltip
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("background", "rgba(255,255,255,0.9)")
      .style("border", "1px solid #333")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("box-shadow", "3px 3px 10px rgba(0,0,0,0.2)");

  // Variables to store data and elements for linking
  let heatmapData;
  let heatmapRects;
  let x, y;
  let showingPositive = true;
  let zoomBehavior;
  let myColor;

  // Read the data
  d3.json("/HM").then(function (data) {
      // Store the original data
      heatmapData = data;
      
      // Process and display the heatmap
      processDataAndCreateHeatmap(data);
      
      // Add event listener for sentiment toggle
      document.getElementById('toggle-sentiment').addEventListener('click', function() {
          showingPositive = !showingPositive;
          updateHeatmapView();
      });
      
      // Listen for context changes
      document.addEventListener('contextChanged', function(e) {
          updateHighlighting(e.detail.context);
      });
  }).catch(function (error) {
      console.error('Error loading heatmap data:', error);
  });

  function processDataAndCreateHeatmap(data) {
      // Combine Positive and Negative data
      const combinedData = [];
      
      // Process Positive data
      Object.entries(data.Positive).forEach(([character, count]) => {
          if (count > 0) { // Only add entries with positive counts
              combinedData.push({
                  Sentiment: "Positive",
                  Character: character,
                  Count: count
              });
          }
      });
      
      // Process Negative data
      Object.entries(data.Negative).forEach(([character, count]) => {
          if (count > 0) { // Only add entries with positive counts
              combinedData.push({
                  Sentiment: "Negative",
                  Character: character,
                  Count: count
              });
          }
      });

      // Sort and limit data for better visualization
      const sortedData = combinedData.sort((a, b) => b.Count - a.Count);
      const topCharacters = [...new Set(sortedData.slice(0, 30).map(d => d.Character))];
      
      // Filter data for top characters
      const filteredData = sortedData.filter(d => topCharacters.includes(d.Character));

      // Create scales
      const sentiments = ["Positive", "Negative"];
      x = d3.scaleBand()
          .domain(sentiments)
          .range([0, width])
          .padding(0.1);

      y = d3.scaleBand()
          .domain(topCharacters)
          .range([0, height])
          .padding(0.1);

      // Enhanced color scales for positive and negative sentiment
      const positiveColorScale = d3.scaleSequential()
          .domain([0, d3.max(filteredData.filter(d => d.Sentiment === "Positive"), d => d.Count)])
          .interpolator(d3.interpolate("#c7e9c0", "#006d2c")); // Light to dark green

      const negativeColorScale = d3.scaleSequential()
          .domain([0, d3.max(filteredData.filter(d => d.Sentiment === "Negative"), d => d.Count)])
          .interpolator(d3.interpolate("#fee0d2", "#de2d26")); // Light to dark red

      // Function to select the appropriate color scale
      myColor = function(d) {
          if (d.Sentiment === "Positive") {
              return positiveColorScale(d.Count);
          } else {
              return negativeColorScale(d.Count);
          }
      };

      // Add X axis with styled labels
      svg.append("g")
          .style("font-size", 12)
          .style("font-weight", "bold")
          .attr("transform", `translate(0, ${height})`)
          .call(d3.axisBottom(x).tickSize(0))
          .select(".domain").remove();

      // Style the sentiment labels
      svg.selectAll(".tick text")
          .style("fill", function(d) {
              return d === "Positive" ? "#006d2c" : "#de2d26";
          })
          .style("font-size", "14px");

      // Add Y axis
      svg.append("g")
          .style("font-size", 10)
          .call(d3.axisLeft(y).tickSize(0))
          .select(".domain").remove();

      // Create initial heatmap
      createHeatmap(filteredData);
      
      // Set up zoom behavior
      zoomBehavior = d3.zoom()
          .scaleExtent([0.5, 3])
          .on("zoom", function(event) {
              svg.selectAll(".heatmap-group").attr("transform", event.transform);
          });
      
      d3.select("#graph2 svg").call(zoomBehavior);
  }

  function createHeatmap(data) {
      // Clear previous heatmap
      svg.selectAll(".heatmap-group").remove();
      
      // Create a group for the heatmap cells
      const heatmapGroup = svg.append("g")
          .attr("class", "heatmap-group");
      
      // Add a subtle grid background
      for (let i = 0; i < y.domain().length; i++) {
          heatmapGroup.append("rect")
              .attr("x", 0)
              .attr("y", i * y.bandwidth())
              .attr("width", width)
              .attr("height", y.bandwidth())
              .attr("fill", i % 2 === 0 ? "rgba(240,240,240,0.3)" : "rgba(255,255,255,0.3)");
      }
          
      // Add heatmap cells with enhanced styling
      heatmapRects = heatmapGroup.selectAll(".heatmap-cell")
          .data(data)
          .enter()
          .append("rect")
          .attr("class", "heatmap-cell")
          .attr("x", d => x(d.Sentiment))
          .attr("y", d => y(d.Character))
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .style("fill", d => myColor(d))
          .style("stroke-width", 1)
          .style("stroke", "white")
          .style("opacity", 0.85)
          .style("rx", 4) // Rounded corners
          .style("ry", 4)
          .on("mouseover", function(event, d) {
              // Show tooltip
              tooltip.transition()
                  .duration(200)
                  .style("opacity", 0.95);
              
              tooltip.html(`<strong>${d.Sentiment} Sentiment</strong><br>
                            <span style="font-size:1.1em; color:${d.Sentiment === 'Positive' ? '#006d2c' : '#de2d26'}">
                            Character: ${d.Character}</span><br>
                            Count: ${d.Count}`)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 10) + "px");
              
              // Highlight the cell
              d3.select(this)
                  .style("stroke", "#FF4500")
                  .style("stroke-width", 3)
                  .style("opacity", 1)
                  .style("box-shadow", "0 0 10px rgba(0,0,0,0.5)");
              
              // Show focus indicator
              showFocusIndicator(this);
          })
          .on("mouseout", function(event, d) {
              // Hide tooltip
              tooltip.transition()
                  .duration(500)
                  .style("opacity", 0);
              
              // Remove highlight if not selected
              if (!d3.select(this).classed("cell-highlight")) {
                  d3.select(this)
                      .style("stroke", "white")
                      .style("stroke-width", 1)
                      .style("opacity", 0.85);
              }
              
              // Hide focus indicator
              hideFocusIndicator();
          })
          .on("click", function(event, d) {
              // Update the shared context when a cell is clicked
              if (visualizationContext.selectedCharacter === d.Character &&
                  visualizationContext.selectedSentiment === d.Sentiment.toLowerCase()) {
                  // If already selected, deselect it
                  visualizationContext.selectedCharacter = null;
                  visualizationContext.selectedSentiment = null;
              } else {
                  // Select the new character and sentiment
                  visualizationContext.selectedCharacter = d.Character;
                  visualizationContext.selectedSentiment = d.Sentiment.toLowerCase();
              }
              visualizationContext.updateVisualizations();
          });
      
      // Add character name labels inside the cells for better visibility
      heatmapGroup.selectAll(".cell-label")
          .data(data.filter(d => d.Count > 10)) // Only label cells with significant counts
          .enter()
          .append("text")
          .attr("class", "cell-label")
          .attr("x", d => x(d.Sentiment) + x.bandwidth() / 2)
          .attr("y", d => y(d.Character) + y.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text(d => d.Character.split(' ')[0]) // Just show first name to avoid crowding
          .style("font-size", "9px")
          .style("fill", d => d.Count > 20 ? "white" : "black")
          .style("font-weight", "bold")
          .style("pointer-events", "none")
          .style("text-shadow", "0px 0px 2px rgba(0,0,0,0.5)");
      
      // Add legend
      addLegend();
  }
  
  function addLegend() {
      // Remove any existing legend
      svg.selectAll(".legend").remove();
      
      const legendHeight = 200;
      const legendGroup = svg.append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${width + 10}, 0)`);
      
      // Create gradients for the legend
      const defs = legendGroup.append("defs");
      
      // Positive sentiment gradient
      const positiveGradient = defs.append("linearGradient")
          .attr("id", "positive-gradient")
          .attr("x1", "0%")
          .attr("y1", "100%")
          .attr("x2", "0%")
          .attr("y2", "0%");
      
      positiveGradient.selectAll("stop")
          .data([
              {offset: "0%", color: "#c7e9c0"},
              {offset: "50%", color: "#74c476"},
              {offset: "100%", color: "#006d2c"}
          ])
          .enter().append("stop")
          .attr("offset", d => d.offset)
          .attr("stop-color", d => d.color);
      
      // Negative sentiment gradient
      const negativeGradient = defs.append("linearGradient")
          .attr("id", "negative-gradient")
          .attr("x1", "0%")
          .attr("y1", "100%")
          .attr("x2", "0%")
          .attr("y2", "0%");
      
      negativeGradient.selectAll("stop")
          .data([
              {offset: "0%", color: "#fee0d2"},
              {offset: "50%", color: "#fc9272"},
              {offset: "100%", color: "#de2d26"}
          ])
          .enter().append("stop")
          .attr("offset", d => d.offset)
          .attr("stop-color", d => d.color);
      
      // Add rectangles with gradients
      legendGroup.append("rect")
          .attr("width", 15)
          .attr("height", legendHeight / 2)
          .attr("y", 0)
          .style("fill", "url(#positive-gradient)")
          .style("stroke", "white")
          .style("stroke-width", 0.5);
      
      legendGroup.append("rect")
          .attr("width", 15)
          .attr("height", legendHeight / 2)
          .attr("y", legendHeight / 2)
          .style("fill", "url(#negative-gradient)")
          .style("stroke", "white")
          .style("stroke-width", 0.5);
      
      // Add scale labels
      legendGroup.append("text")
          .attr("x", 20)
          .attr("y", 10)
          .text("High")
          .style("font-size", 10)
          .style("font-weight", "bold");
      
      legendGroup.append("text")
          .attr("x", 20)
          .attr("y", legendHeight / 2 - 10)
          .text("Low")
          .style("font-size", 10);
      
      legendGroup.append("text")
          .attr("x", 20)
          .attr("y", legendHeight / 2 + 10)
          .text("Low")
          .style("font-size", 10);
      
      legendGroup.append("text")
          .attr("x", 20)
          .attr("y", legendHeight - 5)
          .text("High")
          .style("font-size", 10)
          .style("font-weight", "bold");
      
      // Add sentiment labels
      legendGroup.append("text")
          .attr("x", 7.5)
          .attr("y", legendHeight / 4)
          .attr("text-anchor", "middle")
          .attr("transform", `rotate(-90, 7.5, ${legendHeight / 4})`)
          .text("Positive")
          .style("font-size", 9)
          .style("fill", "#006d2c")
          .style("font-weight", "bold");
      
      legendGroup.append("text")
          .attr("x", 7.5)
          .attr("y", 3 * legendHeight / 4)
          .attr("text-anchor", "middle")
          .attr("transform", `rotate(-90, 7.5, ${3 * legendHeight / 4})`)
          .text("Negative")
          .style("font-size", 9)
          .style("fill", "#de2d26")
          .style("font-weight", "bold");
      
      // Add title to the legend
      legendGroup.append("text")
          .attr("x", 0)
          .attr("y", -10)
          .style("font-size", 12)
          .style("font-weight", "bold")
          .text("Sentiment Intensity");
  }
  
  function updateHeatmapView() {
      // Filter data based on current toggle state
      const sentimentToShow = showingPositive ? "Positive" : "Negative";
      const filteredData = heatmapRects.data().filter(d => d.Sentiment === sentimentToShow);
      
      // Update the heatmap with filtered data
      createHeatmap(filteredData);
      
      // Update button text
      document.getElementById('toggle-sentiment').textContent = 
          `Show ${showingPositive ? 'Negative' : 'Positive'} Sentiment`;
          
      // Update context
      if (visualizationContext.selectedSentiment) {
          visualizationContext.selectedSentiment = sentimentToShow.toLowerCase();
          visualizationContext.updateVisualizations();
      }
  }

  // Update highlighting based on the current context
  function updateHighlighting(context) {
      if (!heatmapRects) return;
      
      // Reset all highlights first
      heatmapRects.classed("cell-highlight", false)
          .style("stroke", "white")
          .style("stroke-width", 1)
          .style("opacity", 0.85);
      
      // Apply new highlights based on context
      if (context.selectedCharacter) {
          heatmapRects.filter(function(d) { 
              return d.Character === context.selectedCharacter; 
          })
          .classed("cell-highlight", true)
          .style("stroke", "#FF4500")
          .style("stroke-width", 3)
          .style("opacity", 1);
      }
      
      if (context.selectedSentiment) {
          // Capitalize first letter for matching
          const sentimentToMatch = context.selectedSentiment.charAt(0).toUpperCase() + 
                                context.selectedSentiment.slice(1);
          
          heatmapRects.filter(function(d) { 
              return d.Sentiment === sentimentToMatch; 
          })
          .classed("cell-highlight", true)
          .style("stroke", "#FF4500")
          .style("stroke-width", 3)
          .style("opacity", 1);
      }
  }
  
  // Focus+Context helper functions
  function showFocusIndicator(element) {
      let bbox = element.getBBox();
      
      // Remove any existing focus indicator
      d3.select(".focus-indicator").remove();
      
      // Create a focus indicator
      svg.append("rect")
          .attr("class", "focus-indicator")
          .attr("x", bbox.x - 2)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 4)
          .attr("height", bbox.height + 4)
          .attr("rx", 4)
          .attr("ry", 4)
          .style("fill", "none")
          .style("stroke", "#FF4500")
          .style("stroke-width", 2)
          .style("stroke-dasharray", "3,3")
          .style("opacity", 0.9);
  }
  
  function hideFocusIndicator() {
      d3.select(".focus-indicator").remove();
  }
});