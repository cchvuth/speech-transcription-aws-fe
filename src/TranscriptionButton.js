import MediaRecorder from 'opus-media-recorder';
import { useState } from 'react';

const url = 'ws://localhost.se:8080/api';

var socket;
var recorder;
var sampleRate;
var lastPartialLength = 0;

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
  const colors = {
    critical: 'red',
    backgroundSoftGrey: 'gray'
  };
  const [isStarted, setIsStarted] = useState(false);

  const initSocket = async () => {
    await new Promise((res, rej) => {
      socket = new WebSocket(url);
      socket.onopen = () => res(socket);
      socket.onerror = (e) => rej(e);
    });

    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
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
    };

    socket.onclose = () => {
      if (recorder.state === 'recording') {
        stopRecorder();
        start();
      }
    };
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
        throw new Error('No sample rate');
      }

      recorder = new MediaRecorder(
        stream,
        { mimeType: 'audio/ogg' },
        {},
      );

      recorder.addEventListener('dataavailable', async (e) => {
        socket.send(e.data);
        // saveToFile(new Blob([e.data]));
      });

      recorder.addEventListener('error', (e) => {
        console.error(e);
      });
      res(recorder);
    });
  };

  const stopRecorder = () => {
    recorder.stop();
    recorder.stream.getTracks().forEach((i) => i.stop());
    setIsStarted(false);
  };

  const start = async () => {
    await Promise.all([initSocket(), initRecorder()]);

    socket.send(String(sampleRate));
    socket.send('start');
    setIsStarted(true);
    recorder.start(1000);
  };

  const stop = async () => {
    stopRecorder();
    setTimeout(() => {
      socket.send('done');
    }, 500);
  };

  const onRecordClick = async () => {
    isStarted ? stop() : start();
  };

  const mixedStyle = Object.assign(
    {
      background: isStarted ? colors.critical : colors.backgroundSoftGrey,
      width: '30px',
      height: '30px',
      cursor: 'pointer',
      border: 'none',
      borderRadius: '50%',
      fontSize: '1rem',
    },
    style,
  );

  return (
    <button
      data-testid="TRANSCRIPTION_BTN"
      style={mixedStyle}
      onClick={onRecordClick}
    >
      {isStarted ? '■' : '🎤'}
    </button>
  );
};

export default TranscriptionButton;
