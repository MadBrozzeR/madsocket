const http = require('http');
const fs = require('fs');
const MadSocket = require('./index.js');

const page = `
  <html>
    <head>
      <title>Chat</title>
      <script src='client.js'></script>
      <script>
        function toChat (message, color) {
          color || (color = 'black');
          document.getElementById('chat').innerHTML += '<div style="color: ' + color + ';">' + message + '</div>';
        }

        var ws = MadSocket('ws://localhost:8090/ws', {
          open: function () {
            toChat('Connected', 'gray');
          },
          close: function () {
            toChat('Disconnected', 'gray');
          },
          message: function (message) {
            toChat('Server: ' + message);
          }
        });

        function send () {
          var input = document.getElementById('input');
          var message = input.value;
          input.value = '';
          if (message === 'exit') {
            ws.close(1000);
          } else {
            toChat('You: ' + message);
            ws.send(message);
          }
        }

        function keypress (event) {
          if (event.keyCode === 13) {
            send();
          }
        }
      </script>
      <style>
        * {
          box-sizing: border-box;
        }

        #chat {
          height: 100px;
          width: 250px;
          overflow: auto;
          border: 1px solid black;
          margin-bottom: 10px;
        }

        #input {
          width: 200px;
          border: 1px solid black;
          height: 24px;
        }

        button {
          width: 50px;
          border: 1px solid black;
          padding: 0;
          height: 24px;
        }
      </style>
    </head>
    <body>
      <div id='chat'></div>
      <input id='input' onkeypress="keypress(event)" /><button onclick='send()'>Send</button>
    </body>
  </html>
`;

const clients = [];

const ws = new MadSocket({
  connect: function () {
    clients.push(this);
    console.log('Client connected. Currently active clients: ' + clients.length);
    this.data = {
      connectionTime: new Date()
    };
  },
  disconnect: function () {
    console.log('Client disconnected');
    this.data.disconnectionTime = new Date();
    this.data.timeout = (this.data.disconnectionTime - this.data.connectionTime) / 1000;
    console.log(this.data);

    const index = clients.indexOf(this);
    clients.splice(index, 1);
  },
  data: function (data) {
    console.log('Client wrote: ', data);
    if (data.toString() === 'quit') {
      this.close(1000);
    } else if (clients.length === 1) {
      this.send(data.toString().split('').reverse().join(''));
    } else {
      for (let index = 0 ; index < clients.length ; ++index) {
        if (clients[index] !== this) {
          clients[index].send(data);
        }
      }
    }
  },
  error: function (error) {
    console.log(error);
  }
}, {
  debug: function (type, data) {
    console.log(type + ':', data.toString('hex'));
  },
  timeout: 300000
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
    // This case works in NodeJS v10+, but I use 'upgrade' listener instead for older versions compatibility.
    // case '/ws':
    //  ws.leach(request, response);
    //  break;
  }
}).on('upgrade', function (message, socket) {
  ws.leach(message, socket);
}).listen(8090, '0.0.0.0', function () { console.log('I\'m listening') });
