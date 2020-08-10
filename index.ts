//import io from 'socket.io'
import { AsciiFilter, GlowFilter } from 'pixi-filters'
import * as PIXI from 'pixi.js'
import '@pixi/graphics-extras'

let socket = io()

let type = "WebGL"
if (!PIXI.utils.isWebGLSupported()) {
  type = "canvas"
}

let isPlayerA = true
let isDisabled = false
if (location.search.includes("playerA")) {
  isPlayerA = true
} else if (location.search.includes("playerB")) {
  isPlayerA = false
}

let scale = 10

let scoreA = 0
let scoreB = 0 

PIXI.utils.sayHello(type)

let app = new PIXI.Application({
  width: 1920,
  height: 1080,
  antialias: true
});

if (window.innerHeight > window.innerWidth) {
  app.view.style.transform = "scale(" + window.innerWidth / 1920 + ")"
  app.view.style.transformOrigin = "top right"
  document.body.style.overflowX = 'hidden'
  document.body.style.overflowY = 'hidden'
} else {
  app.view.style.transform = "scale(" + window.innerHeight / 1080 + ")"
  app.view.style.transformOrigin = "top left"
  document.body.style.overflowX = 'hidden'
  document.body.style.overflowY = 'hidden'
}

let scoreAText = new PIXI.Text(scoreA.toString(), {
  fill: "#FF0000",
  fontSize: app.view.width / 3
})
scoreAText.x = app.view.width * 0.25
scoreAText.y = app.view.height / 2
scoreAText.anchor.set(0.5)
scoreAText.filters = [new AsciiFilter(4)]

let scoreBText = new PIXI.Text(scoreB.toString(), {
  fill: "#5CB5FF",
  fontSize: app.view.width / 3
})
scoreBText.x = app.view.width * 0.75
scoreBText.y = app.view.height / 2
scoreBText.anchor.set(0.5)
scoreBText.filters = [new AsciiFilter(5)]

app.stage.addChild(scoreAText, scoreBText)

app.stage.filters = []

function rgb2hsv(r: number, g: number, b: number) {
  var computedH = 0;
  var computedS = 0;
  var computedV = 0;

  if (r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255) {
    alert('RGB values must be in the range 0 to 255.');
    return;
  }

  r = r / 255; g = g / 255; b = b / 255;

  var minRGB = Math.min(r, Math.min(g, b));
  var maxRGB = Math.max(r, Math.max(g, b));

  // Black-gray-white
  if (minRGB == maxRGB) {
    computedV = minRGB;
    return [0, 0, computedV];
  }

  // Colors other than black-gray-white:
  var d = (r == minRGB) ? g - b : ((b == minRGB) ? r - g : b - r);
  var h = (r == minRGB) ? 3 : ((b == minRGB) ? 1 : 5);
  computedH = 60 * (h - d / (maxRGB - minRGB));
  computedS = (maxRGB - minRGB) / maxRGB;
  computedV = maxRGB;
  return [computedH, computedS, computedV];
}

function HSVtoRGB(h, s, v) {
  /**
   * I: An array of three elements hue (h) ∈ [0, 360], and saturation (s) and value (v) which are ∈ [0, 1]
   * O: An array of red (r), green (g), blue (b), all ∈ [0, 255]
   * Derived from https:/en.wikipedia.org/wiki/HSL_and_HSV
   * This stackexchange was the clearest derivation I found to reimplement https://cs.stackexchange.com/questions/64549/convert-hsv-to-rgb-colors
   */

  let hprime = h / 60;
  const c = v * s;
  const x = c * (1 - Math.abs(hprime % 2 - 1));
  const m = v - c;
  let r, g, b;
  if (!hprime) { r = 0; g = 0; b = 0; }
  if (hprime >= 0 && hprime < 1) { r = c; g = x; b = 0 }
  if (hprime >= 1 && hprime < 2) { r = x; g = c; b = 0 }
  if (hprime >= 2 && hprime < 3) { r = 0; g = c; b = x }
  if (hprime >= 3 && hprime < 4) { r = 0; g = x; b = c }
  if (hprime >= 4 && hprime < 5) { r = x; g = 0; b = c }
  if (hprime >= 5 && hprime < 6) { r = c; g = 0; b = x }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return [r, g, b]
}

function createCircle(color: number, radius: number, torus?: boolean) {
  const graphic = new PIXI.Graphics();
  graphic.beginFill(color);
  graphic.lineStyle(0);
  if (torus) {
    graphic.drawTorus(0, 0, radius * 3 / 4, radius, 0);
  } else {
    graphic.drawCircle(0, 0, radius);
  }
  graphic.endFill();
  const sprite = new PIXI.Sprite(app.renderer.generateTexture(graphic, PIXI.SCALE_MODES.NEAREST, 1));
  sprite.anchor.set(0.5, 0.5);
  return sprite
}

function drawRectangle(color: number, x: number, y: number, width: number, height: number): PIXI.Sprite {
  const graphic = new PIXI.Graphics();
  graphic.beginFill(color);
  graphic.lineStyle(0);
  graphic.drawRect(0, 0, width, height);
  graphic.endFill();
  const sprite = new PIXI.Sprite(app.renderer.generateTexture(graphic, PIXI.SCALE_MODES.NEAREST, 1));
  sprite.x = x
  sprite.y = y
  let rgb: string = color.toString(16).padStart(6, '0')
  let hsv = rgb2hsv(parseInt(rgb.substr(0, 2), 16), parseInt(rgb.substr(2, 2), 16), parseInt(rgb.substr(4, 2), 16))
  let v = hsv[2] * (87 / 50)
  if (v > 1) { v = 1 }
  let glowRGB = HSVtoRGB(hsv[0], hsv[1], v).map(n => n.toString(16).padStart(2, '0'))
  sprite.filters = [new GlowFilter({
    color: parseInt(glowRGB.join(''), 16),
    outerStrength: 4
  })]
  return sprite
}

function addWalls() {
  let centerSprite = drawRectangle(0x444444, app.view.width / 2, 0, app.view.width * 0.0025, app.view.height)
  let topSprite = drawRectangle(0xDEDEDE, 0, app.view.height * 0.97, app.view.width, app.view.height * 0.03)
  let bottomSprite = drawRectangle(0xDEDEDE, 0, 0, app.view.width, app.view.height * 0.03)
  let left1Sprite = drawRectangle(0xDEDEDE, 0, 0, app.view.width * 0.02, app.view.height * 0.35)
  let left2Sprite = drawRectangle(0xDEDEDE, 0, app.view.height * 0.65, app.view.width * 0.02, app.view.height * 0.35)
  let right1Sprite = drawRectangle(0xDEDEDE, app.view.width * 0.98, 0, app.view.width * 0.02, app.view.height * 0.35)
  let right2Sprite = drawRectangle(0xDEDEDE, app.view.width * 0.98, app.view.height * 0.65, app.view.width * 0.02, app.view.height * 0.5)
  app.stage.addChild(centerSprite, topSprite, bottomSprite, left1Sprite, left2Sprite, right1Sprite, right2Sprite)
}

function createPlayer(color: number, radius: number) {
  let sprite = createCircle(color, radius * scale, true);
  let rgb: string = color.toString(16).padStart(6, '0')
  let hsv = rgb2hsv(parseInt(rgb.substr(0, 2), 16), parseInt(rgb.substr(2, 2), 16), parseInt(rgb.substr(4, 2), 16))
  let v = hsv[2] * (87 / 50)
  if (v > 1) { v = 1 }
  let glowRGB = HSVtoRGB(hsv[0], hsv[1], v).map(n => n.toString(16).padStart(2, '0'))
  sprite.filters = [new GlowFilter({
    color: parseInt(glowRGB.join(''), 16),
    outerStrength: 4
  })]
  app.stage.addChild(sprite);
  return sprite
}

function createBall() {
  let sprite: PIXI.Sprite;
  sprite = createCircle(0xFFFFFF, (app.view.width * 0.025));
  sprite.anchor.set(0.5, 0.5)
  app.stage.addChild(sprite)
  return sprite
}

// Player A
let playerA = createPlayer(0xFF3333, (app.view.width * 0.04375) / scale)
// Player B
let playerB = createPlayer(0x5CB5FF, (app.view.width * 0.04375) / scale)

// Add walls
let walls = addWalls()

// Add ball
let ball = createBall()

let mousePos = {x: 0, y: 0}

app.view.addEventListener('mousemove', e => {
  if (isDisabled) {
    return
  }
  let origX = mousePos.x
  let origY = mousePos.y
  mousePos = { x: e.offsetX, y: e.offsetY }
  if ((e.offsetX > (app.view.width / 2) && isPlayerA) || (e.offsetX < (app.view.width / 2) && !isPlayerA)) {
    mousePos.x = origX
  }
  if ((e.offsetX < (app.view.width * 0.02) + (app.view.width * 0.04375)) || (e.offsetX > (app.view.width * 0.98) - (app.view.width * 0.04375))) {
    mousePos.x = origX
  }
  if (e.offsetY < (app.view.height * 0.03) + (app.view.width * 0.04375) || e.offsetY > (app.view.height * 0.97) - (app.view.width * 0.04375)) {
    mousePos.y = origY
  }
  socket.emit('cursor move', {
    playerA: isPlayerA,
    ...mousePos
  })
})

socket.on('simulation-updated', msg => {
  ball.x = msg.ball.x * scale
  ball.y = msg.ball.y * scale

  playerA.x = msg.playerA.x * scale
  playerA.y = msg.playerA.y * scale

  playerB.x = msg.playerB.x * scale
  playerB.y = msg.playerB.y * scale
})

let timeout: any;
socket.on('score', msg => {
  clearInterval(timeout)
  scoreA = msg.score.a
  scoreB = msg.score.b
  scoreAText.text = scoreA.toString()
  scoreBText.text = scoreB.toString()
  if (scoreA < scoreB) {
    scoreAText.style.fontSize = app.view.width / 4
    scoreBText.style.fontSize = app.view.width / 3
  } else if (scoreA > scoreB) {
    scoreAText.style.fontSize = app.view.width / 3
    scoreBText.style.fontSize = app.view.width / 4
  } else {
    scoreAText.style.fontSize = app.view.width / 3.5
    scoreBText.style.fontSize = app.view.width / 3.5
  }
  isDisabled = true
  timeout = setTimeout(() => {isDisabled = false}, 1000)
})

document.body.addEventListener('keydown', e => {
  if (e.key == 'c') {
    console.log(e.key)
    socket.emit('reset position', {})
  }
})

socket.on('reset position', () => {
  clearInterval(timeout)
  isDisabled = true
  timeout = setTimeout(() => {isDisabled = false}, 1000)
})

document.body.appendChild(app.view)