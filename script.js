const GRID_SIZE = 25;
const MIN_NEIGHBORS = 0;
const MAX_NEIGHBORS = 20;
const MIN_ACCEL = 0;
const MAX_ACCEL = 20;
const MIN_SOLAR_NEIGHBORS = 0;
const MAX_SOLAR_NEIGHBORS = 3;
const BASE_JUPITER_PERIOD_SECONDS = 10;
const BASE_JUPITER_ACCEL = 5;
const JUPITER_PERIOD_YEARS = 11.862;
const EARTH_MOON_DISTANCE_KM = 384400;
const ONE_LY_KM = 9.4607e12;
const ONE_AU_KM = 149597870.7;
const MIN_STATIONS = 0;
const MAX_STATIONS = 200;
const MIN_STARSHIPS = 0;
const MAX_STARSHIPS = 200;
const MIN_SHIP_SPEED_MULTIPLIER_SLIDER = 0;
const MAX_SHIP_SPEED_MULTIPLIER_SLIDER = 10;
const BASE_MOON_PERIOD_SECONDS = 60;
const BASE_MOON_ACCEL = 5;

const planets = [
  { orbitAu: 0.387, periodYears: 0.241, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 0.723, periodYears: 0.615, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 1.0, periodYears: 1.0, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 1.524, periodYears: 1.881, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 5.203, periodYears: 11.862, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 9.537, periodYears: 29.457, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 19.191, periodYears: 84.017, angle: Math.random() * Math.PI * 2 },
  { orbitAu: 30.069, periodYears: 164.79, angle: Math.random() * Math.PI * 2 },
];

const wrapper = document.querySelector(".screen-wrapper");
const screenButtons = Array.from(document.querySelectorAll(".screen-btn[data-screen]"));
const screenControls = Array.from(document.querySelectorAll(".slider-group[data-controls]"));

const starCanvas = document.getElementById("star-canvas");
const starCtx = starCanvas.getContext("2d");
const neighborsSlider = document.getElementById("neighbors");
const neighborsValue = document.getElementById("neighbors-value");
const neighborsConnectivity = document.getElementById("neighbors-connectivity");
const shipCountSlider = document.getElementById("ship-count");
const shipCountValue = document.getElementById("ship-count-value");
const shipSpeedSlider = document.getElementById("ship-speed");
const shipSpeedValue = document.getElementById("ship-speed-value");

const solarCanvas = document.getElementById("solar-canvas");
const solarCtx = solarCanvas.getContext("2d");
const accelSlider = document.getElementById("time-accel");
const accelValue = document.getElementById("time-accel-value");
const solarNeighborsSlider = document.getElementById("solar-neighbors");
const solarNeighborsValue = document.getElementById("solar-neighbors-value");

const earthCanvas = document.getElementById("earth-canvas");
const earthCtx = earthCanvas.getContext("2d");
const earthAccelSlider = document.getElementById("earth-time-accel");
const earthAccelValue = document.getElementById("earth-time-accel-value");
const stationCountSlider = document.getElementById("station-count");
const stationCountValue = document.getElementById("station-count-value");
const sideScaleLabel = document.getElementById("side-scale-label");

let currentScreen = "1";
let points = [];
let closestFiveStars = [];
let allStarships = [];
let neighborsToDraw = Number(neighborsSlider.value);
let visibleStarshipCount = Number(shipCountSlider.value);
let shipSpeedSliderValue = Number(shipSpeedSlider.value);
let timeAcceleration = Number(accelSlider.value);
let solarNeighborsToDraw = Number(solarNeighborsSlider.value);
let earthTimeAcceleration = Number(earthAccelSlider.value);
let stationCount = Number(stationCountSlider.value);
let allStations = [];
let moonAngle = Math.random() * Math.PI * 2;
let lastFrameTs = performance.now();
let starConnectivityDirty = true;
let starConnectivityState = false;

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function buildPoints(width, height) {
  const cellW = width / GRID_SIZE;
  const cellH = height / GRID_SIZE;
  const created = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const baseX = col * cellW;
      const baseY = row * cellH;
      created.push({
        x: randomInRange(baseX + cellW * 0.15, baseX + cellW * 0.85),
        y: randomInRange(baseY + cellH * 0.15, baseY + cellH * 0.85),
      });
    }
  }

  return created;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function drawNearestLines(ctx, bodies, connections) {
  if (connections <= 0) return;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.33)";
  ctx.lineWidth = 1;

  for (let i = 0; i < bodies.length; i += 1) {
    const source = bodies[i];
    const sorted = [];

    for (let j = 0; j < bodies.length; j += 1) {
      if (j === i) continue;
      sorted.push({ index: j, dist: distanceSquared(source, bodies[j]) });
    }

    sorted.sort((a, b) => a.dist - b.dist);
    const limit = Math.min(connections, sorted.length);

    for (let n = 0; n < limit; n += 1) {
      const target = bodies[sorted[n].index];
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }
}

function drawStarScene() {
  starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
  drawNearestLines(starCtx, points, neighborsToDraw);

  starCtx.fillStyle = "rgb(255, 255, 255)";
  for (const point of points) {
    starCtx.beginPath();
    starCtx.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
    starCtx.fill();
  }

  drawStarships();
  updateStarConnectivityIndicator(false);
}

function getSize() {
  return Math.floor(wrapper.getBoundingClientRect().width);
}

function toScientificLabelKm(valueKm) {
  if (valueKm <= 0) return "0.00e0 km";
  const exponent = Math.floor(Math.log10(valueKm));
  const coefficient = valueKm / Math.pow(10, exponent);
  return `${coefficient.toFixed(2)}e${exponent} km`;
}

function currentScreenSideLengthKm() {
  if (currentScreen === "1") {
    return 125 * ONE_LY_KM;
  }

  const radiusToSideFactor = 1 / 0.45;
  if (currentScreen === "2") {
    const sideAu = 35 * radiusToSideFactor;
    return sideAu * ONE_AU_KM;
  }

  if (currentScreen === "3") {
    return 385000 * radiusToSideFactor;
  }

  return 0;
}

function updateSideScaleLabel() {
  sideScaleLabel.textContent = toScientificLabelKm(currentScreenSideLengthKm());
}

function jupiterAngularSpeed(periodYears) {
  if (timeAcceleration <= 0) return 0;
  const secondsPerOrbit =
    BASE_JUPITER_PERIOD_SECONDS *
    (periodYears / JUPITER_PERIOD_YEARS) *
    (BASE_JUPITER_ACCEL / timeAcceleration);
  return (Math.PI * 2) / secondsPerOrbit;
}

function getSolarBodies(center, orbitScale) {
  const bodies = [{ x: center, y: center }];

  for (const planet of planets) {
    const radius = planet.orbitAu * orbitScale;
    bodies.push({
      x: center + Math.cos(planet.angle) * radius,
      y: center + Math.sin(planet.angle) * radius,
    });
  }

  return bodies;
}

function drawSolarScene() {
  const size = solarCanvas.width;
  const center = size / 2;
  const edgeMargin = size / 20;
  const maxOrbitRadius = center - edgeMargin;
  const orbitScale = maxOrbitRadius / 30.069;

  solarCtx.clearRect(0, 0, size, size);
  solarCtx.lineWidth = 1;
  solarCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";

  for (const planet of planets) {
    const radius = planet.orbitAu * orbitScale;
    solarCtx.beginPath();
    solarCtx.arc(center, center, radius, 0, Math.PI * 2);
    solarCtx.stroke();
  }

  const bodies = getSolarBodies(center, orbitScale);
  drawNearestLines(solarCtx, bodies, solarNeighborsToDraw);

  solarCtx.fillStyle = "rgb(255, 255, 255)";
  solarCtx.beginPath();
  solarCtx.arc(center, center, 4.6, 0, Math.PI * 2);
  solarCtx.fill();

  for (let i = 1; i < bodies.length; i += 1) {
    const body = bodies[i];
    solarCtx.beginPath();
    solarCtx.arc(body.x, body.y, 3.2, 0, Math.PI * 2);
    solarCtx.fill();
  }
}

function buildKnnAdjacency(bodies, connections) {
  const adjacency = Array.from({ length: bodies.length }, () => []);
  if (connections <= 0 || bodies.length === 0) {
    return adjacency;
  }

  for (let i = 0; i < bodies.length; i += 1) {
    const source = bodies[i];
    const sorted = [];

    for (let j = 0; j < bodies.length; j += 1) {
      if (j === i) continue;
      sorted.push({ index: j, dist: distanceSquared(source, bodies[j]) });
    }

    sorted.sort((a, b) => a.dist - b.dist);
    const limit = Math.min(connections, sorted.length);

    for (let n = 0; n < limit; n += 1) {
      const target = sorted[n].index;
      adjacency[i].push(target);
      adjacency[target].push(i);
    }
  }

  return adjacency;
}

function isGraphConnected(adjacency) {
  if (adjacency.length === 0) return true;
  const visited = new Set([0]);
  const queue = [0];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of adjacency[current]) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return visited.size === adjacency.length;
}

function updateSliderIndicatorPosition() {
  const min = Number(neighborsSlider.min);
  const max = Number(neighborsSlider.max);
  const value = Number(neighborsSlider.value);
  const span = max - min || 1;
  const percent = ((value - min) / span) * 100;
  neighborsConnectivity.style.setProperty("--slider-thumb-pos", `${percent}%`);
}

function updateStarConnectivityIndicator(force) {
  if (force || starConnectivityDirty) {
    const adjacency = buildKnnAdjacency(points, neighborsToDraw);
    starConnectivityState = isGraphConnected(adjacency);
    starConnectivityDirty = false;
  }
  neighborsConnectivity.textContent = starConnectivityState
    ? "Connected"
    : "Disconnected";
  neighborsConnectivity.classList.toggle("is-connected", starConnectivityState);
  updateSliderIndicatorPosition();
}

function findClosestStarIndex(x, y) {
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < points.length; i += 1) {
    const dx = x - points[i].x;
    const dy = y - points[i].y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) {
      bestDist = d2;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function computeClosestStars(k) {
  const neighbors = Array.from({ length: points.length }, () => []);
  for (let i = 0; i < points.length; i += 1) {
    const sorted = [];
    for (let j = 0; j < points.length; j += 1) {
      if (j === i) continue;
      sorted.push({ index: j, dist: distanceSquared(points[i], points[j]) });
    }
    sorted.sort((a, b) => a.dist - b.dist);
    neighbors[i] = sorted.slice(0, k).map((entry) => entry.index);
  }
  return neighbors;
}

function generateAllStarships(width, height) {
  const generated = [];
  const speedUnit = width;

  for (let i = 0; i < MAX_STARSHIPS; i += 1) {
    const x = randomInRange(0, width);
    const y = randomInRange(0, height);
    generated.push({
      x,
      y,
      speedPxPerSec: speedUnit * randomInRange(0.01, 0.03),
      targetStarIndex: findClosestStarIndex(x, y),
      heading: 0,
    });
  }

  return generated;
}

function updateStarships(dt) {
  const shipSpeedMultiplier = shipSpeedSliderValue / 2.5;

  for (const ship of allStarships) {
    const target = points[ship.targetStarIndex];
    if (!target) continue;

    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.hypot(dx, dy);
    const step = ship.speedPxPerSec * shipSpeedMultiplier * dt;

    if (dist <= step || dist < 0.0001) {
      ship.x = target.x;
      ship.y = target.y;

      const options = closestFiveStars[ship.targetStarIndex] || [];
      if (options.length > 0) {
        ship.targetStarIndex = options[randomInt(options.length)];
      }

      const next = points[ship.targetStarIndex];
      if (next) {
        ship.heading = Math.atan2(next.y - ship.y, next.x - ship.x);
      }
      continue;
    }

    const ux = dx / dist;
    const uy = dy / dist;
    ship.x += ux * step;
    ship.y += uy * step;
    ship.heading = Math.atan2(uy, ux);
  }
}

function drawStarships() {
  starCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
  const shipSize = 6;
  const limit = Math.min(visibleStarshipCount, allStarships.length);

  for (let i = 0; i < limit; i += 1) {
    const ship = allStarships[i];
    starCtx.save();
    starCtx.translate(ship.x, ship.y);
    starCtx.rotate(ship.heading);
    starCtx.fillRect(-shipSize / 2, -shipSize / 2, shipSize, shipSize);
    starCtx.restore();
  }
}

function moonAngularSpeed() {
  if (earthTimeAcceleration <= 0) return 0;
  const secondsPerOrbit = BASE_MOON_PERIOD_SECONDS * (BASE_MOON_ACCEL / earthTimeAcceleration);
  return (Math.PI * 2) / secondsPerOrbit;
}

function orbitalAngularSpeed(aKm) {
  const moonW = moonAngularSpeed();
  if (moonW <= 0) return 0;
  return moonW * Math.pow(EARTH_MOON_DISTANCE_KM / aKm, 1.5);
}

function makeStationCircularEarth() {
  const radiusKm = EARTH_MOON_DISTANCE_KM * randomInRange(0.05, 0.15);
  const isRetrograde = Math.random() < 0.1;
  return {
    type: "earthCircular",
    radiusKm,
    angle: Math.random() * Math.PI * 2,
    isRetrograde,
  };
}

function makeStationCircularMoon() {
  const radiusKm = EARTH_MOON_DISTANCE_KM * randomInRange(0.01, 0.1);
  const isRetrograde = Math.random() < 0.1;
  return {
    type: "moonCircular",
    radiusKm,
    angle: Math.random() * Math.PI * 2,
    isRetrograde,
  };
}

function makeStationElliptical() {
  const e = randomInRange(0.05, 0.88);
  const minApogee = EARTH_MOON_DISTANCE_KM * 0.08;
  const apogeeKm = randomInRange(minApogee, EARTH_MOON_DISTANCE_KM);
  const aKm = apogeeKm / (1 + e);
  const omega = Math.random() * Math.PI * 2;
  const nu = Math.random() * Math.PI * 2;
  const isRetrograde = Math.random() < 0.1;

  return {
    type: "earthElliptical",
    e,
    aKm,
    omega,
    nu,
    isRetrograde,
  };
}

function generateStations(count) {
  const generated = [];
  const circularEarthCount = Math.round(count * 0.4);
  const moonCircularCount = Math.round(count * 0.1);
  const ellipticalCount = count - circularEarthCount - moonCircularCount;

  for (let i = 0; i < circularEarthCount; i += 1) {
    generated.push(makeStationCircularEarth());
  }
  for (let i = 0; i < moonCircularCount; i += 1) {
    generated.push(makeStationCircularMoon());
  }
  for (let i = 0; i < ellipticalCount; i += 1) {
    generated.push(makeStationElliptical());
  }

  for (let i = generated.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const temp = generated[i];
    generated[i] = generated[j];
    generated[j] = temp;
  }

  return generated;
}

function generateAllStations() {
  return generateStations(MAX_STATIONS);
}

function rotatePoint(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

function stationPositionAndHeading(station, moonX, moonY) {
  if (station.type === "earthCircular") {
    const x = Math.cos(station.angle) * station.radiusKm;
    const y = Math.sin(station.angle) * station.radiusKm;
    let heading = station.angle + Math.PI / 2;
    if (station.isRetrograde) heading += Math.PI;
    return { x, y, heading };
  }

  if (station.type === "moonCircular") {
    const localX = Math.cos(station.angle) * station.radiusKm;
    const localY = Math.sin(station.angle) * station.radiusKm;
    const x = moonX + localX;
    const y = moonY + localY;
    let heading = station.angle + Math.PI / 2;
    if (station.isRetrograde) heading += Math.PI;
    return { x, y, heading };
  }

  const cosNu = Math.cos(station.nu);
  const sinNu = Math.sin(station.nu);
  const r = (station.aKm * (1 - station.e * station.e)) / (1 + station.e * cosNu);
  const local = rotatePoint(r * cosNu, r * sinNu, station.omega);
  const flightPath = Math.atan2(station.e * sinNu, 1 + station.e * cosNu);
  let heading = station.omega + station.nu + Math.PI / 2 - flightPath;
  if (station.isRetrograde) heading += Math.PI;
  return { x: local.x, y: local.y, heading };
}

function drawStationSquare(ctx, x, y, heading, sizePx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.fillRect(-sizePx / 2, -sizePx / 2, sizePx, sizePx);
  ctx.restore();
}

function drawStationOrbitLine(ctx, station, center, kmToPx, moonX, moonY) {
  ctx.beginPath();

  if (station.type === "earthCircular") {
    ctx.arc(center, center, station.radiusKm * kmToPx, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (station.type === "moonCircular") {
    ctx.arc(
      center + moonX * kmToPx,
      center + moonY * kmToPx,
      station.radiusKm * kmToPx,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    return;
  }

  const bKm = station.aKm * Math.sqrt(1 - station.e * station.e);
  const centerOffset = rotatePoint(-station.aKm * station.e, 0, station.omega);
  ctx.ellipse(
    center + centerOffset.x * kmToPx,
    center + centerOffset.y * kmToPx,
    station.aKm * kmToPx,
    bKm * kmToPx,
    station.omega,
    0,
    Math.PI * 2
  );
  ctx.stroke();
}

function drawEarthScene() {
  const size = earthCanvas.width;
  const center = size / 2;
  const edgeMargin = size / 20;
  const moonOrbitRadiusPx = center - edgeMargin;
  const kmToPx = moonOrbitRadiusPx / EARTH_MOON_DISTANCE_KM;
  const moonX = Math.cos(moonAngle) * EARTH_MOON_DISTANCE_KM;
  const moonY = Math.sin(moonAngle) * EARTH_MOON_DISTANCE_KM;

  earthCtx.clearRect(0, 0, size, size);
  earthCtx.lineWidth = 1;
  earthCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";

  earthCtx.beginPath();
  earthCtx.arc(center, center, moonOrbitRadiusPx, 0, Math.PI * 2);
  earthCtx.stroke();

  earthCtx.fillStyle = "rgb(255, 255, 255)";
  earthCtx.beginPath();
  earthCtx.arc(center, center, 4.2, 0, Math.PI * 2);
  earthCtx.fill();

  earthCtx.beginPath();
  earthCtx.arc(center + moonX * kmToPx, center + moonY * kmToPx, 3.5, 0, Math.PI * 2);
  earthCtx.fill();

  earthCtx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  for (let i = 0; i < stationCount; i += 1) {
    const station = allStations[i];
    drawStationOrbitLine(earthCtx, station, center, kmToPx, moonX, moonY);
  }

  earthCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
  const stationSizePx = 3.1;
  for (let i = 0; i < stationCount; i += 1) {
    const station = allStations[i];
    const orbital = stationPositionAndHeading(station, moonX, moonY);
    drawStationSquare(
      earthCtx,
      center + orbital.x * kmToPx,
      center + orbital.y * kmToPx,
      orbital.heading,
      stationSizePx
    );
  }
}

function updateEarthOrbits(dt) {
  const moonW = moonAngularSpeed();
  moonAngle += moonW * dt;

  for (const station of allStations) {
    if (station.type === "earthCircular") {
      const w = orbitalAngularSpeed(station.radiusKm);
      station.angle += (station.isRetrograde ? -1 : 1) * w * dt;
    } else if (station.type === "moonCircular") {
      const moonOrbitRadius = EARTH_MOON_DISTANCE_KM;
      const localW = orbitalAngularSpeed(moonOrbitRadius) * 16;
      station.angle += (station.isRetrograde ? -1 : 1) * localW * dt;
    } else {
      const w = orbitalAngularSpeed(station.aKm);
      station.nu += (station.isRetrograde ? -1 : 1) * w * dt;
    }
  }
}

function resizeCanvases() {
  const size = getSize();
  starCanvas.width = size;
  starCanvas.height = size;
  solarCanvas.width = size;
  solarCanvas.height = size;
  earthCanvas.width = size;
  earthCanvas.height = size;
  points = buildPoints(size, size);
  closestFiveStars = computeClosestStars(5);
  allStarships = generateAllStarships(size, size);
  starConnectivityDirty = true;
  updateStarConnectivityIndicator(true);
  updateSideScaleLabel();

  if (currentScreen === "1") drawStarScene();
  if (currentScreen === "2") drawSolarScene();
  if (currentScreen === "3") drawEarthScene();
}

function setScreen(nextScreen) {
  currentScreen = nextScreen;

  for (const button of screenButtons) {
    button.classList.toggle("active", button.dataset.screen === nextScreen);
  }
  for (const controls of screenControls) {
    controls.classList.toggle("is-hidden", controls.dataset.controls !== nextScreen);
  }

  starCanvas.classList.toggle("is-hidden", nextScreen !== "1");
  solarCanvas.classList.toggle("is-hidden", nextScreen !== "2");
  earthCanvas.classList.toggle("is-hidden", nextScreen !== "3");

  if (nextScreen === "1") drawStarScene();
  if (nextScreen === "2") drawSolarScene();
  if (nextScreen === "3") drawEarthScene();
  updateSideScaleLabel();
}

function tick(frameTs) {
  const dt = Math.min((frameTs - lastFrameTs) / 1000, 0.1);
  lastFrameTs = frameTs;

  if (currentScreen === "1") {
    updateStarships(dt);
    drawStarScene();
  } else if (currentScreen === "2") {
    for (const planet of planets) {
      planet.angle += jupiterAngularSpeed(planet.periodYears) * dt;
    }
    drawSolarScene();
  } else if (currentScreen === "3") {
    updateEarthOrbits(dt);
    drawEarthScene();
  }

  requestAnimationFrame(tick);
}

neighborsSlider.addEventListener("input", () => {
  const next = Number(neighborsSlider.value);
  neighborsToDraw = Math.max(MIN_NEIGHBORS, Math.min(MAX_NEIGHBORS, next));
  neighborsValue.textContent = String(neighborsToDraw);
  starConnectivityDirty = true;
  updateStarConnectivityIndicator(true);
  updateSliderIndicatorPosition();
  if (currentScreen === "1") drawStarScene();
});

shipCountSlider.addEventListener("input", () => {
  const next = Number(shipCountSlider.value);
  visibleStarshipCount = Math.max(MIN_STARSHIPS, Math.min(MAX_STARSHIPS, next));
  shipCountValue.textContent = String(visibleStarshipCount);
  if (currentScreen === "1") drawStarScene();
});

shipSpeedSlider.addEventListener("input", () => {
  const next = Number(shipSpeedSlider.value);
  shipSpeedSliderValue = Math.max(
    MIN_SHIP_SPEED_MULTIPLIER_SLIDER,
    Math.min(MAX_SHIP_SPEED_MULTIPLIER_SLIDER, next)
  );
  shipSpeedValue.textContent = String(shipSpeedSliderValue);
});

accelSlider.addEventListener("input", () => {
  const next = Number(accelSlider.value);
  timeAcceleration = Math.max(MIN_ACCEL, Math.min(MAX_ACCEL, next));
  accelValue.textContent = String(timeAcceleration);
});

solarNeighborsSlider.addEventListener("input", () => {
  const next = Number(solarNeighborsSlider.value);
  solarNeighborsToDraw = Math.max(MIN_SOLAR_NEIGHBORS, Math.min(MAX_SOLAR_NEIGHBORS, next));
  solarNeighborsValue.textContent = String(solarNeighborsToDraw);
  if (currentScreen === "2") drawSolarScene();
});

earthAccelSlider.addEventListener("input", () => {
  const next = Number(earthAccelSlider.value);
  earthTimeAcceleration = Math.max(MIN_ACCEL, Math.min(MAX_ACCEL, next));
  earthAccelValue.textContent = String(earthTimeAcceleration);
});

stationCountSlider.addEventListener("input", () => {
  const next = Number(stationCountSlider.value);
  stationCount = Math.max(MIN_STATIONS, Math.min(MAX_STATIONS, next));
  stationCountValue.textContent = String(stationCount);
  if (currentScreen === "3") drawEarthScene();
});

for (const button of screenButtons) {
  button.addEventListener("click", () => {
    const next = button.dataset.screen;
    if (!next) return;
    setScreen(next);
  });
}

allStations = generateAllStations();
window.addEventListener("resize", resizeCanvases);
window.addEventListener("resize", updateSliderIndicatorPosition);
resizeCanvases();
setScreen("1");
requestAnimationFrame(tick);
