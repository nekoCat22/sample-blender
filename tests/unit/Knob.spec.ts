/**
 * Knobコンポーネントのテスト
 * 基本的なUI要素とイベントのテストケース
 */

import { mount } from '@vue/test-utils'
import Knob from '@/components/Knob.vue'
import { VueWrapper } from '@vue/test-utils'

describe('Knob.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    // コンポーネントをマウント
    wrapper = mount(Knob, {
      props: {
        label: 'Test Knob',
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
        rotationRange: 270,
        initialRotationOffset: -135,
        isDisabled: false,
        resetValue: 0.5
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  // 基本的なUIテスト
  it('コンポーネントが正しくマウントされる', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('ラベルが正しく表示される', () => {
    const label = wrapper.find('.knob-label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Test Knob')
  })

  it('ノブのダイヤルが正しく表示される', () => {
    const dial = wrapper.find('.knob-dial')
    expect(dial.exists()).toBe(true)
  })

  // プロパティのテスト
  it('デフォルトのプロパティが正しく設定される', () => {
    expect(wrapper.props('label')).toBe('Test Knob')
    expect(wrapper.props('value')).toBe(0.5)
    expect(wrapper.props('min')).toBe(0)
    expect(wrapper.props('max')).toBe(1)
    expect(wrapper.props('step')).toBe(0.1)
    expect(wrapper.props('rotationRange')).toBe(270)
    expect(wrapper.props('initialRotationOffset')).toBe(-135)
    expect(wrapper.props('isDisabled')).toBe(false)
    expect(wrapper.props('resetValue')).toBe(0.5)
  })

  // イベントハンドリングのテスト
  it('ダブルクリックでリセットイベントが発火する', async () => {
    const knob = wrapper.find('.knob')
    await knob.trigger('dblclick')
    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('ドラッグで値が更新される', async () => {
    const knob = wrapper.find('.knob')
    await knob.trigger('mousedown', {
      clientY: 100
    })
    await knob.trigger('mousemove', {
      clientY: 90
    })
    await knob.trigger('mouseup')
    expect(wrapper.emitted('update:value')).toBeTruthy()
  })

  it('無効化状態のときはイベントが発火しない', async () => {
    await wrapper.setProps({ isDisabled: true })
    const knob = wrapper.find('.knob')
    await knob.trigger('mousedown')
    await knob.trigger('dblclick')
    expect(wrapper.emitted('update:value')).toBeFalsy()
    expect(wrapper.emitted('reset')).toBeFalsy()
  })

  // スタイルのテスト
  it('無効化状態のときは適切なスタイルが適用される', async () => {
    const container = wrapper.find('.knob-container')
    expect(container.classes()).not.toContain('disabled')
    
    await wrapper.setProps({ isDisabled: true })
    expect(container.classes()).toContain('disabled')
  })

  // 計算プロパティのテスト
  it('回転角度が正しく計算される', async () => {
    await wrapper.setProps({ value: 1 })
    const dial = wrapper.find('.knob-dial')
    const style = dial.attributes('style')
    expect(style).toContain('transform: rotate(135deg)')
  })
}) 