# Git Workflow

## หลักการพื้นฐานของ Git Workflow
Git Workflow เป็นกระบวนการที่ช่วยจัดการการทำงานร่วมกันในโครงการซอฟต์แวร์ โดยใช้ระบบควบคุมเวอร์ชัน (Version Control System) เพื่อให้ทีมสามารถทำงานร่วมกันได้อย่างมีประสิทธิภาพ ลดความขัดแย้งของโค้ด และเพิ่มความโปร่งใสในการพัฒนาโครงการ

### 1. การตั้งค่าเริ่มต้น
- **Clone Repository**: สร้างโฟลเดอร์สำหรับโปรเจกต์ของคุณ และใช้คำสั่ง `git clone https://github.com/rungrotlnwza/node.git .` เพื่อดึงโค้ดจาก remote repository มายังโฟลเดอร์นั้น
- **สร้าง Branch ใหม่**: ใช้คำสั่ง `git checkout -b <ชื่อ branch>` เพื่อสร้าง branch สำหรับงานของคุณ

### 2. การพัฒนาโค้ด
- **Branch หลัก**:
  - `main`: ใช้สำหรับ release และ Jenkins pipeline (ห้าม push ตรง)
  - `dev`: ใช้สำหรับการพัฒนาร่วมกันในทีม (ทีมงาน pull/push งานบน branch นี้)
  - `me`: ใช้สำหรับการพัฒนาส่วนตัว (ห้าม push งานขึ้น remote)
- **Commit การเปลี่ยนแปลง**: บันทึกการเปลี่ยนแปลงใน branch ของคุณด้วยคำสั่ง `git add .` และ `git commit -m "ข้อความอธิบาย"`
- **ดึงโค้ดล่าสุดจาก branch หลัก**: ใช้คำสั่ง `git pull origin dev` เพื่อดึงการเปลี่ยนแปลงล่าสุดจาก branch `dev` เข้ามาใน branch ของคุณ

#### การ Release ขึ้น main
- **ขั้นตอนการ release**:
  1. สลับไปที่ branch `main`:
     ```bash
     git checkout main
     ```
  2. รวมการเปลี่ยนแปลงจาก branch `dev` แบบ squash merge:
     ```bash
     git merge --squash dev
     ```
  3. สร้าง commit ใหม่สำหรับ release:
     ```bash
     git commit -m "release: vX.Y.Z"
     ```
  4. Push การเปลี่ยนแปลงขึ้น remote:
     ```bash
     git push origin main
     ```

- **เหตุผลที่ใช้ squash merge**:
  - เพื่อให้ commit history บน branch `main` เป็นเส้นตรง (linear history)
  - ลดความซับซ้อนของประวัติการเปลี่ยนแปลง
  - ทำให้แต่ละ release มีเพียง 1 commit ซึ่งง่ายต่อการติดตามและ rollback

### 3. การแก้ไขปัญหา Merge Conflict
- หากมี merge conflict ให้แก้ไขไฟล์ที่มีปัญหาโดยเลือกโค้ดที่ต้องการเก็บไว้
- บันทึกการแก้ไขด้วยคำสั่ง `git add .` และ `git commit -m "แก้ไข merge conflict"`

### 4. การรวมโค้ดเข้ากับ branch หลัก
- **Push การเปลี่ยนแปลง**: ใช้คำสั่ง `git push origin dev` เพื่ออัปโหลดโค้ดของคุณไปยัง remote repository
- **Merge เข้าสู่ main**: เมื่อพร้อม release ให้ merge การเปลี่ยนแปลงจาก `dev` ไปยัง `main`:
  ```bash
  git checkout main
  git merge dev
  git push origin main
  ```

### 5. การตรวจสอบและรีวิวโค้ด
- ตรวจสอบ pull request ของเพื่อนร่วมทีม และแสดงความคิดเห็นหรือเสนอการปรับปรุง
- เมื่อโค้ดได้รับการอนุมัติ ให้ทำการ merge pull request เข้ากับ branch หลัก

## คำแนะนำเพิ่มเติม
1. **ใช้ Branch แยกสำหรับแต่ละงาน**
   - เช่น `feature/new-login` หรือ `bugfix/fix-auth` เพื่อแยกการพัฒนาแต่ละฟีเจอร์หรือการแก้ไขปัญหา

2. **ดึงโค้ดจาก branch หลักบ่อยๆ**
   - ใช้คำสั่ง `git pull` เป็นประจำเพื่อลดโอกาสเกิด merge conflict

3. **สื่อสารกับทีม**
   - แจ้งให้ทีมทราบว่าใครกำลังแก้ไขไฟล์ไหนอยู่ เพื่อลดความขัดแย้งของโค้ด

4. **ใช้เครื่องมือช่วย**
   - เช่น GitHub Desktop, GitKraken หรือ VS Code เพื่อช่วยจัดการ branch และ merge conflict ได้ง่ายขึ้น

## สรุป
Git Workflow เป็นกระบวนการที่ช่วยให้ทีมสามารถทำงานร่วมกันได้อย่างมีประสิทธิภาพ โดยการใช้ branch แยกสำหรับแต่ละงาน การ commit และ push การเปลี่ยนแปลงอย่างสม่ำเสมอ และการสื่อสารกับทีมเพื่อหลีกเลี่ยงปัญหา merge conflict