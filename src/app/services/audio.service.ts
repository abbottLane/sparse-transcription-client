import { Injectable } from '@angular/core';

export interface IAudioFile {
    sampleRate: number
    frames: number
    channels: number
    file: Blob | File
}

export interface IAudioMetadata {
    channels: number
    sampleRate: number
    samples: number
    duration: number
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  audioCtx: AudioContext = new AudioContext() // one context to rule them all
  constructor(
  ) { }
  // this must be called from a click event of some type
  async resumeAudioContext() {
    if (this.audioCtx.state !== 'running') {
      await this.audioCtx.resume()
    }
  }
  getAudioContext(): AudioContext {
    return this.audioCtx
  }

  errorbeep() {
    new	Audio("data:audio/wav;base64,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").play();
  }
  confbeep() {
    new	Audio("data:audio/wav;base64,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").play()
  }
  async getWavMetadata(f: File | Blob): Promise<any> {
    return new Promise((resolve) => {
      let fileReader = new FileReader()
      fileReader.onloadend = () => {
        const v = new DataView(fileReader.result as ArrayBuffer)
        const channelCount = v.getUint16(22, true)
        const sampleRate = v.getUint32(24, true)
        const totalLen = v.getUint32(40, true)
        const bytesPerSample = v.getUint16(32, true)
        resolve({
          channelCount: channelCount,
          sampleRate: sampleRate,
          samples: totalLen / bytesPerSample,
          duration: totalLen / bytesPerSample / sampleRate
        })
      }
      fileReader.readAsArrayBuffer(f)
    })
  }

  // Note that if the file is compressed, the sampleRate and number of samples will be bullshit because
  // Web Audio resamples and there's nothing we can do about it.
  // But for our purposes, this metadata is still fine because it describes what the audio looks like when
  // it is decoded elsewhere in the app, i.e. the respeaking interface.
  async getAudioMetadata(f: File | Blob): Promise<IAudioMetadata> {
    return new Promise((resolve) => {
      let fileReader = new FileReader()
      fileReader.onloadend = () => {
        this.audioCtx.decodeAudioData(fileReader.result as ArrayBuffer)
        .then((ab) => {
          resolve({
            channels: ab.numberOfChannels,
            sampleRate: ab.sampleRate,
            samples: ab.length,
            duration: ab.length / ab.sampleRate
          })
        })
      }
      fileReader.readAsArrayBuffer(f)
    })
  }

  // Assumes inputBuffer sample rate is the same as the current audioContext, i.e. came from a microphone
  resampleBuffer(inputBuffer: Float32Array, ctx: AudioContext, sampleRate: number): Promise<Float32Array> {
    const numFrames = ~~((inputBuffer.length / ctx.sampleRate) * sampleRate)
    const offCont = new OfflineAudioContext(1, numFrames, sampleRate)
    const newBuffer = offCont.createBuffer(1, inputBuffer.length, ctx.sampleRate)
    newBuffer.copyToChannel(inputBuffer, 0)
    const source = offCont.createBufferSource()
    source.buffer = newBuffer
    source.connect(offCont.destination)
    source.start()
    return offCont.startRendering().then((ab: AudioBuffer) => {
      const fa = new Float32Array(ab.getChannelData(0))
      return fa
    })
  }
  float32ArrayToWav(sbuffer: Float32Array, numChannels: number, sampleRate: number): Blob {
    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      }
    }
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    const encodeWAV = (): DataView => {
      const rTotalLen = sbuffer.length
      var buffer = new ArrayBuffer(44 + rTotalLen * 2)
      var view = new DataView(buffer)
      /* RIFF identifier */
      writeString(view, 0, 'RIFF')
      /* RIFF chunk length */
      view.setUint32(4, 36 + rTotalLen * 2, true)
      /* RIFF type */
      writeString(view, 8, 'WAVE')
      /* format chunk identifier */
      writeString(view, 12, 'fmt ')
      /* format chunk length */
      view.setUint32(16, 16, true)
      /* sample format (raw) */
      view.setUint16(20, 1, true)
      /* channel count */
      view.setUint16(22, numChannels, true)
      /* sample rate */
      view.setUint32(24, sampleRate, true)
      /* byte rate (sample rate * block align) */
      view.setUint32(28, sampleRate * 4, true)
      /* block align (channel count * bytes per sample) */
      view.setUint16(32, numChannels * 2, true)
      /* bits per sample */
      view.setUint16(34, 16, true)
      /* data chunk identifier */
      writeString(view, 36, 'data')
      /* data chunk length */
      view.setUint32(40, rTotalLen * 2, true)
      floatTo16BitPCM(view, 44, sbuffer)
      return view
    }
    return new Blob([encodeWAV()], {
      type: 'audio/wav'
    })
  }
}
