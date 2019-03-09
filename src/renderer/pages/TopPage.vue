<template>
  <div id="wrapper">
    <div class="buttonArea">
      <button @click="onClickCapturer('left')">左キャプチャ</button>
      <button @click="onClickAna('left')">左解析</button>
      <button @click="onClickCapturer('right')">右キャプチャ</button>
    </div>
    <div class="canvasArea">
      <canvas id="leftCanvas" />
      <canvas id="rightCanvas" />
    </div>
    <div class="progressArea">
      <div id="leftProgress" />
      <div id="rightProgress" />
    </div>
    <div class="textArea">
      <div id="leftText" />
      <div id="rightText" />
    </div>
    <video />
  </div>
</template>

<script>
  import ioHook from 'iohook'
  import { desktopCapturer, screen } from 'electron'
  import path from 'path'
  import Tesseract from 'tesseract.js'

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
      },
      onClickAna: (type) => {
        const canvas = document.getElementById(`${type}Canvas`)
        canvas.toBlob((blob) => {
          let reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onload = () => {
            path.resolve(reader.result)
            Tesseract.recognize(reader.result).progress((p) => {
              console.log(p)
              document.getElementById(`${type}Progress`).innerHTML = p.progress
            }).then((r) => {
              console.log(r)
              document.getElementById(`${type}Text`).innerHTML = r.text
            })
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
      // Tesseract.recognize(src).progress((p) => {
      //   console.log(p)
      //   // document.getElementById(`${type}Progress`).innerHTML = p.progress
      // }).then((r) => {
      //   console.log(r)
      //   // document.getElementById(`${type}Text`).innerHTML = r.text
      // })
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

  .buttonArea, .progressArea {
    display: flex;
    justify-content: center;
    justify-items: center;
  }

  .canvasArea > canvas {
    outline: black 3px solid;
  }

  video {
    display: none;
  }
</style>
