const Encoder = require('./encoder.js');

function Client (socket, server, request) {
  this.socket = socket;
  this.server = server;
  this.request = request;
  this.header = request.headers;
}
Client.prototype.send = function (message) {
  if (this.socket.writable) {
    const data = Encoder.encode(message);
    this.server.debug('server', data);
    this.socket.write(data);
  }
};
Client.prototype.close = function (status = 1000, reason = '') {
  if (!this.socket.writable) {
    return;
  }

  const buffer = Buffer.allocUnsafe(Buffer.byteLength(reason) + 2);

  if (status instanceof Buffer) {
    status.copy(buffer, 0, 0, 2);
  } else {
    buffer.writeUInt16BE(status);
  }
  if (reason) {
    buffer.write(reason, 2);
  }
  const data = Encoder.encode(buffer, Encoder.TYPE.CLOSE);
  this.server.debug('server', data);
  this.socket.end(data);
};

module.exports = Client;
