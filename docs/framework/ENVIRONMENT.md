# Environment Variables

โปรเจกต์นี้ใช้ไฟล์ `.env` สำหรับการตั้งค่าพฤติกรรมของระบบ  
ก่อนเริ่มใช้งาน ให้คัดลอกไฟล์ `example.env` และเปลี่ยนชื่อเป็น `.env`

```bash
cp example.env .env
```

จากนั้นสามารถปรับค่าต่าง ๆ ได้ตามต้องการ

## Available Variables

| Variable     | Description               | Default |
| ------------ | ------------------------- | ------- |
| PORT         | พอร์ตสำหรับรันเซิร์ฟเวอร์ | 3000    |
| LIVERELOAD   | เปิดหรือปิด Live Reload   | true    |
| DB_HOST      | โฮสต์ MySQL/MariaDB       | localhost |
| DB_USER      | ชื่อผู้ใช้ฐานข้อมูล       | root    |
| DB_PASSWORD  | รหัสผ่านฐานข้อมูล         | (ว่าง)  |
| DB_NAME      | ชื่อฐานข้อมูล             | mydb    |
| JWT_SECRET   | คีย์ลับสำหรับลงนาม JWT   | (ต้องตั้งค่า) |

## Live Reload

DevTeam Framework 2 รองรับ Live Reload สำหรับการพัฒนา  
หากต้องการปิดใช้งาน ให้ตั้งค่าในไฟล์ `.env`

```env
LIVERELOAD=true
```

เมื่อเปิดใช้งาน ระบบจะรีเฟรชหน้าเว็บอัตโนมัติเมื่อมีการแก้ไขไฟล์  
เหมาะสำหรับการพัฒนา Frontend โดยไม่ต้องรีสตาร์ทเซิร์ฟเวอร์

> หมายเหตุ: Live Reload ถูกออกแบบมาเพื่อใช้งานในโหมด Development เท่านั้น
