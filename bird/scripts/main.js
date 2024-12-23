document.addEventListener("DOMContentLoaded", () => {
    const width = 600, height = 600, radius = 250;
    const svg = d3.select("#wheel").attr("width", width).attr("height", height);

    const center = { x: width / 2, y: height / 2 };
    let audio = new Audio();
    let isPlaying = false;

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
    const birdTitle = document.getElementById("bird-title");
    const timeDisplay = document.getElementById("time-display");

    const updateRadiusLine = () => {
        const duration = audio.duration || 1;
        const currentTime = audio.currentTime || 0;
        const angle = (currentTime / duration) * 2 * Math.PI - Math.PI / 2;

        const x2 = center.x + (radius + 20) * Math.cos(angle);
        const y2 = center.y + (radius + 20) * Math.sin(angle);

        radiusLine.attr("x2", x2).attr("y2", y2);

        if (!audio.paused && !audio.ended) {
            requestAnimationFrame(updateRadiusLine);
        }
    };

    const updateTimeDisplay = () => {
        timeDisplay.textContent = `Time: ${audio.currentTime.toFixed(1)}s`;
        updateRadiusLine();
        if (audio.currentTime >= audio.duration) {
            audio.currentTime = 0;
            timeDisplay.textContent = "Time: 0.0s";
        }
    };

    const loadBirdData = (audioSrc, jsonSrc, title) => {
        birdTitle.textContent = title;
        audio.src = audioSrc;

        svg.selectAll(".data-circle").remove();

        d3.json(jsonSrc).then(data => {
            // Create scales for position, color, and drastic opacity
            const scaleRadius = d3.scaleLinear()
                                  .domain([0, d3.max(data, d => d.Frequency)])
                                  .range([0, radius]);

            const scaleColor = d3.scaleLinear()
                                 .domain([0, d3.max(data, d => Math.max(0, d.Volume))])
                                 .range(["#87ceeb", "#f08080"]); // Light blue to light coral

            const scaleOpacity = d3.scalePow()
                                   .exponent(3) // Makes the opacity scale drastic
                                   .domain([0, d3.max(data, d => Math.max(0, d.Volume))])
                                   .range([0, 1]); // Fully transparent to fully opaque

            svg.selectAll(".data-circle")
               .data(data)
               .enter()
               .append("circle")
               .attr("class", "data-circle")
               .attr("cx", d => {
                   const angle = (d.Time / data[data.length - 1].Time) * 2 * Math.PI - Math.PI / 2;
                   return center.x + scaleRadius(d.Frequency) * Math.cos(angle);
               })
               .attr("cy", d => {
                   const angle = (d.Time / data[data.length - 1].Time) * 2 * Math.PI - Math.PI / 2;
                   return center.y + scaleRadius(d.Frequency) * Math.sin(angle);
               })
               .attr("r", 10) // Fixed size for all circles
               .attr("fill", d => scaleColor(d.Volume)) // Set color based on volume
               .attr("opacity", d => scaleOpacity(d.Volume)); // Set drastic opacity

            audio.addEventListener("timeupdate", updateTimeDisplay);
        });
    };

    fetch("birds.json")
        .then(response => response.json())
        .then(birds => {
            const sideMenu = document.getElementById("side-menu");

            birds.forEach((bird, index) => {
                const birdItem = document.createElement("div");
                birdItem.classList.add("bird-item");
                if (index === 0) birdItem.classList.add("active");
                birdItem.textContent = bird.title;
                birdItem.dataset.audio = `audio/${bird.audio}`;
                birdItem.dataset.json = `data/${bird.data}`;
                birdItem.dataset.title = bird.title;

                sideMenu.appendChild(birdItem);

                birdItem.addEventListener("click", () => {
                    document.querySelectorAll(".bird-item").forEach(i => i.classList.remove("active"));
                    birdItem.classList.add("active");

                    const audioSrc = birdItem.dataset.audio;
                    const jsonSrc = birdItem.dataset.json;
                    const title = birdItem.dataset.title;

                    loadBirdData(audioSrc, jsonSrc, title);
                    isPlaying = false;
                    playButton.textContent = "Play";
                    audio.pause();
                });
            });

            const firstBird = birds[0];
            loadBirdData(`audio/${firstBird.audio}`, `data/${firstBird.data}`, firstBird.title);
        });

    playButton.addEventListener("click", () => {
        if (isPlaying) {
            audio.pause();
            playButton.textContent = "Play";
        } else {
            audio.play();
            playButton.textContent = "Pause";
            updateRadiusLine();
        }
        isPlaying = !isPlaying;
    });
});
