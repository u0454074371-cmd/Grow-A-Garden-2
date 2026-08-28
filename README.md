# Grow Garden 2 — Complete GitHub Pages build

Upload the CONTENTS of this folder to the root of your GitHub repository.

Required structure:

index.html
style.css
.nojekyll
scripts/
  data.js
  firebase.js
  game.js
  main.js
  ui.js
  world.js

This build does not require Three.js or another CDN for the 3D game.
Firebase is optional and connects in the background after the game starts.
If Firebase is unavailable, the game continues with localStorage.

Controls:
- WASD = lopen
- Shift = sprint
- Space = springen
- muis = rondkijken
- E = interactie
- 1-6 = seed selecteren
