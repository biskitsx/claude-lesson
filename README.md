# คอร์สเรียนภาษาไทย

```
courses/<slug>/course.json      ข้อมูลคอร์ส: ชื่อ, แหล่งที่มา, domains, lessons
courses/<slug>/lessons/N.M.html เนื้อหาแต่ละบท (HTML fragment)
template/                       course.html, home.html, style.css, app.js ใช้ร่วมกันทุกคอร์ส
build.py                        สร้าง site/
site/                           ผลลัพธ์ (ห้ามแก้ตรงนี้ เพราะ build ใหม่จะทับ)
```

## Build

```bash
python3 build.py && open site/index.html
```

## เพิ่มคอร์สใหม่

1. สร้าง `courses/<slug>/course.json`:

```json
{
  "title": "ชื่อคอร์ส",
  "subtitle": "ฉบับภาษาไทย",
  "description": "คำอธิบายสั้นๆ บนการ์ดหน้าแรก",
  "source": {"name": "ชื่อแหล่งที่มา", "url": "https://..."},
  "domains": [
    {"num": "1", "name": "ชื่อ domain", "weight": 20,
     "lessons": [{"num": "1.1", "title": "ชื่อบท"}]}
  ]
}
```

   `order` (ตัวเลข น้อยขึ้นก่อน) ใช้กำหนดลำดับการ์ดบนหน้าแรก ถ้าไม่ใส่จะเรียงตาม slug ต่อท้าย

   `weight` (% ของข้อสอบ) จะใส่หรือไม่ใส่ก็ได้ บทที่ยังไม่มีไฟล์จะขึ้นว่า "ยังไม่มีเนื้อหา"

2. เขียนแต่ละบทลง `courses/<slug>/lessons/1.1.html` โดยใช้ markup เดียวกับ `courses/claude-developer-foundations/lessons/1.1.html`:
   - `<section class="lesson" id="l-1-1">` ตามด้วย `<h2>` (ชื่อบท) แล้วแบ่งหัวข้อด้วย `<h3>`
   - กล่อง: `box`, `box key`, `box sum`, `box trap`
   - แบบทดสอบ: `<div class="checkpoint">` ตัวเลือกใช้ `<ol type="A">` และเฉลยใน `<details><p><strong>B</strong> เหตุผล…</p></details>`
     ถ้าเฉลยเป็นตัวอักษร (`B` หรือ `A, C`) ระบบจะตรวจคำตอบให้อัตโนมัติ ถ้าเป็นแบบอื่นจะให้ผู้เรียนกดบอกเองว่าตอบถูกหรือผิด
3. รัน `python3 build.py`

Progress ของแต่ละคอร์สเก็บแยกกันใน localStorage ภายใต้ key `quiz:<slug>`
