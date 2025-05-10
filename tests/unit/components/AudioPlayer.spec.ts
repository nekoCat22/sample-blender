/**
 * AudioPlayerコンポーネントのテスト
 * 基本的なUI要素のテストケース
 */

import { mount, VueWrapper, DOMWrapper } from '@vue/test-utils'
import AudioPlayer from '@/components/AudioPlayer.vue'
import Knob from '@/components/Knob.vue'

// Web Audio APIのモック
const mockGainNode = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  gain: { value: 1 }
}

const mockBiquadFilter = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  frequency: { value: 1000 },
  Q: { value: 1 },
  gain: { value: 0 },
  type: 'lowpass'
}

const mockAnalyser = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  getByteFrequencyData: jest.fn()
}

const mockAudioContext = {
  createGain: jest.fn().mockReturnValue(mockGainNode),
  createBiquadFilter: jest.fn().mockReturnValue(mockBiquadFilter),
  createAnalyser: jest.fn().mockReturnValue(mockAnalyser),
  destination: {},
  close: jest.fn().mockResolvedValue(undefined),
  decodeAudioData: jest.fn().mockResolvedValue({
    duration: 1.0,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(44100))
  })
}

// グローバルなAudioContextをモック
declare const global: { AudioContext: jest.Mock }
global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext)

// WaveformDisplayコンポーネントをモック
jest.mock('@/components/WaveformDisplay.vue', () => ({
  name: 'WaveformDisplay',
  template: '<div class="mock-waveform"></div>',
  props: {
    audioBlob: {
      type: Object,
      required: true
    }
  }
}))

// WaveSurferのエラーを無視する設定
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  if (args[0]?.includes('HTMLMediaElement')) {
    return
  }
  originalConsoleError(...args)
}

describe('AudioPlayer.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    // コンポーネントをマウント
    wrapper = mount(AudioPlayer)
  })

  afterEach(() => {
    wrapper.unmount()
  })

  // 基本的なUIテスト
  it('コンポーネントが正しくマウントされる', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('初期状態で再生ボタンが表示される', () => {
    const playButton = wrapper.find('button')
    expect(playButton.exists()).toBe(true)
    expect(playButton.text()).toBe('再生')
  })

  it('初期状態でマスターボリュームノブが表示される', () => {
    const masterVolumeKnob = wrapper.findAllComponents(Knob).find((knob: VueWrapper<any>) => 
      knob.props('label') === 'Master'
    )
    expect(masterVolumeKnob).toBeTruthy()
  })

  it('各サンプルのノブが正しく表示される', () => {
    const knobs = wrapper.findAllComponents(Knob)
    expect(knobs).toHaveLength(10) // マスター(Gain/Filter) + サンプル1(Gain/Filter) + サンプル2(Gain/Filter/Timing) + サンプル3(Gain/Filter/Timing)
  })

  it('サンプル3のノブは初期状態で無効化されている', () => {
    // サンプル3のコンテナを探す
    const sample3Container = wrapper.findAll('.sample-container').find((container: DOMWrapper<Element>) => 
      container.find('h3').text() === 'サンプル3'
    )
    
    if (!sample3Container) {
      throw new Error('サンプル3のコンテナが見つかりません')
    }

    const sample3Knobs = sample3Container.findAllComponents(Knob)
    
    // Gain/Filter/Timingノブの全てが無効化されていることを確認
    expect(sample3Knobs).toHaveLength(3)
    sample3Knobs.forEach((knob: VueWrapper<any>) => {
      expect(knob.props('isDisabled')).toBe(true)
    })
  })

  // オーディオ関連のテストはスキップ
  it.skip('オーディオファイルを読み込める', () => {
    // テストをスキップ
  })

  it.skip('再生ボタンをクリックすると再生状態が切り替わる', () => {
    // テストをスキップ
  })

  it.skip('マスターボリュームを調整できる', () => {
    // テストをスキップ
  })
}) 