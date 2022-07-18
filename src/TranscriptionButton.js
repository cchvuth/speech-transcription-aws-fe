import MediaRecorder from 'opus-media-recorder';
import { useState } from 'react';
import { debounce } from 'lodash';

const url = 'ws://localhost.se:8080/api';

const CHUNK_LENGTH_MS = 1000;
var socket;
var recorder;
var sampleRate;
var lastPartialLength = 0;

// Detect silence variables
const MIN_DECIBELS = -45;
const SILENCE_DURATION_MS = 2000;
var analyser;
var domainData;

// const saveToFile = (blob) => {
//   const blobUrl = URL.createObjectURL(blob);
//   var link = document.createElement("a");
//   link.href = blobUrl;
//   link.download = "audio.ogg";
//   link.click();
// }

const TranscriptionButton = ({
  value,
  onChange,
  style,
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [visualizerHeight, setVisualizerHeight] = useState(0);

  const initSocket = () => {
    return new Promise((res, rej) => {
      socket = new WebSocket(url);
      socket.onopen = () => res(socket);
      socket.onerror = (e) => rej(e);

      socket.onmessage = (event) => {
        if (event.data.includes('Unable to load credentials')) {
          return console.error('AWS Transcribe credentials not setup');
        }

        let parsed;

        try {
          parsed = JSON.parse(event.data);
          parsed.lastPartialLength = lastPartialLength;

          if (parsed.isPartial) {
            lastPartialLength = parsed.result.length;
          } else {
            lastPartialLength = 0;
          }

          const currentValue = value || '';
          const nextValue =
            currentValue.slice(0, -1 * parsed.lastPartialLength || undefined) +
            parsed.result;

          value = nextValue;
          onChange(nextValue);
        } catch (e) {
          console.error('Invalid response from BE');
        }
      };

      socket.onclose = () => {
        if (_isStarted()) {
          stop();
          start();
        }
      };
    });
  };

  const initRecorder = () => {
    return new Promise(async (res, rej) => {
      const stream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch((e) => {
          rej(e);
          alert('Please grant mic permission');
        });

      sampleRate = stream?.getAudioTracks()[0]?.getSettings().sampleRate;

      if (!sampleRate) {
        return rej(new Error('No sample rate'));
      }

      recorder = new MediaRecorder(
        stream,
        { mimeType: 'audio/ogg' },
        {},
      );

      recorder.addEventListener('dataavailable', (e) => {
        socket.send(e.data);
      });

      recorder.addEventListener('error', (e) => {
        console.error(e);
      });

      // Init detect silence
      const audioContext = new AudioContext();
      const audioStreamSource = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.minDecibels = MIN_DECIBELS;
      audioStreamSource.connect(analyser);
      domainData = new Uint8Array(analyser.frequencyBinCount);

      res(recorder);
    });
  };

  // isStarted state sometimes failed to be up to date when check within js code.
  const _isStarted = () => {
    return recorder.state === 'recording'
  }

  const detectSound = () => {
    let soundDetected = false;
    let tempVisualizerHeight = 0;

    analyser.getByteFrequencyData(domainData);

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
      if (domainData[i] > 0) {
        soundDetected = true

        let normalized = Math.ceil(domainData[i] / 30);
        if (normalized > tempVisualizerHeight) {
          tempVisualizerHeight = normalized;
        }
      }
    }

    if (tempVisualizerHeight > 7) {
      tempVisualizerHeight = 7;
    }

    setVisualizerHeight(tempVisualizerHeight)

    if (soundDetected) {
      debounceStop();
    }

    if (_isStarted()) {
      window.requestAnimationFrame(detectSound);
    }
  };

  const start = async () => {
    await Promise.all([initSocket(), initRecorder()]);

    socket.send(String(sampleRate));
    socket.send('start');
    setIsStarted(true);
    recorder.start(CHUNK_LENGTH_MS);

    window.requestAnimationFrame(detectSound);
  };

  const debounceStop = debounce(() => {
    stop({ notifyServer: true });
  }, SILENCE_DURATION_MS);

  const stop = async (arg = {}) => {
    if (_isStarted()) {
      recorder.stop();
      recorder.stream.getTracks().forEach((i) => i.stop());
      setIsStarted(false);
      setVisualizerHeight(0);

      if (arg.notifyServer) {
        setTimeout(() => {
          socket.send('done');
        }, 500);
      }
    }
  };

  const onRecordClick = async () => {
    isStarted ? stop({ notifyServer: true }) : start();
  };

  const mixedStyle = Object.assign(
    {
      width: '20px',
      height: '20px',
      cursor: 'pointer',
      border: 'none',
      borderRadius: '50%',
      fontSize: '1rem',
      transition: 'all 50ms ease',
      boxShadow: `0px 0px 0px ${visualizerHeight}px #ffdada7d`
    },
    style,
  );

  return (
    <img
      data-testid="TRANSCRIPTION_BTN"
      style={ mixedStyle }
      onClick={ onRecordClick }
      src={ isStarted ? 'pause-red.svg' : 'mic-red.svg' }
    />
  );
};

export default TranscriptionButton;
