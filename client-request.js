const Encoder = require('./encoder.js');

function ClientRequest (socket, server, request) {
  this.socket = socket;
  this.server = server;
  this.request = request;
  this.header = request.headers;
}
ClientRequest.prototype.send = function (message, params) {
  this.write(Encoder.encode(message, params));
};
ClientRequest.prototype.write = function (data) {
  if (this.socket.writable) {
    this.server.debug('server', data);
    this.socket.write(data);
  } else {
    this.server.debug('server', 'not-writable');
  }
};
ClientRequest.prototype.close = function (status = 1000, reason = '') {
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
  const data = Encoder.encode(buffer, { opcode: Encoder.TYPE.CLOSE });
  this.server.debug('server', data);
  this.socket.end(data);
};

module.exports = ClientRequest;
