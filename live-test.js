const http = require('http');
const fs = require('fs');
const MadSocket = require('./index.js');

const page = `
  <script src='client.js'></script>
  <script>
    function toChat (message) {
      var block = document.createElement('div');
      block.appendChild(document.createTextNode(message));
      document.getElementById('chat').appendChild(block);
    }

    var ws = MadSocket('ws://localhost:8090/ws', {
      open: function () {
        console.log('Socket open');
      },
      close: function () {
        console.log('Socket closed');
      },
      message: function (message) {
        toChat('Server: ' + message);
      }
    });

    function send () {
      var input = document.getElementById('input');
      var message = input.value;
      input.value = '';
      toChat('You: ' + message);
      ws.send(message);
    }
  </script>
  <body>
    <div style='height: 100px; width: 250px; overflow: auto; border: 1px solid black;' id='chat'></div>
    <input id='input' /><button onclick='send()'>Send</button>
  </body>
`;

const ws = new MadSocket({
  connect: function () {
    console.log('Client connected');
    this.data = {
      connectionTime: new Date()
    };
  },
  disconnect: function () {
    console.log('Client disconnected');
    this.data.disconnectionTime = new Date();
    this.data.timeout = (this.data.disconnectionTime - this.data.connectionTime) / 1000;
    console.log(this.data);
  },
  data: function (data) {
    console.log('Client wrote: ', data);
    this.send(data.toString().split('').reverse().join(''));
  }
}, {
  debug: function (type, data) {
    console.log(type + ':', data.toString('hex'));
  }
});

http.createServer(function (request, response) {
  switch (request.url) {
    case '/':
      const data = Buffer.from(page);
      response.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': data.length
      });
      response.end(data);
      break;
    case '/favicon.ico':
      response.writeHead(200, {
        'Content-Type': 'image/x-icon'
      });
      response.end();
      break;
    case '/client.js':
      fs.readFile('./simple-client.js', function (error, data) {
        response.writeHead(200, {
          'Content-Type': 'text/javascript',
          'Content-Length': data.length
        });
        response.end(data);
      });
      break;
    // case '/ws':
    //  ws.leach(request, response);
    //  break;
  }
}).on('upgrade', function (message, socket) {
  ws.leach(message, socket);
}).listen(8090, '0.0.0.0', function () { console.log('I\'m listening') });
