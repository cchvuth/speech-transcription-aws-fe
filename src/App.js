import { useEffect, useState } from 'react';
import TranscriptionButton from './TranscriptionButton';
import { HighlightWithinTextarea } from 'react-highlight-within-textarea'
import './App.css';

let allData = {
  content: '',
  items: []
};

function App() {
  const [result, setResult] = useState("");
  const [highlights, setHighlights] = useState([]);

  const onStart = () => {
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

      if (item.confidence < 0.2) {
        newHighlights.push({
          highlight: [item.start, item.end],
          className: 'pink'
        });
      } else if (item.confidence < 0.4) {
        newHighlights.push({
          highlight: [item.start, item.end],
          className: 'orange'
        });
      } else if (item.confidence < 0.6) {
        newHighlights.push({
          highlight: [item.start, item.end],
          className: 'yellow'
        });
      }
    })

    setHighlights(newHighlights);
    setResult(allData.content);
  }

  const onRawChange = (object) => {
    if (!object.isPartial) {
      allData.content += object.content + ' ';
      allData.items = allData.items.concat(object.items)
    }
  }

  return (
    <div className="App">
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
