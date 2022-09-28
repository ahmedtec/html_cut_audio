 // append audio file into player
 async function append_audio_file(id_element ,id_output,id_append){
    let url;
    let trimFile = document.querySelector("#"+id_element).files[0];
    let reader = new FileReader();
     reader.onload = async function (evt) {
        url = evt.target.result;
        console.log(url);
        let sound = document.createElement("audio");
        let link =document.createElement("source");
        sound.id = id_output;
        sound.controls = "controls";
        link.src = url;
        sound.type = "audio/mpeg";
        sound.appendChild(link);
        document.getElementById(id_append).appendChild(sound);
    };
    reader.readAsDataURL(trimFile);
    
 }
 


document.getElementById("get_file").addEventListener("click", (e) => { document.getElementById("trimFile").click() });
document.getElementById("trimFile").addEventListener("change", async (e) => {

    document.getElementById("input_file_title").innerText = e.target.files[0].name.length > 30 ? e.target.files[0].name.slice(0, 30) + "...." : e.target.files[0].name;
    
    append_audio_file("trimFile" ,"trimFile_player","display_none_items")
  

    // console.log(document.getElementById("trimFile_player").duration);
    
    let length_start = 0;
    let length_end = 250;

    let trimStart;
    let trimEnd;
    $(function () {
        $("#length_start , #length_start_all").text(seconds2hms(length_start).m + " : " + seconds2hms(length_start).s);
        $("#length_end , #length_end_all").text(seconds2hms(length_end).m + " : " + seconds2hms(length_end).s);
        $("#slider_range").slider({
            range: true,
            min: length_start,
            max: length_end,
            values: [length_start, length_end],
            slide: function (event, ui) {
                $("#length_start").text(seconds2hms(ui.values[0]).m + " : " + seconds2hms(ui.values[0]).s);
                $("#length_end").text(seconds2hms(ui.values[1]).m + " : " + seconds2hms(ui.values[1]).s);
            }
        });
        $("#amount").val("$" + $("#slider_range").slider("values", 0) +
            " - $" + $("#slider_range").slider("values", 1));
    });

    function seconds2hms(seconds, milliseconds) {
        if (milliseconds) {
            seconds = Math.floor(seconds / 1000);
        }
        return { h: ~~(seconds / 3600), m: ~~((seconds % 3600) / 60), s: ~~seconds % 60 }
    }


    // GitCode 
    class AudioMaker {
        constructor(config) {
            config = config || {};
            this.aContext = this._getContext();
            this.sampleRate = this.aContext.sampleRate;
            this.outputType = config.type || 'wav';
        }

        _getContext() {
            window.AudioContext =
                window.AudioContext ||
                window.webkitAudioContext ||
                window.mozAudioContext;
            return new AudioContext();
        };

        _getArrayBuffer(data) {
            let bufferRequest;
            if (data && data instanceof Blob) {
                bufferRequest = data.arrayBuffer();
            } else {
                bufferRequest = fetch(data, { mode: 'no-cors' }).then((res) => {
                    return res.arrayBuffer();
                });
            }
            return bufferRequest;
        }

        trim(data, sTime, eTime) {
            return new Promise(async (resolve) => {
                let _self = this;
                _self._getArrayBuffer(data).then(async (arrayBuffer) => {
                    await _self.aContext.decodeAudioData(arrayBuffer).then((decodedData) => {
                        let trimmedData,
                            trimStart = decodedData.sampleRate * sTime,
                            trimEnd = eTime ? decodedData.sampleRate * eTime : decodedData.sampleRate * decodedData.duration;
                        if (decodedData.numberOfChannels === 2) {
                            trimmedData = _self.interleave(decodedData.getChannelData(0).slice(trimStart, trimEnd), decodedData.getChannelData(1).slice(trimStart, trimEnd));
                        } else {
                            trimmedData = decodedData.getChannelData(0).slice(trimStart, trimEnd);
                        }
                        resolve(_self._exportAudio(trimmedData, decodedData.numberOfChannels));
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
                            floatData.push(Array.from(_self.interleave(decodedData.getChannelData(0), decodedData.getChannelData(1))));
                        } else {
                            floatData.push(Array.from(decodedData.getChannelData(0)));
                        }
                    });
                    let concatinatedArray = floatData.flat();
                    resolve(_self._exportAudio(new Float32Array(concatinatedArray), audioBuffers[0].numberOfChannels));
                });
            });
        }


        timeline(data) {
            return new Promise(async (resolve) => {
                let _self = this, timelineData = [...data], resultArray = [];
                let audioTimelineLoop = (i) => {
                    let modifedArray;
                    _self._getArrayBuffer(timelineData[i].audio).then((arrayBuffer) => {
                        _self.aContext.decodeAudioData(arrayBuffer).then((audioBuffer) => {
                            timelineData[i].audioBuffer = audioBuffer;
                            if (timelineData[i].trim && timelineData[i].trim instanceof Array) {
                                let sTime = timelineData[i].trim[0],
                                    eTime = timelineData[i].trim[1] ? timelineData[i].trim[1] : audioBuffer.duration;
                                if (audioBuffer.numberOfChannels === 2) {
                                    modifedArray = Array.from(_self.interleave(audioBuffer.getChannelData(0).slice(audioBuffer.sampleRate * sTime, audioBuffer.sampleRate * eTime), audioBuffer.getChannelData(1).slice(audioBuffer.sampleRate * sTime, audioBuffer.sampleRate * eTime)));
                                } else {
                                    modifedArray = Array.from(audioBuffer.getChannelData(0).slice(audioBuffer.sampleRate * sTime, audioBuffer.sampleRate * (eTime)));
                                }
                            } else {
                                if (audioBuffer.numberOfChannels === 2) {
                                    modifedArray = Array.from(_self.interleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)));
                                } else {
                                    modifedArray = Array.from(audioBuffer.getChannelData(0));
                                }
                            }
                            if (timelineData[i].reverse) {
                                modifedArray = modifedArray.reverse();
                            }
                            if (timelineData[i].loop && (typeof timelineData[i].loop == 'number')) {
                                for (let j = 0; j < timelineData[i].loop; j++) {
                                    modifedArray.push(modifedArray);
                                }
                            }
                            timelineData[i].modifedArray = modifedArray.flat();
                            resultArray.push(timelineData[i].modifedArray);
                            if (timelineData.length === resultArray.length) {
                                let maxChannels = Math.max(...timelineData.map(o => o.audioBuffer.numberOfChannels), 0);
                                resolve(_self._exportAudio(new Float32Array(resultArray.flat()), maxChannels));
                            } else {
                                modifedArray = null;
                                audioTimelineLoop(i + 1);
                            }
                        });
                    });
                }
                audioTimelineLoop(0);
            });
        };

        _exportAudio(samplesData, numberOfChannels) {
            let _self = this, arrayBuffer, blob;
            if (_self.outputType == 'wav') {
                let format = 3,
                    bitDepth = 32;
                arrayBuffer = _self.encodeWAV(samplesData, format, _self.sampleRate, numberOfChannels, bitDepth);
                blob = new Blob([new Uint8Array(arrayBuffer)], { type: 'audio/wav' });
            }
            return blob;
        };

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
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        }

        encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
            let _self = this,
                bytesPerSample = bitDepth / 8,
                blockAlign = numChannels * bytesPerSample,
                buffer = new ArrayBuffer(44 + samples.length * bytesPerSample),
                view = new DataView(buffer);
            /* RIFF identifier */
            _self.writeString(view, 0, 'RIFF');
            /* RIFF chunk length */
            view.setUint32(4, 36 + samples.length * bytesPerSample, true);
            /* RIFF type */
            _self.writeString(view, 8, 'WAVE');
            /* format chunk identifier */
            _self.writeString(view, 12, 'fmt ');
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
            _self.writeString(view, 36, 'data');
            /* data chunk length */
            view.setUint32(40, samples.length * bytesPerSample, true);
            _self.writeFloat32(view, 44, samples);
            return buffer;
        }

    }

    let _audioMaker = AudioMaker;
    let audioMaker = new _audioMaker();
    let makeOutputElement = (elem, blob) => {
        let outputElem = $('#' + elem)[0];
        outputElem.controls = true;
        outputElem.src = URL.createObjectURL(blob);
    }
    let trimAudio = () => {
        if ($('#trimFile')[0].files[0]) {
            $('#trimError').text('');
            let file = $('#trimFile')[0].files[0];
            trimStart = Number($('#trimStart').val());
            trimEnd = Number($('#trimEnd').val());
            audioMaker.trim(file, trimStart, trimEnd).then((blob) => {
                makeOutputElement('trimOutput', blob);
            });
        } else {
            $('#trimError').text('Need audio file to trim.');
        }
    }

    // End GitCode 


    document.getElementById("dwenload_audio_file").addEventListener("click", (e) => {
        trimAudio()
    })

     console.log(document.getElementById("trimFile_player").duration);
})

