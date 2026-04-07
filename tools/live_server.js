const path = require('path');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');

module.exports = function setupLiveReload(app) {
  if (process.env.LIVERELOAD === 'true') {
    const server = livereload.createServer({
      exts: ['ejs', 'js', 'css', 'json'],
    });
    server.watch([path.join(__dirname, '../')]);
    app.use(connectLivereload());
  }
};
