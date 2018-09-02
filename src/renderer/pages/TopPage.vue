<template>
  <div id="wrapper">
  </div>
</template>

<script>
  import activeWin from 'active-win'
  import ioHook from 'iohook'
  import { mapState, mapActions } from 'vuex'
  export default {
    name: 'top-page'
  }
  ioHook.start()
  /**
   * どこのアプリケーションでもマウスをクリックしたとき
   */
  ioHook.on('mouseclick', async event => {
    console.log(mapState('Counter', [
      'main'
    ]))
    console.log(mapActions('Counter', [
      'someAsyncTask'
    ]))
    try {
      const activeWindow = await activeWin()
      console.log(activeWindow)
    } catch (error) {
      console.error('activeなwindowではありません。')
      console.error(error)
    }
  })
</script>

<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    height: 100%;
    width: 100%
  }
  body {
    height: 100%;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.0);
  }

  #wrapper {
    height: 100%;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.0);
  }

</style>
