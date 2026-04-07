# กฏการเขียนโค้ด (Coding Rules)

เอกสารนี้อธิบายกฏและรูปแบบการเขียนโค้ดสำหรับ DevTeam Framework

---

## Export Pattern

ใช้ CommonJS แบบเดียวกันทั้งโปรเจกต์:

```javascript
module.exports = {
  functionName: async (req, res) => {
    // implementation
  },
  anotherFunction: async (body) => {
    // implementation
  }
};
```

---

## Controller Pattern

```javascript
module.exports = {
  actionName: async (req, res) => {
    try {
      const result = await someService.action(req.body);
      if (!result.ok) {
        if (result.code === "SPECIFIC_ERROR") {
          res.status(400).json({ message: result.message });
          return;
        }
        res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง" });
        return;
      }
      res.status(200).json(result.data);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      return;
    }
  }
};
```

---

## Service Pattern

```javascript
module.exports = {
  actionName: async (body) => {
    // validation
    if (!body.requiredField) {
      return { 
        ok: false, 
        code: "MISSING_FIELD", 
        message: "กรุณากรอกข้อมูล" 
      };
    }
    
    // business logic
    // ...
    
    return { 
      ok: true, 
      data: { /* response data */ } 
    };
  }
};
```

---

## Frontend JavaScript Pattern

### Fetch API Pattern (Client-Side)

#### รูปแบบที่ถูกต้อง
```javascript
fetch('/api/endpoint', {
  credentials: 'include',
  method: 'GET'
}).then(res => res.json()).then(data => {
  // จัดการ DOM ตรงนี้เลย ไม่ต้องแยกฟังก์ชัน
  document.getElementById('xxx').textContent = data.xxx;
});
```

#### สิ่งที่ต้องทำ
- ✅ ใช้ `fetch()` ตรง ๆ พร้อม `credentials: 'include'` และ `method: 'GET'`
- ✅ ใช้ `.then(res => res.json()).then(data => { ... })` แบบ chain ติดกัน
- ✅ เขียนโค้ดจัดการ DOM ใน `.then()` เลย ไม่ต้องสร้างฟังก์ชัน render แยก
- ✅ วาง fetch calls ไว้ top-level ของไฟล์ (ก่อนฟังก์ชัน utility)

#### สิ่งที่ห้ามทำ
- ❌ **ห้ามใช้ `.catch()`** - ให้ error โผล่ใน console ตรง ๆ
- ❌ **ห้ามสร้างฟังก์ชัน render แยก** - เช่น `renderData()`, `renderOverview()`
- ❌ **ห้ามใช้ helper `fetchJson()`** - ใช้ `fetch()` ตรง ๆ เท่านั้น
- ❌ **ห้ามใช้ `async/await`** กับ fetch - ใช้ Promise chain `.then()` แทน

---

## Error Handling

### Controller Error Pattern
```javascript
try {
  // logic
} catch (error) {
  console.error(error);
  res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  return;
}
```

---

## File Naming Convention

- Controller: `*.controller.js` (e.g., `demo.controller.js`)
- Routes: `*.routes.js` (e.g., `user.routes.js`, `api.routes.js`)
- Service: `*.service.js` (e.g., `demo.service.js`)
