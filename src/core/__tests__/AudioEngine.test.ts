/**
 * @file AudioEngine.test.ts
 * @brief AudioEngineクラスのテスト
 * @details
 * - 初期化と破棄のテスト
 * - サンプルの読み込みと再生のテスト
 * - タイミング制御のテスト
 * - 音量制御のテスト
 * - 再生終了イベントのテスト
 */

import { AudioEngine } from '../AudioEngine'

// Web Audio APIのモック
class MockAudioContext {
  private _currentTime = 0

  constructor() {
    // メソッドをバインド
    this.createGain = this.createGain.bind(this)
    this.createBufferSource = this.createBufferSource.bind(this)
    this.decodeAudioData = this.decodeAudioData.bind(this)
    this.suspend = this.suspend.bind(this)
    this.resume = this.resume.bind(this)
    this.close = this.close.bind(this)
  }

  createGain() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: { value: 1 }
    }
  }

  createBufferSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
      onended: null as (() => void) | null
    }
  }

  async decodeAudioData(data: ArrayBuffer): Promise<MockAudioBuffer> {
    return new MockAudioBuffer()
  }

  get currentTime() {
    return this._currentTime
  }

  get destination() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  }

  get state() {
    return 'running'
  }

  async suspend() {}
  async resume() {}
  async close() {}
}

class MockAudioBuffer {
  duration = 1
  length = 44100
  numberOfChannels = 2
  sampleRate = 44100
  copyFromChannel() {}
  copyToChannel() {}
  getChannelData() { return new Float32Array() }
}

// グローバルなモックの設定
Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true
})
Object.defineProperty(window, 'AudioBuffer', {
  value: MockAudioBuffer,
  writable: true,
  configurable: true
})

describe('AudioEngine', () => {
  let audioEngine: AudioEngine

  beforeEach(() => {
    audioEngine = new AudioEngine()
  })

  afterEach(async () => {
    await audioEngine.dispose()
  })

  describe('初期化と破棄', () => {
    it('正常に初期化できること', () => {
      expect(audioEngine).toBeInstanceOf(AudioEngine)
    })

    it('正常に破棄できること', async () => {
      await expect(audioEngine.dispose()).resolves.not.toThrow()
    })
  })

  describe('サンプルの読み込みと再生', () => {
    const mockAudioData = new ArrayBuffer(1024)

    beforeEach(async () => {
      // モックの音声データを読み込み
      await audioEngine.loadSample('1', mockAudioData)
    })

    it('サンプルを再生できること', () => {
      expect(() => audioEngine.playSample('1')).not.toThrow()
    })

    it('存在しないサンプルを再生しようとするとエラーになること', () => {
      expect(() => audioEngine.playSample('999')).toThrow('サンプル 999 が見つかりません')
    })
  })

  describe('タイミング制御', () => {
    it('タイミングを設定できること', () => {
      expect(() => audioEngine.setTiming('1', 0.2)).not.toThrow()
    })

    it('無効なタイミングを設定しようとするとエラーになること', () => {
      expect(() => audioEngine.setTiming('1', -0.1)).toThrow()
      expect(() => audioEngine.setTiming('1', 0.6)).toThrow()
    })

    it('タイミングをリセットできること', () => {
      audioEngine.setTiming('1', 0.2)
      audioEngine.resetTiming('1')
      expect(audioEngine.getTiming('1')).toBe(0)
    })
  })

  describe('音量制御', () => {
    it('マスターボリュームを設定できること', () => {
      expect(() => audioEngine.setMasterVolume(0.5)).not.toThrow()
    })

    it('無効なマスターボリュームを設定しようとするとエラーになること', () => {
      expect(() => audioEngine.setMasterVolume(-0.1)).toThrow()
      expect(() => audioEngine.setMasterVolume(1.1)).toThrow()
    })

    it('サンプルの音量を設定できること', () => {
      expect(() => audioEngine.setSampleVolume('1', 0.5)).not.toThrow()
    })
  })

  describe('再生終了イベント', () => {
    const mockAudioData = new ArrayBuffer(1024)
    let playbackEndCallback: jest.Mock

    beforeEach(async () => {
      // モックの音声データを読み込み
      await audioEngine.loadSample('1', mockAudioData)
      await audioEngine.loadSample('2', mockAudioData)
      playbackEndCallback = jest.fn()
      audioEngine.setOnPlaybackEnd(playbackEndCallback)
    })

    it('複数のサンプルを同時に再生できること', () => {
      expect(() => audioEngine.playSamples(['1', '2'])).not.toThrow()
    })

    it('タイミングを指定して再生できること', () => {
      expect(() => audioEngine.playSamples(['1', '2'], { '2': 0.2 })).not.toThrow()
    })

    it('再生終了時にコールバックが呼ばれること', () => {
      // 再生開始
      audioEngine.playSamples(['1', '2'])

      // AudioEngineから実際のソースノードを取得して再生終了イベントを発火
      // @ts-ignore - プライベートメソッドのテストのため
      const source1 = audioEngine['sampleSources'].get('1')
      // @ts-ignore - プライベートメソッドのテストのため
      const source2 = audioEngine['sampleSources'].get('2')

      // 再生終了イベントを発火
      source1?.onended?.(new Event('ended'))
      source2?.onended?.(new Event('ended'))

      // コールバックが1回だけ呼ばれることを確認
      expect(playbackEndCallback).toHaveBeenCalledTimes(1)
    })
  })
}) 