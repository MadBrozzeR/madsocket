const net = require('net');
const MadSocket = require('./index.js');

let counter = 0;

function test (description, assertion, expected) {
  ++counter;
  process.stdout.write(description);
  if (assertion === expected) {
    process.stdout.write(' \033[32mOK\033[0m\n');
  } else {
    process.stdout.write(' \033[31mFAIL\033[0m\n');
    process.exit(1);
  }
}

const socket = new net.Socket();

socket.on('connect', function () {
  const request = 'GET /ws HTTP/1.1\r\n' +
    'Host: localhost\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Origin: localhost\r\n' +
    'Sec-WebSocket-Key: Iv8io/9s+lYFgZWcXczP8Q==\r\n' +
    'Sec-WebSocket-Version: 13\r\n\r\n'
  socket.write(request);
});
socket.on('data', function (data) {
  queue[queue.cursor++].call(socket, data);
});

const queue = [
  function (data) {
    const expected = '485454502f312e312031303120537769746368696e672050726f746f636f6c730d0a557067726164653a20776562736' +
      'f636b65740d0a436f6e6e656374696f6e3a20557067726164650d0a5365632d576562536f636b65742d4163636570743a2068734' +
      '26c627544546b6b323473727a454f5442556c5a416c4332673d0d0a0d0a'

    test('Correct HTTP response received', data.toString('hex'), expected);
    this.write(Buffer.from('81831544e221743786', 'hex'));
  },
  function (data) {
    test('Correct response received', data.toString('hex'), '8103647361');
  }
];
queue.cursor = 0;

const ws = new MadSocket({
  start: function () {
    test('Server started', true, true);

    socket.connect(8090);
  },
  close: function () {
    test('Server closed', true, true);
    test('All tests should be triggered', counter, 6);
  },

  connect: function () {
    test('Client connected', true, true);
  },
  data: function (data) {
    this.send(data.toString().split('').reverse().join(''));
  },
  disconnect: function () {
    test('Client should disconnect after timeout', true, true);
    ws.close();
  }
}, {
  timeout: 100
});

ws.listen(8090);

