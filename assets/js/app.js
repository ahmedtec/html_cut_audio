// append audio file into player

async function append_audio_file(id_element, id_output, id_append, data) {
  let url;
  let trimFile = document.querySelector("#" + id_element).files[0];
  let reader = new FileReader();

  reader.onload = async function (evt) {
    url = evt.target.result;
    console.log(url);
    let sound = document.createElement("audio");
    let link = document.createElement("source");
    sound.id = id_output;
    sound.setAttribute("preload", "metadata");
    sound.controls = "controls";
    link.src = url;
    sound.type = "audio/mpeg";
    sound.appendChild(link);
    // document.getElementById(id_append).appendChild(sound);

    // Get the reference element
    let sp2 = document.getElementById(id_append);
    // Get the parent element
    let parentDiv = sp2.parentNode;

    // Insert the new element into before sp2
    parentDiv.insertBefore(sound, sp2);
  };
  reader.readAsDataURL(trimFile);
  reader.addEventListener("loadend", (e) => {
    let intervalID = setInterval(() => {
      try {
        if (document.getElementById("trimFile_player").duration) {
          console.log(document.getElementById("trimFile_player").duration);
          cutter(data, document.getElementById("trimFile_player").duration);
          clearInterval(intervalID);
        }
      } catch (e) {
        console.log("eroor", e);
      }
      console.log(document.getElementById("trimFile_player").duration);
    }, 500);
  });
}

document.getElementById("get_file").addEventListener("click", (e) => {
  document.getElementById("trimFile").click();
});
document.getElementById("trimFile").addEventListener("change", (e) => {
  append_audio_file("trimFile", "trimFile_player", "display_none_items", e);
});

cutter = async (name, length) => {
  document.getElementById("input_file_title").innerText =
    name.target.files[0].name.length > 30
      ? name.target.files[0].name.slice(0, 30) + "...."
      : name.target.files[0].name;

  //  console.log("222222222222",document.getElementById("trimFile_player").duration);
  // console.log(document.getElementById("trimFile_player").duration);

  let length_start = 0;
  let length_end = length;

  let trimStart;
  let trimEnd;
  $(function () {
    $("#length_start , #length_start_all").text(
      seconds2hms(length_start).m + " : " + seconds2hms(length_start).s
    );
    $("#length_start").attr("time", length_start);
    $("#length_end , #length_end_all").text(
      seconds2hms(length_end).m + " : " + seconds2hms(length_end).s
    );
    $("#length_end").attr("time", length_end);
    $("#slider_range").slider({
      range: true,
      min: length_start,
      max: length_end,
      values: [length_start, length_end],
      slide: function (event, ui) {
        $("#length_start").text(
          seconds2hms(ui.values[0]).m + " : " + seconds2hms(ui.values[0]).s
        );
        $("#length_start").attr("time", ui.values[0]);
        $("#length_end").text(
          seconds2hms(ui.values[1]).m + " : " + seconds2hms(ui.values[1]).s
        );
        $("#length_end").attr("time", ui.values[1]);
      },
    });
    $("#amount").val(
      "$" +
        $("#slider_range").slider("values", 0) +
        " - $" +
        $("#slider_range").slider("values", 1)
    );
  });

  function seconds2hms(seconds, milliseconds) {
    if (milliseconds) {
      seconds = Math.floor(seconds / 1000);
    }
    return {
      h: ~~(seconds / 3600),
      m: ~~((seconds % 3600) / 60),
      s: ~~seconds % 60,
    };
  }

  // GitCode
  class AudioMaker {
    constructor(config) {
      config = config || {};
      this.aContext = this._getContext();
      this.sampleRate = this.aContext.sampleRate;
      this.outputType = config.type || "wav";
    }

    _getContext() {
      window.AudioContext =
        window.AudioContext ||
        window.webkitAudioContext ||
        window.mozAudioContext;
      return new AudioContext();
    }

    _getArrayBuffer(data) {
      let bufferRequest;
      if (data && data instanceof Blob) {
        bufferRequest = data.arrayBuffer();
      } else {
        bufferRequest = fetch(data, { mode: "no-cors" }).then((res) => {
          return res.arrayBuffer();
        });
      }
      return bufferRequest;
    }

    trim(data, sTime, eTime) {
      return new Promise(async (resolve) => {
        let _self = this;
        _self._getArrayBuffer(data).then(async (arrayBuffer) => {
          await _self.aContext
            .decodeAudioData(arrayBuffer)
            .then((decodedData) => {
              let trimmedData,
                trimStart = decodedData.sampleRate * sTime,
                trimEnd = eTime
                  ? decodedData.sampleRate * eTime
                  : decodedData.sampleRate * decodedData.duration;
              if (decodedData.numberOfChannels === 2) {
                trimmedData = _self.interleave(
                  decodedData.getChannelData(0).slice(trimStart, trimEnd),
                  decodedData.getChannelData(1).slice(trimStart, trimEnd)
                );
              } else {
                trimmedData = decodedData
                  .getChannelData(0)
                  .slice(trimStart, trimEnd);
              }
              resolve(
                _self._exportAudio(trimmedData, decodedData.numberOfChannels)
              );
            });
        });
      });
    }

    add(data) {
      return new Promise(async (resolve) => {
        let _self = this;
        let arrayBuffers = data.map(async (audio) => {
          return await _self._getArrayBuffer(audio).then((arrayBuffer) => {
            return _self.aContext.decodeAudioData(arrayBuffer);
          });
        });
        Promise.all(arrayBuffers).then((audioBuffers) => {
          let floatData = [];
          audioBuffers.forEach((decodedData) => {
            if (decodedData.numberOfChannels === 2) {
              floatData.push(
                Array.from(
                  _self.interleave(
                    decodedData.getChannelData(0),
                    decodedData.getChannelData(1)
                  )
                )
              );
            } else {
              floatData.push(Array.from(decodedData.getChannelData(0)));
            }
          });
          let concatinatedArray = floatData.flat();
          resolve(
            _self._exportAudio(
              new Float32Array(concatinatedArray),
              audioBuffers[0].numberOfChannels
            )
          );
        });
      });
    }

    timeline(data) {
      return new Promise(async (resolve) => {
        let _self = this,
          timelineData = [...data],
          resultArray = [];
        let audioTimelineLoop = (i) => {
          let modifedArray;
          _self._getArrayBuffer(timelineData[i].audio).then((arrayBuffer) => {
            _self.aContext.decodeAudioData(arrayBuffer).then((audioBuffer) => {
              timelineData[i].audioBuffer = audioBuffer;
              if (
                timelineData[i].trim &&
                timelineData[i].trim instanceof Array
              ) {
                let sTime = timelineData[i].trim[0],
                  eTime = timelineData[i].trim[1]
                    ? timelineData[i].trim[1]
                    : audioBuffer.duration;
                if (audioBuffer.numberOfChannels === 2) {
                  modifedArray = Array.from(
                    _self.interleave(
                      audioBuffer
                        .getChannelData(0)
                        .slice(
                          audioBuffer.sampleRate * sTime,
                          audioBuffer.sampleRate * eTime
                        ),
                      audioBuffer
                        .getChannelData(1)
                        .slice(
                          audioBuffer.sampleRate * sTime,
                          audioBuffer.sampleRate * eTime
                        )
                    )
                  );
                } else {
                  modifedArray = Array.from(
                    audioBuffer
                      .getChannelData(0)
                      .slice(
                        audioBuffer.sampleRate * sTime,
                        audioBuffer.sampleRate * eTime
                      )
                  );
                }
              } else {
                if (audioBuffer.numberOfChannels === 2) {
                  modifedArray = Array.from(
                    _self.interleave(
                      audioBuffer.getChannelData(0),
                      audioBuffer.getChannelData(1)
                    )
                  );
                } else {
                  modifedArray = Array.from(audioBuffer.getChannelData(0));
                }
              }
              if (timelineData[i].reverse) {
                modifedArray = modifedArray.reverse();
              }
              if (
                timelineData[i].loop &&
                typeof timelineData[i].loop == "number"
              ) {
                for (let j = 0; j < timelineData[i].loop; j++) {
                  modifedArray.push(modifedArray);
                }
              }
              timelineData[i].modifedArray = modifedArray.flat();
              resultArray.push(timelineData[i].modifedArray);
              if (timelineData.length === resultArray.length) {
                let maxChannels = Math.max(
                  ...timelineData.map((o) => o.audioBuffer.numberOfChannels),
                  0
                );
                resolve(
                  _self._exportAudio(
                    new Float32Array(resultArray.flat()),
                    maxChannels
                  )
                );
              } else {
                modifedArray = null;
                audioTimelineLoop(i + 1);
              }
            });
          });
        };
        audioTimelineLoop(0);
      });
    }

    _exportAudio(samplesData, numberOfChannels) {
      let _self = this,
        arrayBuffer,
        blob;
      if (_self.outputType == "wav") {
        let format = 3,
          bitDepth = 32;
        arrayBuffer = _self.encodeWAV(
          samplesData,
          format,
          _self.sampleRate,
          numberOfChannels,
          bitDepth
        );
        blob = new Blob([new Uint8Array(arrayBuffer)], { type: "audio/wav" });
      }
      return blob;
    }

    interleave(inputL, inputR) {
      let length = inputL.length + inputR.length,
        result = new Float32Array(length),
        index = 0,
        inputIndex = 0;
      while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
      }
      return result;
    }

    writeString(view, offset, string) {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeFloat32(output, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 4) {
        output.setFloat32(offset, input[i], true);
      }
    }

    floatTo16BitPCM(output, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    }

    encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
      let _self = this,
        bytesPerSample = bitDepth / 8,
        blockAlign = numChannels * bytesPerSample,
        buffer = new ArrayBuffer(44 + samples.length * bytesPerSample),
        view = new DataView(buffer);
       
      /* RIFF identifier */
      _self.writeString(view, 0, "RIFF");
      /* RIFF chunk length */
      view.setUint32(4, 36 + samples.length * bytesPerSample, true);
      /* RIFF type */
      _self.writeString(view, 8, "WAVE");
      /* format chunk identifier */
      _self.writeString(view, 12, "fmt ");
      /* format chunk length */
      view.setUint32(16, 16, true);
      /* sample format (raw) */
      view.setUint16(20, format, true);
      /* channel count */
      view.setUint16(22, numChannels, true);
      /* sample rate */
      view.setUint32(24, sampleRate, true);
      /* byte rate (sample rate * block align) */
      view.setUint32(28, sampleRate * blockAlign, true);
      /* block align (channel count * bytes per sample) */
      view.setUint16(32, blockAlign, true);
      /* bits per sample */
      view.setUint16(34, bitDepth, true);
      /* data chunk identifier */
      _self.writeString(view, 36, "data");
      /* data chunk length */
      view.setUint32(40, samples.length * bytesPerSample, true);
      _self.writeFloat32(view, 44, samples);
      console.log("_self", _self, "view", view, "buffer", buffer);


      let wavHdr = lamejs.WavHeader.readHeader(new DataView(buffer));
        console.log("wavHdr", wavHdr);
        let wavSamples = new Int16Array(
          buffer,
          wavHdr.dataOffset,
          wavHdr.dataLen / 2
        );
        console.log("wavSamples", wavSamples);
        wavToMp3(wavHdr.channels, wavHdr.sampleRate, wavSamples);



      return buffer;
    }
  }

  let _audioMaker = AudioMaker;
  let audioMaker = new _audioMaker();
  let makeOutputElement = (elem, blob) => {
    let outputElem = $("#" + elem)[0];
    outputElem.controls = true;
    outputElem.src = URL.createObjectURL(blob);
    // saveFile(blob, "adasads")
    // var url = URL.createObjectURL(blob);
    // var elem = document.createElement('a');
    // elem.href = blob;
    // elem.download = "132132";
    // elem.id = "downloadAnchor";
    // document.body.appendChild(elem);
    // $('#downloadAnchor').click();
  };
  let trimAudio = () => {
    if ($("#trimFile")[0].files[0]) {
      $("#trimError").text("");
      let file = $("#trimFile")[0].files[0];
      // trimStart = Number($("#trimStart").val());
      // trimEnd = Number($("#trimEnd").val());
      trimStart = Number($("#length_start").attr("time"));
      trimEnd = Number($("#length_end").attr("time"));
      audioMaker.trim(file, trimStart, trimEnd).then((blob) => {
        makeOutputElement("trimOutput", blob);
      });
    } else {
      $("#trimError").text("Need audio file to trim.");
    }
  };

  // End GitCode

  document
    .getElementById("dwenload_audio_file")
    .addEventListener("click", (e) => {
      console.log("dwenload_audio_file");
      trimAudio();
    });

  let playSetTimeout;
  document.getElementById("play_file").addEventListener("click", (e) => {
    let audioPlayer = document.getElementById("trimFile_player");
    let start = $("#length_start").attr("time");
    10;
    let end = $("#length_end").attr("time");
    50;
    audioPlayer.currentTime = start;
    try {
      if (playSetTimeout) {
        clearTimeout(playSetTimeout);
        console.log("clearTimeout > playSetTimeout", playSetTimeout);
      }
    } catch (e) {
      console.log(e);
    }
    if (audioPlayer.paused) {
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }

    playSetTimeout = setTimeout(() => {
      audioPlayer.pause();
    }, (end - start) * 1000);
    console.log("playSetTimeout", playSetTimeout);
  });

  //  console.log(document.getElementById("trimFile_player").duration);
};

function saveFile(blob, filename) {
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const a = document.createElement("a");
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 0);
  }
}

function wavToMp3(channels, sampleRate, samples) {
  var buffer = [];
  // var mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  // var remaining = samples.length;
  // var samplesPerFrame = 1152;
  // for (var i = 0; remaining >= samplesPerFrame; i += samplesPerFrame) {
  //     var mono = samples.subarray(i, i + samplesPerFrame);
  //     var mp3buf = mp3enc.encodeBuffer(mono);
  //     if (mp3buf.length > 0) {
  //         buffer.push(new Int8Array(mp3buf));
  //     }
  //     remaining -= samplesPerFrame;
  // }
  // var d = mp3enc.flush();

  mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  var mp3Data = [];

  left = new Int16Array(sampleRate); //one second of silence (get your data from the source you have)
  right = new Int16Array(sampleRate); //one second of silence (get your data from the source you have)
  sampleBlockSize = 1152; //can be anything but make it a multiple of 576 to make encoders life easier

  for (var i = 0; i < samples.length; i += sampleBlockSize) {
    leftChunk = left.subarray(i, i + sampleBlockSize);
    rightChunk = right.subarray(i, i + sampleBlockSize);
    var mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  var mp3buf = mp3encoder.flush(); //finish writing mp3

  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  console.log(mp3buf);
  if (mp3buf.length > 0) {
    buffer.push(new Int8Array(mp3buf));
  }

  var mp3Blob = new Blob(buffer, { type: "audio/mp3" });
  var bUrl = window.URL.createObjectURL(mp3Blob);
  saveFile(mp3Blob, "itsmp3");
  // send the download link to the console
  console.log("mp3 download:", bUrl);
}
