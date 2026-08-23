import type { ComponentProps } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultAudioLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import {
  MuteIcon,
  PauseIcon,
  PlayIcon,
  SeekBackwardIcon,
  SeekForwardIcon,
  VolumeHighIcon,
  VolumeLowIcon,
} from "@features/media/playerIcons";
import styles from "@features/media/CourseMedia.module.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";

type PlayerSrc = NonNullable<ComponentProps<typeof MediaPlayer>["src"]>;

const icons = {
  ...defaultLayoutIcons,
  PlayButton: { Play: PlayIcon, Pause: PauseIcon, Replay: PlayIcon },
  MuteButton: { Mute: MuteIcon, VolumeLow: VolumeLowIcon, VolumeHigh: VolumeHighIcon },
  SeekButton: { Backward: SeekBackwardIcon, Forward: SeekForwardIcon },
};

export interface InspectorPlayerProps {
  readonly src: string;
  readonly type: string;
  readonly title: string;
}

export function InspectorPlayer({ src, type, title }: InspectorPlayerProps) {
  const source = { src, type } as unknown as PlayerSrc;
  return (
    <MediaPlayer className={styles.player} src={source} viewType="audio" title={title} playsInline>
      <MediaProvider />
      <DefaultAudioLayout icons={icons} smallLayoutWhen={false} slots={{ settingsMenu: null }} />
    </MediaPlayer>
  );
}
