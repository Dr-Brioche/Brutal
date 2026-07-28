# Aperçu RÉEL des cartes : rend garnirCarte() avec le vrai CSS d'index.html dans
# un navigateur headless (Playwright) et capture une image. Sert à vérifier le
# visuel des cartes sans lancer tout le jeu.
#
# Les cartes sont prises dans le VRAI catalogue (jeu/data/cartes.js) : ce qu'on
# voit est donc ce que le joueur voit, écussons compris (« all » en bas-droite,
# « cac » / « dist » en bas-gauche).
#
#   Prérequis : pip install playwright   (le navigateur est déjà installé)
#   Usage     : python3 outils/apercu-cartes.py [sortie.png] [--langue fr|en] [id,id,…]
#
# Sans liste d'ids, on montre un ÉCHANTILLON choisi pour couvrir tous les cas
# d'écusson (mêlée simple, distance, AOE mêlée, AOE distance, carte sans dégâts).
import json
import os
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

args = [a for a in sys.argv[1:]]
langue = "fr"
if "--langue" in args:
    i = args.index("--langue")
    langue = args[i + 1]
    del args[i:i + 2]
SORTIE = args[0] if args and args[0].endswith(".png") else "/tmp/apercu-cartes.png"
if args and args[0].endswith(".png"):
    args = args[1:]

# Échantillon par défaut : un cas par combinaison d'écussons.
IDS = args[0].split(",") if args else [
    "frappe",             # mêlée, dégâts simples          → cac
    "boule-de-feu",       # sort à distance                → dist
    "giant-swing",        # mêlée + frappe tout le monde   → cac + tous
    "nuee-toxique",       # distance + tout le monde       → dist + tous
    "mur-de-fer",         # défense pure                   → aucun écusson
    "danse-empoisonnee",  # mêlée AOE (la Force compte enfin)
]

PAGE = os.path.join(RACINE, "_apercu_tmp.html")
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
 // La LANGUE d'abord : les écussons et les noms de cartes en dépendent.
 const {definirLangue}=await import('./jeu/systems/langue.js');
 definirLangue(""" + json.dumps(langue) + """);
 const {installerLangueDonnees}=await import('./jeu/systems/i18n_donnees.js');
 installerLangueDonnees();
 const {CARTES}=await import('./jeu/data/cartes.js');
 const {garnirCarte}=await import('./jeu/ui/carte.js');
 const manquants=[];
 for(const id of """ + json.dumps(IDS) + """){
   const c=CARTES[id];
   if(!c){manquants.push(id);continue;}
   const e=document.createElement('button');e.className='combat-carte';
   garnirCarte(e,c);document.getElementById('main').append(e);
 }
 window.__manquants=manquants;
 await Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;})));
 window.__ready=true;
</script></body></html>""")

srv = subprocess.Popen(["python3", "-m", "http.server", "8099"], cwd=RACINE,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        pg = b.new_page(viewport={"width": 1400, "height": 780}, device_scale_factor=2)
        erreurs = []
        pg.on("pageerror", lambda e: erreurs.append(str(e)))
        pg.goto("http://localhost:8099/_apercu_tmp.html")
        pg.wait_for_function("window.__ready===true", timeout=8000)
        pg.wait_for_timeout(400)
        manquants = pg.evaluate("window.__manquants")
        pg.locator("#main").screenshot(path=SORTIE)
        b.close()
    if manquants:
        print("⚠ cartes introuvables :", ", ".join(manquants))
    if erreurs:
        print("⚠ erreurs JS :", erreurs)
    print(f"capture ({langue}) ->", SORTIE)
finally:
    srv.terminate()
    os.remove(PAGE)
