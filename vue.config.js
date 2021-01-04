module.exports = {
  lintOnSave: false
}

// vue.config.js file to be place in the root of your repository

module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/Spotify-Distance/'
    : '/'
}