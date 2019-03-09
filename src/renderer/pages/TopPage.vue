<template>
  <div id="wrapper">
    <div>キャプチャ</div>
    <div class="canvasArea">
      <div><canvas id="leftCanvas" /></div>
      <div><canvas id="rightCanvas" /></div>
    </div>
    <div class="buttonArea">
      <button @click="onClickCapturer('left')">左キャプチャ</button>
      <button @click="onClickCapturer('right')">右キャプチャ</button>
    </div>
    <div>日本語解析率</div>
    <div class="progressArea">
      <div id="leftJpnProgress" />
      <div id="rightJpnProgress" />
    </div>
    <div>日本語解析結果出力</div>
    <div class="textArea">
      <textarea id="leftJpnText" />
      <textarea id="rightJpnText" />
    </div>
    <div>英語解析率</div>
    <div class="progressArea">
      <div id="leftEngProgress" />
      <div id="rightEngProgress" />
    </div>
    <div>英語解析結果出力</div>
    <div class="textArea">
      <textarea id="leftEngText" />
      <textarea id="rightEngText" />
    </div>
    <video />
  </div>
</template>

<script>
  import ioHook from 'iohook'
  import { desktopCapturer, screen } from 'electron'

  const screenSize = screen.getPrimaryDisplay().size
  let firstOnMouseEvent = null
  let secondOnMouseEvent = null

  export default {
    name: 'top-page',
    methods: {
      onClickCapturer: (type) => {
        ioHook.start()

        ioHook.on('mousedrag', async event => {
          try {
            firstOnMouseEvent = firstOnMouseEvent || event
          } catch (error) {
            console.error('activeなwindowではありません。')
            console.error(error)
          }
        })

        ioHook.on('mouseup', async event => {
          try {
            secondOnMouseEvent = event
            desktopCapturer.getSources({ types: ['screen'] }, (error, sources) => {
              if (error) throw error
              const deskTopScreen = sources.find(source => /screen:/.test(source.id))
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
          } catch (error) {
            console.error('activeなwindowではありません。')
            console.error(error)
          }
        })
      }
    }
  }

  const handleStream = (stream, type) => {
    const video = document.querySelector('video')
    video.srcObject = stream
    video.onloadedmetadata = (e) => {
      video.play()
    }
    video.onplaying = () => {
      video.pause()
    }
    video.onpause = () => {
      const canvas = document.getElementById(`${type}Canvas`)
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
        document.getElementById(`${type}JpnProgress`).innerHTML = `${p.progress * 100}%`
      }).then((r) => {
        document.getElementById(`${type}JpnText`).innerHTML = r.text
      })
      window.Tesseract.recognize(canvas).progress((p) => {
        document.getElementById(`${type}EngProgress`).innerHTML = `${p.progress * 100}%`
      }).then((r) => {
        document.getElementById(`${type}EngText`).innerHTML = r.text
      })
    }
  }

  const handleError = (e) => {
    console.log(e)
    firstOnMouseEvent = null
    secondOnMouseEvent = null
    ioHook.stop()
  }
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
