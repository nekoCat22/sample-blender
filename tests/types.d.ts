/**
 * テスト用の型定義ファイル
 */

import type { ComponentPublicInstance } from 'vue'
import type { VueWrapper, DOMWrapper } from '@vue/test-utils'

declare module '@vue/test-utils' {
  export * from '@vue/test-utils'
  export type { VueWrapper, DOMWrapper }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
} 