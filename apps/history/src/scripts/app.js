import { loadScenarios } from "./scenarios.js";

const elements = {
  continueBtn: document.getElementById("continue-btn"),
  errorBar: document.getElementById("error-bar"),
  loader: document.getElementById("loader"),
  narrationText: document.getElementById("narration-text"),
  pauseBtn: document.getElementById("pause-btn"),
  playBtn: document.getElementById("play-btn"),
  progressFill: document.getElementById("progress-fill"),
  restartBtn: document.getElementById("restart-btn"),
  scenarioDescription: document.getElementById("scenario-description"),
  scenarioSelect: document.getElementById("scenario-select"),
  scenarioSubtitle: document.getElementById("scenario-subtitle"),
  scenarioTitle: document.getElementById("scenario-title"),
  sceneTitle: document.getElementById("scene-title"),
  statusCommand: document.getElementById("status-command"),
  statusNote: document.getElementById("status-note"),
  statusProgress: document.getElementById("status-progress"),
  statusState: document.getElementById("status-state"),
  stopBtn: document.getElementById("stop-btn"),
  svg: d3.select("#map-svg"),
};

let width = 0;
let height = 0;
let projection = null;
let pathGen = null;
let countriesFeature = null;
let countryByName = {};
let activeScenario = null;
let scenarios = [];

const svg = elements.svg;
svg.append("defs");
const mainG = svg.append("g").attr("class", "world");
const mapLayer = mainG.append("g").attr("class", "map");
const markLayer = mainG.append("g").attr("class", "persist");
const tempLayer = mainG.append("g").attr("class", "temp");
const labelLayer = mainG.append("g").attr("class", "labels");

const STYLE_KEYWORDS = new Set(["sharp", "dashed", "curved", "arc", "straight"]);
const NAMED_COLORS = new Set(["red", "green", "blue", "yellow", "white", "black", "orange", "purple", "gold", "silver", "gray", "grey", "pink", "cyan"]);
const initialNarration = "Choose a scenario and press Play to begin.";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showError(message) {
  elements.errorBar.textContent = `x ${message}`;
  elements.errorBar.classList.add("visible");
  clearTimeout(showError.timer);
  showError.timer = setTimeout(() => elements.errorBar.classList.remove("visible"), 5000);
}

function hideError() {
  elements.errorBar.classList.remove("visible");
}

function setStatus({ state, note, command, progress }) {
  if (state !== undefined) {
    elements.statusState.textContent = state;
  }
  if (note !== undefined) {
    elements.statusNote.textContent = note;
  }
  if (command !== undefined) {
    elements.statusCommand.textContent = command;
  }
  if (progress !== undefined) {
    elements.statusProgress.textContent = progress;
  }
}

function updateControls(player) {
  const atlasReady = Boolean(projection && activeScenario);
  const running = player.state === "running";
  const paused = player.state === "paused";
  const waiting = player.state === "waiting";
  const canResume = paused || waiting;
  const canStop = running || paused || waiting;

  elements.playBtn.disabled = !atlasReady || running;
  elements.pauseBtn.disabled = !running;
  elements.continueBtn.disabled = !canResume;
  elements.restartBtn.disabled = !atlasReady;
  elements.stopBtn.disabled = !canStop;
}

function resize() {
  const rect = document.querySelector(".map-pane").getBoundingClientRect();
  width = rect.width;
  height = rect.height;

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  if (!countriesFeature) {
    return;
  }

  projection = d3.geoNaturalEarth1().fitSize([width * 0.98, height * 0.95], countriesFeature);
  projection.translate([width / 2, height / 2 + 10]);
  pathGen = d3.geoPath(projection);
  redrawMap();
  runtime.renderAll();
}

function redrawMap() {
  mapLayer.selectAll("*").remove();
  mapLayer.append("path").datum({ type: "Sphere" }).attr("class", "ocean").attr("d", pathGen);
  mapLayer.append("path").datum(d3.geoGraticule10()).attr("class", "graticule").attr("d", pathGen);
  mapLayer
    .selectAll(".country")
    .data(countriesFeature.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", pathGen)
    .attr("data-name", (feature) => feature.properties.name);
  mapLayer.append("path").datum({ type: "Sphere" }).attr("class", "sphere").attr("d", pathGen);
}

async function loadWorld() {
  const urls = [
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
    "https://unpkg.com/world-atlas@2/countries-110m.json",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(String(response.status));
      }

      const topo = await response.json();
      countriesFeature = topojson.feature(topo, topo.objects.countries);
      countryByName = {};

      for (const feature of countriesFeature.features) {
        const name = feature.properties.name;
        if (name) {
          countryByName[name.toLowerCase()] = feature;
        }
      }

      const aliases = {
        usa: "United States of America",
        us: "United States of America",
        uk: "United Kingdom",
        britain: "United Kingdom",
        russia: "Russia",
        "czech republic": "Czechia",
        holland: "Netherlands",
        korea: "South Korea",
      };

      for (const [alias, actualName] of Object.entries(aliases)) {
        const feature = countryByName[actualName.toLowerCase()];
        if (feature) {
          countryByName[alias] = feature;
        }
      }

      elements.loader.style.display = "none";
      resize();
      return;
    } catch {
      continue;
    }
  }

  elements.loader.textContent = "Atlas failed to load";
  throw new Error("Atlas failed to load");
}

const zoomBehavior = d3.zoom()
  .scaleExtent([0.5, 8])
  .filter((event) => !event.ctrlKey && event.type !== "dblclick")
  .on("zoom", (event) => {
    if (event.sourceEvent || runtime.cameraTransitioning) {
      mainG.attr("transform", event.transform);
      runtime.cameraTransform = event.transform;
    }
  });

svg.call(zoomBehavior).on("dblclick.zoom", null);
svg.on("dblclick", () => {
  runtime.resetCamera(600);
});

function findCommentIdx(line) {
  let inQuote = false;
  let bracketDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      inQuote = !inQuote;
    } else if (!inQuote && char === "[") {
      bracketDepth += 1;
    } else if (!inQuote && char === "]") {
      bracketDepth -= 1;
    } else if (!inQuote && bracketDepth === 0 && char === "#") {
      return index;
    }
  }

  return -1;
}

function tokenize(line) {
  const tokens = [];
  let current = "";
  let inQuote = false;
  let bracketDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      inQuote = !inQuote;
      current += char;
      continue;
    }

    if (!inQuote) {
      if (char === "[") {
        bracketDepth += 1;
        current += char;
        continue;
      }
      if (char === "]") {
        bracketDepth -= 1;
        current += char;
        continue;
      }
      if ((char === " " || char === "\t") && bracketDepth === 0) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith("[")) {
    const matches = trimmed.match(/\[([^\[\]]+)\]/g) || [];
    const coords = matches.map((match) => match.slice(1, -1).split(",").map((part) => parseFloat(part.trim())));
    if (coords.length === 0) {
      return null;
    }
    if (coords.length === 1) {
      return coords[0];
    }
    return coords;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  return trimmed;
}

function parseArgs(tokens) {
  const args = { _positional: [] };

  for (const token of tokens) {
    let colonIndex = -1;
    let bracketDepth = 0;
    let inQuote = false;

    for (let index = 0; index < token.length; index += 1) {
      const char = token[index];
      if (char === "\"") {
        inQuote = !inQuote;
      } else if (!inQuote && char === "[") {
        bracketDepth += 1;
      } else if (!inQuote && char === "]") {
        bracketDepth -= 1;
      } else if (!inQuote && bracketDepth === 0 && char === ":") {
        colonIndex = index;
        break;
      }
    }

    if (colonIndex > 0) {
      const key = token.slice(0, colonIndex);
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        args[key] = parseValue(token.slice(colonIndex + 1));
        continue;
      }
    }

    args._positional.push(parseValue(token));
  }

  return args;
}

function liftPositionals(args) {
  const remaining = [];

  for (const value of args._positional) {
    if (typeof value === "string") {
      if (STYLE_KEYWORDS.has(value) && args.style === undefined) {
        args.style = value;
        continue;
      }

      if ((NAMED_COLORS.has(value) || value.startsWith("#")) && args.color === undefined) {
        args.color = value;
        continue;
      }
    }

    remaining.push(value);
  }

  args._positional = remaining;
}

function parseDSL(source) {
  const commands = [];
  const lines = source.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const commentIndex = findCommentIdx(rawLine);
    const line = (commentIndex >= 0 ? rawLine.slice(0, commentIndex) : rawLine).trim();
    if (!line) {
      continue;
    }

    const tokens = tokenize(line);
    if (!tokens.length) {
      continue;
    }

    const cmd = tokens.shift();
    commands.push({
      args: parseArgs(tokens),
      cmd,
      line: index + 1,
      raw: line,
    });
  }

  return commands;
}

class Runtime {
  constructor() {
    this.state = "idle";
    this.commands = [];
    this.pc = 0;
    this.polygons = new Map();
    this.renderables = [];
    this.cameraTransform = d3.zoomIdentity;
    this.cameraTransitioning = false;
    this.runToken = 0;
  }

  load(source) {
    this.stop({ resetNarration: true, keepScenarioMeta: true });
    this.commands = parseDSL(source);
    this.pc = 0;
    this.polygons.clear();
    this.state = "ready";
    this.setProgress();
    setStatus({
      command: "ready",
      note: "Scenario loaded. Press Play to begin.",
      state: "Ready",
    });
    updateControls(this);
  }

  async start({ restart = false } = {}) {
    if (!activeScenario) {
      return;
    }

    if (restart || this.state === "stopped" || this.state === "idle") {
      this.load(activeScenario.script);
    }

    if (this.state === "waiting" || this.state === "paused") {
      this.resume();
      return;
    }

    if (this.state === "running") {
      return;
    }

    this.state = "running";
    setStatus({
      state: "Playing",
      note: "Playing scenario narration.",
    });
    updateControls(this);
    const token = ++this.runToken;
    await this.step(token);
  }

  pause() {
    if (this.state !== "running") {
      return;
    }

    this.state = "paused";
    setStatus({
      state: "Paused",
      note: "Playback paused. Press Continue to resume.",
    });
    updateControls(this);
  }

  resume() {
    if (this.state !== "paused" && this.state !== "waiting") {
      return;
    }

    this.state = "running";
    setStatus({
      state: "Playing",
      note: "Playing scenario narration.",
    });
    updateControls(this);
    const token = ++this.runToken;
    this.step(token);
  }

  stop({ resetNarration = false, keepScenarioMeta = false } = {}) {
    this.runToken += 1;
    this.state = "stopped";
    this.pc = 0;
    this.clearAll();
    this.polygons.clear();
    this.resetCamera(0);

    if (resetNarration) {
      elements.sceneTitle.textContent = "";
      elements.narrationText.textContent = initialNarration;
    }

    this.setProgress();
    setStatus({
      state: keepScenarioMeta ? "Ready" : "Stopped",
      note: keepScenarioMeta ? "Scenario loaded. Press Play to begin." : "Playback stopped. Press Play to start again.",
      command: "idle",
    });
    updateControls(this);
  }

  setProgress() {
    const total = this.commands.length;
    elements.progressFill.style.width = total ? `${(this.pc / total) * 100}%` : "0%";
    setStatus({
      progress: `${Math.min(this.pc, total)} / ${total}`,
    });
  }

  async step(token) {
    while (this.pc < this.commands.length) {
      if (token !== this.runToken || this.state !== "running") {
        return;
      }

      const command = this.commands[this.pc];
      this.pc += 1;
      this.setProgress();
      setStatus({
        command: `${command.line}: ${command.cmd}`,
      });

      try {
        await this.execute(command, token);
      } catch (error) {
        showError(`Line ${command.line}: ${error.message}`);
        this.state = "paused";
        setStatus({
          state: "Error",
          note: "Playback paused because a command failed.",
        });
        updateControls(this);
        return;
      }
    }

    if (token === this.runToken) {
      this.state = "completed";
      setStatus({
        state: "Complete",
        note: "Scenario complete. Press Restart to play again.",
        command: "complete",
      });
      updateControls(this);
    }
  }

  async execute(command, token) {
    const { args, cmd } = command;
    liftPositionals(args);
    const positional = args._positional;

    switch (cmd) {
      case "title":
        elements.sceneTitle.textContent = positional[0] || args.text || "";
        return;
      case "say":
        elements.narrationText.textContent = positional[0] || args.text || "";
        return;
      case "wait":
        this.state = "waiting";
        setStatus({
          state: "Waiting",
          note: "Waiting for Continue.",
        });
        updateControls(this);
        return;
      case "delay":
        await this.pauseableDelay(positional[0] || args.ms || 500, token);
        return;
      case "clear":
        this.clearByLayer("temp");
        return;
      case "clearall":
        this.clearAll();
        return;
      case "reset":
        this.clearAll();
        this.resetCamera();
        return;
      case "define":
        this.defineShape(positional, args);
        return;
      case "arrow":
        this.drawArrow(args);
        return;
      case "highlight":
        this.drawRegion(args, "temp");
        return;
      case "mark":
        this.drawRegion(args, "mark");
        return;
      case "pulse":
        this.drawPulse(args);
        return;
      case "label":
        this.drawLabel(args);
        return;
      case "marker":
        this.drawMarker(args);
        return;
      case "camera":
        await this.moveCamera(args, token);
        return;
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }

  async pauseableDelay(duration, token) {
    let remaining = duration;

    while (remaining > 0) {
      if (token !== this.runToken) {
        return;
      }
      if (this.state === "paused") {
        await wait(60);
        continue;
      }
      if (this.state === "waiting") {
        return;
      }
      const slice = Math.min(remaining, 40);
      const startedAt = performance.now();
      await wait(slice);
      remaining -= performance.now() - startedAt;
    }
  }

  async moveCamera(args, token) {
    const center = args.center;
    const zoom = args.zoom !== undefined ? +args.zoom : 1;
    const duration = args.duration !== undefined ? +args.duration : 1500;
    let transform;

    if (!center && zoom === 1) {
      transform = d3.zoomIdentity;
    } else {
      const point = center ? projection([center[1], center[0]]) : [width / 2, height / 2];
      const tx = width / 2 - point[0] * zoom;
      const ty = height / 2 - point[1] * zoom;
      transform = d3.zoomIdentity.translate(tx, ty).scale(zoom);
    }

    this.cameraTransitioning = true;
    const transition = svg.transition().duration(duration).ease(d3.easeCubicInOut).call(zoomBehavior.transform, transform);
    await transition.end().catch(() => {});
    this.cameraTransitioning = false;

    if (token === this.runToken) {
      this.cameraTransform = transform;
    }
  }

  resetCamera(duration = 800) {
    this.cameraTransitioning = duration > 0;
    const transition = svg.transition().duration(duration).ease(d3.easeCubicInOut).call(zoomBehavior.transform, d3.zoomIdentity);
    transition.end().catch(() => {}).finally(() => {
      this.cameraTransitioning = false;
    });
    this.cameraTransform = d3.zoomIdentity;
  }

  defineShape(positional) {
    const name = positional[0];
    const type = positional[1] || "polygon";
    const coords = positional[2];

    if (!name || !coords) {
      throw new Error("define requires: define <name> polygon [lat,lon],[lat,lon],...");
    }

    if (type !== "polygon") {
      throw new Error(`Unsupported shape type: ${type}`);
    }

    const points = Array.isArray(coords[0]) ? coords : [coords];
    const ring = points.map((coord) => [coord[1], coord[0]]);
    const [firstLon, firstLat] = ring[0];
    const [lastLon, lastLat] = ring[ring.length - 1];
    if (firstLon !== lastLon || firstLat !== lastLat) {
      ring.push([firstLon, firstLat]);
    }

    this.polygons.set(name.toLowerCase(), {
      geometry: { coordinates: [ring], type: "Polygon" },
      properties: { name },
      type: "Feature",
    });
  }

  resolveShape(name) {
    if (!name) {
      return null;
    }

    const key = String(name).toLowerCase();
    return this.polygons.get(key) || countryByName[key] || null;
  }

  createRenderable(layer, draw) {
    const renderable = {
      draw,
      layer,
      node: null,
      rafId: null,
      timerId: null,
      stopped: false,
      stop() {
        this.stopped = true;
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
        }
        if (this.timerId) {
          clearTimeout(this.timerId);
        }
        if (this.node) {
          d3.select(this.node).interrupt();
          this.node.remove();
        }
      },
    };

    this.renderables.push(renderable);
    this.drawRenderable(renderable);
    return renderable;
  }

  drawRenderable(renderable) {
    if (renderable.node) {
      renderable.node.remove();
    }
    renderable.node = renderable.draw(renderable) || null;
  }

  renderAll() {
    if (!projection || !pathGen) {
      return;
    }

    for (const renderable of this.renderables) {
      if (!renderable.stopped) {
        this.drawRenderable(renderable);
      }
    }

    mainG.attr("transform", this.cameraTransform);
  }

  clearByLayer(layer) {
    this.renderables = this.renderables.filter((renderable) => {
      if (renderable.layer === layer) {
        renderable.stop();
        return false;
      }
      return true;
    });
  }

  clearAll() {
    for (const renderable of this.renderables) {
      renderable.stop();
    }
    this.renderables = [];
  }

  drawRegion(args, layer) {
    const name = args._positional[0] || args.name;
    const feature = this.resolveShape(name);
    if (!feature) {
      throw new Error(`Region not found: "${name}"`);
    }

    const color = args.color || "#c9a961";
    const opacity = args.opacity !== undefined ? +args.opacity : 0.5;
    const targetLayer = layer === "mark" ? markLayer : tempLayer;

    this.createRenderable(layer, () => targetLayer.append("path")
      .datum(feature)
      .attr("d", pathGen)
      .attr("fill", color)
      .attr("opacity", opacity)
      .attr("pointer-events", "none")
      .attr("stroke", color)
      .attr("stroke-width", 0.7)
      .node());
  }

  drawArrow(args) {
    const from = args.from || (Array.isArray(args._positional[0]) ? args._positional[0] : null);
    const to = args.to || (Array.isArray(args._positional[1]) ? args._positional[1] : null);
    if (!from || !to) {
      throw new Error("arrow requires from:[lat,lon] to:[lat,lon]");
    }

    const color = args.color || "#e8dcc8";
    const widthValue = args.width !== undefined ? +args.width : 2.5;
    const opacity = args.opacity !== undefined ? +args.opacity : 0.95;
    const style = args.style || "sharp";
    const markerId = `ah-${Math.random().toString(36).slice(2, 9)}`;

    svg.select("defs")
      .append("marker")
      .attr("id", markerId)
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 8)
      .attr("refY", 5)
      .attr("markerWidth", 4.5)
      .attr("markerHeight", 4.5)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M0,0 L10,5 L0,10 Z")
      .attr("fill", color);

    this.createRenderable("temp", (renderable) => {
      const start = projection([from[1], from[0]]);
      const end = projection([to[1], to[0]]);
      if (!start || !end) {
        return null;
      }

      let pathData;
      if (style === "curved" || style === "arc") {
        const mx = (start[0] + end[0]) / 2;
        const my = (start[1] + end[1]) / 2;
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.hypot(dx, dy) || 1;
        const offset = length * 0.25;
        const cx = mx - (dy / length) * offset;
        const cy = my + (dx / length) * offset;
        pathData = `M${start[0]},${start[1]} Q${cx},${cy} ${end[0]},${end[1]}`;
      } else {
        pathData = `M${start[0]},${start[1]} L${end[0]},${end[1]}`;
      }

      const path = tempLayer.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("marker-end", `url(#${markerId})`)
        .attr("opacity", opacity)
        .attr("stroke", color)
        .attr("stroke-linecap", "round")
        .attr("stroke-width", widthValue);

      if (style === "dashed") {
        path.attr("stroke-dasharray", `${widthValue * 3.2},${widthValue * 2.2}`);
        let offset = 0;
        const animate = () => {
          if (renderable.stopped || !path.node()?.isConnected) {
            return;
          }
          offset = (offset - 1) % 100;
          path.attr("stroke-dashoffset", offset);
          renderable.rafId = requestAnimationFrame(animate);
        };
        animate();
      } else {
        const totalLength = path.node().getTotalLength();
        path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength).transition().duration(700).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
      }

      return path.node();
    });
  }

  drawLabel(args) {
    const text = args.text || args._positional[0];
    const at = args.at;
    if (!text || !at) {
      throw new Error("label requires text:\"...\" at:[lat,lon]");
    }

    const color = args.color || "#c9a961";
    const size = args.size !== undefined ? +args.size : 13;

    this.createRenderable("temp", () => {
      const point = projection([at[1], at[0]]);
      if (!point) {
        return null;
      }

      return labelLayer.append("text")
        .attr("class", "label-text")
        .attr("fill", color)
        .attr("font-size", size)
        .attr("x", point[0])
        .attr("y", point[1])
        .text(text)
        .node();
    });
  }

  drawMarker(args) {
    const at = args.at || (Array.isArray(args._positional[0]) ? args._positional[0] : null);
    if (!at) {
      throw new Error("marker requires at:[lat,lon]");
    }

    const color = args.color || "#c9a961";
    const label = args.label;

    this.createRenderable("temp", () => {
      const point = projection([at[1], at[0]]);
      if (!point) {
        return null;
      }

      const group = tempLayer.append("g").attr("transform", `translate(${point[0]},${point[1]})`);
      group.append("circle").attr("r", 4.5).attr("fill", color).attr("stroke", "#14100c").attr("stroke-width", 1.2);
      group.append("circle").attr("r", 10).attr("fill", "none").attr("opacity", 0.35).attr("stroke", color).attr("stroke-width", 1);
      if (label) {
        group.append("text").attr("class", "label-text").attr("fill", color).attr("font-size", 12).attr("y", -11).text(label);
      }
      return group.node();
    });
  }

  drawPulse(args) {
    const name = args._positional[0];
    const at = args.at;
    const color = args.color || "#ff4d3a";

    if (at) {
      this.createRenderable("temp", (renderable) => {
        const point = projection([at[1], at[0]]);
        if (!point) {
          return null;
        }

        const group = tempLayer.append("g").attr("transform", `translate(${point[0]},${point[1]})`);
        const pulse = () => {
          if (renderable.stopped || !group.node()?.isConnected) {
            return;
          }
          group.append("circle")
            .attr("r", 3)
            .attr("fill", "none")
            .attr("opacity", 0.9)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .transition()
            .duration(1400)
            .ease(d3.easeCubicOut)
            .attr("r", 25)
            .attr("opacity", 0)
            .on("end", function onEnd() {
              d3.select(this).remove();
            });
          renderable.timerId = setTimeout(pulse, 700);
        };
        pulse();
        return group.node();
      });
      return;
    }

    const feature = this.resolveShape(name);
    if (!feature) {
      throw new Error(`Region not found: "${name}"`);
    }

    this.createRenderable("temp", (renderable) => {
      const path = tempLayer.append("path")
        .datum(feature)
        .attr("d", pathGen)
        .attr("fill", color)
        .attr("opacity", 0.55)
        .attr("stroke", color)
        .attr("stroke-width", 1.5);

      const pulsate = () => {
        if (renderable.stopped || !path.node()?.isConnected) {
          return;
        }
        path.transition().duration(900).attr("opacity", 0.15).transition().duration(900).attr("opacity", 0.55).on("end", pulsate);
      };
      pulsate();
      return path.node();
    });
  }
}

const runtime = new Runtime();

function populateScenarioPicker() {
  elements.scenarioSelect.innerHTML = "";
  for (const scenario of scenarios) {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.title;
    elements.scenarioSelect.append(option);
  }
}

function selectScenario(id) {
  activeScenario = scenarios.find((scenario) => scenario.id === id) || scenarios[0] || null;
  if (!activeScenario) {
    return;
  }

  elements.scenarioSelect.value = activeScenario.id;
  elements.scenarioTitle.textContent = activeScenario.title;
  elements.scenarioSubtitle.textContent = activeScenario.subtitle || "";
  elements.scenarioDescription.textContent = activeScenario.description || "";
  elements.sceneTitle.textContent = "";
  elements.narrationText.textContent = initialNarration;
  hideError();
  runtime.load(activeScenario.script);
}

elements.playBtn.addEventListener("click", () => {
  runtime.start();
});

elements.pauseBtn.addEventListener("click", () => {
  runtime.pause();
});

elements.continueBtn.addEventListener("click", () => {
  runtime.resume();
});

elements.restartBtn.addEventListener("click", () => {
  runtime.start({ restart: true });
});

elements.stopBtn.addEventListener("click", () => {
  runtime.stop({ resetNarration: true });
});

elements.scenarioSelect.addEventListener("change", (event) => {
  selectScenario(event.target.value);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    if (runtime.state === "waiting" || runtime.state === "paused") {
      event.preventDefault();
      runtime.resume();
    }
  }
});

window.addEventListener("resize", () => {
  if (countriesFeature) {
    resize();
  }
});

async function init() {
  try {
    setStatus({
      state: "Loading",
      note: "Loading scenarios and atlas.",
      command: "boot",
      progress: "0 / 0",
    });

    scenarios = await loadScenarios();
    populateScenarioPicker();
    await loadWorld();
    selectScenario(scenarios[0]?.id);
    setStatus({
      state: "Ready",
      note: "Choose a scenario and press Play.",
      command: "ready",
    });
    updateControls(runtime);
  } catch (error) {
    showError(error.message);
    setStatus({
      state: "Error",
      note: "The atlas could not finish loading.",
      command: "error",
    });
    updateControls(runtime);
  }
}

init();
