const http = require('http');

http.get('http://localhost:3000/api/home', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const obj = JSON.parse(data);
    console.log('Tournament:', obj.data.tournament.name);
    console.log('Date:', obj.data.tournament.date);
    console.log('Registered Teams:', obj.data.registration.approved_teams + '/' + obj.data.registration.max_teams);
    console.log('Remaining Slots:', obj.data.registration.remaining);
    console.log('Registration Open:', obj.data.registration.open);
  });
}).on('error', (e) => {
  console.log('Error:', e.message);
});
