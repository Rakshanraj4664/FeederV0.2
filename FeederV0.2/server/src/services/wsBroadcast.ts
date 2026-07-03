type BroadcastFn = (data: string) => void

let broadcastFn: BroadcastFn = () => {}

export function setBroadcast(fn: BroadcastFn): void {
  broadcastFn = fn
}

export function broadcast(data: string): void {
  broadcastFn(data)
}
