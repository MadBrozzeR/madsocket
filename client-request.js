const { Collector } = require('./collector.js');
const Encoder = require('./encoder.js');
const proceedCommandFrame = require('./command-frames.js');
const { OPCODE } = require('./constants.js');

function ClientConnection (socket, server, request) {
  const client = this;

  this.socket = socket;
  this.server = server;
  this.request = request;
  this.header = request.headers;
  this.pongProcessor = null;

  this.data = new Collector(Encoder.COLLECTOR_STEPS, function (info) {
    const frame = {
      type: info.flags.opcode,
      fin: info.flags.fin,
      data: info.data,
    };

    server.listeners.frame && server.listeners.frame.call(client, frame);

    if (frame.type === OPCODE.PONG) {
      client.pongProcessor && client.pongProcessor(frame.data);
    } else if (!proceedCommandFrame(frame, client)) {
      server.listeners.message && server.listeners.message.call(client, frame.data, {
        fin: frame.fin,
        opcode: frame.opcode
      });
    }
  });
}
ClientConnection.prototype.send = function (message, params) {
  return this.write(Encoder.encode(message, params));
};
ClientConnection.prototype.write = function (data) {
  const client = this;
  const dataToSend = data instanceof Buffer ? data : Buffer.from(data);

  return new Promise(function (resolve, reject) {
    if (client.socket.writable) {
      client.server.debug('server', data);
      client.socket.write(dataToSend, function () {
        resolve(dataToSend);
      });
    } else {
      client.server.debug('server', 'not-writable');
      reject(new Error('Socket is not writable'));
    }
  });
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
  const data = Encoder.encode(buffer, { opcode: OPCODE.CLOSE });
  this.server.debug('server', data);
  this.socket.end(data);
};
ClientConnection.prototype.ping = function (message = '', timeout = 1000) {
  const client = this;

  return new Promise(function (resolve) {
    if (client.socket.writable) {
      client.send(message, { opcode: OPCODE.PING });

      const timeoutRef = setTimeout(function () {
        clearTimeout(timeoutRef);
        client.pongProcessor = null;
        resolve(false);
      }, timeout);

      client.pongProcessor = function (data) {
        clearTimeout(timeoutRef);
        client.pongProcessor = null;
        if (data.toString() === message) {
          resolve(true);
        } else {
          resolve(false);
        }
      };
    } else {
      resolve(false);
    }
  });
}

module.exports = ClientConnection;
