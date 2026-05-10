const canvas = document.querySelector("#sceneCanvas");
const ctx = canvas.getContext("2d");
const viewport = document.querySelector("#viewport");
const lessonSelect = document.querySelector("#lessonSelect");
const depthSlider = document.querySelector("#depthSlider");
const voiceToggle = document.querySelector("#voiceToggle");
const labelsToggle = document.querySelector("#labelsToggle");
const startBtn = document.querySelector("#startBtn");
const resetBtn = document.querySelector("#resetBtn");
const xrBtn = document.querySelector("#xrBtn");
const statusNode = document.querySelector("#status");
const guideText = document.querySelector("#guideText");
const questionNode = document.querySelector("#question");
const answersNode = document.querySelector("#answers");
const scoreNode = document.querySelector("#score");

const lessons = {
  scale: {
    title: "Scale and Distance",
    guide:
      "Move through the space and compare the character, cube, and grid. The scene helps learners feel size relationships instead of only reading numbers.",
    question: "Which feature best teaches scale?",
    options: ["Walking around objects", "Reading a long paragraph", "Turning sound off"],
    correct: 0,
  },
  color: {
    title: "Color Theory",
    guide:
      "Warm and cool surfaces show how color directs attention in a 3D learning environment.",
    question: "What do warm colors usually do in a scene?",
    options: ["Pull attention forward", "Remove all shadows", "Make objects invisible"],
    correct: 0,
  },
  lighting: {
    title: "Lighting and Shadows",
    guide:
      "Lighting gives the scene depth. Learners compare direct light, shadow, and reflection to understand form more clearly.",
    question: "Why are shadows useful?",
    options: ["They reveal depth and contact", "They delete textures", "They stop interaction"],
    correct: 0,
  },
};

let angle = 0;
let drag = false;
let lastX = 0;
let score = 0;
let completed = new Set();

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(900, Math.floor(rect.width * scale));
  canvas.height = Math.max(620, Math.floor(rect.height * scale));
}

function project(point, centerX, centerY, depth) {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = x * cos - z * sin;
  const rz = x * sin + z * cos + depth;
  const perspective = 520 / (520 + rz);
  return {
    x: centerX + rx * perspective,
    y: centerY + y * perspective,
    size: perspective,
    z: rz,
  };
}

function drawPolygon(points, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCube(cx, cy, size, depth, colorA, colorB, colorC) {
  const s = size / 2;
  const vertices = [
    [-s, -s, -s],
    [s, -s, -s],
    [s, s, -s],
    [-s, s, -s],
    [-s, -s, s],
    [s, -s, s],
    [s, s, s],
    [-s, s, s],
  ].map(([x, y, z]) => project([x + cx, y + cy, z], canvas.width / 2, canvas.height / 2, depth));

  const faces = [
    [vertices[0], vertices[1], vertices[2], vertices[3], colorA],
    [vertices[1], vertices[5], vertices[6], vertices[2], colorB],
    [vertices[4], vertices[5], vertices[6], vertices[7], colorC],
    [vertices[0], vertices[4], vertices[7], vertices[3], colorB],
    [vertices[3], vertices[2], vertices[6], vertices[7], colorA],
  ];

  faces
    .map((face) => ({ face, z: face.slice(0, 4).reduce((sum, point) => sum + point.z, 0) / 4 }))
    .sort((a, b) => b.z - a.z)
    .forEach(({ face }) => drawPolygon(face.slice(0, 4), face[4]));
}

function drawSphere(x, y, radius, color, shine = "#ffffff") {
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.42, 4, x, y, radius);
  gradient.addColorStop(0, shine);
  gradient.addColorStop(0.32, color);
  gradient.addColorStop(1, "#4a2834");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharacter(centerX, centerY, scale, depth) {
  const bob = Math.sin(angle * 2.2) * 8;
  const body = project([0, 40 + bob, 0], centerX, centerY, depth);
  const head = project([0, -92 + bob, -20], centerX, centerY, depth);
  const leftHand = project([-88, 8 + bob, 10], centerX, centerY, depth);
  const rightHand = project([88, 8 + bob, 10], centerX, centerY, depth);

  ctx.lineWidth = Math.max(8, 15 * body.size * scale);
  ctx.strokeStyle = "#f5c85c";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(body.x - 35 * scale, body.y - 48 * scale);
  ctx.lineTo(leftHand.x, leftHand.y);
  ctx.moveTo(body.x + 35 * scale, body.y - 48 * scale);
  ctx.lineTo(rightHand.x, rightHand.y);
  ctx.stroke();

  drawSphere(body.x, body.y, 72 * body.size * scale, "#78a9ff", "#d6e4ff");
  drawSphere(head.x, head.y, 58 * head.size * scale, "#f5c85c", "#fff2bd");

  ctx.fillStyle = "#101820";
  ctx.beginPath();
  ctx.arc(head.x - 18 * scale, head.y - 8 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.arc(head.x + 18 * scale, head.y - 8 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#101820";
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.arc(head.x, head.y + 12 * scale, 19 * scale, 0.1, Math.PI - 0.1);
  ctx.stroke();
}

function drawGrid(centerX, centerY, depth, immersion) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = -8; i <= 8; i += 1) {
    const a = project([i * 70, 190, -420], centerX, centerY, depth);
    const b = project([i * 70, 190, 420], centerX, centerY, depth);
    const c = project([-560, 190, i * 70], centerX, centerY, depth);
    const d = project([560, 190, i * 70], centerX, centerY, depth);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + immersion);
    ctx.lineTo(b.x, b.y + immersion);
    ctx.moveTo(c.x, c.y + immersion);
    ctx.lineTo(d.x, d.y + immersion);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScene() {
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2 - 10;
  const immersion = Number(depthSlider.value) * 1.1;
  const depth = 260 - immersion;

  ctx.clearRect(0, 0, width, height);
  drawGrid(centerX, centerY, depth, immersion);

  const lesson = lessonSelect.value;
  const warm = lesson === "color" ? "#ff6d8f" : "#4fd3a7";
  const cool = lesson === "lighting" ? "#f5c85c" : "#78a9ff";

  drawCube(-260, 80, 120, depth + 80, warm, "#c64d6d", "#ff9daf");
  drawCube(270, 10, 150, depth + 120, cool, "#4f74bd", "#9ec0ff");
  drawCharacter(centerX, centerY, 1.08, depth);

  if (lesson === "lighting") {
    const gradient = ctx.createRadialGradient(centerX - 220, centerY - 220, 10, centerX - 220, centerY - 220, 430);
    gradient.addColorStop(0, "rgba(245,200,92,0.22)");
    gradient.addColorStop(1, "rgba(245,200,92,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  angle += 0.006;
  requestAnimationFrame(drawScene);
}

function speak(text) {
  if (!voiceToggle.checked || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1.04;
  window.speechSynthesis.speak(utterance);
}

function renderActivity() {
  const lesson = lessons[lessonSelect.value];
  questionNode.textContent = lesson.question;
  answersNode.innerHTML = "";
  lesson.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => {
      const correct = index === lesson.correct;
      button.classList.add(correct ? "correct" : "wrong");
      if (correct && !completed.has(lessonSelect.value)) {
        completed.add(lessonSelect.value);
        score += 1;
        scoreNode.textContent = `${score}/3`;
      }
      statusNode.textContent = correct ? "Correct answer" : "Try again after observing the scene";
      if (correct) showNextStep();
    });
    answersNode.appendChild(button);
  });
}

function showNextStep() {
  const lessonKeys = Object.keys(lessons);
  const currentIndex = lessonKeys.indexOf(lessonSelect.value);
  const nextKey = lessonKeys.find((key) => !completed.has(key));
  const message = document.createElement("p");
  message.className = "next-step";

  if (score >= lessonKeys.length) {
    message.textContent = "Activity complete.";
    questionNode.textContent = "Lesson complete";
    answersNode.innerHTML = "";
    answersNode.appendChild(message);
    speak("Activity complete.");
    return;
  }

  const targetKey = nextKey || lessonKeys[(currentIndex + 1) % lessonKeys.length];
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `Next: ${lessons[targetKey].title}`;
  button.addEventListener("click", () => {
    lessonSelect.value = targetKey;
    updateLesson(true);
  });

  message.textContent = "Continue with the next activity.";
  answersNode.appendChild(message);
  answersNode.appendChild(button);
}

function updateLesson(announce) {
  const lesson = lessons[lessonSelect.value];
  guideText.textContent = lesson.guide;
  statusNode.textContent = `${lesson.title} lesson active`;
  renderActivity();
  if (announce) speak(`${lesson.title}. ${lesson.guide} ${lesson.question}`);
}

startBtn.addEventListener("click", () => updateLesson(true));
lessonSelect.addEventListener("change", () => updateLesson(false));
labelsToggle.addEventListener("change", () => viewport.classList.toggle("hide-labels", !labelsToggle.checked));
resetBtn.addEventListener("click", () => {
  angle = 0;
  depthSlider.value = 55;
  viewport.classList.remove("xr-active");
  statusNode.textContent = "Scene reset";
});
xrBtn.addEventListener("click", () => {
  viewport.classList.toggle("xr-active");
  const active = viewport.classList.contains("xr-active");
  statusNode.textContent = active ? "Focus mode active" : "Standard view active";
  if (active) speak("Focus mode active. Move through the scene and inspect each learning object.");
});

viewport.addEventListener("pointerdown", (event) => {
  drag = true;
  lastX = event.clientX;
  viewport.setPointerCapture(event.pointerId);
});
viewport.addEventListener("pointermove", (event) => {
  if (!drag) return;
  angle += (event.clientX - lastX) * 0.01;
  lastX = event.clientX;
});
viewport.addEventListener("pointerup", () => {
  drag = false;
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
updateLesson(false);
drawScene();
