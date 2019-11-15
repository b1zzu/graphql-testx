import { NetworkStatus, NetworkStatusChangeCallback } from "offix-client";

export class ToggleableNetworkStatus implements NetworkStatus {
  private online = true;
  private callbacks: NetworkStatusChangeCallback[] = [];

  public onStatusChangeListener(callback: NetworkStatusChangeCallback): void {
    this.callbacks.push(callback);
  }

  public async isOffline(): Promise<boolean> {
    return !this.online;
  }

  public setOnline(online: boolean): void {
    this.online = online;
    for (const callback of this.callbacks) {
      callback.onStatusChange({ online });
    }
  }
}
