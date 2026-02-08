import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import LandingPage from './components/LandingPage';
import MessageNode from './components/nodes/MessageNode';
import UserInputNode from './components/nodes/UserInputNode';
import { saveApiKey, getApiKey, clearApiKey } from './utils/apiKeyStorage';
import { sendMessageToClaude } from './utils/claudeApi';

const nodeTypes = {
  messageNode: MessageNode,
  userInputNode: UserInputNode,
};

let nodeIdCounter = 0;
let edgeIdCounter = 0;

const NODE_GAP = 30;
const DEFAULT_NODE_HEIGHT = 120;

function getNodeBottom(node) {
  const height = node.measured?.height || DEFAULT_NODE_HEIGHT;
  return node.position.y + height;
}

// Inner component that can use useReactFlow
function Flow({ onLogout }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [pendingInputNode, setPendingInputNode] = useState(null);

  const { getNodes, getEdges, screenToFlowPosition } = useReactFlow();

  // Add pending input node once parent is measured
  useEffect(() => {
    if (!pendingInputNode) return;

    const { parentId, inputNodeId, x, onSubmit, pinned } = pendingInputNode;
    const currentNodes = getNodes();
    const parentNode = currentNodes.find(n => n.id === parentId);

    if (!parentNode?.measured?.height) return;

    const inputY = getNodeBottom(parentNode) + NODE_GAP;

    const newInputNode = {
      id: inputNodeId,
      type: 'userInputNode',
      position: { x, y: inputY },
      data: {
        input: '',
        placeholder: 'Type your message...',
        onSubmit,
        isSubmitting: false,
        pinned: pinned || false,
      },
    };

    setNodes(prev => [...prev, newInputNode]);
    setEdges(prev => [
      ...prev,
      {
        id: `edge-${++edgeIdCounter}`,
        source: parentId,
        sourceHandle: 'bottom-source',
        target: inputNodeId,
        targetHandle: 'top',
      },
    ]);
    setPendingInputNode(null);
  }, [nodes, pendingInputNode, getNodes]);

  // Traverse from a node back to root, collecting message nodes
  const getConversationHistory = useCallback((startNodeId) => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const messages = [];
    let currentId = startNodeId;

    while (currentId) {
      const node = currentNodes.find(n => n.id === currentId);

      if (node && node.type === 'messageNode') {
        messages.unshift({
          role: node.data.role,
          content: node.data.content,
        });
      }

      const parentEdge = currentEdges.find(e => e.target === currentId);
      currentId = parentEdge ? parentEdge.source : null;
    }

    return messages;
  }, [getNodes, getEdges]);

  const handleUserMessage = useCallback(async (message, inputNodeId) => {
    // Get fresh nodes/edges from ReactFlow instance
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const inputNode = currentNodes.find(n => n.id === inputNodeId);
    if (!inputNode) return;

    const timestamp = Date.now();
    const userNodeId = `user-${timestamp}`;
    const assistantNodeId = `assistant-${timestamp}`;
    const newInputNodeId = `input-${++nodeIdCounter}`;

    const history = getConversationHistory(inputNodeId);
    const fullHistory = [...history, { role: 'user', content: message }];

    // Check if this is a pinned (branched) conversation
    const isPinned = inputNode.data?.pinned || false;
    // Check if this input is the anchor (first node user dragged to create branch)
    const isAnchor = inputNode.data?.isAnchor || false;

    // Find parent node with fresh measurements
    const parentEdge = currentEdges.find(e => e.target === inputNodeId);
    const parentNode = parentEdge
      ? currentNodes.find(n => n.id === parentEdge.source)
      : null;

    // For pinned nodes, use their current position; otherwise calculate from parent
    const userNodeY = isPinned
      ? inputNode.position.y
      : (parentNode ? getNodeBottom(parentNode) + NODE_GAP : inputNode.position.y);

    const userNode = {
      id: userNodeId,
      type: 'messageNode',
      position: { x: inputNode.position.x, y: userNodeY },
      data: { role: 'user', content: message, isLoading: false, pinned: isPinned, isAnchor },
    };

    const assistantNode = {
      id: assistantNodeId,
      type: 'messageNode',
      position: { x: inputNode.position.x, y: userNodeY + DEFAULT_NODE_HEIGHT + NODE_GAP },
      data: { role: 'assistant', content: '', isLoading: true, pinned: isPinned },
    };

    setEdges(prevEdges => {
      const updatedEdges = prevEdges.map(edge =>
        edge.target === inputNodeId
          ? { ...edge, target: userNodeId, targetHandle: 'top' }
          : edge
      );

      return [
        ...updatedEdges,
        {
          id: `edge-${++edgeIdCounter}`,
          source: userNodeId,
          sourceHandle: 'bottom-source',
          target: assistantNodeId,
          targetHandle: 'top',
        },
      ];
    });

    setNodes(prevNodes => [
      ...prevNodes.filter(n => n.id !== inputNodeId),
      userNode,
      assistantNode,
    ]);

    try {
      const response = await sendMessageToClaude(fullHistory);

      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === assistantNodeId
            ? { ...n, data: { ...n.data, content: response, isLoading: false } }
            : n
        )
      );

      setPendingInputNode({
        parentId: assistantNodeId,
        inputNodeId: newInputNodeId,
        x: inputNode.position.x,
        onSubmit: (msg) => handleUserMessage(msg, newInputNodeId),
        pinned: isPinned,
      });
    } catch (error) {
      console.error('Error getting response:', error);

      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === assistantNodeId
            ? { ...n, data: { ...n.data, content: `Error: ${error.message}`, isLoading: false } }
            : n
        )
      );
    }
  }, [getNodes, getEdges, getConversationHistory]);

  const initializeGraph = useCallback(() => {
    const inputId = `input-${++nodeIdCounter}`;

    const initialNodes = [
      {
        id: 'welcome',
        type: 'messageNode',
        position: { x: 250, y: 50 },
        data: {
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          isLoading: false,
        },
      },
      {
        id: inputId,
        type: 'userInputNode',
        position: { x: 250, y: 250 },
        data: {
          input: '',
          placeholder: 'Type your message...',
          onSubmit: (msg) => handleUserMessage(msg, inputId),
          isSubmitting: false,
        },
      },
    ];

    const initialEdges = [
      {
        id: `edge-${++edgeIdCounter}`,
        source: 'welcome',
        sourceHandle: 'bottom-source',
        target: inputId,
        targetHandle: 'top',
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [handleUserMessage]);

  // Initialize on mount
  useEffect(() => {
    if (nodes.length === 0) {
      initializeGraph();
    }
  }, [nodes.length, initializeGraph]);

  // Get all descendant node IDs (children, grandchildren, etc.)
  const getDescendantIds = useCallback((nodeId, edgeList) => {
    const descendants = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const childEdges = edgeList.filter(e => e.source === currentId);

      for (const edge of childEdges) {
        if (!descendants.includes(edge.target)) {
          descendants.push(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return descendants;
  }, []);

  // Called when nodes are deleted - also delete all descendants
  const onNodesDelete = useCallback((deletedNodes) => {
    const currentEdges = getEdges();
    const descendantIds = new Set();

    for (const node of deletedNodes) {
      const descendants = getDescendantIds(node.id, currentEdges);
      descendants.forEach(id => descendantIds.add(id));
    }

    if (descendantIds.size > 0) {
      setNodes(nds => nds.filter(n => !descendantIds.has(n.id)));
    }
  }, [getEdges, getDescendantIds]);

  const onNodesChange = useCallback((changes) => {
    // Check if any dimensions changed
    const dimensionChanges = changes.filter(
      change => change.type === 'dimensions' && change.dimensions
    );

    setNodes(nds => {
      let updatedNodes = applyNodeChanges(changes, nds);

      // If dimensions changed, reposition nodes for alignment
      if (dimensionChanges.length > 0) {
        const currentEdges = getEdges();

        dimensionChanges.forEach(change => {
          const nodeId = change.id;
          const node = updatedNodes.find(n => n.id === nodeId);
          if (!node) return;

          // 1. If this node changed, position it relative to its parent
          const parentEdge = currentEdges.find(e => e.target === nodeId);
          if (parentEdge) {
            const parentNode = updatedNodes.find(n => n.id === parentEdge.source);

            // Branch anchor: first node in a branch - don't reposition at all
            if (node.data?.isAnchor) return;

            if (parentNode?.measured?.width && node.measured?.width) {
              const parentCenterX = parentNode.position.x + (parentNode.measured.width / 2);
              const newX = parentCenterX - (node.measured.width / 2);
              const newY = getNodeBottom(parentNode) + NODE_GAP;

              const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
              if (Math.abs(node.position.x - newX) > 1 || Math.abs(node.position.y - newY) > 1) {
                updatedNodes = [
                  ...updatedNodes.slice(0, nodeIndex),
                  { ...node, position: { x: newX, y: newY } },
                  ...updatedNodes.slice(nodeIndex + 1),
                ];
              }
            }
          }

          // 2. Reposition child nodes to stay centered below this node
          const childEdges = currentEdges.filter(e => e.source === nodeId);
          const updatedNode = updatedNodes.find(n => n.id === nodeId);

          childEdges.forEach(edge => {
            const childIndex = updatedNodes.findIndex(n => n.id === edge.target);
            if (childIndex === -1) return;

            const childNode = updatedNodes[childIndex];

            // Branch anchor: first node in a branch - don't reposition at all
            if (childNode.data?.isAnchor) return;

            const newY = getNodeBottom(updatedNode) + NODE_GAP;

            // Center child horizontally if both have measured widths
            let newX = childNode.position.x;
            if (updatedNode?.measured?.width && childNode.measured?.width) {
              const parentCenterX = updatedNode.position.x + (updatedNode.measured.width / 2);
              newX = parentCenterX - (childNode.measured.width / 2);
            }

            if (Math.abs(childNode.position.x - newX) > 1 || Math.abs(childNode.position.y - newY) > 1) {
              updatedNodes = [
                ...updatedNodes.slice(0, childIndex),
                { ...childNode, position: { x: newX, y: newY } },
                ...updatedNodes.slice(childIndex + 1),
              ];
            }
          });
        });
      }

      return updatedNodes;
    });
  }, [getEdges]);

  const onEdgesChange = useCallback((changes) => {
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, []);

  // Create new input node when user drags from a handle and releases in empty space
  const onConnectEnd = useCallback((event, connectionState) => {
    // Only create node if connection didn't complete (no target)
    if (connectionState.isValid) return;

    const sourceNode = connectionState.fromNode;
    const sourceHandle = connectionState.fromHandle?.id;

    // Only allow branching from message nodes
    if (!sourceNode || sourceNode.type !== 'messageNode') return;

    // Get drop position in flow coordinates
    const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
    const position = screenToFlowPosition({ x: clientX, y: clientY });

    const newInputNodeId = `input-${++nodeIdCounter}`;

    const newInputNode = {
      id: newInputNodeId,
      type: 'userInputNode',
      position,
      data: {
        input: '',
        placeholder: 'Type your message...',
        onSubmit: (msg) => handleUserMessage(msg, newInputNodeId),
        isSubmitting: false,
        pinned: true, // Part of a branch
        isAnchor: true, // First node in branch - don't auto-reposition
      },
    };

    const newEdge = {
      id: `edge-${++edgeIdCounter}`,
      source: sourceNode.id,
      sourceHandle: sourceHandle,
      target: newInputNodeId,
      targetHandle: 'top',
    };

    setNodes(prev => [...prev, newInputNode]);
    setEdges(prev => [...prev, newEdge]);
  }, [screenToFlowPosition, handleUserMessage]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnectEnd={onConnectEnd}
        fitView
      />
    </div>
  );
}

// Outer component that handles auth and provides ReactFlowProvider
export default function App() {
  const [apiKey, setApiKey] = useState(null);

  useEffect(() => {
    const savedKey = getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleApiKeySubmit = (key) => {
    saveApiKey(key);
    setApiKey(key);
  };

  const handleLogout = () => {
    clearApiKey();
    setApiKey(null);
    nodeIdCounter = 0;
    edgeIdCounter = 0;
  };

  if (!apiKey) {
    return <LandingPage onApiKeySubmit={handleApiKeySubmit} />;
  }

  return (
    <ReactFlowProvider>
      <Flow onLogout={handleLogout} />
    </ReactFlowProvider>
  );
}
