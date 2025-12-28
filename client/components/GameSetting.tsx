import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Button,
  IconButton,
  Tab,
  Tabs,
  Typography,
  TextField,
  FormGroup,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ClearIcon from '@mui/icons-material/Clear';
import ShareIcon from '@mui/icons-material/Share';
import TerrainIcon from '@mui/icons-material/Terrain';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import WaterIcon from '@mui/icons-material/Water';
import GroupIcon from '@mui/icons-material/Group';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'next-i18next';

import SliderBox from './SliderBox';
import PlayerTable from './PlayerTable';
import MapExplorer from './game/MapExplorer';

import { forceStartOK, MaxTeamNum, SpeedOptions } from '@/lib/constants';
import { useGame, useGameDispatch } from '@/context/GameContext';

interface GameSettingProps { }

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  '& .MuiToggleButtonGroup-grouped': {
    margin: theme.spacing(0.5),
    border: 0,
    '&.Mui-disabled': {
      border: 0,
    },
    '&:not(:first-of-type)': {
      borderRadius: theme.shape.borderRadius,
    },
    '&:first-of-type': {
      borderRadius: theme.shape.borderRadius,
    },
  },
}));

const GameSetting: React.FC<GameSettingProps> = (props) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isNameFocused, setIsNamedFocused] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [forceStart, setForceStart] = useState(false);
  const [openMapExplorer, setOpenMapExplorer] = useState(false);

  const [availableBotTypes, setAvailableBotTypes] = useState<string[]>([]);
  const [botError, setBotError] = useState<string>('');

  const { room, socketRef, myPlayerId, myUserName, team } = useGame();
  const { roomDispatch, snackStateDispatch } = useGameDispatch();

  const { t } = useTranslation();

  const router = useRouter();

  const BOT_SERVER_URL = process.env.NEXT_PUBLIC_BOT_SERVER_URL || 'http://localhost:1214';

  // 检查是否所有人类玩家都是观战者（以 team === MaxTeamNum + 1 为准）
  // spectator = team === MaxTeamNum + 1
  const isAllHumanSpectators = (() => {
    if (!room.players || room.players.length === 0) return false;

    const humanPlayers = room.players.filter(player => !player.isBot);
    if (humanPlayers.length === 0) return false;

    const result = humanPlayers.every(player => {
      // 兼容老逻辑：如果服务器有 spectating 字段也一起判断
      return player.team === MaxTeamNum + 1 || player.spectating;
    });


    return result;
  })();

  // 检查当前玩家是否是房主
  const isHost = useMemo(() => {
    if (!myPlayerId || !room.players) return false;

    const myPlayer = room.players.find(player => player.id === myPlayerId);
    const result = myPlayer ? myPlayer.isRoomHost : false;


    return result;
  }, [myPlayerId, room.players]);

  // 计算非观战玩家数量（包括AI）
  const nonSpectatingPlayersCount = useMemo(() => {
    const count = room.players.filter(player => !player.spectating).length;


    return count;
  }, [room.players]);

  // 统计作为 player 的机器人数量（严格按 team 判断 spectator）
  const botPlayerCount = useMemo(() => {
    if (!room.players || room.players.length === 0) return 0;

    const count = room.players.filter(player =>
      player.isBot && (player.team !== MaxTeamNum + 1) && !player.spectating
    ).length;

    return count;
  }, [room.players]);

  // 特殊开始按钮逻辑：当所有人类都是观战者且当前玩家是房主时显示开始按钮
  const showSpecialStartButton = isAllHumanSpectators && isHost;

  // 特殊开始按钮的启用条件：作为 player 的 bot 数量 > 1
  const isSpecialStartButtonEnabled = botPlayerCount > 1;

  // 调试特殊开始按钮的最终状态
  useEffect(() => {
    console.log('isAllHumanSpectators:', isAllHumanSpectators);
    console.log('isHost:', isHost);
    console.log('showSpecialStartButton:', showSpecialStartButton);
    console.log('nonSpectatingPlayersCount:', nonSpectatingPlayersCount);
    console.log('botPlayerCount:', botPlayerCount);
    console.log('isSpecialStartButtonEnabled:', isSpecialStartButtonEnabled);
  }, [isAllHumanSpectators, isHost, showSpecialStartButton, nonSpectatingPlayersCount, isSpecialStartButtonEnabled, team, botPlayerCount]);

  // 获取可用的机器人种类
  const fetchBotTypes = useCallback(async () => {
    try {
      const response = await fetch(`${BOT_SERVER_URL}/type/`);
      if (!response.ok) throw new Error('Failed to fetch bot types');
      const data = await response.json();
      setAvailableBotTypes(data.bot_types || []);
      setBotError('');
    } catch (error) {
      setBotError('机器人服务器连接失败');
      console.error('Error fetching bot types:', error);
    }
  }, [BOT_SERVER_URL]);

  // 添加机器人
  const handleAddBot = async (botType: string) => {
    try {
      const response = await fetch(`${BOT_SERVER_URL}/add/?roomId=${room.id}&type=${botType}`);
      if (response.ok) {
        snackStateDispatch({
          type: 'update',
          title: '',
          message: `${t('bot-added-success')} ${botType}`,
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error('Failed to add bot');
      }
    } catch (error) {
      snackStateDispatch({
        type: 'update',
        title: '',
        message: `${t('bot-add-failed')} ${botType}`,
        status: 'error',
        duration: 2000,
      });
      console.error('Error adding bot:', error);
    }
  };

  // 移除机器人
  const handleRemoveBot = async (botType: string) => {
    try {
      const response = await fetch(`${BOT_SERVER_URL}/remove/?roomId=${room.id}&type=${botType}`);
      if (response.ok) {
        snackStateDispatch({
          type: 'update',
          title: '',
          message: `${t('bot-removed-success')} ${botType}`,
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error('Failed to remove bot');
      }
    } catch (error) {
      snackStateDispatch({
        type: 'update',
        title: '',
        message: `${t('bot-remove-failed')} ${botType}`,
        status: 'error',
        duration: 2000,
      });
      console.error('Error removing bot:', error);
    }
  };

  // 删除整个房间的所有机器人
  const handleRemoveAllBots = async () => {
    try {
      const response = await fetch(`${BOT_SERVER_URL}/remove/?roomId=${room.id}`);
      if (response.ok) {
        snackStateDispatch({
          type: 'update',
          title: '',
          message: t('all-bots-removed-success'),
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error('Failed to remove all bots');
      }
    } catch (error) {
      snackStateDispatch({
        type: 'update',
        title: '',
        message: t('all-bots-remove-failed'),
        status: 'error',
        duration: 2000,
      });
      console.error('Error removing all bots:', error);
    }
  };

  // 初始化时获取机器人数据
  useEffect(() => {
    if (room.id) {
      fetchBotTypes();
    }
  }, [room.id, fetchBotTypes]);

  useEffect(() => {
    setShareLink(window.location.href);
  }, []);

  const handleRoomNameBlur = (event: any) => {
    setIsNamedFocused(false);
    let name = room.roomName;

    const regex = /^[\s\u200B]+$/;
    if (!name || name === '' || regex.test(name)) {
      name = 'Untitled';
      roomDispatch({
        type: 'update_property',
        payload: {
          property: 'roomName',
          value: name,
        },
      });
    }
    socketRef.current.emit('change_room_setting', 'roomName', name);
  };

  const handleTeamChange = (_: Event, newTeam: any) => {
    socketRef.current.emit('set_team', newTeam);
  };

  const handleOpenMapExplorer = () => {
    setOpenMapExplorer(true);
  };

  const handleCloseMapExplorer = () => {
    setOpenMapExplorer(false);
  };

  const clearRoomMap = () => {
    socketRef.current.emit('change_room_setting', 'mapId', '');
  };

  const handleMapSelect = (mapId: string) => {
    socketRef.current.emit('change_room_setting', 'mapId', mapId);
    setOpenMapExplorer(false);
  };

  const handleClickForceStart = () => {
    // 如果是特殊开始模式（所有人类都是观战者且当前玩家是房主），直接开始游戏
    if (showSpecialStartButton) {
      console.log('=== 特殊开始模式 ===');
      console.log('所有人类都是观战者，跳过正常force start检测');
      console.log('机器人玩家数量:', botPlayerCount);
      console.log('直接开始游戏...');

      // 在特殊模式下，服务器会自动处理开始条件
      // 根据服务器逻辑：没有人类玩家但有多个机器人时，forceStartNum = 0，满足开始条件
      socketRef.current.emit('force_start');
    } else {
      // 正常逻辑：切换准备状态，需要满足force start条件
      console.log('=== 正常开始模式 ===');
      console.log('切换准备状态，等待force start条件满足');
      setForceStart(!forceStart);
      socketRef.current.emit('force_start');
    }
  };

  const disabled_ui: boolean = useMemo(() => {
    // when player is not host
    if (myPlayerId && room.players) {
      for (let i = 0; i < room.players.length; ++i) {
        if (room.players[i].id === myPlayerId) {
          return !room.players[i].isRoomHost;
        }
      }
    }
    return true;
  }, [myPlayerId, room]);

  const handleRoomNameChange = (event: any) => {
    roomDispatch({
      type: 'update_property',
      payload: {
        property: 'roomName',
        value: event.target.value,
      },
    });
  };

  const handleSettingChange =
    (property: string) => (event: Event, newValue: any) => {
      console.log(`change_room_setting: ${property}, ${newValue}`);
      if (property === 'gameSpeed') newValue = Number.parseFloat(newValue);
      roomDispatch({
        type: 'update_property',
        payload: {
          property: property,
          value: newValue,
        },
      });
      socketRef.current.emit('change_room_setting', property, newValue);
    };
  const handleChangeHost = (playerId: string, username: string) => {
    console.log(`change host to ${username}, id ${playerId}`);
    socketRef.current.emit('change_host', playerId);
  };

  const handleLeaveRoom = () => {
    console.log('Leave Room');
    socketRef.current.disconnect();
    router.push(`/`);
  };

  return (
    <Box
      sx={{
        width: {
          xs: '90vw',
          md: '55vw',
          lg: '45vw',
        },
      }}
    >
      <Dialog open={openMapExplorer} onClose={handleCloseMapExplorer}>
        <DialogTitle>Choose a Map</DialogTitle>
        <DialogContent>
          <MapExplorer userId={myUserName} onSelect={handleMapSelect} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMapExplorer}>Close</Button>
        </DialogActions>
      </Dialog>

      <Card
        className='menu-container'
        sx={{
          boxShadow: 'unset',
          mb: 1,
          '& .MuiCardHeader-root': {
            padding: '0.6rem',
          },
        }}
      >
        <CardHeader
          avatar={
            <IconButton onClick={handleLeaveRoom} color='primary'>
              <ArrowBackRoundedIcon />
            </IconButton>
          }
          title={
            !isNameFocused || disabled_ui ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  zIndex: 100,
                }}
                onClick={() => {
                  !disabled_ui && setIsNamedFocused(true);
                }}
              >
                <Typography fontWeight='bold' color='primary' fontSize='20px'>
                  {room.roomName}
                </Typography>
              </div>
            ) : (
              <TextField
                autoFocus
                variant='standard'
                inputProps={{ style: { fontSize: '20px' } }}
                value={room.roomName}
                onChange={handleRoomNameChange}
                onBlur={handleRoomNameBlur}
                disabled={disabled_ui}
              />
            )
          }
          action={
            <IconButton
              color='primary'
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                snackStateDispatch({
                  type: 'update',
                  title: '',
                  message: t('copied'),
                  status: 'success',
                  duration: 3000,
                });
              }}
            >
              <ShareIcon />
            </IconButton>
          }
          sx={{ padding: 'sm' }}
        />
        <CardContent
          className='menu-container'
          sx={{
            p: 0,
            '&:last-child': { pb: 0 },
          }}
        >
          {disabled_ui && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant='caption' align='center'>
                {t('not-host')}
              </Typography>
            </Box>
          )}
          {room.mapName && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant='h6'
                color='primary'
                sx={{ mr: 2, whiteSpace: 'nowrap' }}
                align='center'
                component={Link}
                href={`/maps/${room.mapId}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('custom-map')}: {room.mapName}
              </Typography>
              {!disabled_ui && (
                <IconButton onClick={clearRoomMap}>
                  <ClearIcon />
                </IconButton>
              )}
            </Box>
          )}
          <Tabs
            value={tabIndex}
            onChange={(event, value) => setTabIndex(value)}
            variant='scrollable'
            indicatorColor='primary'
            scrollButtons
            allowScrollButtonsMobile
            textColor='inherit'
            aria-label='game settings tabs'
          >
            <Tab label={t('team')} />
            <Tab label={t('game')} />
            <Tab label={t('map')} />
            <Tab label={t('terrain')} />
            <Tab label={t('modifiers')} />
            <Tab label={t('bot')} />
          </Tabs>
          <TabPanel value={tabIndex} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
              <Typography
                sx={{
                  mr: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('select-your-team')}
              </Typography>
              <StyledToggleButtonGroup
                color='primary'
                value={team}
                exclusive
                // @ts-ignore
                onChange={handleTeamChange}
                aria-label='select-team'
                sx={{ maxWidth: '100%', overflowX: 'auto' }}
              >
                {Array.from({ length: MaxTeamNum }, (_, i) => i + 1).map(
                  (value) => (
                    <ToggleButton key={value} value={value}>
                      <Typography>{value}</Typography>
                    </ToggleButton>
                  )
                )}
                <ToggleButton key={MaxTeamNum + 1} value={MaxTeamNum + 1}>
                  <Typography>spectators</Typography>
                </ToggleButton>
              </StyledToggleButtonGroup>
            </Box>
          </TabPanel>
          <TabPanel value={tabIndex} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
              <Button
                variant='contained'
                disabled={disabled_ui}
                onClick={handleOpenMapExplorer}
              >
                {t('select-a-custom-map')}
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  my: 1,
                }}
              >
                <Typography
                  sx={{
                    mr: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('game-speed')}
                </Typography>
                <ToggleButtonGroup
                  color='primary'
                  value={room.gameSpeed}
                  exclusive
                  // @ts-ignore
                  onChange={handleSettingChange('gameSpeed')}
                  aria-label='game-speed'
                  disabled={disabled_ui}
                >
                  {SpeedOptions.map((value) => (
                    <ToggleButton key={value} value={value}>
                      <Typography>{`${value}x`}</Typography>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            </Box>
          </TabPanel>
          <TabPanel value={tabIndex} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <SliderBox
                label={t('height')} // game's width and height is reversed
                value={room.mapWidth}
                disabled={disabled_ui}
                handleChange={handleSettingChange('mapWidth')}
              />
              <SliderBox
                label={t('width')} // game's width and height is reversed
                value={room.mapHeight}
                disabled={disabled_ui}
                handleChange={handleSettingChange('mapHeight')}
              />
            </Box>
          </TabPanel>
          <TabPanel value={tabIndex} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <SliderBox
                label={t('mountain')}
                value={room.mountain}
                disabled={disabled_ui}
                handleChange={handleSettingChange('mountain')}
                icon={<TerrainIcon />}
              />
              <SliderBox
                label={t('city')}
                value={room.city}
                disabled={disabled_ui}
                handleChange={handleSettingChange('city')}
                icon={<LocationCityIcon />}
              />
              <SliderBox
                label={t('swamp')}
                value={room.swamp}
                disabled={disabled_ui}
                handleChange={handleSettingChange('swamp')}
                icon={<WaterIcon />}
              />
            </Box>
          </TabPanel>
          <TabPanel value={tabIndex} index={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <SliderBox
                label={t('max-player-num')}
                value={room.maxPlayers}
                valueLabelDisplay='auto'
                disabled={disabled_ui}
                min={2}
                max={12}
                step={1}
                marks={Array.from({ length: 11 }, (_, i) => ({
                  value: i + 2,
                  label: `${i + 2}`,
                }))}
                handleChange={handleSettingChange('maxPlayers')}
              />
              <FormGroup sx={{ display: 'flex', flexDirection: 'row' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={room.fogOfWar}
                      // @ts-ignore
                      onChange={handleSettingChange('fogOfWar')}
                      disabled={disabled_ui}
                    />
                  }
                  label={t('fog-of-war')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={room.revealKing}
                      // @ts-ignore
                      onChange={handleSettingChange('revealKing')}
                      disabled={disabled_ui}
                    />
                  }
                  label={t('reveal-king')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={room.deathSpectator}
                      // @ts-ignore
                      onChange={handleSettingChange('deathSpectator')}
                      disabled={disabled_ui}
                    />
                  }
                  label={t('death-spectator')}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={room.warringStatesMode}
                      // @ts-ignore
                      onChange={handleSettingChange('warringStatesMode')}
                      disabled={disabled_ui}
                    />
                  }
                  label={t('warring-states-mode')}
                />
              </FormGroup>
            </Box>
          </TabPanel>
          <TabPanel value={tabIndex} index={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {botError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {botError}
                </Alert>
              )}
              <Typography
                sx={{
                  mr: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('available-bot-types')}
              </Typography>
              {availableBotTypes.length > 0 ? (
                <List dense>
                  {availableBotTypes.map((botType, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={botType} />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            edge="end"
                            onClick={() => handleAddBot(botType)}
                            disabled={disabled_ui}
                          >
                            <AddIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveBot(botType)}
                            disabled={disabled_ui}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {/* 移除全部机器人按钮 */}
                  <ListItem>
                    <ListItemText primary={t('remove-all-bots')} />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={handleRemoveAllBots}
                        disabled={disabled_ui || botPlayerCount === 0}
                        color="error"
                        title={t('remove-all-bots')}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              ) : (
                <Typography
                  sx={{
                    mr: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('no-bots-available')}
                </Typography>
              )}
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
      <Card
        className='menu-container'
        sx={{
          boxShadow: 'unset',
          mb: 2,
          '& .MuiCardHeader-root': {
            paddingTop: '0rem',
          },
        }}
      >
        <CardHeader
          avatar={<GroupIcon color='primary' />}
          title={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography color='primary' fontWeight='bold'>
                {t('players')}
              </Typography>
            </Box>
          }
          sx={{ padding: 'sm' }}
        />
        <CardContent
          sx={{
            padding: 0,
            '&:last-child': { pb: 0 },
          }}
        >
          <PlayerTable
            myPlayerId={myPlayerId}
            players={room.players}
            handleChangeHost={handleChangeHost}
            disabled_ui={disabled_ui}
            warringStatesMode={room.warringStatesMode}
          />
        </CardContent>
      </Card>
      <Button
        variant='contained'
        color={
          showSpecialStartButton
            ? 'primary'  // 特殊开始按钮使用主色调
            : (forceStart ? 'primary' : 'secondary')  // 正常准备按钮逻辑
        }
        disabled={
          // 特殊逻辑：当所有人类都是观战者时，只有房主可以点击开始按钮
          showSpecialStartButton
            ? !isSpecialStartButtonEnabled  // 人机数量大于1时启用，等于1时禁用
            : team === MaxTeamNum + 1  // 正常逻辑：观战者禁用
        }
        size='large'
        sx={{
          width: '100%',
          height: '60px',
          fontSize: '20px',
        }}
        onClick={handleClickForceStart}
      >
        {showSpecialStartButton
          ? t('start-game')  // 特殊开始按钮始终显示"开始游戏"
          : t('ready')
        }(
        {showSpecialStartButton
          ? nonSpectatingPlayersCount  // 特殊开始按钮显示总玩家数
          : room.players.filter((player) => !player.spectating && player.forceStart).length
        }/
        {
          // 显示包括AI玩家在内的总玩家数
          room.players.filter((player) => !player.spectating).length
        }
        )
      </Button>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      ></Box>
    </Box>
  );
};

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: '1rem' }}>{children}</Box>}
    </div>
  );
}

export default GameSetting;