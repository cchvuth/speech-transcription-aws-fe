import { useState } from 'react';
import TranscriptionButton from './TranscriptionButton';
import { HighlightWithinTextarea } from 'react-highlight-within-textarea'
import './App.css';
import ReactTooltip from 'react-tooltip';

let allData = {
  content: '',
  items: []
};

const ToolTip = (props) => {
  const content = Math.round(Number(props.className.split(' ').pop()) * 100) + '% certainty';
  return (
    <mark className={props.className} data-tip={content}>{props.children}</mark>
  );
};

function App() {
  const [result, setResult] = useState('');
  const [highlights, setHighlights] = useState([]);

  const onStart = () => {
    allData.content = result;
  }

  const onStop = () => {
    let idx = 0;
    let remainContent = allData.content;

    const newHighlights = [];

    allData.items.forEach(item => {
      let emptyFronts = remainContent.indexOf(item.content);
      idx += emptyFronts;
      item.start = idx;
      item.end = idx + item.content.length;
      remainContent = remainContent.substring(emptyFronts + item.content.length)
      idx = item.end;

      if (item.confidence < 0.3) {
        newHighlights.push({
          highlight: [item.start, item.end],
          component: ToolTip,
          className: 'pink ' + item.confidence
        });
      } else if (item.confidence < 0.5) {
        newHighlights.push({
          highlight: [item.start, item.end],
          component: ToolTip,
          className: 'orange ' + item.confidence
        });
      } else if (item.confidence < 0.8) {
        newHighlights.push({
          highlight: [item.start, item.end],
          component: ToolTip,
          className: 'yellow ' + item.confidence
        });
      }
    })

    setHighlights(newHighlights);
    setResult(allData.content);
    setTimeout(() => {
      ReactTooltip.rebuild();
    })
  }

  const onRawChange = (object) => {
    if (!object.isPartial) {
      allData.content += object.content + ' ';
      allData.items = allData.items.concat(object.items)
    }
  }

  return (
    <div className="App">
      <ReactTooltip />
      <div className="input-container">
        <HighlightWithinTextarea
          value={result}
          highlight={highlights}
          onChange={setResult}
          placeholder=""
        />
        <TranscriptionButton
          value={result}
          onStart={onStart}
          onStop={onStop}
          onChange={setResult}
          onRawChange={onRawChange}></TranscriptionButton>
      </div>
      <div className="output-container">
        {result}
      </div>
    </div>
  );
}

export default App;
