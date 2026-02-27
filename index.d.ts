import type { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';

type Opcodes = {
  CONTINUATION: 0x0;
  TEXT: 0x1;
  BINARY: 0x2;
  CLOSE: 0x8;
  PING: 0x9;
  PONG: 0xa;
};

type MessageParams = {
  fin: boolean;
  opcode: Opcodes[keyof Opcodes];
};

type Frame = {
  type: number;
  fin: boolean;
  data: Buffer;
};

type Listeners = {
  start?: (this: MadSocket) => void;
  close?: (this: MadSocket) => void;

  error?: (this: MadSocket | ClientConnection, error: any) => void;

  connect?: (this: ClientConnection) => void;
  disconnect?: (this: ClientConnection) => void;
  message?: (this: ClientConnection, message: Buffer, params: MessageParams) => void;
  frame?: (this: ClientConnection, frame: Frame) => void;
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

export class ClientConnection {
  request: IncomingMessage;
  send(message: string, params?: Partial<MessageParams>): Promise<Buffer>;
  close(status?: number, reason?: string);
  ping(message?: string, timeout?: number): Promise<boolean>;
  write(data: string | Buffer): Promise<Buffer>;
}

type HandshakeInfo = {
  success: boolean;
  status: number;
  headers: IncomingMessage['headers'];
  errorMessage: string;
};

type ClientListeners = {
  error?: (this: MadSocketClient, error: any) => void;
  message?: (this: MadSocketClient, message: Buffer, params: MessageParams) => void;
  connect?: (this: MadSocketClient) => void;
  disconnect?: (this: MadSocketClient) => void;
  handshake?: (this: MadSocketClient, info: HandshakeInfo) => void;
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

export const OPCODE: Opcodes;
