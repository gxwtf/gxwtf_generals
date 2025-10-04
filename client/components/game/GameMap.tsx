import { useGame, useGameDispatch } from '@/context/GameContext';
import useMap from '@/hooks/useMap';
import { Position, SelectedMapTileInfo, TileProp, TileType } from '@/lib/types';
import usePossibleNextMapPositions from '@/lib/use-possible-next-map-positions';
import { getPlayerIndex } from '@/lib/utils';
import { ZoomInMap, ZoomOutMap } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import HomeIcon from '@mui/icons-material/Home';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'next-i18next';
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapTile from './MapTile';
function GameMap() {
  const {
    attackQueueRef,
    socketRef,
    room,
    mapData,
    myPlayerId,
    mapQueueData,
    selectedMapTileInfo,
    initGameInfo,
    turnsCount,
  } = useGame();

  const { t } = useTranslation();

  const isSmallScreen = useMediaQuery('(max-width:600px)');

  const touchAttacking = useRef(false);
  const lastTouchPosition = useRef({ x: -1, y: -1 });

  const touchDragging = useRef(false);
  const touchStartPosition = useRef({ x: 0, y: 0 });
  const initialDistance = useRef(0);
  const lastTouchTime = useRef(0);
  const touchHalf = useRef(false);
  const [showDirections, setShowDirections] = useState(false);

  const toggleDirections = () => {
    setShowDirections(!showDirections);
  };

  const { setSelectedMapTileInfo, halfArmy, clearQueue, popQueue, selectGeneral,

    handlePositionChange, testIfNextPossibleMove,
    handleClick,
    attackUp, attackDown, attackLeft, attackRight } = useGameDispatch();

  const {
    tileSize,
    position,
    mapRef,
    mapPixelWidth,
    mapPixelHeight,
    zoom,
    setZoom,
    handleZoomOption,
    setPosition,
  } = useMap({
    mapWidth: initGameInfo ? initGameInfo.mapWidth : 0,
    mapHeight: initGameInfo ? initGameInfo.mapHeight : 0,
    listenTouch: false, // implement touch later
  });

  const centerGeneral = useCallback(() => {
    if (initGameInfo) {
      const { king } = initGameInfo;
      const pixel_x = Math.floor(mapPixelWidth / 2 - king.x * zoom * tileSize);
      const pixel_y = Math.floor(mapPixelHeight / 2 - king.y * zoom * tileSize);
      setPosition({ x: pixel_y, y: pixel_x });
    }
  }, [
    initGameInfo,
    mapPixelHeight,
    mapPixelWidth,
    zoom,
    tileSize,
    setPosition,
  ]);

  // useEffect(() => {
  //   if (isSmallScreen) {
  //     centerGeneral();
  //   }
  // }, [isSmallScreen, centerGeneral]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      handleZoomOption(event.key);
      switch (event.key) {
        case 'z':
          halfArmy(touchHalf);
          break;
        case 'e':
          popQueue();
          break;
        case 'q':
          clearQueue();
          break;
        case 'g':
          selectGeneral();
          break;
        case 'c':
          setPosition({ x: 0, y: 0 });
          break;
        case 'h': // home
          centerGeneral();
          break;
        case 'a':
        case 'ArrowLeft': // 37 Left
          event.preventDefault();
          attackLeft(selectedMapTileInfo);
          break;
        case 'w':
        case 'ArrowUp': // 38 Up
          event.preventDefault();
          attackUp(selectedMapTileInfo);
          break;
        case 'd':
        case 'ArrowRight': // 39 Right
          event.preventDefault();
          attackRight(selectedMapTileInfo);
          break;
        case 's':
        case 'ArrowDown': // 40 Down
          event.preventDefault();
          attackDown(selectedMapTileInfo);
          break;
      }
    },
    [attackDown, attackLeft, attackRight, attackUp, centerGeneral, clearQueue, halfArmy, handleZoomOption, popQueue, selectGeneral, selectedMapTileInfo, setPosition]
  );

  const myPlayerIndex = useMemo(() => {
    return getPlayerIndex(room, myPlayerId);
  }, [room, myPlayerId]);

  const queueEmpty = mapQueueData.length === 0;

  let displayMapData = mapData.map((tiles, x) => {
    return tiles.map((tile, y) => {
      const [, color] = tile;
      const isOwned = color === room.players[myPlayerIndex].color;
      const _className = queueEmpty ? '' : mapQueueData[x][y].className;

      let tileHalf = false;

      const getIsSelected = () => {
        if (!selectedMapTileInfo) {
          return false;
        }

        if (selectedMapTileInfo.x === x && selectedMapTileInfo.y === y) {
          tileHalf = selectedMapTileInfo.half;
        } else if (mapQueueData.length !== 0 && mapQueueData[x][y].half) {
          tileHalf = true;
        } else {
          tileHalf = false;
        }
        const isSelected = x === selectedMapTileInfo.x && y === selectedMapTileInfo.y;
        return isSelected;
      }
      const isSelected = getIsSelected();

      return {
        tile,
        isOwned,
        _className,
        tileHalf,
        isSelected,
      };
    });
  });

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      // 移除 event.preventDefault() 让点击事件能够正常触发
      // event.preventDefault();

      if (event.touches.length === 1) {
        // touch drag or touch attack
        if (mapRef.current) {
          const touch = event.touches[0];
          const rect = mapRef.current.getBoundingClientRect();
          const y = Math.floor((touch.clientX - rect.left) / (tileSize * zoom));
          const x = Math.floor((touch.clientY - rect.top) / (tileSize * zoom));
          const [tileType, color] = mapData[x][y];
          const isOwned = color === room.players[myPlayerIndex].color;
          const currentTime = new Date().getTime();
          if (!isOwned) {
            touchDragging.current = true;
            touchStartPosition.current = {
              x: event.touches[0].clientX - position.x,
              y: event.touches[0].clientY - position.y,
            };
            // console.log('touch drag at ', x, y);
          } else {
            touchAttacking.current = true;
            // 移除直接的分兵逻辑，让点击事件通过handleClick处理
            // 只记录触摸位置和时间，不直接处理分兵
            // if (
            //   lastTouchPosition.current.x === x &&
            //   lastTouchPosition.current.y === y &&
            //   currentTime - lastTouchTime.current <= 400 // quick double touch 400ms
            // ) {
            //   touchHalf.current = !touchHalf.current;
            // }
            // setSelectedMapTileInfo({
            //   x,
            //   y,
            //   half: touchHalf.current,
            //   unitsCount: 0,
            // });
            lastTouchPosition.current = { x, y };
            // lastTouchTime.current = currentTime;
          }
        }
      } else if (event.touches.length === 2) {
        // zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
          Math.pow(touch1.clientY - touch2.clientY, 2)
        );
        initialDistance.current = distance;
      }
    },
    [mapRef, tileSize, zoom, mapData, room.players, myPlayerIndex, position.x, position.y, setSelectedMapTileInfo]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length === 1) {
        // 单指触摸：处理拖拽和攻击
        
        if (touchDragging.current) {
          // 拖拽非己方区域：移动页面，并阻止浏览器默认滚动行为
          event.preventDefault();
          
          const updatePosition = () => {
            setPosition({
              x: event.touches[0].clientX - touchStartPosition.current.x,
              y: event.touches[0].clientY - touchStartPosition.current.y,
            });
          };
          requestAnimationFrame(updatePosition);
        } else if (touchAttacking.current && mapRef.current) {
          // 拖拽己方区域：移动兵力，不移动页面
          // 这里也需要阻止默认行为，避免页面滚动
          event.preventDefault();
          
          const touch = event.touches[0];
          const rect = mapRef.current.getBoundingClientRect();
          const y = Math.floor((touch.clientX - rect.left) / (tileSize * zoom));
          const x = Math.floor((touch.clientY - rect.top) / (tileSize * zoom));
    
          const dx = x - selectedMapTileInfo.x;
          const dy = y - selectedMapTileInfo.y;
          // check if newPosition is valid
          if (
            (dx === 0 && dy === 0) ||
            (x === lastTouchPosition.current.x &&
              y === lastTouchPosition.current.y)
          ) {
            return;
          }
          if (!mapData) return;
          if (mapData.length === 0) return;
          const [tileType, color] = mapData[x][y];
          // check tileType
          if (
            tileType === TileType.Mountain ||
            tileType === TileType.Obstacle
          ) {
            return;
          }
          // check neighbor
          let direction = '';
          if (dy === 1 && dx === 0) {
            direction = 'right';
          } else if (dy === -1 && dx === 0) {
            direction = 'left';
          } else if (dy === 0 && dx === 1) {
            direction = 'down';
          } else if (dy === 0 && dx === -1) {
            direction = 'up';
          } else {
            // not valid move
            touchAttacking.current = false;
            return;
          }
          // console.log('valid touch move attack', x, y, className);
          touchHalf.current = false;
          const newPoint = { x, y };
          handlePositionChange(selectedMapTileInfo, newPoint, `queue_${direction}`);
          lastTouchPosition.current = newPoint;
        }
      } else if (event.touches.length === 2) {
        // 双指触摸：处理缩放，并阻止浏览器默认的双击缩放行为
        event.preventDefault();
    
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
          Math.pow(touch1.clientY - touch2.clientY, 2)
        );
        const delta = distance - initialDistance.current;
        const newZoom = Math.min(Math.max(zoom + delta * 0.0002, 0.2), 4.0);
        setZoom(newZoom);
      }
    },
    [mapRef, setPosition, tileSize, zoom, selectedMapTileInfo, mapData, handlePositionChange, setZoom]
  );

  // const handleTouchEnd = useCallback((event: TouchEvent) => {
  //   // 如果是单指触摸且没有拖动，则触发点击事件
  //   if (event.touches.length === 0 && !touchDragging.current && touchAttacking.current) {
  //     if (mapRef.current) {
  //       const touch = event.changedTouches[0];
  //       const rect = mapRef.current.getBoundingClientRect();
  //       const y = Math.floor((touch.clientX - rect.left) / (tileSize * zoom));
  //       const x = Math.floor((touch.clientY - rect.top) / (tileSize * zoom));
  //       const [tileType, color] = mapData[x][y];

  //       // 模拟点击事件，调用handleClick函数
  //       handleClick([tileType, color, 0], x, y, myPlayerIndex);
  //     }
  //   }

  //   touchAttacking.current = false;
  //   touchDragging.current = false;
  // }, [mapRef, tileSize, zoom, mapData, myPlayerIndex, handleClick]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // 如果是单指触摸且没有拖动，则应该触发点击事件
    // 点击事件会通过正常的onClick处理流程，包括分兵逻辑
    if (event.touches.length === 0 && !touchDragging.current && touchAttacking.current) {
      // 这里不需要手动调用handleClick，因为触摸事件结束后
      // 浏览器会自动触发click事件，由MapTile的onClick处理
    }

    touchAttacking.current = false;
    touchDragging.current = false;
  }, []);


  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.addEventListener('keydown', handleKeyDown);
      return () => {
        mapNode.removeEventListener('keydown', handleKeyDown);
      };
    }
    return () => { };
  }, [handleKeyDown, mapRef]);

  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.focus(); // 只在地图初始化的时候自动 focus 一次
    }
    return () => { };
  }, []);

  useEffect(() => {
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.addEventListener('touchstart', handleTouchStart, {
        passive: true, // 改为 true 让点击事件能够正常触发
      });
      mapNode.addEventListener('touchmove', handleTouchMove, {
        passive: false, // 改为 false 以便在双指缩放时调用 preventDefault()
      });
      mapNode.addEventListener('touchend', handleTouchEnd);
      return () => {
        mapNode.removeEventListener('touchstart', handleTouchStart);
        mapNode.removeEventListener('touchmove', handleTouchMove);
        mapNode.removeEventListener('touchend', handleTouchEnd);
      };
    }
    return () => { };
  }, [mapRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div>
      <div
        ref={mapRef}
        tabIndex={0}
        onBlur={() => {
          // TODO: inifite re-render loop. 
          // when surrender or game over dialog is shown. onBlur will execute, it set SelectedMapTile so a re-render is triggered. in the next render, onBlur execute again
          // setSelectedMapTileInfo({ x: -1, y: -1, half: false, unitsCount: 0 });
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
          width: mapPixelHeight, // game's width and height are swapped
          height: mapPixelWidth,
        }}
      >
        {/* map key (x,y) example */}
        {/* 0,0 / 0, 1 */}
        {/* 1,0 / 1, 1 */}
        {displayMapData.map((tiles, x) => {
          return tiles.map((tile, y) => {
            return (
              <div key={`${x}/${y}`}
                onClick={() => {
                  handleClick(tile.tile, x, y, myPlayerIndex,lastTouchTime.current);
                  lastTouchTime.current=new Date().getTime();
                }}>
                <MapTile
                  isNextPossibleMove={testIfNextPossibleMove(tile.tile[0], x, y)}
                  zoom={zoom}
                  size={tileSize}
                  x={x}
                  y={y}
                  {...tile}
                  warringStatesMode={room.warringStatesMode} />
              </div>
            );
          });
        })}
      </div>
      {isSmallScreen && (
        <Box
          className='menu-container'
          sx={{
            margin: 0,
            padding: '1px !important',
            position: 'absolute',
            left: '5px',
            bottom: { xs: '65px', md: '80px' },
            display: 'flex',
            justifyContent: 'space-between',
            alignContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '2',
          }}
        >
          <Tooltip title={t('howToPlay.centerGeneral')} placement='top'>
            <IconButton onClick={centerGeneral}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('howToPlay.undoMove')} placement='top'>
            <IconButton onClick={popQueue}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('howToPlay.clearQueuedMoves')} placement='top'>
            <IconButton onClick={clearQueue}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('howToPlay.toggle50')} placement='top'>
            <IconButton onClick={() => halfArmy(touchHalf)}>
              <Typography variant='body2'>50%</Typography>
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={() => {
              setZoom((z) => z - 0.2);
            }}
          >
            <ZoomInMap />
          </IconButton>
          <IconButton
            onClick={() => {
              setZoom((z) => z + 0.2);
            }}
          >
            <ZoomOutMap />
          </IconButton>
          <Tooltip title={t('expandWSAD')} placement='top'>
            <IconButton onClick={toggleDirections}>
              {showDirections ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {showDirections && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: '5px',
            position: 'absolute',
            right: '10px',
            bottom: { xs: '65px', md: '80px' },
            zIndex: 1000,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <IconButton onClick={() => attackUp(selectedMapTileInfo)} className='attack-button'>
              <ArrowUpwardIcon />
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: {
                  xs: '40vw',
                  md: '20vw',
                  lg: '20vw',
                },
                justifyContent: 'space-between',
              }}
            >
              <IconButton onClick={() => attackLeft(selectedMapTileInfo)} className='attack-button'>
                <ArrowBackIcon />
              </IconButton>
              <IconButton onClick={() => attackRight(selectedMapTileInfo)} className='attack-button'>
                <ArrowForwardIcon />
              </IconButton>
            </Box>
            <IconButton onClick={() => attackDown(selectedMapTileInfo)} className='attack-button'>
              <ArrowDownwardIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </div>
  );
}

export default GameMap;