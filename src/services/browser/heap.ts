import CDP from 'chrome-remote-interface'
import { HeapSnapshot, SerializedHeapSnapshot } from 'puppeteer-heap-snapshot'
export { findObjectsWithProperties } from 'puppeteer-heap-snapshot'

const HEAP_SNAPSHOT_TIMEOUT = 30000

function deserializeHeapSnapshot(serializedHeapSnapshot: SerializedHeapSnapshot): HeapSnapshot {
  return {
    ...serializedHeapSnapshot,
    nodes: Uint32Array.from(serializedHeapSnapshot.nodes),
    edges: Uint32Array.from(serializedHeapSnapshot.edges),
  }
}

export async function captureHeapSnapshot(cdpSession: CDP.Client): Promise<HeapSnapshot> {
  return await new Promise((_resolve, _reject) => {
    let heapSnapshotResolved = false
    let heapSnapshotTimeout: ReturnType<typeof setTimeout> | null = null
    const heapSnapshotChunks: string[] = []

    const resolve = (snapshot: HeapSnapshot) => {
      heapSnapshotResolved = true
      _resolve(snapshot)
    }

    const reject = (error: Error) => {
      if (!heapSnapshotResolved) {
        _reject(error)
      }
    }

    cdpSession.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }: { chunk: string }) => {
      heapSnapshotChunks.push(chunk)

      if (chunk[chunk.length - 1] === '}') {
        try {
          const snapshotResponse = JSON.parse(heapSnapshotChunks.join('')) as SerializedHeapSnapshot

          if (heapSnapshotTimeout) {
            clearTimeout(heapSnapshotTimeout)
          }

          resolve(deserializeHeapSnapshot(snapshotResponse))
        } catch (err) {
          // Ignore JSON parser errors, may not be complete snapshot
        }
      }
    })

    cdpSession.on(
      'HeapProfiler.reportHeapSnapshotProgress',
      ({}: { done: number; total: number; finished?: boolean }) => {
        if (heapSnapshotTimeout) {
          clearTimeout(heapSnapshotTimeout)
        }

        heapSnapshotTimeout = setTimeout(() => {
          reject(new Error('Heap snapshot operation timed out'))
        }, HEAP_SNAPSHOT_TIMEOUT)
      },
    )

    cdpSession.send('HeapProfiler.takeHeapSnapshot', {
      // `reportProgress` events aren't useful for actually tracking real progress, only for the
      // DevTools UI. There's a race condition with the event emitter between UI finish and real finish.
      // Instead we track progress by trying to parse the raw json data if the last character in the chunk
      // is "}". We use the progress to start a timer that if we don't receieve the snapshot within X seconds, we fail.
      // This means we won't indefinitely hang waiting for chunks. Not ideal but works.
      reportProgress: true,
      captureNumericValue: true,
    })
  })
}
