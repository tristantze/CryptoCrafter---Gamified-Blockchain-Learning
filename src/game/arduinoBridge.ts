import { Capacitor, registerPlugin } from '@capacitor/core';

type BridgeStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'error';

const DEVICE_NAME_PREFIX = 'CryptoCrafter_Box';
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export interface ArduinoBridgeState {
  status: BridgeStatus;
  detail: string;
  lastScene: string;
  lastError?: string;
}

interface ProgressSnapshot {
  miningComplete: boolean;
  verificationComplete: boolean;
  chainComplete: boolean;
  boxUnlocked: boolean;
}

interface NativeBoxBluetoothResult {
  connected?: boolean;
  detail?: string;
  deviceName?: string;
}

interface NativeBoxBluetoothPlugin {
  connect(): Promise<NativeBoxBluetoothResult>;
  disconnect(): Promise<NativeBoxBluetoothResult>;
  sendCommand(options: { command: string }): Promise<NativeBoxBluetoothResult>;
  getStatus(): Promise<NativeBoxBluetoothResult>;
}

const NativeBoxBluetooth = registerPlugin<NativeBoxBluetoothPlugin>('BoxBluetooth');

interface BluetoothLike {
  requestDevice(options: {
    filters: Array<{ namePrefix?: string; services?: string[] }>;
    optionalServices?: string[];
  }): Promise<BluetoothDeviceLike>;
}

interface BluetoothDeviceLike extends EventTarget {
  name?: string;
  gatt?: BluetoothRemoteGATTServerLike;
}

interface BluetoothRemoteGATTServerLike {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServerLike>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTServiceLike>;
}

interface BluetoothRemoteGATTServiceLike {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristicLike>;
}

interface BluetoothRemoteGATTCharacteristicLike extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristicLike>;
  writeValue(value: BufferSource): Promise<void>;
}

declare global {
  interface Navigator {
    bluetooth?: BluetoothLike;
  }
}

class ArduinoBridge {
  private state: ArduinoBridgeState = {
    status: this.hasNativeBluetoothSupport() || this.hasBluetoothSupport() ? 'disconnected' : 'unsupported',
    detail: this.initialDetail(),
    lastScene: 'MainMenuScene',
  };

  private listeners = new Set<(state: ArduinoBridgeState) => void>();
  private device?: BluetoothDeviceLike;
  private rxCharacteristic?: BluetoothRemoteGATTCharacteristicLike;
  private txCharacteristic?: BluetoothRemoteGATTCharacteristicLike;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private pendingProgress?: ProgressSnapshot;

  subscribe(listener: (state: ArduinoBridgeState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return this.state;
  }

  async connect() {
    if (this.hasNativeBluetoothSupport()) {
      await this.connectNative();
      return;
    }

    if (!this.hasBluetoothSupport()) {
      this.updateState({
        status: 'unsupported',
        detail: 'This browser cannot connect to the Prize Chest over Web Bluetooth.',
      });
      return;
    }

    this.updateState({
      status: 'connecting',
      detail: 'Waiting for the Prize Chest selection...',
      lastError: undefined,
    });

    try {
      this.device = await navigator.bluetooth!.requestDevice({
        filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
        optionalServices: [UART_SERVICE_UUID],
      });
      this.device.addEventListener('gattserverdisconnected', this.handleGattDisconnect);

      const server = await this.device.gatt!.connect();
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
      this.txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
      this.txCharacteristic.addEventListener('characteristicvaluechanged', this.handleNotification);
      await this.txCharacteristic.startNotifications();

      this.updateState({
        status: 'connected',
        detail: `${this.device.name ?? 'Prize Chest'} connected.`,
        lastError: undefined,
      });

      await this.sendLine('HELLO');
      await this.reportScene(this.state.lastScene);
      if (this.pendingProgress) {
        await this.syncProgressState(this.pendingProgress);
      }
    } catch (error) {
      await this.disconnect(false);
      this.updateState({
        status: this.hasBluetoothSupport() ? 'disconnected' : 'unsupported',
        detail: 'Bluetooth connection was cancelled or failed.',
        lastError: error instanceof Error ? error.message : 'Unknown Bluetooth error',
      });
    }
  }

  async disconnect(updateStatus = true) {
    if (this.hasNativeBluetoothSupport()) {
      try {
        await NativeBoxBluetooth.disconnect();
      } catch {
        // Native disconnect is best effort; JS state still needs to clear.
      }

      if (updateStatus) {
        this.updateState({
          status: 'disconnected',
          detail: 'Prize Chest disconnected.',
        });
      }
      return;
    }

    this.txCharacteristic?.removeEventListener('characteristicvaluechanged', this.handleNotification);
    this.device?.removeEventListener('gattserverdisconnected', this.handleGattDisconnect);

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.device = undefined;
    this.rxCharacteristic = undefined;
    this.txCharacteristic = undefined;

    if (updateStatus) {
      this.updateState({
        status: this.hasBluetoothSupport() ? 'disconnected' : 'unsupported',
        detail: this.hasBluetoothSupport()
          ? 'Prize Chest disconnected.'
          : 'Web Bluetooth is unavailable in this browser.',
      });
    }
  }

  async reportScene(sceneName: string) {
    this.updateState({ lastScene: sceneName });
    await this.sendLine(`SCENE|${sceneName}`);
  }

  async syncProgressState(progress: ProgressSnapshot) {
    this.pendingProgress = progress;
    await this.sendLine(
      `STATE|${progress.miningComplete ? 1 : 0}|${progress.verificationComplete ? 1 : 0}|${progress.chainComplete ? 1 : 0}|${progress.boxUnlocked ? 1 : 0}`,
    );
  }

  async sendReward(reward: string) {
    await this.sendLine(`REWARD|${reward}`);
  }

  async sendDebugCommand(command: string) {
    await this.sendLine(command);
  }

  async refreshStatus() {
    if (!this.hasNativeBluetoothSupport()) return;

    try {
      const result = await NativeBoxBluetooth.getStatus();
      this.updateState({
        status: result.connected ? 'connected' : 'disconnected',
        detail: result.detail ?? this.state.detail,
      });
    } catch (error) {
      this.updateState({
        status: 'error',
        detail: 'Could not read native Bluetooth status.',
        lastError: error instanceof Error ? error.message : 'Unknown status error',
      });
    }
  }

  private async connectNative() {
    this.updateState({
      status: 'connecting',
      detail: 'Looking for paired Prize Chest named CryptoCrafter_Box...',
      lastError: undefined,
    });

    try {
      const result = await NativeBoxBluetooth.connect();
      this.updateState({
        status: 'connected',
        detail: result.detail ?? 'Prize Chest connected.',
        lastError: undefined,
      });

      await this.sendLine('HELLO');
      await this.reportScene(this.state.lastScene);
      if (this.pendingProgress) {
        await this.syncProgressState(this.pendingProgress);
      }
    } catch (error) {
      this.updateState({
        status: 'disconnected',
        detail: 'Native Bluetooth connection failed.',
        lastError: error instanceof Error ? error.message : 'Unknown native Bluetooth error',
      });
    }
  }

  private async sendLine(message: string) {
    if (this.hasNativeBluetoothSupport()) {
      if (this.state.status !== 'connected') return;
      const result = await NativeBoxBluetooth.sendCommand({ command: message });
      this.updateState({
        status: result.connected === false ? 'disconnected' : 'connected',
        detail: result.detail ?? this.state.detail,
      });
      return;
    }

    if (!this.rxCharacteristic || this.state.status !== 'connected') return;
    await this.rxCharacteristic.writeValue(this.encoder.encode(`${message}\n`));
  }

  private handleNotification = (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristicLike;
    if (!characteristic.value) return;

    const line = this.decoder.decode(characteristic.value).trim();
    if (line) this.handleIncomingLine(line);
  };

  private handleIncomingLine(line: string) {
    if (line === 'BOX_READY') {
      this.updateState({
        status: 'connected',
        detail: 'Prize Chest connected and ready.',
      });
      return;
    }

    if (line.startsWith('STATUS|')) {
      const detail = line.slice('STATUS|'.length).trim();
      this.updateState({
        status: 'connected',
        detail: detail || 'Prize Chest connected.',
      });
    }
  }

  private handleGattDisconnect = () => {
    this.device = undefined;
    this.rxCharacteristic = undefined;
    this.txCharacteristic = undefined;
    this.updateState({
      status: this.hasBluetoothSupport() ? 'disconnected' : 'unsupported',
      detail: 'Prize Chest disconnected.',
    });
  };

  private hasBluetoothSupport() {
    return typeof navigator !== 'undefined' && typeof navigator.bluetooth?.requestDevice === 'function';
  }

  private hasNativeBluetoothSupport() {
    return Capacitor.isNativePlatform();
  }

  private initialDetail() {
    if (this.hasNativeBluetoothSupport()) {
      return 'Prize Chest connection ready. Pair CryptoCrafter_Box in Android settings first.';
    }

    if (this.hasBluetoothSupport()) {
      return 'Prize Chest ready to connect over Bluetooth.';
    }

    return 'Prize Chest connection is unavailable in this browser.';
  }

  private updateState(next: Partial<ArduinoBridgeState>) {
    this.state = {
      ...this.state,
      ...next,
    };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const arduinoBridge = new ArduinoBridge();
