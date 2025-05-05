/* eslint-disable @typescript-eslint/no-explicit-any */
<template>
  <div id="app">
    <AudioPlayer />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import AudioPlayer from './components/AudioPlayer.vue'

export default defineComponent({
  name: 'App',
  components: {
    AudioPlayer
  }
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
