document.addEventListener("DOMContentLoaded", () => {
    const width = 800;
    const height = 600;
    const svg = d3.select("#spectrogram");

    const birdColors = {}; // Store bird colors for unique mapping
    let birdIndex = 0; // Index for assigning unique colors

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Use D3's category color scale

    const scaleX = d3.scaleLinear().domain([0, 10]).range([50, width - 50]); // Time
    const scaleY = d3.scaleLinear().domain([0, 500]).range([height - 50, 50]); // Frequency
    const scaleSize = d3.scaleLinear().domain([0, 100]).range([2, 20]); // Volume

    // Function to add bird data to the graph
    const addBirdToGraph = (bird) => {
        // Assign a unique color to each bird
        if (!birdColors[bird.title]) {
            birdColors[bird.title] = colorScale(birdIndex++);
        }

        const birdDataPath = `data/${bird.data}`;
        console.log(`Loading data from: ${birdDataPath}`);

        d3.json(birdDataPath)
            .then((data) => {
                console.log(`Data loaded for ${bird.title}`, data);

                svg.selectAll(`.circle-${bird.title}`)
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("class", `circle-${bird.title}`)
                    .attr("cx", (d) => scaleX(d.Time))
                    .attr("cy", (d) => scaleY(d.Frequency))
                    .attr("r", (d) => scaleSize(d.Volume))
                    .attr("fill", birdColors[bird.title])
                    .attr("opacity", 0.7);
            })
            .catch((error) => {
                console.error(`Error loading data for ${bird.title}:`, error);
            });
    };

    // Populate bird buttons dynamically
    fetch("data/birds.json")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load birds.json: ${response.statusText}`);
            }
            return response.json();
        })
        .then((birds) => {
            const birdButtonsContainer = document.getElementById("bird-buttons");

            birds.forEach((bird) => {
                const birdButton = document.createElement("button");
                birdButton.classList.add("bird-button");
                birdButton.textContent = `Add ${bird.title}`;

                birdButton.addEventListener("click", () => {
                    console.log(`Adding bird: ${bird.title}`);
                    addBirdToGraph(bird);
                });

                birdButtonsContainer.appendChild(birdButton);
            });
        })
        .catch((error) => {
            console.error("Error loading birds.json:", error);
        });

    // Add graph axes
    const xAxis = d3.axisBottom(scaleX).ticks(10);
    const yAxis = d3.axisLeft(scaleY).ticks(10);

    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(xAxis)
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text("Time (s)");

    svg.append("g")
        .attr("transform", "translate(50, 0)")
        .call(yAxis)
        .append("text")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text("Frequency (Hz)");

    // Navigation to visualization page
    const visualizationButton = document.getElementById("to-visualization");
    visualizationButton.addEventListener("click", () => {
        window.location.href = "index.html";
    });
});
