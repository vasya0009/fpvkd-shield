# Как опубликовать на GitHub (пошагово)

Репозиторий уже подготовлен и закоммичен локально. Авторизоваться в GitHub за тебя
нельзя, поэтому финальные шаги делаешь ты. Два пути — выбери любой.

## Вариант A — через сайт GitHub (без команд, проще)

1. Зайди на https://github.com/new — создай **публичный** репозиторий, например
   `fpvkd-shield`. НЕ добавляй README/License (они уже есть). Нажми *Create*.
2. На странице нового репозитория: *uploading an existing file* → перетащи ВСЕ файлы
   из папки `fpvkd_shield` КРОМЕ папок `dist/`, `build/`, `_build_src/`
   (это сборочный мусор). Commit.
3. Собранный `dist\fpvkd_shield.exe` выложи как релиз:
   *Releases* → *Create a new release* → тег `v1.0` → перетащи `fpvkd_shield.exe`
   в *Attach binaries* → *Publish release*.
4. Скопируй прямую ссылку на `fpvkd_shield.exe` из релиза — её вставишь в Steam-пост.

## Вариант B — через git (если умеешь)

Создай пустой публичный репозиторий на github.com (без файлов), затем:
```
cd C:\ClaudeProjects\fpv_server\fpvkd_shield
git remote add origin https://github.com/ТВОЙ_ЛОГИН/fpvkd-shield.git
git push -u origin main
```
(при первом push откроется окно входа в GitHub — это нормально).
Затем на сайте сделай Release и приложи `dist\fpvkd_shield.exe` (шаг A3–A4).

## Примечания
- `dist/`, `build/`, `_build_src/`, логи — в `.gitignore`, в репозиторий не попадут.
  Это правильно: тяжёлый `.exe` раздаётся через Releases, а не в исходниках.
- Не хочешь выкладывать готовый `.exe` — можно залить только исходники; тогда люди
  соберут сами (`python build_exe.py`) или запустят из исходника. Но для «даже ребёнок»
  нужен именно `.exe` в Releases.
