/**
 * @file setup.js
 * @brief Jestのセットアップファイル
 * @details
 * - Web Audio APIのモックを設定
 * - グローバルなテスト環境の設定
 */

// Web Audio APIのモック
class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
  }

  setValueAtTime(value, time) {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    return this;
  }
}

class MockAudioNode {
  constructor() {
    this.context = new MockAudioContext();
  }

  connect(destination) {
    return destination;
  }

  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super();
    this._gainValue = 1;
    this.gain = new MockAudioParam(this._gainValue);
  }
}

class MockAudioContext {
  constructor() {
    this._state = 'running';
  }

  createGain() {
    return new MockGainNode();
  }

  async suspend() {
    this._state = 'suspended';
    return Promise.resolve();
  }

  async resume() {
    this._state = 'running';
    return Promise.resolve();
  }

  async close() {
    this._state = 'closed';
    return Promise.resolve();
  }

  get state() {
    return this._state;
  }
}

// グローバルにモックを設定
global.AudioContext = MockAudioContext;
global.AudioNode = MockAudioNode;
global.AudioParam = MockAudioParam;
global.GainNode = MockGainNode;
global.window.AudioContext = MockAudioContext;
global.window.AudioNode = MockAudioNode;
global.window.AudioParam = MockAudioParam;
global.window.GainNode = MockGainNode;

// グローバルなfetchのモック
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    redirected: false,
    status: 200,
    statusText: 'OK',
    type: 'basic',
    url: 'http://example.com'
  })
)

// ResizeObserverのモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
})) 