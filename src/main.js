import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaplayCtx";
import { displayDialog, setCamScale } from "./utils";

// Define an offset constant for the head's vertical placement
const HEAD_OFFSET_Y = -60;

const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
};

let isMovingWithMouse = false;

k.loadSprite("spritesheet", "./larz.png", {
  sliceX: 56,
  sliceY: 40,
  anims: {
    // BODY animations
    "idle-down": 59,
    "walk-down": { from: 298, to: 303, loop: true, speed: 8 },
    "idle-side": 56,
    "walk-side": { from: 280, to: 285, loop: true, speed: 8 },
    "idle-up": 57,
    "walk-up": { from: 286, to: 291, loop: true, speed: 8 },

    // HEAD animations
    "idle-down-head": 3,
    "walk-down-head": { from: 242, to: 247, loop: true, speed: 8 },
    // Optional head animations for other directions:
    "idle-up-head": 1, // example frame – adjust as needed
    "walk-up-head": { from: 118, to: 123, loop: true, speed: 8 },
    "idle-side-head": 0, // example frame – adjust as needed
    "walk-side-head": { from: 224, to: 229, loop: true, speed: 8 },
  },
});

k.loadSprite("map", "./map.png");

k.setBackground(k.Color.fromHex("#000000"));

// Declare these so they can be accessed in the helper function
let playerBody;
let playerHead;

// Helper function to set both body and head animations based on direction and state
function setPlayerAnim(direction, state) {
  // state should be "walk" or "idle"
  let bodyAnim = "";
  let headAnim = "";

  if (direction === "up") {
    bodyAnim = state === "walk" ? "walk-up" : "idle-up";
    headAnim = state === "walk" ? "walk-up-head" : "idle-up-head";
  } else if (direction === "down") {
    bodyAnim = state === "walk" ? "walk-down" : "idle-down";
    headAnim = state === "walk" ? "walk-down-head" : "idle-down-head";
  } else if (direction === "left" || direction === "right") {
    bodyAnim = state === "walk" ? "walk-side" : "idle-side";
    headAnim = state === "walk" ? "walk-side-head" : "idle-side-head";
  }

  // Set animations on both sprites
  playerBody.play(bodyAnim);
  playerHead.play(headAnim);

  // Flip the body sprite if facing left
  if (direction === "left") {
    playerBody.flipX = true;
    playerHead.flipX = true;
  } else if (direction === "right") {
    playerBody.flipX = false;
    playerHead.flipX = false;
  }
}

k.scene("main", async () => {
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);

  // Create the BODY sprite (handles collisions, movement, etc.)
  playerBody = k.make([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({ shape: new k.Rect(k.vec2(0, 3), 10, 10) }),
    k.body(),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    { speed: 250, direction: "down", isInDialog: false },
    "player",
  ]);

  // Create the HEAD sprite (will follow the body)
  playerHead = k.make([
    k.sprite("spritesheet", { anim: "idle-down-head" }),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    "head",
  ]);

  // Keep the head positioned over the body using the defined offset
  playerHead.onUpdate(() => {
    playerHead.pos.x = playerBody.pos.x;
    playerHead.pos.y = playerBody.pos.y + HEAD_OFFSET_Y;
  });

  k.add(playerBody);
  k.add(playerHead);

  // Set up map layers and collision boundaries
  for (const layer of layers) {
    if (layer.name === "bounds") {
      for (const outerBoundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(
              k.vec2(0),
              outerBoundary.width,
              outerBoundary.height
            ),
          }),
          k.body({ isStatic: true }),
          k.pos(outerBoundary.x, outerBoundary.y),
          outerBoundary.name,
        ]);
      }
    }

    if (layer.name === "propbounds") {
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);
        if (boundary.name) {
          playerBody.onCollide(boundary.name, () => {
            playerBody.isInDialog = true;
            // When colliding, revert to idle based on current direction
            setPlayerAnim(playerBody.direction, "idle");
            displayDialog(
              dialogueData[boundary.name] ?? "There is no data for this object",
              () => {
                playerBody.isInDialog = false;
              }
            );
          });
        }
      }
      continue;
    }

    if (layer.name === "spawnpoint") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          playerBody.pos = k.vec2(
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor
          );
          continue;
        }
      }
    }
  }

  setCamScale(k);
  k.onResize(() => setCamScale(k));

  k.onUpdate(() => {
    // Camera follows the body sprite
    k.setCamPos(playerBody.pos.x, playerBody.pos.y + 100);
  });

  // ---------- MOUSE MOVEMENT ----------
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || playerBody.isInDialog) return;
    const worldMousePos = k.toWorld(k.mousePos());
    playerBody.moveTo(worldMousePos, playerBody.speed);
    const mouseAngle = playerBody.pos.angle(worldMousePos);
    const lowerBound = 50;
    const upperBound = 125;
    isMovingWithMouse = true;

    if (mouseAngle > lowerBound && mouseAngle < upperBound) {
      playerBody.direction = "up";
      setPlayerAnim("up", "walk");
    } else if (mouseAngle < -lowerBound && mouseAngle > -upperBound) {
      playerBody.direction = "down";
      setPlayerAnim("down", "walk");
    } else if (Math.abs(mouseAngle) > upperBound) {
      playerBody.direction = "right";
      setPlayerAnim("right", "walk");
    } else {
      playerBody.direction = "left";
      setPlayerAnim("left", "walk");
    }
  });

  // ---------- KEYBOARD MOVEMENT ----------
  k.onKeyDown("w", () => {
    if (playerBody.isInDialog) return;
    if (!keyState.w) {
      keyState.w = true;
      playerBody.direction = "up";
      setPlayerAnim("up", "walk");
    }
    playerBody.move(0, -playerBody.speed);
  });
  k.onKeyRelease("w", () => {
    keyState.w = false;
  });

  k.onKeyDown("s", () => {
    if (playerBody.isInDialog) return;
    if (!keyState.s) {
      keyState.s = true;
      playerBody.direction = "down";
      setPlayerAnim("down", "walk");
    }
    playerBody.move(0, playerBody.speed);
  });
  k.onKeyRelease("s", () => {
    keyState.s = false;
  });

  k.onKeyDown("a", () => {
    if (playerBody.isInDialog) return;
    if (!keyState.a) {
      keyState.a = true;
      playerBody.direction = "left";
      setPlayerAnim("left", "walk");
    }
    playerBody.move(-playerBody.speed, 0);
  });
  k.onKeyRelease("a", () => {
    keyState.a = false;
  });

  k.onKeyDown("d", () => {
    if (playerBody.isInDialog) return;
    if (!keyState.d) {
      keyState.d = true;
      playerBody.direction = "right";
      setPlayerAnim("right", "walk");
    }
    playerBody.move(playerBody.speed, 0);
  });
  k.onKeyRelease("d", () => {
    keyState.d = false;
  });

  // ---------- IDLE when no keys are pressed ----------
  k.onUpdate(() => {
    if (isMovingWithMouse) return;
    if (
      !k.isKeyDown("w") &&
      !k.isKeyDown("a") &&
      !k.isKeyDown("s") &&
      !k.isKeyDown("d") &&
      !playerBody.isInDialog
    ) {
      setPlayerAnim(playerBody.direction, "idle");
    }
  });

  // When the mouse is released, revert to idle
  k.onMouseRelease(() => {
    isMovingWithMouse = false;
    setPlayerAnim(playerBody.direction, "idle");
  });
});

k.go("main");
