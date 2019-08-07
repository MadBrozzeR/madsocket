const net = require('net');
const Encoder = require('./encoder.js');
const Handshake = require('./handshake.js');
const Client = require('./client.js');
const proceedCommandFrame = require('./command-frames.js');
const utils = require('./utils.js');

const EMPTY = {};
const CLOSE = 'close';
const CONNECTION = 'connection';
const DATA = 'data';
const TIMEOUT = 'timeout';
const ERROR = 'error';
const DEFAULT_TIMEOUT = 0;

const TIMEOUT_MESSAGE = Encoder.encode(Buffer.from('03e954696d656f7574', 'hex'), Encoder.TYPE.CLOSE);

function onTimeout () {
  utils.socketEnd(this, TIMEOUT_MESSAGE);
};

function noop () {};

function bind (socket, payload) {
  const listeners = this.listeners;
  const response = Handshake.getResponse(payload);
  const server = this;

  if (response) {
    server.debug('server', Buffer.from(response));
    utils.socketWrite(socket, response);

    const client = new Client(socket, server, payload.headers);

    listeners.connect && listeners.connect.call(client);

    function onData (data) {
      server.debug('client', data);

      const frame = Encoder.decode(data);

      if (!proceedCommandFrame(frame, client)) {
        listeners.message && listeners.message.call(client, frame.data);
      }
    };
    function onClose () {
      listeners.disconnect && listeners.disconnect.call(client);
    };
    function onError (error) {
      listeners.error && listeners.error.call(client, error);
    }

    socket.on(DATA, onData);
    socket.on(CLOSE, onClose);
    socket.on(ERROR, onError);
    socket.removeAllListeners(TIMEOUT);
    socket.setTimeout(this.timeout, onTimeout);
  } else {
    const response = Handshake.getBadResponse();

    server.debug('server', Buffer.from(response));
    socket.end(response);
  }
}

function Server (listeners = EMPTY, props = EMPTY) {
  this.server = new net.Server();
  this.listeners = listeners;
  this.timeout = props.timeout || DEFAULT_TIMEOUT;
  this.debug = props.debug || noop;
  const server = this;

  function handshake (data) {
    this.removeListener(DATA, handshake);
    server.debug('client', data);

    const payload = Handshake.getHttpPayload(data);

    bind.call(server, this, payload);
  }

  this.server.on(CONNECTION, function (socket) {
    socket.on(DATA, handshake);
  });

  this.server.on(CLOSE, function () {
    listeners.close && listeners.close.call(this);
  });

  this.server.on(ERROR, function (error) {
    listeners.error && listeners.error.call(this, error);
  });
}

Server.prototype.listen = function (port = 80, host = '0.0.0.0') {
  this.server.listen(port, host, this.listeners.start);

  return this;
};

Server.prototype.close = function () {
  this.server.close();

  return this;
};

Server.prototype.leach = function (message, serverResponse) {
  const socket = serverResponse.socket || serverResponse;

  bind.call(this, socket, message);

  return this;
};

module.exports = Server;
