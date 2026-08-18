import React from "react";
import { View } from "./view";
import { api } from "@/lib/api";
import { useStore } from "@/store";
import { barrelThing } from "@/shared/barrel";
import { callRemote } from "../remote";

export default function App() {
  return <View>{callRemote(useStore(barrelThing).count)}</View>;
}

export { React };
