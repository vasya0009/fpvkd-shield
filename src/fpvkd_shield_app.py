#!/usr/bin/env python3
# FPV Kamikaze Drone - anti-crash shield (self-contained).
# Attaches to the running game and hides the fake "b0nehack" sessions/lobbies so the
# "Выделенные серверы" browser stops crashing. No game files are modified.
# Build: pyinstaller --onefile --name fpvkd_shield fpvkd_shield_app.py
import sys, time
try:
    import frida
except Exception:
    print("frida не найдена. Если запускаете из исходника: pip install frida")
    input("Enter для выхода..."); sys.exit(1)

SHIELD_JS = r'''
__SHIELD_JS__
'''

def log(*a): print(*a, flush=True)

def _utf8_console():
    try:
        import ctypes
        ctypes.windll.kernel32.SetConsoleOutputCP(65001)
        ctypes.windll.kernel32.SetConsoleCP(65001)
    except Exception: pass
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

def main():
    _utf8_console()
    print("="*60)
    print("  FPV Kamikaze Drone — ЩИТ от вылета браузера серверов")
    print("="*60)
    print("1) Игра должна быть ЗАПУЩЕНА (главное меню).")
    print("2) Это окно не закрывай, пока играешь.\n")
    dev = frida.get_local_device()
    def find():
        ps = dev.enumerate_processes()
        c = [p for p in ps if p.name.lower()=="fpvkamikazedrone-win64-shipping.exe"] or \
            [p for p in ps if "fpvkamikaze" in p.name.lower()]
        return c[0] if c else None
    print("[*] Ищу игру...")
    t=None
    for _ in range(120):
        t=find()
        if t: break
        time.sleep(1.0)
    if not t:
        print("[!] Игра не найдена. Сначала запусти FPV Kamikaze Drone, потом этот файл.")
        input("Enter для выхода..."); return
    print(f"[+] Нашёл игру (pid {t.pid}). Ставлю щит...")
    ses=dev.attach(t.pid)
    def on_msg(m,d):
        if m.get("type")=="send":
            p=m["payload"]
            if p.get("t")=="filter":
                log(f"    [щит] {p.get('kind')}: пришло {p.get('total')}, "
                    f"оставлено {p.get('kept')}, скрыто фейков {p.get('hidden')}")
            elif p.get("t")=="ready":
                log("[+] ЩИТ АКТИВЕН. Открывай «Выделенные серверы» — вылета не будет.")
        elif m.get("type")=="error":
            log("[script error]", m.get("description"))
    s=ses.create_script(SHIELD_JS); s.on("message", on_msg); s.load()
    try:
        while any(p.pid==t.pid for p in dev.enumerate_processes()):
            time.sleep(1.5)
    except KeyboardInterrupt:
        pass
    print("[*] Игра закрыта — щит снят.")

if __name__=="__main__":
    try: main()
    except Exception as e:
        print("Ошибка:", e); input("Enter для выхода...")
