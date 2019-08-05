const net = require('net');
const Encoder = require('./encoder.js');
const Handshake = require('./handshake.js');
const Client = require('./client.js');

const EMPTY = {};
const CLOSE = 'close';
const CONNECTION = 'connection';
const DATA = 'data';

function Server (listeners = EMPTY) {
  this.server = new net.Server();
  this.listeners = listeners;

  function handshake (data) {
    this.off(DATA, handshake);

    const payload = Handshake.getHttpPayload(data);
    const client = new Client(this);
    listeners.connect.call(client, payload);

    function onData (data) {
      listeners.data && listeners.data.call(client, Encoder.decode(data));
    };
    function onClose (data) {
      client.active = false;
      this.off(DATA, onData);
      this.off(CLOSE, onClose);
      this.off(DATA, handshake);
      listeners.disconnect && listeners.disconnect.call(client);
    };

    socket.on(DATA, onData);
    socket.on(CLOSE, onClose);

    client.active && this.write(Handshake.getResponse(payload));
  }

  this.server.on(CONNECTION, function (socket) {
    socket.on(DATA, handshake);
  });
}

Server.prototype.listen = function (port = 80, host = '0.0.0.0') {
  this.server.listen(port, host, this.listeners.listening);
};

module.exports = Server;
