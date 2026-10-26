#!/usr/bin/env python3
# Injects eos_shield.js into the app and builds a one-file fpvkd_shield.exe.
# Usage: python build_exe.py   (needs: pip install pyinstaller frida)
import os, subprocess, sys, tempfile, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
js   = open(os.path.join(HERE, "eos_shield.js"), encoding="utf-8").read()
tmpl = open(os.path.join(HERE, "src", "fpvkd_shield_app.py"), encoding="utf-8").read()
if "'''" in js:
    sys.exit("eos_shield.js contains ''' which would break embedding")
built = tmpl.replace("__SHIELD_JS__", js)

work = os.path.join(HERE, "_build_src")
os.makedirs(work, exist_ok=True)
app = os.path.join(work, "fpvkd_shield_app.py")
open(app, "w", encoding="utf-8").write(built)

cmd = [sys.executable, "-m", "PyInstaller", "--onefile", "--console",
       "--name", "fpvkd_shield",
       "--distpath", os.path.join(HERE, "dist"),
       "--workpath", os.path.join(HERE, "build"),
       "--specpath", os.path.join(HERE, "build"),
       app]
print("running:", " ".join(cmd))
r = subprocess.run(cmd)
if r.returncode == 0:
    print("\nOK ->", os.path.join(HERE, "dist", "fpvkd_shield.exe"))
else:
    print("\nBUILD FAILED rc=", r.returncode)
sys.exit(r.returncode)
