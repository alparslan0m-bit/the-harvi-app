import { api } from "./helper";

export function callRemote() {
  // invoke the remote API through a helper
  api.auth.login();
}
