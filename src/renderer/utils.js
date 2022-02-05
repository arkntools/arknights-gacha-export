import { onBeforeUnmount } from 'vue'
import * as IconComponents from '@element-plus/icons-vue'
const { ipcRenderer } = require('electron')

export const IconInstaller = (app) => {
  Object.values(IconComponents).forEach((component) => {
    app.component(component.name, component)
  })
}

/**
 * @param {Array<Parameters<import('electron')['ipcRenderer']['on']>>} params
 */
export const componentSafeIpcRenderOn = (params) => {
  params.forEach((args) => {
    ipcRenderer.on(...args)
  })
  onBeforeUnmount(() => {
    params.forEach((args) => {
      ipcRenderer.off(...args)
    })
  })
}
