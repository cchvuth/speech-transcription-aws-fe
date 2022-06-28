import './App.css';
import MediaRecorder from 'opus-media-recorder';
import React, { useState } from 'react';

var url = "ws://localhost.se:8080/api";
var recorder;
var socket = new WebSocket(url);

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [result, setResult] = useState('');

  const workerOptions = {
    OggOpusEncoderWasmPath: './OggOpusEncoder.wasm',
    WebMOpusEncoderWasmPath: './WebMOpusEncoder.wasm'
  };

  // const saveAsFile = (data) => {
  //   var url = (window.URL || window.webkitURL).createObjectURL(new Blob([data]));
  //   var link = window.document.createElement('a');
  //   link.href = url;
  //   link.download = 'audio.ogg';
  //   link.click();
  // }

  // const postAudio = (data, sampleRate) => {
  //   var formdata = new FormData();
  //   formdata.append("audio", data, "audio.ogg");
  //   formdata.append("rate", sampleRate);

  //   var requestOptions = {
  //     method: 'POST',
  //     body: formdata
  //   };

  //   fetch("http://localhost.se:8080/api/speechtranscription/en", requestOptions)
  //     .then(response => response.text())
  //     .then(text => {
  //       setResult(result + text);
  //     })
  //     .catch(error => console.log('error', error));
  // }

  socket.onmessage = (event) => {
    setResult(result + event.data);
  };

  socket.onclose = (event) => {
    if (event.wasClean) {
      console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
      console.log('[close] Connection died');
    }

    socket = new WebSocket(url);
  };

  socket.onerror = (error) => {
    console.log(`[error] ${error.message}`);
  };

  const start = () => {
    setIsStarted(true);

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      let options = { mimeType: 'audio/ogg' };
      const sampleRate = stream.getAudioTracks()[0].getSettings().sampleRate;
      recorder = new MediaRecorder(stream, options, workerOptions);

      socket.send(sampleRate);
      socket.send("start");

      recorder.addEventListener('dataavailable', (e) => {
        // saveAsFile(e.data);
        // postAudio(e.data, sampleRate);
        socket.send(e.data)
      });

      recorder.addEventListener('error', (e) => {
        console.error(e);
      })

      recorder.start(1000);
    });
  }

  const stop = () => {
    setIsStarted(false);
    recorder.stop()
    recorder.stream.getTracks().forEach(i => i.stop());
    setTimeout(() => {
      socket.send("done");
    }, 500)
  }

  const onRecordClick = async () => {
    if (!isStarted) {
      start()
    } else {
      stop();
    }
  }

  return (
    <div className="App">
      <p><em>{isStarted ? "Listening..." : "Ready"}</em></p>
      <div className="input-container">
        <input type="text" value={result} onChange={e => setResult(e.target.value)} />
        <button className={isStarted ? "started" : ""} style={{ background: isStarted ? '#ffc3c3' : '' }} onClick={onRecordClick}>{isStarted ? '■' : '🎤'}</button>
      </div>
      <div className="output-container">
        {result}
      </div>
    </div>
  );
}

export default App;
