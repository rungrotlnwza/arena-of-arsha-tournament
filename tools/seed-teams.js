// ============================================
// Seed 32 Teams for Arena of Arsha Tournament 2026
// ============================================

const mysqli = require('../app/config/mysqli.config');

// Mock data
const teamNames = [
  'อัศวินทองคำ', 'Dark Knights', 'สุ่มไปเถอะ', 'มือใหม่หัดแข่ง',
  'ทีมเด็กปั้ม', 'หมีพ่นไฟ', 'เสือดำอาละวาด', 'มังกรทมิฬ',
  'หมาป่าเดียวดาย', 'นกฟีนิกซ์', 'แมวน้ำแห่งทะเล', 'ราชสีห์ผงาด',
  'ความหวังสุดท้าย', 'สายฟ้าแลบ', 'พายุทราย', 'น้ำแข็งไฟ',
  'เงาดำราตรี', 'แสงอรุณใหม่', 'ดาวตก', 'จันทร์เจ้า',
  'สุริยันแสงทอง', 'ลมหายใจแห่งทะเล', 'ภูผาหิมะ', 'ป่าไผ่เขียว',
  'ดอกไม้ไฟ', 'สายรุ้งกลางฝน', 'ฝนดาวตก', 'หมอกควัน',
  'เพลิงไหม้', 'น้ำค้างยามเช้า', 'ฟ้าครึ้ม', 'สายลมหนาว'
];

const firstNames = ['สมชาย', 'สมหญิง', 'ประเสริฐ', 'มณี', 'ประทีป', 'วิไล', 'สุรศักดิ์', 'กันยา',
  'ณัฐพล', 'สุดารัตน์', 'พิชัย', 'อังคณา', 'ธนพล', 'จินตนา', 'วีรศักดิ์', 'พรทิพย์',
  'อนุชา', 'นิภา', 'สุรชัย', 'วรรณา', 'ประวิตร', 'สุมณฑา', 'กรุณา', 'มาลี',
  'สมศักดิ์', 'บุญมี', 'ธนา', 'ศิริพร', 'วิชัย', 'อำพร', 'สุเทพ', 'รัตนา'];

const lastNames = ['ใจดี', 'รักดี', 'ขยันทำ', 'มานะ', 'สวัสดี', 'รุ่งเรือง', 'แก้วใส', 'มีทรัพย์',
  'สมบูรณ์', 'วงศ์ใหญ่', 'พงษ์ศิริ', 'นามสกุล', 'ประเสริฐ', 'ศรีสุข', 'เกียรติยศ', 'บุญญา',
  'เจริญ', 'สุขใจ', 'มั่นคง', 'วัฒนา', 'กิตติ', 'เพ็ญแก้ว', 'รอดพ้น', 'ศิริมงคล'];

const bdoClasses = ['Warrior', 'Ranger', 'Sorceress', 'Berserker', 'Tamer', 'Musa', 'Maehwa', 'Valkyrie',
  'Kunoichi', 'Ninja', 'Wizard', 'Witch', 'Dark Knight', 'Striker', 'Mystic', 'Lahn',
  'Archer', 'Shai', 'Guardian', 'Hashashin', 'Nova', 'Sage', 'Corsair', 'Drakania'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDiscordId() {
  const names = ['shadow', 'dragon', 'wolf', 'night', 'fire', 'ice', 'storm', 'light',
    'dark', 'soul', 'blade', 'arrow', 'magic', 'power', 'king', 'queen'];
  const nums = Math.floor(Math.random() * 9000) + 1000;
  return getRandomItem(names) + nums;
}

function generateFamilyName() {
  const prefixes = ['Shadow', 'Night', 'Fire', 'Ice', 'Storm', 'Dark', 'Light', 'Dragon',
    'Wolf', 'Soul', 'Blade', 'Blood', 'Thunder', 'Wind', 'Star', 'Moon'];
  const suffixes = ['Clan', 'Guild', 'House', 'Family', 'Order', 'Legion', 'Crew', 'Squad'];
  return getRandomItem(prefixes) + getRandomItem(suffixes);
}

async function seedTeams() {
  const conn = await mysqli.getConnection();
  
  try {
    console.log('🎮 Starting to seed 32 teams...\n');
    
    await conn.beginTransaction();
    
    for (let i = 0; i < 32; i++) {
      const teamName = teamNames[i];
      
      // Create team
      const [teamResult] = await conn.query(
        `INSERT INTO teams (team_name, status, experience, referral, agree_live) 
         VALUES (?, 'approved', ?, ?, ?)`,
        [
          teamName,
          `ประสบการณ์การแข่งขัน ${Math.floor(Math.random() * 5) + 1} ปี`,
          getRandomItem(['facebook', 'discord', 'twitch', 'friend', 'other']),
          Math.random() > 0.3 // 70% agree to live stream
        ]
      );
      
      const teamId = teamResult.insertId;
      
      // Create 2 players for each team
      for (let j = 0; j < 2; j++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        
        await conn.query(
          `INSERT INTO players (team_id, full_name, discord_id, bdo_name, family_name, player_order) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            teamId,
            `${firstName} ${lastName}`,
            generateDiscordId(),
            `${getRandomItem(bdoClasses)}_${Math.floor(Math.random() * 999)}`,
            generateFamilyName(),
            j + 1
          ]
        );
      }
      
      console.log(`✅ Team ${i + 1}/32: ${teamName}`);
    }
    
    await conn.commit();
    
    console.log('\n🎉 Successfully seeded 32 teams with 64 players!');
    console.log('📊 Total: 32 teams (all approved)');
    
  } catch (error) {
    await conn.rollback();
    console.error('❌ Error seeding teams:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

// Run
seedTeams();
