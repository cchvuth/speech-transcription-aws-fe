/** @jsxImportSource @emotion/react */
import { BaseSyntheticEvent, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Popover } from 'react-tiny-popover';
import {
  TranscriptionButton,
  TranscriptionResult,
} from './TranscriptionButton';

const colors = {
  borderInteractiveFocus: "#9fc5e8",
  textSecondary: "rgba(84, 92, 99, 1)",
  criticalBackground: "#FFD2D2",
  warningBackground: "#FFD89E",
  borderDefault: "rgba(231, 232, 233, 1)",
  white: 'white'
}

const genSpan = (content: string, id = uuidv4()) => {
  return <span key={id}>{content}</span>;
};

const InteractableSpan = ({
  content,
  color,
  id = uuidv4(),
}: {
  content: string;
  color: string;
  id: string;
}) => {
  const [activePopover, setActivePopover] = useState(false);

  const getColor = () => {
    return color === 'pink'
      ? colors.criticalBackground
      : colors.warningBackground;
  };

  const onAccept = (e: BaseSyntheticEvent) => {
    setActivePopover(false);
    const ele = document.getElementById(id);
    if (ele) {
      ele.style.background = '';
    }
    e.stopPropagation();
  };

  const onDelete = (e: BaseSyntheticEvent) => {
    setActivePopover(false);
    const ele = document.getElementById(id);
    const nextSibling = ele?.nextElementSibling;

    if (nextSibling?.innerHTML === ' ') {
      nextSibling.remove();
    } else if (
      nextSibling?.innerHTML === '.' ||
      nextSibling?.innerHTML === ','
    ) {
      const prevSibling = ele?.previousElementSibling;

      if (prevSibling?.innerHTML === ' ') {
        prevSibling.remove();
      }
    }

    ele?.remove();
    e.stopPropagation();
  };

  const popoverContent = (
    <div
      id={`${id}content`}
      style={{
        borderRadius: '8px',
        margin: '5px',
        boxShadow: '0px 2px 4px rgba(10, 22, 31, 0.1)',
        border: `1px solid ${colors.borderDefault}`,
        background: colors.white,
      }}
    >
      <div
        style={{
          borderRadius: '4px',
          padding: '8px',
          margin: '16px',
          background: getColor(),
        }}
      >
        icon
        <span
          style={{
            marginLeft: '8px',
          }}
        >
          {color === 'pink' ? (
            'Low'
          ) : (
            'High'
          )} Confidence
        </span>
      </div>
      <div onClick={onAccept} style={{ padding: '8px' }}>
          Check icon
          <span style={{ padding: '8px' }}>
            Accept
          </span>
        </div>
        <div onClick={onDelete} style={{ padding: '8px' }}>
          Trash icon
          <span style={{ padding: '8px' }}>
            Delete
          </span>
        </div>
    </div>
  );

  const enablePopover = (ev: React.MouseEvent<HTMLSpanElement>) => {
    if ((ev.target as HTMLSpanElement)?.style.background) {
      setActivePopover(true);
    }
  };

  return (
    <Popover
      isOpen={activePopover}
      positions={['bottom', 'top']}
      content={popoverContent}
      onClickOutside={() => setActivePopover(false)}
    >
      <span
        id={id}
        role="button"
        tabIndex={0}
        style={{
          background: getColor(),
          borderRadius: '4px',
          padding: '0px 1px',
        }}
        onClick={enablePopover}
        onKeyDown={() => {}}
        data-original={content}
      >
        {content}
      </span>
    </Popover>
  );
};

const genInteractableSpan = (value: string, color: string) => {
  const id = uuidv4();
  return <InteractableSpan key={id} id={id} content={value} color={color} />;
};

const TextAreaHighlight = ({
  id = uuidv4(),
  label = '',
  rows = 3,
  value,
  onChangeFn,
  style = {},
  disabled = false,
}: {
  id?: string;
  label?: string;
  rows?: number;
  value: string;
  onChangeFn: (newValue: string | ((oldValue: string) => string)) => void;
  style?: object;
  disabled?: boolean;
}) => {
  const [raw, setRaw] = useState(
    value ? [genSpan(value), genSpan(' ')] : ([] as JSX.Element[]),
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const onInputChange = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLDivElement;

    if (target.innerText === '\n') {
      target.replaceChildren('');
      onChangeFn('');
    } else {
      onChangeFn(target.innerText);
      const spans = target.children;

      if (spans) {
        const toBeRemoved = [];

        for (let i = 0; i < spans.length; i += 1) {
          const child = spans[i] as HTMLSpanElement;
          if (child?.getAttribute('data-original') !== child?.innerText) {
            child.style.background = '';
            child.removeAttribute('data-tip');
            const openedPopover = document.getElementById(`${child.id}content`);

            if (openedPopover) {
              openedPopover.style.display = 'none';
            }
          } else if (child?.innerText === '') {
            toBeRemoved.push(child);
          }
        }

        toBeRemoved.forEach((child) => child.remove());
      }
    }
  };

  const onTranscriptionRawChange = (result: TranscriptionResult) => {
    if (!result.isPartial) {
      const newSpans = [] as JSX.Element[];
      result.items.forEach((item, index) => {
        if (item.confidence < 0.7) {
          let color = 'orange';

          if (item.confidence < 0.4) {
            color = 'pink';
          }

          newSpans.push(genInteractableSpan(item.content, color));
        } else {
          newSpans.push(genSpan(item.content));
        }

        const nextSpan = result.items[index + 1];

        if (nextSpan && nextSpan.content !== ',' && nextSpan.content !== '.') {
          newSpans.push(genSpan(' '));
        }
      });

      // When the last word is highlighted, the user will continue to write in that highlighted color,
      // This prevents that from happening.
      newSpans.push(genSpan(' '));
      setRaw((prev) => [...prev, ...newSpans]);
    }
  };

  const containerStyle = {
    resize: 'vertical' as const,
    overflow: 'auto',
    boxShadow: '0 0 0 1px rgb(157 162 165)',
    borderRadius: '4px',
    outlineOffset: '2px',
    outline: isFocused
      ? `${colors.borderInteractiveFocus} solid 2px`
      : undefined,
  };

  const textAreaStyle = {
    width: '100%',
    height: '100%',
    minHeight: `${rows * 25}px`,
    textAlign: 'start' as const,
    padding: '8px',
    outline: '0px',
    color: isTranscribing ? colors.textSecondary : undefined,
    whiteSpace: 'pre-wrap' as const,
  };

  const textAreaEditableStyle = {
    display: !isTranscribing ? 'block' : 'none',
    ...textAreaStyle,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
    color: 'rgba(0, 0, 0, 1)',
  };

  const transcribeBtnLocation = {
    position: 'absolute',
    left: '0px',
    bottom: '-47px',
  };

  const transcribeStatusStyle = {
    position: 'absolute' as const,
    left: '40px',
    bottom: '-40px',
    color: colors.textSecondary,
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
        </label>
      )}
      <div style={containerStyle}>
        {isTranscribing && <div css={textAreaStyle}>{value}</div>}

        {/* Always here but display:done to preserve edited raw data */}
        <div
          id={id}
          contentEditable={!disabled && !isTranscribing}
          suppressContentEditableWarning
          css={textAreaEditableStyle}
          onInput={onInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {raw}
        </div>
        <TranscriptionButton
          style={transcribeBtnLocation}
          onChangeFn={onChangeFn}
          onRawChange={onTranscriptionRawChange}
          onStart={() => {
            setIsRecording(true);
            setIsTranscribing(true);
          }}
          onRecordingStop={() => setIsRecording(false)}
          onTranscribeStop={() => setIsTranscribing(false)}
        />
        <span style={transcribeStatusStyle}>
          {isRecording && (
            'Listening...'
          )}
          {isTranscribing && !isRecording && (
            'Transcribing...'
          )}
        </span>
      </div>
    </div>
  );
};

export { TextAreaHighlight, colors };
