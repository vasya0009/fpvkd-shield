#!/usr/bin/env python3
# Attaches the anti-crash shield to a running FPV Kamikaze Drone client.
# Usage: python shield_runner.py [seconds]   (default 3600)
# Requires: pip install frida
import frida, sys, json, time, os

HERE   = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "eos_shield.js")
OUT    = os.path.join(HERE, "shield.log.jsonl")
RUN_SECS = int(sys.argv[1]) if len(sys.argv) > 1 else 3600

log = open(OUT, "a", encoding="utf-8")
def w(o):
    line = json.dumps(o, ensure_ascii=False)
    log.write(line + "\n"); log.flush()
    print(line, flush=True)

dev = frida.get_local_device()
def find():
    ps = dev.enumerate_processes()
    c = [p for p in ps if p.name.lower() == "fpvkamikazedrone-win64-shipping.exe"] or \
        [p for p in ps if "fpvkamikaze" in p.name.lower()]
    return c[0] if c else None

print("[shield] looking for the game (launch it to the main menu first)...")
t = None
for _ in range(60):
    t = find()
    if t: break
    time.sleep(1.0)
if not t:
    w({"t": "fatal", "m": "game not running — launch FPV Kamikaze Drone first"})
    sys.exit(2)

w({"t": "attach", "pid": t.pid, "name": t.name})
ses = dev.attach(t.pid)
def on_msg(m, d):
    if m.get("type") == "send": w(m["payload"])
    elif m.get("type") == "error": w({"t": "script_error", "desc": m.get("description")})
s = ses.create_script(open(SCRIPT, encoding="utf-8").read())
s.on("message", on_msg); s.load()
w({"t": "loaded", "m": "shield active — open ВЫДЕЛЕННЫЕ СЕРВЕРЫ; fakes will be hidden, no crash"})

t0 = time.time()
while time.time() - t0 < RUN_SECS:
    time.sleep(1.0)
    if not any(p.pid == t.pid for p in dev.enumerate_processes()):
        w({"t": "game_exited"}); break
w({"t": "runner_done"})
try: ses.detach()
except: pass
log.close()
