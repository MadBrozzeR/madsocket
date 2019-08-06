const net = require('net');
const Encoder = require('./encoder.js');
const Handshake = require('./handshake.js');
const Client = require('./client.js');

const EMPTY = {};
const CLOSE = 'close';
const CONNECTION = 'connection';
const DATA = 'data';
const TIMEOUT = 'timeout';
const DEFAULT_TIMEOUT = 0;

function bind (socket, payload) {
  const listeners = this.listeners;
  const response = Handshake.getResponse(payload);

  if (response) {
    socket.write(response);

    if (socket.listenerCount(TIMEOUT)) {
      socket.setTimeout(this.timeout);
    } else {
      socket.setTimeout(this.timeout, socket.end);
    }

    const client = new Client(socket, payload.headers);

    listeners.connect && listeners.connect.call(client);

    function onData (data) {
      listeners.data && listeners.data.call(client, Encoder.decode(data));
    };
    function onClose () {
      client.active = false;
      // I'm not sure if I need it
      // socket.removeListener(DATA, onData);
      // socket.removeListener(CLOSE, onClose);
      listeners.disconnect && listeners.disconnect.call(client);
    };

    socket.on(DATA, onData);
    socket.on(CLOSE, onClose);
  } else {
    socket.end(Handshake.getBadResponse());
  }
}

function Server (listeners = EMPTY, props = EMPTY) {
  this.server = new net.Server();
  this.listeners = listeners;
  this.timeout = props.timeout || DEFAULT_TIMEOUT;
  const server = this;

  function handshake (data) {
    this.off(DATA, handshake);

    const payload = Handshake.getHttpPayload(data);

    bind.call(server, this, payload);
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

  bind.call(this, socket, message);
};

module.exports = Server;
