# MadSocket

It's just one of many other WebSocket server implementations on NodeJS.

## Server instance

```
const MadSocket = require('madsocket');

const ws = new MadSocket(<listeners>, <props>);
```

Initialization of WebSocket instance. Yet it does nothing more than just exists and store its configuration.

*listeners* - optional. Set of websocket event listeners.

*props* - optional. Server settings.

### props

Second argument for constructor function. But since it more simple I'll start with it.
Currently this object supports only one property.

```
{
  timeout: 0
}
```

*timeout* - Maximum time of inactivity for one socket connection in milliseconds.
After time has passed inactive socket is being automatically disconnected.
Default value is 0, which means infinite time, and socket will never be automatically disconnected.

### listeners

First argument for constructor function. There we should describe all valuable actions for websocket events.

```
{
  start: function () {},        // Server is listening for income connections.
  close: function () {},        // Server is no more listening.

  connect: function () {},      // Client connected to server.
  disconnect: function () {},   // Client disconnected from server.
  data: function (message) {}   // Client sent message
}
```

All listeners are optional, and you can ommit any listener that you are not interested in.

First two listeners are server related. They get no arguments, but has MadSocket instance as a context (`this`).

All other listeners are Client relative. They all get Client instance as a context (`this`), and only `data` listener
receives actual message as function argument.

### ws.listen

```
ws.listen(port = 80, host = '0.0.0.0');
```

Start websocket server for income connections. `listeners.start` will be emitted on successfull server start.

### ws.close

```
ws.listen();
```

Stop server from listening to new connections. `listeners.close` will be emitted after server is stopped.

### ws.leach

```
ws.leach(request, response);
```

Sometimes (or for me it's always) you already have your webserver listening to the same port as you want for
WebSocket to listen to. In such cases you can setup your web server to pass connections into MadSocket instance.

```
// For NodeJS v10+ you can use ws.leach right inside of server's `connection` event listener.
const server = http.crateServer((request, response) => {
  if (request.url === '/ws') {
    ws.leach(request, response);
  }
}).listen(80);

// For older versions compatibility (less then NodeJS v10) you have to attach listener to `upgrade` server event.
// Otherwise socket will be automatically destroyed. With this approach you don't need to place ws.leach inside
// 'connection' listener, otherwise unexpected behavior may be encountered.
server.on('upgrade', (request, socket) => {
  ws.leach(request, socket);
});
```

Given example should be enough for sharing single connection port between WebSocket and native NodeJS http(s) server.

In this case MadSocket server itself is never being started, so `start` and `close` events will never be triggered.

## Client instance

When any Client relative event (connect, disconnect, data) occures, corresponding listener is being called with
Client instance as a context. So you can use `this` keyword to gain access to this instance and its methods.

### client.send

```
client.send(message);
```

Send message to this client.

### client.close

```
client.close();
```

Disconnect client from WebSocket server.
