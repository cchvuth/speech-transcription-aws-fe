import { useEffect, useRef, useState } from 'react';
import TranscriptionButton from './TranscriptionButton';
import ReactTooltip from 'react-tooltip';
import { v4 as uuidv4 } from 'uuid';

const r3 = {
  "isPartial": false, "items": [{ "confidence": 0.5551, "content": "A" },
  { "confidence": 0.9993, "content": "Latin" },
  { "confidence": 1, "content": "professor" },
  { "confidence": 1, "content": "at" },
  { "confidence": 0.9969, "content": "Hampton" },
  { "content": "," },
  { "confidence": 0.9511, "content": "Sidney" },
  { "confidence": 0.9981, "content": "College" },
  { "confidence": 0.9981, "content": "in" },
  { "confidence": 1, "content": "Virginia" },
  { "content": "," },
  { "confidence": 0.9987, "content": "looked" },
  { "confidence": 0.9972, "content": "up" },
  { "confidence": 0.9995, "content": "one" },
  { "confidence": 0.998, "content": "of" },
  { "confidence": 0.9954, "content": "the" },
  { "confidence": 0.9989, "content": "more" },
  { "confidence": 0.923, "content": "obscure" },
  { "confidence": 0.9965, "content": "Latin" },
  { "confidence": 0.9605, "content": "words" },
  { "confidence": 0.552, "content": "concept" },
  { "confidence": 0.3551, "content": "of" },
  { "confidence": 0.5353, "content": "her" },
  { "confidence": 1, "content": "from" },
  { "confidence": 0.9304, "content": "a" },
  { "confidence": 0.5765, "content": "Laura" },
  { "confidence": 0.1717, "content": "MIPs" },
  { "confidence": 0.4744, "content": "and" },
  { "confidence": 1, "content": "passage" },
  { "content": "." }], "content": "A Latin professor at Hampton, Sidney College in Virginia, looked up one of the more obscure Latin words concept of her from a Laura MIPs and passage."
}

const TextAreaHighlight = ({
  value,
  onChange,
  style = {},
}) => {
  const inputRef = useRef();
  const [raw, setRaw] = useState([])

  useEffect(() => {
    raw.push(genSpan(value))
    raw.push(genSpan(' '))
  }, [])

  const onInput = (ev) => {
    onChange(ev.target.innerText);
  }

  const onRecordingStart = () => {
  }

  const onRecordingStop = () => {
  }

  const onTranscriptionChange = (text) => {
    onChange(text)
  }

  const onSpanClick = (ev) => {
    ev.target.classList.remove(ev.target.classList[0]);
    ev.target.removeAttribute('data-tip');
  }

  const genSpan = (content, className = '', dataTip = undefined) => {
    return <span key={uuidv4()} className={className} data-tip={dataTip} onClick={onSpanClick}>{content}</span>
  }

  const onTranscriptionRawChange = (object) => {
    const newRaws = [];
    object.items.forEach((item, index) => {
      if (item.confidence < 0.8) {
        const tooltip = Math.round((item.confidence || 1) * 100) + '% certainty'
        let color = '';

        if (item.confidence < 0.3) {
          color = 'pink';
        } else if (item.confidence < 0.5) {
          color = 'orange';
        } else  {
          color = 'yellow';
        }

        newRaws.push(genSpan(item.content, color + ' ' + item.confidence, tooltip))
      } else {
        newRaws.push(genSpan(item.content))
      }

      const next = object.items[index + 1];

      if (next && next.content !== ',' && next.content !== '.') {
        newRaws.push(genSpan(' '))
      }
    })

    setRaw(raw.concat(newRaws));

    setTimeout(() => {
      onChange(inputRef.current.innerText);
      ReactTooltip.rebuild();
    });
  }

  useEffect(() => {
    onRecordingStart();
    onTranscriptionRawChange(r3);
    onRecordingStop();
  }, []);

  const mixedStyle = Object.assign(
    {
      width: '100%'
    },
    style,
  );

  return (
    <div className="input-container">
      <div
        ref={inputRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        style={mixedStyle}
        onInput={onInput}
      >
        {raw}
      </div>
      <TranscriptionButton
        value={value}
        onStart={onRecordingStart}
        onStop={onRecordingStop}
        onChange={onTranscriptionChange}
        onRawChange={onTranscriptionRawChange}>
      </TranscriptionButton>
    </div>
  );
};

export default TextAreaHighlight;
