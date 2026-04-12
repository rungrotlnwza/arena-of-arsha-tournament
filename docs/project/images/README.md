# โฟลเดอร์เก็บภาพประกอบเอกสาร

โฟลเดอร์นี้ใช้เก็บรูป screenshot หรือภาพประกอบสำหรับเอกสารใน `docs/project`

## แนวทางการตั้งชื่อไฟล์

- `user-register.png`
- `user-teams.png`
- `user-bracket.png`
- `admin-login.png`
- `admin-dashboard.png`
- `admin-teams.png`
- `admin-bracket.png`

## วิธีอ้างรูปในไฟล์ Markdown

ถ้าอ้างจากไฟล์ใน `docs/project` เช่น `README.md`, `user-guide.md`, `admin-guide.md`

```md
![คำอธิบายรูป](./images/ชื่อไฟล์.png)
```

ตัวอย่าง

```md
![หน้าสมัครทีม](./images/user-register.png)
![หน้าจัดการตารางแข่งขัน](./images/admin-bracket.png)
```

## หมายเหตุ

- ถ้าต้องการแปะรูปหลายรูปในเอกสารเดียว ให้เรียงภาพใกล้หัวข้อที่เกี่ยวข้อง
- ถ้ารูปมีหลายเวอร์ชัน แนะนำให้เติมคำบอกเวอร์ชันท้ายชื่อไฟล์ เช่น `admin-bracket-v2.png`
