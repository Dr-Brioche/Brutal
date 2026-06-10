// Le clavier : on retient à chaque instant quelles touches sont enfoncées.
//
// Astuce importante : e.code désigne la POSITION PHYSIQUE de la touche
// (nommée d'après un clavier qwerty). Donc "KeyW" = la touche Z d'un
// clavier français. Résultat : ZQSD (azerty), WASD (qwerty) et les
// flèches fonctionnent tous, sans réglage.

const enfoncees = new Set();

window.addEventListener("keydown", (e) => enfoncees.add(e.code));
window.addEventListener("keyup", (e) => enfoncees.delete(e.code));

export const clavier = {
  gauche: () => enfoncees.has("ArrowLeft") || enfoncees.has("KeyA"),
  droite: () => enfoncees.has("ArrowRight") || enfoncees.has("KeyD"),
  haut: () => enfoncees.has("ArrowUp") || enfoncees.has("KeyW"),
  bas: () => enfoncees.has("ArrowDown") || enfoncees.has("KeyS"),
};
