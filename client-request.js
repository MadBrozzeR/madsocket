const { Collector } = require('./collector.js');
const Encoder = require('./encoder.js');
const proceedCommandFrame = require('./command-frames.js');

function ClientConnection (socket, server, request) {
  const client = this;

  this.socket = socket;
  this.server = server;
  this.request = request;
  this.header = request.headers;
  this.data = new Collector(Encoder.COLLECTOR_STEPS, function (info) {
    const frame = {
      type: info.flags.opcode,
      fin: info.flags.fin,
      data: info.data,
    };

    if (!proceedCommandFrame(frame, client)) {
      server.listeners.message && server.listeners.message.call(client, frame.data, {
        fin: frame.fin,
        opcode: frame.opcode
      });
    }
  });
}
ClientConnection.prototype.send = function (message, params) {
  this.write(Encoder.encode(message, params));
};
ClientConnection.prototype.write = function (data) {
  if (this.socket.writable) {
    this.server.debug('server', data);
    this.socket.write(data);
  } else {
    this.server.debug('server', 'not-writable');
  }
};
ClientConnection.prototype.close = function (status = 1000, reason = '') {
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

module.exports = ClientConnection;
