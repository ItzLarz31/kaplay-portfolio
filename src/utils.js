export function displayDialog(text, onDisplayEnd) {
  const dialogueUI = document.getElementById("textbox-container");
  const dialogue = document.getElementById("dialogue");
  const closeBtn = document.getElementById("btn-close");
  const canvas = document.getElementById("game");

  dialogueUI.classList.add("visible");

  let index = 0;
  let currentText = "";
  const intervalRef = setInterval(() => {
    if (index < text.length) {
      currentText += text[index];
      dialogue.innerHTML = currentText;
      index++;
      return;
    }
    clearInterval(intervalRef);
  }, 0.5);

  function onCloseBtnClick() {
    onDisplayEnd();
    dialogueUI.classList.remove("visible");
    dialogue.innerHTML = "";
    clearInterval(intervalRef);
    closeBtn.removeEventListener("click", onCloseBtnClick);
    canvas.focus();
  }

  closeBtn.addEventListener("click", onCloseBtnClick);
}

export function setCamScale(k) {
  const resizeFactor = k.width() / k.height();

  if (resizeFactor < 1) {
    k.setCamScale(k.vec2(1));
    return;
  }

  k.setCamScale(k.vec2(1.5));
}
