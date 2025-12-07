const WS_VERSION = '13';

const CLIENT_HANDSHAKE_TEMPLATE = (
  'GET ${path} HTTP/1.1\r\n' +
  'Host: ${host}\r\n' +
  'Upgrade: websocket\r\n' +
  'Connection: upgrade\r\n' +
  'Sec-WebSocket-Key: ${key}\r\n' +
  'Sec-WebSocket-Version: ' + WS_VERSION + '\r\n' +
  '\r\n'
);

const SERVER_HANDSHAKE_TEMPLATE = (
  'HTTP/1.1 101 Switching Protocols\r\n' +
  'Upgrade: websocket\r\n' +
  'Connection: Upgrade\r\n' +
  'Sec-WebSocket-Accept: ${key}\r\n' +
  '\r\n'
);

const BAD_REQUEST_TEMPLATE = 'HTTP/1.1 400 Bad Request\r\n\r\n';

module.exports = {
  CLIENT_HANDSHAKE_TEMPLATE,
  SERVER_HANDSHAKE_TEMPLATE,
  BAD_REQUEST_TEMPLATE,
};
