import { Game } from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.tabIndex = 0;
canvas.focus();
new Game(canvas);
