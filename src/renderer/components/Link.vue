<template>
  <a @click="openHref" class="cursor-pointer text-blue-400">{{ title || href }}</a>
</template>

<script setup>
const { shell } = require('electron')

const props = defineProps({
  title: String,
  href: String
})

const openHref = () => shell.openExternal(props.href)
</script>
