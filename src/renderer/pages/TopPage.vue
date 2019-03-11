<template>
  <div id="wrapper">
    <div>キャプチャ</div>
    <div class="canvasArea">
      <div><canvas ref="leftCanvas" /></div>
      <div><canvas ref="rightCanvas" /></div>
    </div>
    <div class="buttonArea">
      <button @click="onClickCapturer('left')">左キャプチャ</button>
      <button @click="onClickCapturer('right')">右キャプチャ</button>
    </div>
    <div>日本語解析率</div>
    <div class="progressArea">
      <div>{{ leftJpnProgressValue }}</div>
      <div>{{ rightJpnProgressValue }}</div>
    </div>
    <div>日本語解析結果出力</div>
    <div class="textArea">
      <textarea v-model="leftJpnTextValue" />
      <textarea v-model="rightJpnTextValue" />
    </div>
    <div>英語解析率</div>
    <div class="progressArea">
      <div>{{ leftEngProgressValue }}</div>
      <div>{{ rightEngProgressValue }}</div>
    </div>
    <div>英語解析結果出力</div>
    <div class="textArea">
      <textarea v-model="leftEngTextValue" />
      <textarea v-model="rightEngTextValue" />
    </div>
    <video ref="video" />
    <div v-if="googleToken">
      <div>Googleの認証がされています</div>
      <div class="buttonArea">
        <button @click="onClickGoogleOcr('left')">左Googleでの解析実行</button>
        <button @click="onClickGoogleOcr('right')">右Googleでの解析実行</button>
      </div>
      <div class="textArea">
        <textarea v-model="leftGoogleTextValue" />
        <textarea v-model="rightGoogleTextValue" />
      </div>
    </div>
  </div>
</template>

<script>
  import ioHook from 'iohook'
  import { mapState, mapActions } from 'vuex'
  import { desktopCapturer, screen, ipcRenderer } from 'electron'
  import fs from 'fs'
  const { remote } = window.require('electron')
  const app = remote.require('electron').app

  const screenSize = screen.getPrimaryDisplay().size
  let firstOnMouseEvent = null
  let secondOnMouseEvent = null
  let component = null
  export default {
    name: 'top-page',
    data () {
      return {
        leftJpnProgressValue: '0%',
        rightJpnProgressValue: '0%',
        leftJpnTextValue: '',
        rightJpnTextValue: '',
        leftEngProgressValue: '0%',
        rightEngProgressValue: '0%',
        leftEngTextValue: '',
        rightEngTextValue: '',
        leftGoogleTextValue: '',
        rightGoogleTextValue: ''
      }
    },
    mounted () {
      component = this
    },
    methods: {
      onClickCapturer: (type) => {
        ioHook.start()

        ioHook.on('mousedrag', async event => {
          firstOnMouseEvent = firstOnMouseEvent || event
        })

        ioHook.on('mouseup', async event => {
          secondOnMouseEvent = event
          desktopCapturer.getSources({ types: ['screen'] }, (error, sources) => {
            if (error) throw error
            const deskTopScreen = sources.find(source => /screen:/.test(source.id))
            if (!deskTopScreen) {
              throw new Error('not desktop screen')
            }
            navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: deskTopScreen.id,
                  minWidth: screenSize.width,
                  maxWidth: screenSize.width,
                  minHeight: screenSize.height,
                  maxHeight: screenSize.height
                }
              }
            }).then((stream) => handleStream(stream, type)).catch((e) => handleError(e))
          })
        })
      },
      onClickGoogleOcr: (type) => {
        const canvas = component.$refs[`${type}Canvas`]
        const contentType = 'image/png'
        const dataurl = canvas.toDataURL(contentType).split(',')[1]
        const buffer = Buffer.from(dataurl, 'base64')
        fs.writeFile(`${app.getAppPath()}/${type}.png`, buffer, (error) => {
          if (error != null) {
            console.error('save error.')
            return
          }
          ipcRenderer.send('uploadFile', type)
        })
      },
      ...mapActions({
        setToken: 'google/setToken',
        setFolderId: 'google/setFolderId'
      })
    },
    computed: {
      ...mapState({
        googleToken: state => state.google.token
      })
    }
  }

  ipcRenderer.on('googleToken', (ev, token) => {
    component.$store.dispatch('setToken', token)
  })

  ipcRenderer.on('folderId', (ev, folderId) => {
    component.$store.dispatch('setFolderId', folderId)
  })

  ipcRenderer.on('googleText', (ev, {type, text}) => {
    component[`${type}GoogleTextValue`] = text
  })

  const handleStream = (stream, type) => {
    const video = component.$refs.video
    video.srcObject = stream
    video.onloadedmetadata = (e) => {
      video.play()
    }
    video.onplaying = () => {
      video.pause()
    }
    video.onpause = () => {
      const canvas = component.$refs[`${type}Canvas`]
      const x = firstOnMouseEvent.x < secondOnMouseEvent.x ? firstOnMouseEvent.x : secondOnMouseEvent.x
      const y = firstOnMouseEvent.y < secondOnMouseEvent.y ? firstOnMouseEvent.y : secondOnMouseEvent.y
      const width = x === firstOnMouseEvent.x ? secondOnMouseEvent.x - firstOnMouseEvent.x : firstOnMouseEvent.x - secondOnMouseEvent.x
      const height = y === firstOnMouseEvent.y ? secondOnMouseEvent.y - firstOnMouseEvent.y : firstOnMouseEvent.y - secondOnMouseEvent.y
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      context.drawImage(video, x, y, width, height, 0, 0, width, height)
      firstOnMouseEvent = null
      secondOnMouseEvent = null
      ioHook.stop()
      window.Tesseract.recognize(canvas, {lang: 'jpn'}).progress((p) => {
        component[`${type}JpnProgressValue`] = `${p.progress * 100}%`
      }).then((r) => {
        component[`${type}JpnTextValue`] = r.text
      })
      window.Tesseract.recognize(canvas).progress((p) => {
        component[`${type}EngProgressValue`] = `${p.progress * 100}%`
      }).then((r) => {
        component[`${type}EngTextValue`] = r.text
      })
    }
  }

  const handleError = (e) => {
    console.error(e)
    firstOnMouseEvent = null
    secondOnMouseEvent = null
    ioHook.stop()
  }
</script>

<style scoped>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    height: 1500px;
    width: 100%
  }

  body {
    height: 100%;
    width: 100%;
    background-color: white;
  }

  #wrapper {
    height: 100%;
    width: 100%;
    background-color: white;
  }

  .buttonArea,
  .canvasArea,
  .progressArea,
  .textArea {
    display: flex;
    justify-content: center;
    justify-items: center;
  }

  .buttonArea > button,
  .canvasArea > div,
  .progressArea > div {
    width: 50%;
  }

  .textArea > textarea {
    resize: vertical;
    width: 50%;
    height: 30%;
    height: 200px;
  }

  .canvasArea > div > canvas {
    outline: black 3px solid;
  }

  video {
    display: none;
  }
</style>
