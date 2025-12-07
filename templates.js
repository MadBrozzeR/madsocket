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

module.exports = {
  CLIENT_HANDSHAKE_TEMPLATE,
};
