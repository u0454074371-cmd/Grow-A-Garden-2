# Grow Garden 2 — PLAYABLE

Deze versie is bedoeld om direct op GitHub Pages te draaien.

Belangrijk:
- Geen ES modules.
- Geen Three.js.
- Geen externe CDN.
- De game wacht NIET op Firebase.
- De 3D-achtige wereld en gameplay draaien volledig in `scripts/main.js`.
- Bij problemen met Firebase blijft de lokale game werken.

Upload de bestanden exact zo:

index.html
style.css
firebase.rules.json
scripts/
  main.js

Besturing:
WASD lopen
Shift sprinten
Spatie springen
Muis rondkijken
E interactie
1-6 is niet nodig; seeds kies je onderaan

Klik een leeg tuinveld + E = planten.
Kijk naar een rijpe crop + E = oogsten.

Voor GitHub Pages:
Settings → Pages → Deploy from branch → main → /(root)
