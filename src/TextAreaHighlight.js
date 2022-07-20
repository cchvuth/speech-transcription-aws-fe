import { useEffect, useRef, useState } from 'react';
import TranscriptionButton from './TranscriptionButton';
import ReactTooltip from 'react-tooltip';
import { v4 as uuidv4 } from 'uuid';

const TextAreaHighlight = ({
  value,
  onChange,
  style = {},
}) => {
  const inputRef = useRef();
  const [raw, setRaw] = useState([])

  useEffect(() => {
    const newRaw = [];
    newRaw.push(genSpan(value));
    newRaw.push(genSpan(' '));
    setRaw(raw.concat(newRaw));
  }, [])

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
        onInput={(ev) => {
          onChange(ev.target.innerText);
        }}
      >
        {raw}
      </div>
      <TranscriptionButton
        value={value}
        onChange={onTranscriptionChange}
        onRawChange={onTranscriptionRawChange}>
      </TranscriptionButton>
    </div>
  );
};

export default TextAreaHighlight;
