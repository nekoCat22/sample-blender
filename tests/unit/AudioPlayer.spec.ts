/**
 * AudioPlayerコンポーネントのテスト
 * 基本的なUI要素のテストケース
 */

import { mount } from '@vue/test-utils'
import AudioPlayer from '@/components/AudioPlayer.vue'

describe('AudioPlayer.vue', () => {
  let wrapper: any

  beforeEach(async () => {
    // コンポーネントをマウント
    wrapper = mount(AudioPlayer, {
      attachTo: document.body,
      global: {
        stubs: {
          'wave-surfer': true
        }
      }
    })
    
    // コンポーネントの初期化を待つ
    await wrapper.vm.$nextTick()
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('コンポーネントが正しくマウントされる', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('初期状態で再生ボタンが表示される', () => {
    const playButton = wrapper.find('button')
    expect(playButton.exists()).toBe(true)
    expect(playButton.text()).toBe('再生')
  })

  it('初期状態でマスターボリュームノブが表示される', () => {
    const masterVolumeContainer = wrapper.find('.master-volume-container')
    expect(masterVolumeContainer.exists()).toBe(true)
    const masterKnob = masterVolumeContainer.find('.knob')
    expect(masterKnob.exists()).toBe(true)
  })

  it('初期状態で波形表示エリアが表示される', () => {
    const waveformContainers = wrapper.findAll('.sample-container')
    expect(waveformContainers.length).toBe(3)
  })

  it('初期状態で音量メーターが表示される', () => {
    const meter = wrapper.find('.meter')
    expect(meter.exists()).toBe(true)
  })

  it('サンプル3のトグルスイッチが表示される', () => {
    const toggleSwitch = wrapper.find('.toggle-switch')
    expect(toggleSwitch.exists()).toBe(true)
  })

  it('各サンプルに音量ノブが表示される', () => {
    const volumeKnobs = wrapper.findAll('.knob-container .knob')
    expect(volumeKnobs.length).toBeGreaterThan(0)
  })
}) 