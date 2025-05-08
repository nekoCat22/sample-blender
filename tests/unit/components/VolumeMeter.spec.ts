/**
 * @file VolumeMeter.test.ts
 * @brief VolumeMeterコンポーネントのテスト
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VolumeMeter from '@/components/VolumeMeter.vue'

describe('VolumeMeter', () => {
  let wrapper: any

  beforeEach(() => {
    // コンポーネントをマウント
    wrapper = mount(VolumeMeter, {
      props: {
        level: -60
      }
    })
  })

  it('初期状態では-60dBを表示する', () => {
    expect(wrapper.vm.level).toBe(-60)
  })

  it('音量レベルに応じてメーターの幅が変化する', async () => {
    // 音量レベルを変更
    await wrapper.setProps({ level: -30 })
    await nextTick()

    // メーターの幅を確認（-30dBは50%の位置）
    const meterLevel = wrapper.find('.meter-level')
    expect(meterLevel.attributes('style')).toContain('width: 50%')
  })

  it('警告域（-12dB以上）で警告色を表示する', async () => {
    // 音量レベルを警告域に設定
    await wrapper.setProps({ level: -10 })
    await nextTick()

    // 警告色のクラスが適用されていることを確認
    const meterLevel = wrapper.find('.meter-level')
    expect(meterLevel.classes()).toContain('meter-level--warning')
  })

  it('危険域（-6dB以上）で危険色を表示する', async () => {
    // 音量レベルを危険域に設定
    await wrapper.setProps({ level: -4 })
    await nextTick()

    // 危険色のクラスが適用されていることを確認
    const meterLevel = wrapper.find('.meter-level')
    expect(meterLevel.classes()).toContain('meter-level--danger')
  })

  it('音量レベルが範囲外の場合は適切に制限される', async () => {
    // 音量レベルを範囲外に設定
    await wrapper.setProps({ level: 10 }) // 0dB以上
    await nextTick()

    // メーターの幅が100%に制限されていることを確認
    const meterLevel = wrapper.find('.meter-level')
    expect(meterLevel.attributes('style')).toContain('width: 100%')

    // 音量レベルを負の範囲外に設定
    await wrapper.setProps({ level: -70 }) // -60dB以下
    await nextTick()

    // メーターの幅が0%に制限されていることを確認
    expect(meterLevel.attributes('style')).toContain('width: 0%')
  })
}) 