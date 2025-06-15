/**
 * AudioPlayerコンポーネントのテスト
 * 基本的なUI要素のテストケース
 */

import { mount, VueWrapper, DOMWrapper } from '@vue/test-utils'
import AudioPlayer from '@/components/AudioPlayer.vue'
import Knob from '@/components/Knob.vue'
// @ts-ignore
import flushPromises from 'flush-promises'

// Web Audio APIのモック
const mockGainNode = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  gain: { 
    value: 1,
    setTargetAtTime: jest.fn()
  }
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

const mockStereoPanner = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  pan: {
    value: 0,
    setValueAtTime: jest.fn()
  }
}

const mockAudioContext = {
  createGain: jest.fn().mockReturnValue(mockGainNode),
  createBiquadFilter: jest.fn().mockReturnValue(mockBiquadFilter),
  createAnalyser: jest.fn().mockReturnValue(mockAnalyser),
  createStereoPanner: jest.fn().mockReturnValue(mockStereoPanner),
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

  beforeEach(async () => {
    // コンポーネントをマウント
    wrapper = mount(AudioPlayer)
    await flushPromises()
  })

  afterEach(() => {
    wrapper.unmount()
  })

  // 基本的なUIテスト
  it('コンポーネントが正しくマウントされる', async () => {
    expect(wrapper.exists()).toBe(true)
    await flushPromises()
  })

  it('初期状態で再生ボタンが表示される', async () => {
    const playButton = wrapper.find('button')
    expect(playButton.exists()).toBe(true)
    expect(playButton.text()).toBe('再生')
    await flushPromises()
  })

  it('初期状態でマスターボリュームノブが表示される', async () => {
    const masterVolumeKnob = wrapper.findAllComponents(Knob).find((knob: VueWrapper<any>) => 
      knob.props('label') === 'Master'
    )
    expect(masterVolumeKnob).toBeTruthy()
    await flushPromises()
  })

  it('各サンプルのノブが正しく表示される', async () => {
    const knobs = wrapper.findAllComponents(Knob)
    expect(knobs).toHaveLength(16) // マスター(Gain/Filter) + サンプル1(Gain/Filter/Pitch/Pan) + サンプル2(Gain/Filter/Timing/Pitch/Pan) + サンプル3(Gain/Filter/Timing/Pitch/Pan)
    await flushPromises()
  })

  it('サンプル3のノブは初期状態で無効化されている', async () => {
    const wrapper = mount(AudioPlayer)
    await flushPromises()

    const sample3Container = wrapper.findAll('.sample-container').at(2)
    if (!sample3Container) throw new Error('サンプル3のcontainerが見つかりません')

    const sample3Knobs = sample3Container.findAllComponents({ name: 'Knob' })
    const labels = ['Gain', 'Filter', 'Timing', 'Pitch', 'Pan']
    expect(sample3Knobs).toHaveLength(5)

    sample3Knobs.forEach((knob: any, idx: number) => {
      expect(knob.props('label')).toBe(labels[idx])
      expect(knob.props('isDisabled')).toBe(true)
    })

    const toggle = sample3Container.find('input[type="checkbox"]')
    await toggle.setValue(true)
    await flushPromises()

    const updatedKnobs = sample3Container.findAllComponents({ name: 'Knob' })
    updatedKnobs.forEach((knob: any, idx: number) => {
      expect(knob.props('label')).toBe(labels[idx])
      expect(knob.props('isDisabled')).toBe(false)
    })
  })

  // チャンネル3の有効/無効のテストを追加
  it('チャンネル3のトグルスイッチで有効/無効を切り替えられる', async () => {
    const toggleSwitch = wrapper.find('.toggle-switch input[type="checkbox"]')
    expect(toggleSwitch.exists()).toBe(true)

    // 初期状態は無効
    expect(wrapper.vm.isChannel3Enabled).toBe(false)

    // トグルスイッチをクリックして有効化
    await toggleSwitch.setValue(true)
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(wrapper.vm.isChannel3Enabled).toBe(true)

    // 再度クリックして無効化
    await toggleSwitch.setValue(false)
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(wrapper.vm.isChannel3Enabled).toBe(false)
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