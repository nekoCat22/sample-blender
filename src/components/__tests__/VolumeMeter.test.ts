/**
 * @file VolumeMeter.test.ts
 * @brief VolumeMeterコンポーネントのテスト
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VolumeMeter from '../VolumeMeter.vue'
import { AudioEngine } from '../../core/AudioEngine'

describe('VolumeMeter', () => {
  let wrapper: any
  let audioEngine: AudioEngine
  let mockSetInterval: jest.SpyInstance
  let mockClearInterval: jest.SpyInstance
  let intervalCallback: TimerHandler

  beforeEach(() => {
    // setIntervalのモック
    mockSetInterval = jest.spyOn(window, 'setInterval').mockImplementation((handler: TimerHandler) => {
      intervalCallback = handler
      return 1
    })

    // clearIntervalのモック
    mockClearInterval = jest.spyOn(window, 'clearInterval').mockImplementation(() => {})

    // AudioEngineのモックを作成
    audioEngine = {
      getSampleVolume: jest.fn().mockReturnValue(0.5),
      dispose: jest.fn()
    } as unknown as AudioEngine

    // コンポーネントをマウント
    wrapper = mount(VolumeMeter, {
      props: {
        audioEngine,
        isPlaying: false
      }
    })
  })

  afterEach(() => {
    mockSetInterval.mockRestore()
    mockClearInterval.mockRestore()
  })

  it('初期状態では-60dBを表示する', () => {
    expect(wrapper.vm.level).toBe(-60)
  })

  it('再生中は音量レベルを更新する', async () => {
    // モックの設定
    jest.mocked(audioEngine.getSampleVolume)
      .mockReturnValueOnce(0.5)  // sample1
      .mockReturnValueOnce(0.3)  // sample2
      .mockReturnValueOnce(0.2)  // sample3

    // 再生状態を変更
    await wrapper.setProps({ isPlaying: true })

    // インターバルコールバックを実行
    if (typeof intervalCallback === 'function') {
      intervalCallback()
    }

    // 音量レベルの計算を確認
    const expectedLevel = 20 * Math.log10((0.5 + 0.3 + 0.2) / 3)
    expect(wrapper.vm.level).toBeCloseTo(expectedLevel, 1)
  })

  it('再生停止時は-60dBにリセットする', async () => {
    // 再生状態を変更
    await wrapper.setProps({ isPlaying: true })
    await wrapper.setProps({ isPlaying: false })

    expect(wrapper.vm.level).toBe(-60)
  })

  it('コンポーネントのアンマウント時にインターバルをクリアする', async () => {
    // 再生状態を変更してインターバルを設定
    await wrapper.setProps({ isPlaying: true })

    // コンポーネントをアンマウント
    wrapper.unmount()

    // clearIntervalが呼ばれたことを確認
    expect(mockClearInterval).toHaveBeenCalled()
  })

  it('警告域と危険域の表示を確認', async () => {
    // モックの設定
    jest.mocked(audioEngine.getSampleVolume)
      .mockReturnValue(0.8)  // すべてのサンプルで0.8を返す

    // 再生状態を変更してインターバルを開始
    await wrapper.setProps({ isPlaying: true })

    // インターバルコールバックを実行して音量レベルを更新
    if (typeof intervalCallback === 'function') {
      intervalCallback()
    }

    // DOMの更新を待つ
    await nextTick()

    // 警告域の表示を確認
    const meterLevel = wrapper.find('.meter-level')
    expect(meterLevel.classes()).toContain('meter-level--warning')
    expect(meterLevel.classes()).toContain('meter-level--danger')
  })
}) 