import { api } from "@/lib/api";

export function View({ children }) {
  return <div>{api.label}</div>;
}
