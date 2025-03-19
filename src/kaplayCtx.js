import kaplay from "kaplay";

export const k = kaplay({
  touchToMouse: true,
  global: false,
  canvas: document.getElementById("game"),
});
