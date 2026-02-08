import { Handle, Position } from '@xyflow/react';
import './MessageNode.css';

export default function MessageNode({ data }) {
  const isAssistant = data.role === 'assistant';

  return (
    <div className={`message-node ${isAssistant ? 'assistant' : 'user'}`}>
      {/* Target handles - can receive connections from any direction */}
      <Handle type="target" position={Position.Top} id="top" />


      <div className="message-header">
        <span className="message-role">
          {isAssistant ? 'Claude' : 'You'}
        </span>
      </div>

      <div className="message-content">
        {data.isLoading ? (
          <div className="loading-indicator">
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
          </div>
        ) : (
          <p>{data.content}</p>
        )}
      </div>

      {/* Source handles - can create connections in any direction */}
      {isAssistant && (
        <>
          <Handle type="source" position={Position.Bottom} id="bottom-source" />
          <Handle type="source" position={Position.Left} id="left-source" />
          <Handle type="source" position={Position.Right} id="right-source" />
        </>
      )}
      {!isAssistant && (
          <Handle type="source" position={Position.Bottom} id="bottom-source" />
      )}
    </div>
  );
}
