const net = require('net');
const tls = require('tls');
const { useTemplate, generateClientKey, generateMask } = require('./utils.js');
const { CLIENT_HANDSHAKE_TEMPLATE } = require('./templates.js');
const Handshake = require('./handshake.js');
const Encoder = require('./encoder.js');
const proceedCommandFrame = require('./command-frames.js');
const { Collector } = require('./collector.js');

const URL_RE = /(ws|wss):\/\/([^\/:]+)(:\d+)?(\/.*)?/

function bind (client, socket) {
  client.socket = socket;
  client.status = 'handshake';
  const listeners = client.listeners;

  socket.on('data', function (data) {
    client.debug.call(client, 'server', data);

    switch (client.status) {
      case 'handshake':
        const result = Handshake.validateServerHandshake(data, client.key);

        if (result.success) {
          client.status = 'active';
          listeners.connect && client.listeners.connect.call(client);
        } else {
          client.status = 'error';
          listeners.error && client.listeners.error.call(client, new Error(result.errorMessage));
          // client.close();
        }
        break;
      case 'active':
        client.data.push(data);
        break;
    }
  });

  socket.on('close', function () {
    client.debug.call(client, 'close');
    client.status = 'closed';
    socket.removeAllListeners();
    listeners.disconnect && listeners.disconnect.call(client);
    // client.close();
  });

  socket.on('error', function (error) {
    client.debug.call(client, 'error', error);
    client.status = 'error';
    listeners.error && listeners.error.call(client, error);
    // client.close();
  });

  return client;
}

function Client (listeners = {}, params = {}) {
  const client = this;
  this.url = params.url || '';
  this.listeners = listeners; // error, message, connect, disconnect
  this.socket = null;
  this.status = 'init'; // init | handshake | active | error | closed
  this.key = '';
  this.debug = params.debug || function () {};
  this.data = new Collector(Encoder.COLLECTOR_STEPS, function (info) {
    const frame = {
      type: info.flags.opcode,
      fin: info.flags.fin,
      data: info.data,
    };
    if (!proceedCommandFrame(frame, client)) {
      listeners.message && listeners.message.call(client, frame.data, { fin: frame.fin, opcode: frame.opcode });
    }
  });
};

Client.prototype.on = function (listeners) {
  for (const key in listeners) {
    this.listeners[key] = listeners[key];
  }

  return this;
}

Client.prototype.connect = function (url) {
  const client = this;

  if (url) {
    this.url = url;
  }

  if (this.socket) {
    this.socket.removeAllListeners();
  }

  const urlRegMatch = this.url ? URL_RE.exec(this.url) : null;

  if (!urlRegMatch) {
    throw new Error('Cannot proceed URL');
  }

  const protocol = urlRegMatch[1];
  const isSecure = protocol === 'wss';
  const host = urlRegMatch[2];
  const port = urlRegMatch[3]
    ? parseInt(urlRegMatch[3].substring(1), 10)
    : isSecure
      ? 443
      : 80;
  const path = urlRegMatch[4] || '/';
  const options = isSecure ? { servername: host } : {};
  const key = generateClientKey();

  const socket = (isSecure ? tls : net).connect(port, host, options, function () {
    client.debug.call(client, 'connected');
    const handshake = useTemplate(CLIENT_HANDSHAKE_TEMPLATE, { host, path, key });
    client.write(Buffer.from(handshake));
  });

  bind(this, socket);
  this.key = key;

  return this;
}

Client.prototype.close = function () {
  if (this.socket.writable) {
    this.debug.call(this, 'end', true);
    this.socket.end();
  } else {
    this.debug.call(this, 'warning', 'end:not-writable');
  }

  if (this.status === 'active') {
    this.status = 'closed';
  }
}

Client.prototype.send = function (message, params) {
    const mask = generateMask();
    const data = Encoder.encode(message, { opcode: params.opcode, fin: params.fin, mask: mask });
    this.write(data);
}

Client.prototype.write = function (data) {
  if (this.socket.writable) {
    this.debug.call(this, 'client', data);
    this.socket.write(data);
  } else {
    this.debug.call(this, 'warning', 'client:not-writable');
  }
}

Client.connect = function (url, listeners) {
  return new Client(listeners).connect(url);
}

module.exports = Client;
