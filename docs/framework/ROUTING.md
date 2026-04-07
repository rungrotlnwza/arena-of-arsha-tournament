# Routing Concept

DevTeam Framework 2 ใช้ Router กลางเพื่อรวมเส้นทางทั้งหมดของระบบ  
โดยแยกโครงสร้างระหว่าง Frontend และ Backend อย่างชัดเจน

## แนวคิดหลัก

- Entry point จะ mount router หลักเพียงครั้งเดียว
- Router หลักทำหน้าที่รวม frontend และ backend routes
- Frontend routes รับผิดชอบการ render view และ layout

## Example Frontend Route

ตัวอย่างการสร้าง Frontend Route  
โดยกำหนด view และ layout แบบ explicit ด้วย Relative Path

```js
router.get("/", (req, res) => {
  res.render(path.join(__dirname, "../../../views/page/index.ejs"), {
    layout: path.join(__dirname, "../../../views/layouts/main.layout.ejs"),
  });
});
```
