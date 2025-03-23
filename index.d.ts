import { IncomingMessage, ServerResponse } from 'http';

declare module 'madsocket' {
  type Listeners = {
    start?: (this: MadSocket) => void;
    close?: (this: MadSocket) => void;

    error?: (this: MadSocket | Client, error: any) => void;

    connect?: (this: Client) => void;
    disconnect?: (this: Client) => void;
    message?: (this: Client, message: string) => void;
  };

  type Props = {
    timeout?: number;
    debug?: (type: string, data: Buffer) => void;
  };

  export class MadSocket {
    constructor(listeners: Listeners, props: Props);

    listen(port: number, host?: string);

    close();

    leach(request: IncomingMessage, response: ServerResponse<IncomingMessage>); // DEPRECATED
    leech(request: IncomingMessage, response: ServerResponse<IncomingMessage>);
  }

  export class Client {
    send(message: string);
    close(status?: number, reason?: string);
  }
}
