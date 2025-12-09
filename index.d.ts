import type { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import { OPCODE } from './constants';

type MessageParams = {
  fin: boolean;
  opcode: (typeof OPCODE)[keyof typeof OPCODE];
};

type Listeners = {
  start?: (this: MadSocket) => void;
  close?: (this: MadSocket) => void;

  error?: (this: MadSocket | ClientRequest, error: any) => void;

  connect?: (this: ClientRequest) => void;
  disconnect?: (this: ClientRequest) => void;
  message?: (this: ClientRequest, message: Buffer, params: MessageParams) => void;
};

type Props = {
  timeout?: number;
  debug?: (type: string, data: Buffer) => void;
};

export class MadSocket {
  constructor(listeners?: Listeners, props?: Props);

  listen(port?: number, host?: string);

  close();

  leach(request: IncomingMessage, response: ServerResponse<IncomingMessage>); // DEPRECATED
  leech(request: IncomingMessage, response: ServerResponse<IncomingMessage>);
}

export class ClientRequest {
  request: IncomingMessage;
  send(message: string, params?: Partial<MessageParams>);
  close(status?: number, reason?: string);
}

type ClientListeners = {
  error?: (this: MadSocketClient, error: any) => void;
  message?: (this: MadSocketClient, message: Buffer, params: MessageParams) => void;
  connect?: (this: MadSocketClient) => void;
  disconnect?: (this: MadSocketClient) => void;
};

type ClientParams = {
  url?: string;
  debug?: (this: MadSocketClient, type: string, data?: any) => void;
};

export class MadSocketClient {
  url: string;
  listeners: ClientListeners;
  socket: Socket | null;
  status: 'init' | 'handshake' | 'active' | 'error' | 'closed';
  key: string;

  static connect(url: string, listeners?: ClientListeners): MadSocketClient;

  constructor(listeners?: ClientListeners, params?: ClientParams);
  on(listeners: ClientListeners): this;
  connect(url?: string): this;
  close(): void;
  send(data: string | Buffer, params?: Partial<MessageParams>): void;
}
