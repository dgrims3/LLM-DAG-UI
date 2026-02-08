import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import './UserInputNode.css';

export default function UserInputNode({ data }) {
  const [input, setInput] = useState(data.input || '');

  const handleSubmit = () => {
    if (input.trim() && data.onSubmit) {
      data.onSubmit(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Stop propagation to prevent ReactFlow from handling the event
    e.stopPropagation();

    // Submit on Enter (unless Shift is held for line break)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="user-input-node">
      {/* Target handles - can receive connections from any direction */}
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="target" position={Position.Right} id="right-target" />

      <div className="input-header">
        <span className="input-label">Your Message</span>
      </div>

      <textarea
        className="nodrag"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        placeholder={data.placeholder || 'Type your message... (Enter to send, Shift+Enter for new line)'}
        disabled={data.isSubmitting}
        rows={4}
      />

      <button
        className="nodrag submit-button"
        onClick={(e) => {
          e.stopPropagation();
          handleSubmit();
        }}
        disabled={!input.trim() || data.isSubmitting}
      >
        {data.isSubmitting ? 'Sending...' : 'Send'}
      </button>

    </div>
  );
}
