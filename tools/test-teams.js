const http = require('http');

http.get('http://localhost:3000/api/teams', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const obj = JSON.parse(data);
    console.log('Total teams:', obj.data.length);
    console.log('\n=== First 5 Teams ===');
    obj.data.slice(0, 5).forEach((t, i) => {
      console.log((i+1) + '. ' + t.team_name);
      console.log('   Player 1: ' + t.player1_name + ' (' + t.player1_bdo + ')');
      console.log('   Player 2: ' + t.player2_name + ' (' + t.player2_bdo + ')');
      console.log('');
    });
    console.log('... and ' + (obj.data.length - 5) + ' more teams');
  });
}).on('error', (e) => {
  console.log('Error:', e.message);
});
