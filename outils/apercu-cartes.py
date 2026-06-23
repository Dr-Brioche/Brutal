# Aperçu RÉEL des cartes : rend garnirCarte() avec le vrai CSS d'index.html dans
# un navigateur headless (Playwright) et capture une image. Sert à vérifier le
# visuel des cartes sans lancer tout le jeu.
#   Prérequis : pip install playwright && python3 -m playwright install chromium
#   Usage     : python3 outils/apercu-cartes.py [sortie.png]
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = sys.argv[1] if len(sys.argv) > 1 else "/tmp/apercu-cartes.png"
PAGE = os.path.join(RACINE, "_apercu_tmp.html")

CARTES = [
    {"id": "frappe", "nom": "Strike", "cout": 1, "type": "attaque", "texte": "Deal 6 damage."},
    {"id": "pioche-chanceuse", "nom": "Lucky Draw", "cout": 1, "type": "buff",
     "texte": "Draw 3 cards. Keep those costing less than 3, discard the rest."},
    {"id": "mur-de-fer", "nom": "Iron Wall", "cout": 1, "type": "defense", "texte": "Gain 8 Stone."},
]
import json
open(PAGE, "w").write("""<!doctype html><html><head><meta charset="utf-8">
<style id="base"></style><style>
 body{margin:0;background:#1a1822}
 #scene{height:100vh;container-type:size;display:flex;align-items:center;justify-content:center}
 #main{display:flex;gap:18px;align-items:flex-end;--carte-l:30cqh}
 #main .combat-carte{transform:none!important}
</style></head><body><div id="scene"><div id="main"></div></div>
<script type="module">
 const html=await(await fetch('index.html')).text();
 const m=html.match(/<style>([\\s\\S]*?)<\\/style>/); if(m)document.getElementById('base').textContent=m[1];
 const {garnirCarte}=await import('./jeu/ui/carte.js');
 for(const c of """ + json.dumps(CARTES) + """){const e=document.createElement('button');e.className='combat-carte';garnirCarte(e,c);document.getElementById('main').append(e);}
 await Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;})));
 window.__ready=true;
</script></body></html>""")

srv = subprocess.Popen(["python3", "-m", "http.server", "8099"], cwd=RACINE,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1150, "height": 780}, device_scale_factor=2)
        pg.goto("http://localhost:8099/_apercu_tmp.html")
        pg.wait_for_function("window.__ready===true", timeout=8000)
        pg.wait_for_timeout(400)
        pg.locator("#main").screenshot(path=SORTIE)
        b.close()
    print("capture ->", SORTIE)
finally:
    srv.terminate()
    os.remove(PAGE)
