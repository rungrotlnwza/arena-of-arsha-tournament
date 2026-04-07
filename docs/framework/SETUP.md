# การตั้งค่าระบบ

## ขั้นตอนที่ 1: Clone โปรเจกต์

Clone repository ของโปรเจกต์ที่ใช้ framework นี้ (แทนที่ URL และชื่อโฟลเดอร์ตามจริง):

```bash
git clone <URL-repository-โปรเจกต์ของคุณ>
cd <ชื่อโฟลเดอร์โปรเจกต์>
```

## ขั้นตอนที่ 2: ติดตั้ง Dependencies

ติดตั้ง dependencies ที่จำเป็น:

```bash
npm install
```

## ขั้นตอนที่ 3: ตั้งค่า Git Remotes

เพื่อให้การอัปเดตและการทำงานเป็นไปอย่างถูกต้อง ให้ตั้งค่า Git remotes ดังนี้:

1. เพิ่ม repository ของ framework เป็น remote ชื่อ `framework`:

   ```bash
   git remote add framework https://github.com/rungrotlnwza/DevTeam-EJS-FrameWork.git
   ```

2. ตรวจสอบ remotes:

   ```bash
   git remote -v
   ```

   คุณควรเห็น `origin` ชี้ไปที่ repo โปรเจกต์ของคุณ และ `framework` ชี้ไปที่ DevTeam-EJS-FrameWork

## ขั้นตอนที่ 4: อัปเดต Framework

เพื่อดึงการอัปเดตล่าสุดจาก repository ของ framework ให้รันคำสั่ง:

```bash
npm run update
```

คำสั่งนี้จะดึงการเปลี่ยนแปลงล่าสุดจาก remote `framework` มาใช้งาน

## ขั้นตอนที่ 5: Push งานของคุณ

เพื่อส่งการเปลี่ยนแปลงไปยัง repository โปรเจกต์ของคุณ ให้ใช้คำสั่ง:

```bash
git push origin main
```
