import { useRouter } from "next/router";
import React, { useRef } from "react";
import { useCurrentRoomIdStore } from "../../global-stores/useCurrentRoomIdStore";
import { useMuteStore } from "../../global-stores/useMuteStore";
import { useDeafStore } from "../../global-stores/useDeafStore";
import { SolidDeafened, SolidDeafenedOff, SolidMicrophone } from "../../icons";
import SvgSolidMicrophoneOff from "../../icons/SolidMicrophoneOff";
import { useCurrentRoomInfo } from "../../shared-hooks/useCurrentRoomInfo";
import { useSetMute } from "../../shared-hooks/useSetMute";
import { useSetDeaf } from "../../shared-hooks/useSetDeaf";
import { useTypeSafeQuery } from "../../shared-hooks/useTypeSafeQuery";
import { BoxedIcon } from "../../ui/BoxedIcon";
import { MultipleUsers } from "../../ui/UserAvatar";
import { a, useSpring, config } from "react-spring";
import { useDrag } from "react-use-gesture";
import { useBoundingClientRect } from "../../shared-hooks/useBoundingClientRect";
import { useLeaveRoom } from "../../shared-hooks/useLeaveRoom";

interface MinimizedRoomCardControllerProps {}

export const FloatingRoomInfo: React.FC<MinimizedRoomCardControllerProps> = () => {
  const { currentRoomId } = useCurrentRoomIdStore();
  const { data } = useTypeSafeQuery(
    ["joinRoomAndGetInfo", currentRoomId!],
    { enabled: !!currentRoomId },
    [currentRoomId!]
  );
  const { canSpeak } = useCurrentRoomInfo();
  const { muted } = useMuteStore();
  const setMute = useSetMute();
  const { deafened } = useDeafStore();
  const setDeaf = useSetDeaf();
  const router = useRouter();
  const { leaveRoom } = useLeaveRoom();

  const [{ y }, api] = useSpring(() => ({ y: 0 }));
  const floatingRef = useRef(null);
  const bbox = useBoundingClientRect(floatingRef);

  const close = () => {
    api({
      y: bbox ? bbox.height : 60,
      immediate: false,
      config: { ...config.default },
      onRest: () => leaveRoom(),
    });
  };

  const bind = useDrag(
    ({ last, down, movement: [, my] }) => {
      api.start({
        y: down ? my : 0,
        config: { mass: 1, tension: 500, friction: 50 },
      });

      if (last && bbox) {
        if (y.get() > bbox.height / 3) {
          close();
        }
      }
    },
    {
      axis: "y",
      bounds: {
        top: 0,
        left: 0,
        right: 0,
      },
      useTouch: true,
    }
  );

  if (!data || "error" in data) {
    return null;
  }

  const { room } = data;

  const avatars =
    "peoplePreviewList" in room
      ? room.peoplePreviewList
          .map((x) => x.avatarUrl!)
          .slice(0, 2)
          .filter((x) => x !== null)
      : [];

  const bgStyles = {
    opacity: y.to([0, bbox ? bbox.height : 60], [1, 0], "clamp"),
  };

  return (
    <a.div
      data-testid="floating-room-container"
      className="flex fixed left-0 bg-primary-900 items-center w-full border-t border-primary-700 px-3 justify-between animate-breathe-slow"
      style={{
        bottom: 60,
        zIndex: 9,
        y,
        ...bgStyles,
      }}
      {...bind()}
      ref={floatingRef}
    >
      <div className="flex overflow-hidden">
        <div className="mr-2">
          <MultipleUsers srcArray={avatars} />
        </div>
        <button
          onClick={() => {
            router.push(`/room/${room.id}`);
          }}
          style={{ minWidth: 100 }}
          className="truncate text-primary-100 text-left font-bold mr-3"
        >
          {room.name}
        </button>
      </div>

      <div className="flex py-2 overflow-hidden">
        {canSpeak ? (
          <BoxedIcon
            data-testid="mute"
            hover
            onClick={() => {
              setMute(!muted);
            }}
            className={`w-7 mr-2 ${
              !muted && !deafened ? "bg-accent text-button" : ""
            }`}
          >
            {muted || deafened ? (
              <SvgSolidMicrophoneOff />
            ) : (
              <SolidMicrophone />
            )}
          </BoxedIcon>
        ) : null}
        <BoxedIcon
          data-testid="deafen"
          hover
          onClick={() => {
            setDeaf(!deafened);
          }}
          className={`w-7 ${deafened ? "bg-accent" : ""}`}
        >
          {deafened ? <SolidDeafenedOff /> : <SolidDeafened />}
        </BoxedIcon>
      </div>
    </a.div>
  );
};
