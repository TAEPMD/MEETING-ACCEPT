# NIEM RSVP - GitHub + Vercel Setup

โปรเจกต์นี้เป็นระบบตอบรับการประชุม และระบบตอบรับการเป็นวิทยากร โดย
- Frontend: `index.html`
- Backend: Google Apps Script (`code.gs`) + Google Sheets + Google Drive

## ระบบตอบรับการเป็นวิทยากร

- Admin สร้างรายการโดยเลือก "ประเภทการตอบรับ" เป็น **เชิญเป็นวิทยากร** ในฟอร์มเพิ่ม/แก้ไขการประชุม
- ผู้ได้รับเชิญเข้าผ่านการ์ด **วิทยากร** ในหน้าแรก (หรือ QR/ลิงก์ส่วนบุคคลตามปกติ) แล้วตอบ "ยินดีรับเป็นวิทยากร" หรือ "ไม่สามารถรับเป็นวิทยากรได้"
- อีเมลยืนยัน ประวัติการตอบรับ ไฟล์ CSV และหนังสือยืนยัน (PDF) จะใช้ข้อความสำหรับวิทยากรโดยอัตโนมัติ
- ข้อมูลเก็บใน Sheet `Meetings` คอลัมน์ `eventType` (`meeting` หรือ `speaker`) — Sheet เดิมจะถูกเติมคอลัมน์นี้ให้อัตโนมัติ และแถวเดิมที่ว่างจะถือเป็นการประชุมปกติ

ไฟล์ถูกปรับให้รองรับ 2 โหมดแล้ว:
1. โหมด Apps Script ปกติ (ใช้งานผ่าน `google.script.run`)
2. โหมด Vercel static (เรียก backend ผ่าน HTTP ไปยัง Apps Script Web App)

---

## 1) ขึ้น GitHub

### วิธีผ่าน Git CLI

```bash
git init
git add .
git commit -m "Initial commit: NIEM RSVP"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### หมายเหตุ
- มี `.gitignore` ให้แล้ว
- หากมีข้อมูลลับในไฟล์อื่น ให้ตรวจสอบก่อน push

---

## 2) Deploy Frontend บน Vercel

### วิธีเร็วสุด
1. เข้า Vercel
2. Import GitHub repo นี้
3. เพิ่ม Environment Variable `GAS_API_URL` ตามหัวข้อถัดไป
4. Deploy

โปรเจกต์มี `vercel.json` แล้ว เพื่อ route ทุก path มาที่ `index.html`

### สำคัญ: ตั้งค่า Environment Variable บน Vercel

ใน Project Settings > Environment Variables ให้เพิ่ม:

- `GAS_API_URL` = `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

ระบบจะเรียกผ่าน `api/gas.js` (server-side proxy) เพื่อเลี่ยงปัญหา CORS จาก browser

---

## 3) เชื่อม Vercel กับ Backend (Apps Script)

ระบบบน Vercel ต้องรู้ URL ของ Apps Script Web App (`.../exec`) เพื่อเรียก API

### ขั้นตอน
1. Deploy Apps Script ให้เป็น Web App และได้ URL ปลายทางแบบ `.../exec`
2. ใส่ URL นั้นลง `GAS_API_URL` ใน Vercel สำหรับ Production และ Preview ที่ต้องใช้งาน
3. Deploy ใหม่

`GAS_API_URL` เป็นการตั้งค่าฝั่ง server เท่านั้น หน้าเว็บจะไม่ขอให้ผู้ใช้กรอก URL และจะไม่เก็บ URL นี้ใน browser

---

## 4) ตรวจสอบหลัง deploy

ทดสอบ flow หลัก:
1. หน้าแรกโหลดข้อมูลประชุมได้
2. Admin บันทึกประชุมได้
3. เปลี่ยน Active/Inactive ได้
4. ผู้ใช้ตอบรับได้
5. อัปโหลดวาระ/เอกสารรายบุคคลได้

หากขึ้นข้อความว่าระบบเชื่อมต่อฐานข้อมูลยังไม่ได้รับการตั้งค่า:
- ตรวจว่า Environment Variable ชื่อ `GAS_API_URL` มีค่าเป็น Apps Script Web App URL ที่ลงท้ายด้วย `/exec`
- ตรวจว่าเลือก Environment ถูกต้อง (Production/Preview)
- Redeploy หลังเพิ่มหรือแก้ Environment Variable

---

## 5) โครงสร้างไฟล์หลัก

- `index.html` : UI + logic ฝั่ง client
- `code.gs` : Backend Apps Script + API dispatcher (`doPost`)
- `vercel.json` : config สำหรับ Vercel
- `.gitignore` : ไฟล์ที่ไม่ควรขึ้น git
- `User Guide.md` : คู่มือผู้ใช้งาน
- `คู่มือการติดตั้งและการใช้งาน (User Manual).md` : คู่มือฉบับไทยเดิม
