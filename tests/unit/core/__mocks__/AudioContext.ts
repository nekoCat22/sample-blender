/**
 * @file AudioContext.ts
 * @brief Web Audio APIのモック
 * @details
 * - AudioContextのモック
 * - GainNodeのモック
 */

class MockGainNode {
  private _gainValue: number = 1;
  private connected: boolean = true;

  constructor() {}

  disconnect() {
    this.connected = false;
  }

  connect(destination: any) {
    this.connected = true;
  }

  get gain() {
    return this._gainValue;
  }

  set gain(value: number) {
    if (value < 0 || value > 1) {
      throw new Error('Gain value must be between 0 and 1');
    }
    this._gainValue = value;
  }
}

class MockAudioContext {
  private _state: 'running' | 'suspended' | 'closed' = 'running';
  private gainNode: MockGainNode;

  constructor() {
    this.gainNode = new MockGainNode();
  }

  createGain() {
    return this.gainNode;
  }

  async suspend() {
    this._state = 'suspended';
  }

  async resume() {
    this._state = 'running';
  }

  async close() {
    this._state = 'closed';
  }

  get state() {
    return this._state;
  }
}

// グローバルにモックを公開
(window as any).AudioContext = MockAudioContext; 