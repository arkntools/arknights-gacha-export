<template>
  <div v-if="ui" class="relative">
    <div class="flex justify-between">
      <div>
        <el-button
          type="primary"
          :icon="state.status === 'init' ? 'milk-tea' : 'refresh-right'"
          class="focus:outline-none"
          :disabled="!allowClick()"
          plain
          @click="fetchData()"
          :loading="state.status === 'loading'"
          >{{ state.status === 'init' ? ui.button.load : ui.button.update }}</el-button
        >
        <el-button
          icon="folder-opened"
          @click="saveExcel"
          class="focus:outline-none"
          :disabled="!gachaData"
          type="success"
          plain
          >{{ ui.button.excel }}</el-button
        >
        <el-tooltip v-if="detail && state.status !== 'loading'" :content="ui.hint.newAccount" placement="bottom">
          <el-button @click="newUser()" plain icon="plus" class="focus:outline-none"></el-button>
        </el-tooltip>
        <el-tooltip v-if="state.status === 'updated'" :content="ui.hint.relaunchHint" placement="bottom">
          <el-button
            @click="relaunch()"
            type="success"
            icon="refresh"
            class="focus:outline-none"
            style="margin-left: 48px"
            >{{ ui.button.directUpdate }}</el-button
          >
        </el-tooltip>
      </div>
      <div class="flex gap-2">
        <el-select
          v-if="
            state.status !== 'loading' &&
            state.dataMap &&
            (state.dataMap.size > 1 || (state.dataMap.size === 1 && state.current === 0))
          "
          class="w-44"
          @change="changeCurrent"
          :model-value="uidSelectText"
        >
          <el-option v-for="[uid, { nickName }] of state.dataMap" :key="uid" :label="nickName" :value="uid"></el-option>
        </el-select>
        <el-button @click="showSetting(true)" class="focus:outline-none" plain type="info" icon="setting">{{
          ui.button.option
        }}</el-button>
      </div>
    </div>
    <p class="text-gray-400 my-2 text-xs">{{ hint }}</p>
    <div v-if="detail" class="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
      <div class="mb-4" v-for="[pool, item] of detail" :key="pool">
        <div>
          <p class="text-center text-gray-600 my-2">{{ pool }}</p>
          <pie-chart :data="item" :i18n="state.i18n"></pie-chart>
          <gacha-detail :data="item" :i18n="state.i18n"></gacha-detail>
        </div>
      </div>
    </div>
    <Setting
      v-show="state.showSetting"
      :i18n="state.i18n"
      :has-data="!!gachaData"
      @changeLang="getI18nData()"
      @close="showSetting(false)"
    ></Setting>

    <el-dialog
      :title="ui.tokenDialog.title"
      v-model="state.showUrlDlg"
      width="90%"
      custom-class="token-dialog max-w-md"
    >
      <p class="mb-4 text-gray-500">
        {{ ui.tokenDialog.hint1 }}
        <Link href="https://ak.hypergryph.com" />
        {{ ui.tokenDialog.hint2 }}
        <Link href="https://web-api.hypergryph.com/account/info/hg" />
        {{ ui.tokenDialog.hint3 }}
      </p>
      <el-input :placeholder="ui.tokenDialog.placeholder" v-model="state.urlInput" spellcheck="false"></el-input>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="state.showUrlDlg = false" class="focus:outline-none">{{ ui.common.cancel }}</el-button>
          <el-button
            type="primary"
            @click=";(state.showUrlDlg = false), fetchData(state.urlInput)"
            class="focus:outline-none"
            >{{ ui.common.ok }}</el-button
          >
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, toRaw } from 'vue'
import PieChart from './components/PieChart.vue'
import GachaDetail from './components/GachaDetail.vue'
import Setting from './components/Setting.vue'
import Link from './components/Link.vue'
import gachaDetail from './gachaDetail'
import { version } from '../../package.json'
import { componentSafeIpcRenderOn } from './utils'
const { ipcRenderer } = require('electron')

const state = reactive({
  status: 'init',
  log: '',
  data: null,
  dataMap: new Map(),
  current: 0,
  showSetting: false,
  i18n: null,
  showUrlDlg: false,
  urlInput: '',
  config: {}
})

const ui = computed(() => state.i18n?.ui)

const gachaData = computed(() => state.dataMap.get(state.current))

const uidSelectText = computed(() => (state.current === 0 ? state.i18n.ui.select.newAccount : state.current))

const allowClick = () => {
  const data = gachaData.value
  if (!data) return true
  return Date.now() - data.time >= 1000 * 60
}

const hint = computed(() => {
  if (!state.i18n) return 'Loading...'
  const { hint } = state.i18n.ui
  const { colon } = state.i18n.symbol
  switch (state.status) {
    case 'init':
      return hint.init
    case 'loading':
      return state.log || 'Loading...'
    case 'updated':
      return state.log
    case 'failed':
      return state.log + ` - ${hint.failed}`
    case 'loaded':
      return `${hint.lastUpdate}${colon}${new Date(gachaData.value?.time).toLocaleString()}`
    default:
      return '\u00a0'
  }
})

const detail = computed(() => {
  const data = gachaData.value
  if (data) return gachaDetail(toRaw(data.result))
})

const typeMap = computed(() => gachaData.value?.typeMap)

const fetchData = async (token) => {
  state.status = 'loading'
  const data = await ipcRenderer.invoke('FETCH_DATA', token)
  if (data) {
    state.dataMap = data.dataMap
    state.current = data.current
    state.status = 'loaded'
  } else {
    state.status = 'failed'
  }
}

const readData = async () => {
  const data = await ipcRenderer.invoke('READ_DATA')
  if (data) {
    state.dataMap = data.dataMap
    state.current = data.current
    if (gachaData.value) state.status = 'loaded'
  }
}

const getI18nData = async () => {
  const data = await ipcRenderer.invoke('I18N_DATA')
  if (data) {
    state.i18n = data
    setTitle()
  }
}

const saveExcel = async () => {
  await ipcRenderer.invoke('SAVE_EXCEL')
}

const changeCurrent = async (uid) => {
  state.status = uid === 0 ? 'init' : 'loaded'
  state.current = uid
  await ipcRenderer.invoke('CHANGE_UID', uid)
}

const newUser = () => changeCurrent(0)

const relaunch = () => ipcRenderer.invoke('RELAUNCH')

const showSetting = (show) => {
  if (show) {
    state.showSetting = true
  } else {
    state.showSetting = false
    updateConfig()
  }
}

const setTitle = () => {
  document.title = `${state.i18n.ui.win.title} - v${version}`
}

const updateConfig = async () => {
  state.config = await ipcRenderer.invoke('GET_CONFIG')
}

componentSafeIpcRenderOn([
  [
    'LOAD_DATA_STATUS',
    (event, message) => {
      state.log = message
    }
  ],
  [
    'ERROR',
    (event, err) => {
      console.error(err)
    }
  ],
  [
    'UPDATE_HINT',
    (event, message) => {
      state.log = message
      state.status = 'updated'
    }
  ],
  [
    'TOKEN_NOT_SET',
    () => {
      state.showUrlDlg = true
    }
  ]
])

onMounted(async () => {
  await readData()
  await getI18nData()
  await updateConfig()
})
</script>

<style>
*:not(input):not(textarea):not([content-editable='true']) {
  user-select: none;
}
.el-select .el-input__inner:read-only {
  pointer-events: none;
}
.el-select .el-input {
  cursor: pointer;
}
.token-dialog .el-dialog__body {
  padding-top: 16px;
}
</style>
