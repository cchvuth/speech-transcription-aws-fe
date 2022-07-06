import { useState } from 'react';
import TranscriptionButton from './TranscriptionButton';
import './App.css';
function App() {
  const [result, setResult] = useState("");
  return (
    <div className="App">
      <div className="input-container">
        <input type="text" value={result} onChange={e => setResult(e.target.value)} />
        <TranscriptionButton value={result} onChange={setResult}></TranscriptionButton>
      </div>
      <div className="output-container">
        {result}
      </div>
    </div>
  );
}

export default App;
