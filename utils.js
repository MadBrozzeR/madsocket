const Encoder = require('./encoder.js');

module.exports.socketWrite = function socketWrite (socket, message) {
  if (socket.writable) {
    socket.write(message);
  }
};

module.exports.socketEnd = function socketEnd (socket, message) {
  if (socket.writable) {
    socket.end(message);
  }
}
