const Encoder = require('./encoder.js');

function Client (socket, server, header) {
  this.active = true;
  this.socket = socket;
  this.server = server;
  this.header = header;
}
Client.prototype.send = function (message) {
  if (this.active) {
    const data = Encoder.encode(message);
    this.server.debug('server', data);
    this.socket.write(data);
  }
};
Client.prototype.close = function () {
  this.socket.end();
  this.active = false;
};

module.exports = Client;
