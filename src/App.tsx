import { useState } from 'react';
import './App.css';
import { TextAreaHighlight } from './TextAreaHighlight';

function App() {
  const [text, setText] = useState('')
  return (
    <div className="App">
      <TextAreaHighlight
        id="test"
        rows={3}
        value={text}
        style={{
          width: '500px',
          margin: '30px auto'
        }}
        onChangeFn={setText}
      />
    </div>
  );
}

export default App;
