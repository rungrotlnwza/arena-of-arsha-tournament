# JWT Middleware

ใช้สำหรับตรวจสอบ JWT และควบคุมการเข้าถึงตาม role  
ไฟล์: `app/middleware/jwt.middleware.js`

## ตัวแปรแวดล้อม

ตั้งค่าใน `.env`:

```env
JWT_SECRET=your-secret-key
```

## API

| ชื่อ | ประเภท | คำอธิบาย |
|------|--------|----------|
| `verify(token)` | ฟังก์ชัน | ตรวจ/ decode token ได้ payload (throw ถ้าไม่ถูกหรือหมดอายุ) |
| `getToken(req)` | ฟังก์ชัน | ดึง token จาก `Authorization: Bearer` หรือ cookie `token` |
| `authenticate` | middleware | รับ Bearer หรือ cookie → verify → ใส่ `req.user` ไม่ผ่านตอบ 401 JSON |
| `verifyToken` | middleware | รับเฉพาะ cookie `token` → verify → ใส่ `req.user` ไม่ผ่าน redirect `/auth/login` |
| `requireRole(roles)` | ฟังก์ชันคืน middleware | ตรวจ `req.user.role` ไม่ตรง → redirect `/auth/login` (สำหรับหน้าเว็บ) |
| `requireRoleApi(roles)` | ฟังก์ชันคืน middleware | ตรวจ `req.user.role` ไม่ตรง → 401/403 JSON (สำหรับ API) |
| `revoke(req)` | middleware | ใส่ token ของ request ลง blacklist (ใช้ตอน logout) |

## ตัวอย่างการใช้งาน

### หน้าเว็บ (cookie + redirect)

```js
const jwt = require('./app/middleware/jwt.middleware');

// ต้อง login (cookie)
router.get('/dashboard', jwt.verifyToken, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// ต้อง login + role
router.get('/admin', jwt.verifyToken, jwt.requireRole('admin'), (req, res) => {
  res.render('admin', { user: req.user });
});

router.get('/staff', jwt.verifyToken, jwt.requireRole(['admin', 'staff']), handler);

// Logout
router.post('/logout', jwt.verifyToken, jwt.revoke, (req, res) => {
  res.redirect('/auth/login');
});
```

### API (Bearer หรือ cookie + JSON)

```js
// ต้อง login
router.get('/api/me', jwt.authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ต้อง login + role
router.get('/api/admin', jwt.authenticate, jwt.requireRoleApi('admin'), (req, res) => {
  res.json({ data: '...' });
});
```

### สร้าง token (ตอน login)

Middleware นี้ไม่มีฟังก์ชัน sign ให้สร้าง token ใน route หรือ service เอง เช่น:

```js
const jwtLib = require('jsonwebtoken');

router.post('/login', (req, res) => {
  // เช็ค user จาก DB ...
  const token = jwtLib.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.cookie('token', token, { httpOnly: true }).redirect('/dashboard');
});
```

## Blacklist

Token ที่ถูก revoke (logout) จะถูกเก็บในหน่วยความจำ (Set)  
หลัง restart server blacklist จะว่าง — token เก่าที่หมดอายุจะ verify ไม่ผ่านอยู่แล้ว
