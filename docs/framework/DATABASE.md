# Database (MySQL / MariaDB)

ใช้ `mysql2` แบบ promise และ connection pool  
ไฟล์: `app/config/mysqli.config.js`

## ตัวแปรแวดล้อม

ตั้งค่าใน `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=mydb
```

## การใช้งาน

```js
const pool = require('./app/config/mysqli.config');

// Query
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

// Execute
await pool.execute('INSERT INTO users (name) VALUES (?)', [name]);

// Transaction
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('INSERT INTO ...');
  await conn.query('UPDATE ...');
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release();
}
```

## หมายเหตุ

- ชื่อไฟล์เป็น `mysqli.config.js` (สะกดแบบ MySQLi) แต่ใช้ driver **mysql2** ของ Node.js
- Pool ใช้ค่า default จาก env ข้างต้น ถ้าไม่ตั้ง `.env` จะใช้ `localhost`, `root`, รหัสว่าง, `mydb`
