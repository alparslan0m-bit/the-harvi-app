import { state } from "../store";

registerEndpoint("GET /data");
registerEndpoint("POST /submit");

export const api = {
  label: state.name,
};
