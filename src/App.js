import { useState } from 'react';
import TextAreaHighlight from './TextAreaHighlight'
import './App.css';
import ReactTooltip from 'react-tooltip';

function App() {
  const [result, setResult] = useState('Hello');

  return (
    <div className="App">
      <ReactTooltip />
      <TextAreaHighlight
          value={result}
          onChange={setResult}
        />
      <div className="output-container">
        {result}
      </div>
    </div>
  );
}

export default App;
