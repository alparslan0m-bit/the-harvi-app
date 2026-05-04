import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import React, { useMemo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";

interface AvatarProps { size?: number }

interface Cfg {
  seed: string;
  skinColor: string[];
  top: string[];
  hairColor: string[];
  bg: string;
}

const CFGS: Record<string, Cfg> = {
  male_light: {
    seed: "harvi-male-light",
    skinColor: ["ffdbb4"],
    top: ["shortHairShortFlat"],
    hairColor: ["2c1b18"],
    bg: "#EFF6FF",
  },
  male_medium: {
    seed: "harvi-male-medium",
    skinColor: ["d08b5b"],
    top: ["shortHairShortWaved"],
    hairColor: ["724133"],
    bg: "#F0FDF4",
  },
  male_dark: {
    seed: "harvi-male-dark",
    skinColor: ["614335"],
    top: ["shortHairDreads01"],
    hairColor: ["2c1b18"],
    bg: "#FFF7ED",
  },
  female_light: {
    seed: "harvi-female-light",
    skinColor: ["ffdbb4"],
    top: ["longHairBun"],
    hairColor: ["2c1b18"],
    bg: "#FDF4FF",
  },
  female_medium: {
    seed: "harvi-female-medium",
    skinColor: ["d08b5b"],
    top: ["longHairCurvy"],
    hairColor: ["b58143"],
    bg: "#FFF1F2",
  },
  female_dark: {
    seed: "harvi-female-dark",
    skinColor: ["614335"],
    top: ["longHairFro"],
    hairColor: ["2c1b18"],
    bg: "#F0FDFA",
  },
};

function DoctorAvatar({ id, size = 80 }: { id: string; size: number }) {
  const cfg = CFGS[id];

  const xml = useMemo(() => {
    if (!cfg) return "";
    return createAvatar(avataaars, {
      seed: cfg.seed,
      skinColor: cfg.skinColor,
      top: cfg.top,
      hairColor: cfg.hairColor,
      clothing: ["blazerAndShirt"],
      clothesColor: ["ffffff"],
      eyes: ["default"],
      eyebrows: ["defaultNatural"],
      mouth: ["smile"],
      backgroundColor: [cfg.bg.replace("#", "")],
    }).toString();
  }, [id]);

  if (!xml) return null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        overflow: "hidden",
        backgroundColor: cfg.bg,
      }}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

export function MaleDoctorLight({ size = 80 }: AvatarProps)    { return <DoctorAvatar id="male_light"    size={size} />; }
export function MaleDoctorMedium({ size = 80 }: AvatarProps)   { return <DoctorAvatar id="male_medium"   size={size} />; }
export function MaleDoctorDark({ size = 80 }: AvatarProps)     { return <DoctorAvatar id="male_dark"     size={size} />; }
export function FemaleDoctorLight({ size = 80 }: AvatarProps)  { return <DoctorAvatar id="female_light"  size={size} />; }
export function FemaleDoctorMedium({ size = 80 }: AvatarProps) { return <DoctorAvatar id="female_medium" size={size} />; }
export function FemaleDoctorDark({ size = 80 }: AvatarProps)   { return <DoctorAvatar id="female_dark"   size={size} />; }

export type AvatarId =
  | "male_light" | "male_medium" | "male_dark"
  | "female_light" | "female_medium" | "female_dark";

export const AVATARS: { id: AvatarId; label: string; component: React.FC<AvatarProps> }[] = [
  { id: "male_light",    label: "Doctor", component: MaleDoctorLight    },
  { id: "male_medium",   label: "Doctor", component: MaleDoctorMedium   },
  { id: "male_dark",     label: "Doctor", component: MaleDoctorDark     },
  { id: "female_light",  label: "Doctor", component: FemaleDoctorLight  },
  { id: "female_medium", label: "Doctor", component: FemaleDoctorMedium },
  { id: "female_dark",   label: "Doctor", component: FemaleDoctorDark   },
];

export function AvatarById({ id, size = 80 }: { id: AvatarId | null; size?: number }) {
  const found = AVATARS.find((a) => a.id === id);
  if (!found) return null;
  const C = found.component;
  return <C size={size} />;
}
