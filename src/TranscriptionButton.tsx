/** @jsxImportSource @emotion/react */
import { useRef, useState } from 'react';
import { debounce } from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MediaRecorder = require('opus-media-recorder');

const url = `ws://localhost.se:8257/api/speech-transcription/ws`;

const CHUNK_LENGTH_MS = 1000;
let sampleRate: number | undefined;
const specialty:
  | 'PRIMARYCARE'
  | 'CARDIOLOGY'
  | 'NEUROLOGY'
  | 'ONCOLOGY'
  | 'RADIOLOGY'
  | 'UROLOGY' = 'PRIMARYCARE';

// Detect silence variables
const MIN_DECIBELS = -45;
const MAX_VISUALIZER_HEIGHT = 13;
const SILENCE_DURATION_MS = 5000;

export interface TranscriptionResult {
  isPartial: boolean;
  lastPartialLength: number; // added by FE
  content: string;
  items: { content: string; confidence: number }[];
}

const TranscriptionButton = ({
  onChangeFn,
  style = {},
  onRawChange,
  onStart = () => {},
  onRecordingStop = () => {},
  onTranscribeStop = () => {},
}: {
  onChangeFn: (newValue: string | ((oldValue: string) => string)) => void;
  style?: object;
  onRawChange: (newValue: TranscriptionResult) => void;
  onStart?: () => void;
  onRecordingStop?: () => void;
  onTranscribeStop?: () => void;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [visualizerHeight, setVisualizerHeight] = useState(0);
  const lastPartialLength = useRef(0);

  const socket = useRef<WebSocket | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const domainData = useRef<Uint8Array | null>(null);

  // isRecording state is async so use this as real-time state.
  const isRecordingInternal = () => {
    return recorder.current?.state === 'recording';
  };

  const initSocket = () => {
    return new Promise((res, rej) => {
      socket.current = new WebSocket(url);
      socket.current.onopen = () => res(socket);
      socket.current.onerror = (e) => rej(e);
    });
  };

  const initRecorder = () => {
    return new Promise((res, rej) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          sampleRate = stream?.getAudioTracks()[0]?.getSettings().sampleRate;

          if (!sampleRate) {
            rej(new Error('No sample rate'));
            return;
          }

          recorder.current = new MediaRecorder(
            stream,
            { mimeType: 'audio/ogg' }
          );

          recorder.current?.addEventListener('dataavailable', (e) => {
            socket.current?.send(e.data);
          });

          recorder.current?.addEventListener('error', () => {
            throw new Error('Unable to start recorder');
          });

          // Init detect silence
          const audioContext = new AudioContext();
          const audioStreamSource = audioContext.createMediaStreamSource(
            stream as MediaStream,
          );
          analyser.current = audioContext.createAnalyser();
          analyser.current.minDecibels = MIN_DECIBELS;
          audioStreamSource.connect(analyser.current);
          domainData.current = new Uint8Array(
            analyser.current.frequencyBinCount,
          );

          res(recorder);
        })
        .catch((e) => {
          rej(e);
          throw new Error(
            'No mic permission'
          );
        });
    });
  };

  const stop = async (arg: { notifyServer?: boolean } = {}) => {
    if (isRecordingInternal()) {
      recorder.current?.stop();
      recorder.current?.stream.getTracks().forEach((i) => i.stop());
      setIsRecording(false);
      setVisualizerHeight(0);
      onRecordingStop();

      if (arg.notifyServer) {
        setTimeout(() => {
          socket.current?.send('done');
        }, 500);
      }
    }
  };

  const debounceStop = debounce(() => {
    stop({ notifyServer: true });
  }, SILENCE_DURATION_MS);

  const detectSound = () => {
    let soundDetected = false;
    let tempVisualizerHeight = 0;

    if (!analyser.current || !domainData.current) {
      return;
    }

    analyser.current?.getByteFrequencyData(domainData.current as Uint8Array);

    for (let i = 0; i < analyser.current.frequencyBinCount; i += 1) {
      const data = (domainData.current[i] || 0) * 2;

      if (data > 0) {
        soundDetected = true;

        if (data > tempVisualizerHeight) {
          tempVisualizerHeight = data;
        }
      }
    }

    if (tempVisualizerHeight > MAX_VISUALIZER_HEIGHT) {
      tempVisualizerHeight = MAX_VISUALIZER_HEIGHT;
    }

    if (soundDetected) {
      debounceStop();
    }

    if (isRecordingInternal()) {
      setVisualizerHeight((prev) =>
        tempVisualizerHeight === MAX_VISUALIZER_HEIGHT &&
        tempVisualizerHeight === prev
          ? 5
          : tempVisualizerHeight,
      );
      window.requestAnimationFrame(detectSound);
    }
  };

  const start = () => {
    if (isTranscribing) return;

    return Promise.all([initSocket(), initRecorder()]).then(
      () => {
        if (socket.current) {
          socket.current.onmessage = (event) => {
            if (event.data.includes('Unable to load credentials')) {
              throw new Error('AWS Transcribe credentials not setup');
            }

            let parsed: TranscriptionResult | undefined;

            try {
              parsed = JSON.parse(event.data);
            } catch (e) {
              // Ignore
            }

            if (parsed) {
              parsed.lastPartialLength = lastPartialLength.current;

              if (parsed.isPartial) {
                lastPartialLength.current = parsed.content.length;
              } else {
                lastPartialLength.current = 0;
              }

              onRawChange(parsed);

              onChangeFn((current) => {
                const currentValue = current || '';
                const nextValue = parsed
                  ? currentValue.slice(
                      0,
                      -1 * parsed.lastPartialLength || undefined,
                    ) + parsed.content
                  : currentValue;
                return nextValue;
              });
            }
          };

          socket.current.onclose = () => {
            if (isRecordingInternal()) {
              stop();
              start();
            }
            setIsTranscribing(false);
            onTranscribeStop();
          };
        }

        socket.current?.send(String(sampleRate));
        socket.current?.send(`start:${specialty}`);
        setIsRecording(true);
        setIsTranscribing(true);
        recorder.current?.start(CHUNK_LENGTH_MS);
        onStart();
        window.requestAnimationFrame(detectSound);
      },
      () => {
        setTimeout(() => {
          if (!isRecordingInternal()) {
            recorder.current?.stream.getTracks().forEach((i) => i.stop());
          }
        }, 1000);
      },
    );
  };

  const onRecordClick = () => {
    return isRecording ? stop({ notifyServer: true }) : start();
  };

  const containerStyle = {
    display: 'flex',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    transition: 'all 50ms ease',
    boxShadow: `0px 0px 0px ${visualizerHeight}px #FFD2D2`,
    opacity: !isRecording && isTranscribing ? '0.4' : '1',
    cursor: !isRecording && isTranscribing ? 'not-allowed' : 'pointer',
    ...style,
  };

  const getToolTip = () => {
    return isRecording
      ? 'Stop Dictation'
      : 'Start Dictation'
  };

  return (
    <img
      title={getToolTip()}
      style={ containerStyle }
      onClick={ onRecordClick }
      src={ isRecording ? 'pause-red.svg' : 'mic-red.svg' }
      alt="mic"
    />
  );
};

export { TranscriptionButton };
