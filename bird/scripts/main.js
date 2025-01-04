document.addEventListener("DOMContentLoaded", () => {
    const width = 600, height = 600, radius = 250;
    const svg = d3.select("#wheel").attr("width", width).attr("height", height);

    const center = { x: width / 2, y: height / 2 };
    const activeAudios = {};
    const activeData = {};
    let isPlaying = false;
    const baseDuration = 8;

    const birdImages = {
        "American Bushtit": "images/bushtit.jpg",
        "Lesser Goldfinch": "images/goldfinch.jpg",
        "Mallard": "images/mallard.jpg",
        "Ruby-Throated Hummingbird": "images/ruby-throated-hummingbird.jpg",
    };

    const environmentColors = {
        forest: ["#0C24F9", "#FAC300"],
        grassland: ["#0CE6FA", "#FA6801"],
        wetland: ["#0CFA50", "#FA0808"],
        orchard: ["#E800FA", "#74FA0C"],
    };

    const birdEnvironments = {
        "American Bushtit": "forest",
        "Lesser Goldfinch": "grassland",
        "Mallard": "wetland",
        "Ruby-Throated Hummingbird": "orchard",
    };

    const getEnvironmentGradient = (birdName, value) => {
        const environment = birdEnvironments[birdName];
        const [startColor, endColor] = environmentColors[environment] || ["#CCCCCC", "#999999"];
        return d3.interpolateRgb(startColor, endColor)(value);
    };

    for (let i = 1; i <= 5; i++) {
        svg.append("circle")
           .attr("cx", center.x)
           .attr("cy", center.y)
           .attr("r", (radius / 5) * i)
           .attr("fill", "none")
           .attr("stroke", "#463e34")
           .attr("stroke-opacity", 0.4)
           .attr("stroke-dasharray", "4,4");
    }

    for (let i = 0; i < 360; i += 30) {
        const angle = (i * Math.PI) / 180;
        svg.append("line")
           .attr("x1", center.x)
           .attr("y1", center.y)
           .attr("x2", center.x + radius * Math.cos(angle))
           .attr("y2", center.y + radius * Math.sin(angle))
           .attr("stroke", "#463e34")
           .attr("stroke-opacity", 0.4)
           .attr("stroke-dasharray", "4,4");
    }

    svg.append("circle")
       .attr("cx", center.x)
       .attr("cy", center.y)
       .attr("r", radius)
       .attr("fill", "#f0f8ff")
       .attr("opacity", 0.3);

    svg.append("circle")
       .attr("cx", center.x)
       .attr("cy", center.y)
       .attr("r", radius + 20)
       .attr("fill", "none")
       .attr("stroke", "#4e4d49")
       .attr("stroke-width", 5);

    svg.append("circle")
       .attr("cx", center.x)
       .attr("cy", center.y)
       .attr("r", 5)
       .attr("fill", "#d6cfbf");

    const radiusLine = svg.append("line")
                          .attr("x1", center.x)
                          .attr("y1", center.y)
                          .attr("x2", center.x)
                          .attr("y2", center.y - radius - 20)
                          .attr("stroke", "#FFA500")
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
        timeDisplay.textContent = "Time: 0.0 / 8.0";
    };

    const updateRadiusLine = () => {
        if (!isPlaying || Object.keys(activeAudios).length === 0) return;

        const audio = Object.values(activeAudios)[0];
        const elapsedTime = (audio.currentTime % baseDuration);

        const angle = (elapsedTime / baseDuration) * 2 * Math.PI - Math.PI / 2;
        const x2 = center.x + (radius + 20) * Math.cos(angle);
        const y2 = center.y + (radius + 20) * Math.sin(angle);
        radiusLine.attr("x2", x2).attr("y2", y2);

        timeDisplay.textContent = `Time: ${elapsedTime.toFixed(1)} / 8.0`;

        if (audio.currentTime >= baseDuration) {
            resetPlayback();
            return;
        }

        requestAnimationFrame(updateRadiusLine);
    };

    const toggleBirdVisualization = (bird, buttonElement) => {
        const isActive = buttonElement.classList.contains("active");
        const birdClass = bird.title.replace(/\s+/g, '-');

        if (isActive) {
            svg.selectAll(`.data-circle-${birdClass}`).remove();
            if (activeAudios[bird.title]) {
                activeAudios[bird.title].pause();
                delete activeAudios[bird.title];
            }
            buttonElement.classList.remove("active");
            buttonElement.style.opacity = "0.5";
        } else {
            d3.json(`data/${bird.data}`).then(data => {
                const adjustedData = data.filter(d => d.Time <= baseDuration)
                                         .map(d => ({
                                             ...d,
                                             Time: d.Time % baseDuration
                                         }));

                activeData[bird.title] = adjustedData;

                const scaleRadius = d3.scaleLinear()
                                      .domain([0, d3.max(adjustedData, d => d.Frequency)])
                                      .range([0, radius]);

                const scaleColor = d3.scaleLinear()
                                     .domain([0, d3.max(adjustedData, d => Math.max(0, d.Volume))])
                                     .range(environmentColors[birdEnvironments[bird.title]]);

                const scaleOpacity = d3.scalePow()
                                       .exponent(4.5)
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

                const birdAudio = new Audio(`audio/${bird.audio}`);
                birdAudio.loop = false;
                birdAudio.currentTime = 0;
                activeAudios[bird.title] = birdAudio;

                if (isPlaying) {
                    birdAudio.play();
                }

                buttonElement.classList.add("active");
                buttonElement.style.opacity = "1";
            });
        }
    };

    const rightMenu = d3.select("body").append("div")
        .attr("id", "right-menu")
        .style("position", "absolute")
        .style("right", "125px")
        .style("top", "200px")
        .style("width", "350px")
        .style("background-color", "#e3ecf5")
        .style("padding", "20px")
        .style("border-radius", "10px")
        .style("box-shadow", "0 4px 10px rgba(0, 0, 0, 0.1)");

    fetch("birds.json")
        .then(response => response.json())
        .then(birds => {
            const environments = {};

            birds.forEach(bird => {
                const environment = birdEnvironments[bird.title];
                if (!environments[environment]) {
                    environments[environment] = rightMenu.append("div")
                        .style("margin-bottom", "20px");

                    const environmentContainer = environments[environment]
                        .append("div")
                        .style("display", "flex")
                        .style("align-items", "center")
                        .style("margin-bottom", "10px");

                    environmentContainer
                        .append("div")
                        .text(environment.charAt(0).toUpperCase() + environment.slice(1))
                        .style("margin-right", "10px")
                        .style("font-size", "20px")
                        .style("font-weight", "bold");

                    environmentContainer
                        .append("div")
                        .style("width", "30px")
                        .style("height", "30px")
                        .style("background-color", environmentColors[environment][0])
                        .style("border-radius", "50%");
                }

                const birdContainer = environments[environment]
                    .append("div")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("margin-top", "10px")
                    .style("opacity", "0.5")
                    .classed("bird-entry", true);

                birdContainer
                    .append("img")
                    .attr("src", birdImages[bird.title])
                    .attr("alt", `${bird.title} icon`)
                    .style("width", "50px")
                    .style("height", "50px")
                    .style("margin-right", "10px");

                birdContainer
                    .append("div")
                    .style("cursor", "pointer")
                    .style("font-size", "18px")
                    .text(bird.title)
                    .on("click", () => {
                        toggleBirdVisualization(bird, birdContainer.node());
                    });
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
