/**
 * AudioPlayerコンポーネントのテスト
 * 基本的なUI要素のテストケース
 */

import { mount } from '@vue/test-utils'
import AudioPlayer from '@/components/AudioPlayer.vue'
import Knob from '@/components/Knob.vue'
import { VueWrapper } from '@vue/test-utils'

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
    const masterVolumeKnob = wrapper.findAllComponents(Knob).find(knob => 
      knob.props('label') === 'Master'
    )
    expect(masterVolumeKnob).toBeTruthy()
  })

  it('各サンプルのノブが正しく表示される', () => {
    const knobs = wrapper.findAllComponents(Knob)
    expect(knobs).toHaveLength(6) // マスター + サンプル1のGain + サンプル2のGain/Timing + サンプル3のGain/Timing
  })

  it('サンプル3のノブは初期状態で無効化されている', () => {
    // サンプル3のコンテナを探す
    const sample3Container = wrapper.findAll('.sample-container').find(container => 
      container.find('h3').text() === 'サンプル3'
    )
    
    if (!sample3Container) {
      throw new Error('サンプル3のコンテナが見つかりません')
    }

    const sample3Knobs = sample3Container.findAllComponents(Knob)
    
    // Gainノブとタイミングノブの両方が無効化されていることを確認
    expect(sample3Knobs).toHaveLength(2)
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