import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useCanvasStore } from '../store';
import { websocketService } from '../services/websocketService';
import '../styles/LayerManager.css';

const ItemType = 'LAYER_ITEM';

interface LayerItemProps {
  id: string;
  label: string;
  index: number;
  moveLayer: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  isOwner: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({ id, label, index, moveLayer, onDrop, isOwner }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveLayer(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    drop() {
        onDrop();
    }
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));
          
  const opacity = isDragging ? 0.4 : 1;

  return (
    <div
      ref={ref}
      className="layer-item"
      style={{ opacity }}
      data-handler-id={handlerId}
    >
      <div className="layer-item-content">
        <span 
          className="layer-item-badge" 
          style={{ 
            backgroundColor: id === 'local' ? '#4CAF50' : (isOwner ? '#FFC107' : '#2196F3')
          }}
        ></span>
        <span className="layer-item-label">
          {label}
        </span>
      </div>
      <span className="layer-item-handle">≡</span>
    </div>
  );
};

export const LayerManager: React.FC<{ isOwner: boolean }> = ({ isOwner }) => {
  const layerOrder = useCanvasStore(state => state.layerOrder);
  const setLayerOrder = useCanvasStore(state => state.setLayerOrder);
  const onlineUsers = useCanvasStore(state => state.onlineUsers);
  
  // Ensure layerOrder contains all onlineUsers (except maybe 'local' if it's handled separately)
  // Actually, CanvasMain handles syncing layerOrder with onlineUsers.
  // But we should ensure consistency here too?
  // If I rely on CanvasMain, I don't need this effect.
  // But let's keep a safety check: if 'local' is missing, add it.
  
  React.useEffect(() => {
      if (!layerOrder.includes('local')) {
           setLayerOrder([...layerOrder, 'local']);
      }
  }, [layerOrder, setLayerOrder]);

  const moveLayer = React.useCallback((dragIndex: number, hoverIndex: number) => {
    // Convert visual indices (Top-to-Bottom) to real indices (Bottom-to-Top)
    // Visual Index 0 = Top Layer = Real Index (Length - 1)
    const length = layerOrder.length;
    const realDragIndex = length - 1 - dragIndex;
    const realHoverIndex = length - 1 - hoverIndex;

    const dragLayer = layerOrder[realDragIndex];
    const newLayerOrder = [...layerOrder];
    newLayerOrder.splice(realDragIndex, 1);
    newLayerOrder.splice(realHoverIndex, 0, dragLayer);
    setLayerOrder(newLayerOrder);
  }, [layerOrder, setLayerOrder]);

  const handleDrop = React.useCallback(() => {
      // Sync change
      websocketService.sendLayerOrder(useCanvasStore.getState().layerOrder);
  }, []);

  const getLabel = (id: string) => {
    if (id === 'local') {
        const myId = websocketService.getUserId();
        const me = onlineUsers.find(u => u.userId === myId);
        // console.log('me', me);
        return me ? `${me.userName} (Me)` : 'Me (Local)';
    }
    const user = onlineUsers.find(u => u.userId === id);
    return user ? user.userName : `User: ${id.slice(0, 6)}...`;
  };

  // Reverse layerOrder for display (Top Layer at Top of List)
  const displayLayers = [...layerOrder].reverse();

  return (
    <div className="layer-manager-container">
      <div className="layer-manager-header">
          <span>画布层级 ({displayLayers.length})</span>
      </div>
      {displayLayers.map((id, index) => (
        <LayerItem
          key={id}
          index={index}
          id={id}
          label={getLabel(id)}
          moveLayer={moveLayer}
          onDrop={handleDrop}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
};         
