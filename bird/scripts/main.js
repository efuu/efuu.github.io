document.addEventListener("DOMContentLoaded", () => {
    const width = 600, height = 600, radius = 250;
    const svg = d3.select("#wheel").attr("width", width).attr("height", height);

    const center = { x: width / 2, y: height / 2 };
    const activeAudios = {}; // Store active audio instances
    const activeData = {}; // Store active bird data
    let isPlaying = false;
    const baseDuration = 8; // Fixed duration (8 seconds)

    // Add concentric circles
    for (let i = 1; i <= 5; i++) {
        svg.append("circle")
           .attr("cx", center.x)
           .attr("cy", center.y)
           .attr("r", (radius / 5) * i)
           .attr("fill", "none")
           .attr("stroke", "#b7946a")
           .attr("stroke-opacity", 0.4)
           .attr("stroke-dasharray", "4,4");
    }

    // Add radial lines
    for (let i = 0; i < 360; i += 30) {
        const angle = (i * Math.PI) / 180;
        svg.append("line")
           .attr("x1", center.x)
           .attr("y1", center.y)
           .attr("x2", center.x + radius * Math.cos(angle))
           .attr("y2", center.y + radius * Math.sin(angle))
           .attr("stroke", "#b7946a")
           .attr("stroke-opacity", 0.4)
           .attr("stroke-dasharray", "4,4");
    }

    // Add background circle
    svg.append("circle")
       .attr("cx", center.x)
       .attr("cy", center.y)
       .attr("r", radius)
       .attr("fill", "#b7946a")
       .attr("opacity", 0.3);

    // Add outer circle
    svg.append("circle")
       .attr("cx", center.x)
       .attr("cy", center.y)
       .attr("r", radius + 20)
       .attr("fill", "none")
       .attr("stroke", "#4e4d49")
       .attr("stroke-width", 5);

    // Add center circle
    svg.append("circle")
       .attr("cx", center.x)
       .attr("cy", center.y)
       .attr("r", 5)
       .attr("fill", "#d6cfbf");

    // Add the radius line
    const radiusLine = svg.append("line")
                          .attr("x1", center.x)
                          .attr("y1", center.y)
                          .attr("x2", center.x)
                          .attr("y2", center.y - radius - 20)
                          .attr("stroke", "#d6cfbf")
                          .attr("stroke-width", 3);

    const playButton = document.getElementById("play-button");
    const timeDisplay = document.getElementById("time-display");

    const resetPlayback = () => {
        isPlaying = false;
        playButton.textContent = "Play";
        Object.values(activeAudios).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        radiusLine.attr("x2", center.x).attr("y2", center.y - radius - 20);
        timeDisplay.textContent = "Time: 0.0s";
    };

    const updateRadiusLine = () => {
        if (!isPlaying || Object.keys(activeAudios).length === 0) return;

        const audio = Object.values(activeAudios)[0];
        const elapsedTime = audio.currentTime;

        if (elapsedTime >= baseDuration) {
            resetPlayback();
            return;
        }

        const angle = (elapsedTime / baseDuration) * 2 * Math.PI - Math.PI / 2;
        const x2 = center.x + (radius + 20) * Math.cos(angle);
        const y2 = center.y + (radius + 20) * Math.sin(angle);
        radiusLine.attr("x2", x2).attr("y2", y2);

        timeDisplay.textContent = `Time: ${elapsedTime.toFixed(1)}s`;

        requestAnimationFrame(updateRadiusLine);
    };

    const toggleBirdVisualization = (bird, buttonElement) => {
        const isActive = buttonElement.classList.contains("active");
        const birdClass = bird.title.replace(/\s+/g, '-'); // Replace spaces with hyphens for unique class names

        if (isActive) {
            // Remove visualization and audio
            svg.selectAll(`.data-circle-${birdClass}`).remove();
            if (activeAudios[bird.title]) {
                activeAudios[bird.title].pause();
                delete activeAudios[bird.title];
            }
            buttonElement.classList.remove("active");
        } else {
            // Load bird data and add visualization
            d3.json(`data/${bird.data}`).then(data => {
                const adjustedData = data.filter(d => d.Time <= baseDuration) // Filter invalid times
                                         .map(d => ({
                                             ...d,
                                             Time: d.Time % baseDuration // Loop times within baseDuration
                                         }));

                activeData[bird.title] = adjustedData;

                const scaleRadius = d3.scaleLinear()
                                      .domain([0, d3.max(adjustedData, d => d.Frequency)])
                                      .range([0, radius]);

                const scaleColor = d3.scaleLinear()
                                     .domain([0, d3.max(adjustedData, d => Math.max(0, d.Volume))])
                                     .range(["#87ceeb", "#f08080"]);

                const scaleOpacity = d3.scalePow()
                                       .exponent(3)
                                       .domain([0, d3.max(adjustedData, d => Math.max(0, d.Volume))])
                                       .range([0, 1]);

                svg.selectAll(`.data-circle-${birdClass}`)
                   .data(adjustedData)
                   .enter()
                   .append("circle")
                   .attr("class", `data-circle-${birdClass}`)
                   .attr("cx", d => {
                       const angle = (d.Time / baseDuration) * 2 * Math.PI - Math.PI / 2;
                       return center.x + scaleRadius(d.Frequency) * Math.cos(angle);
                   })
                   .attr("cy", d => {
                       const angle = (d.Time / baseDuration) * 2 * Math.PI - Math.PI / 2;
                       return center.y + scaleRadius(d.Frequency) * Math.sin(angle);
                   })
                   .attr("r", 10)
                   .attr("fill", d => scaleColor(d.Volume))
                   .attr("opacity", d => scaleOpacity(d.Volume));

                // Add audio
                const birdAudio = new Audio(`audio/${bird.audio}`);
                birdAudio.loop = false;
                birdAudio.currentTime = 0; // Start from the beginning
                activeAudios[bird.title] = birdAudio;

                if (isPlaying) {
                    birdAudio.play();
                }

                buttonElement.classList.add("active");
            });
        }
    };

    fetch("birds.json")
        .then(response => response.json())
        .then(birds => {
            const sideMenu = document.getElementById("side-menu");

            birds.forEach(bird => {
                const birdItem = document.createElement("div");
                birdItem.classList.add("bird-item");
                birdItem.textContent = bird.title;

                birdItem.addEventListener("click", () => {
                    toggleBirdVisualization(bird, birdItem);
                });

                sideMenu.appendChild(birdItem);
            });
        });

    playButton.addEventListener("click", () => {
        if (isPlaying) {
            resetPlayback();
        } else {
            isPlaying = true;
            Object.values(activeAudios).forEach(audio => audio.play());
            playButton.textContent = "Pause";
            updateRadiusLine();
        }
    });
});
