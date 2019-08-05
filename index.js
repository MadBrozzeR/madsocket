const net = require('net');
const Encoder = require('./encoder.js');
const Handshake = require('./handshake.js');
const Client = require('./client.js');

const EMPTY = {};
const CLOSE = 'close';
const CONNECTION = 'connection';
const DATA = 'data';

function bind (socket, payload, listeners) {
  const response = Handshake.getResponse(payload);

  if (response) {
    socket.write(response);
    const client = new Client(socket, payload);

    listeners.connect && listeners.connect.call(client);

    function onData (data) {
      listeners.data && listeners.data.call(client, Encoder.decode(data));
    };
    function onClose () {
      client.active = false;
      socket.off(DATA, onData);
      socket.off(CLOSE, onClose);
      listeners.disconnect && listeners.disconnect.call(client);
    };

    socket.on(DATA, onData);
    socket.on(CLOSE, onClose);
  } else {
    socket.end(Handshake.getBadResponse());
  }
}

function Server (listeners = EMPTY) {
  this.server = new net.Server();
  this.listeners = listeners;

  function handshake (data) {
    this.off(DATA, handshake);

    const payload = Handshake.getHttpPayload(data);

    bind(this, payload, listeners);
  }

  this.server.on(CONNECTION, function (socket) {
    socket.on(DATA, handshake);
  });

  this.server.on(CLOSE, function () {
    listeners.close && listeners.close.call(this);
  });
}

Server.prototype.listen = function (port = 80, host = '0.0.0.0') {
  this.server.listen(port, host, this.listeners.start);
};

Server.prototype.close = function () {
  this.server.close();
};

Server.prototype.leach = function (message, serverResponse) {
  const socket = serverResponse.socket || serverResponse;
  socket.setTimeout(125000);

  bind(socket, message, this.listeners);
};

module.exports = Server;
