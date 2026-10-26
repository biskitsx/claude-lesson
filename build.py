"""Build site/ from courses/<slug>/{course.json,lessons/*.html} and template/.

site/index.html          หน้ารวมคอร์ส
site/<slug>/index.html   หน้าคอร์ส (sidebar + บทเรียนทั้งหมด)
site/assets/             style.css, app.js ใช้ร่วมกันทุกคอร์ส
"""
import html
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).parent
TPL = ROOT / "template"
OUT = ROOT / "site"


def lesson_id(num):
    return "l-" + num.replace(".", "-")


def build_course(dir):
    c = json.loads((dir / "course.json").read_text())
    nav, body = [], []
    for d in c["domains"]:
        n, name, lessons = d["num"], html.escape(d["name"]), d["lessons"]
        weight = f'{d["weight"]}% ของข้อสอบ' if d.get("weight") else ""
        items = "".join(f'<li><a href="#{lesson_id(l["num"])}"><span class="lnum">{l["num"]}</span>'
                        f'<span class="lt">{html.escape(l["title"])}</span></a></li>' for l in lessons)
        nav.append(f'<li class="dom" data-dom="{n}"><details><summary><span class="dnum">{n}</span>'
                   f'<span class="dname">{name}<small>{weight + " · " if weight else ""}{len(lessons)} บท</small></span>'
                   f'<span class="ring"></span></summary><ul>{items}</ul></details></li>')
        body.append(f'<div class="domain" id="d-{n}"><span>Domain {n}{" · " + weight if weight else ""}</span><h1>{name}</h1></div>')
        for l in lessons:
            f = dir / "lessons" / f'{l["num"]}.html'
            body.append(f.read_text() if f.exists() else
                        f'<section class="lesson" id="{lesson_id(l["num"])}"><h2>{l["num"]} {html.escape(l["title"])}</h2>'
                        f'<p class="src">ยังไม่มีเนื้อหา</p></section>')
    body = "\n".join(body)
    page = (TPL / "course.html").read_text()
    for k, v in {"SLUG": dir.name, "TITLE": html.escape(c["title"]), "SUBTITLE": html.escape(c.get("subtitle", "")),
                 "SOURCE_URL": c["source"]["url"], "SOURCE_NAME": html.escape(c["source"]["name"]),
                 "NAV": "\n".join(nav), "BODY": body}.items():
        page = page.replace("{{" + k + "}}", v)
    (OUT / dir.name).mkdir(parents=True)
    (OUT / dir.name / "index.html").write_text(page)
    n_lessons = sum(len(d["lessons"]) for d in c["domains"])
    return (f'<a class="card" href="{dir.name}/index.html" data-course="{dir.name}" data-total="{body.count(chr(34) + "checkpoint" + chr(34))}">'
            f'<h2>{html.escape(c["title"])}</h2><p>{html.escape(c.get("description", ""))}</p>'
            f'<span class="meta">{len(c["domains"])} domains · {n_lessons} บท · <span class="prog"></span></span>'
            f'<div class="meter"><i></i></div></a>')


def build():
    shutil.rmtree(OUT, ignore_errors=True)
    (OUT / "assets").mkdir(parents=True)
    for f in ("style.css", "app.js"):
        shutil.copy(TPL / f, OUT / "assets" / f)
    cards = [build_course(d) for d in sorted((ROOT / "courses").iterdir()) if (d / "course.json").exists()]
    (OUT / "index.html").write_text((TPL / "home.html").read_text().replace("{{CARDS}}", "\n".join(cards)))
    print(f"built {len(cards)} course(s) → {OUT}")


if __name__ == "__main__":
    build()
