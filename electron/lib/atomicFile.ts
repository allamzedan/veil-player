import { open, rename, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join } from 'node:path'

export interface AtomicFileOperations {
  writeAndSync: (filePath: string, data: string) => Promise<void>
  replace: (temporaryPath: string, destinationPath: string) => Promise<void>
  remove: (filePath: string) => Promise<void>
}

const nodeOperations: AtomicFileOperations = {
  async writeAndSync(filePath, data) {
    const handle = await open(filePath, 'wx')
    try {
      await handle.writeFile(data, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
  },
  replace: rename,
  remove: unlink
}

export async function atomicWriteTextFile(
  destinationPath: string,
  data: string,
  operations: AtomicFileOperations = nodeOperations
): Promise<void> {
  const temporaryPath = join(
    dirname(destinationPath),
    `.${basename(destinationPath)}.${process.pid}.${randomUUID()}.tmp`
  )
  let temporaryCreated = false
  try {
    await operations.writeAndSync(temporaryPath, data)
    temporaryCreated = true
    await operations.replace(temporaryPath, destinationPath)
    temporaryCreated = false
  } finally {
    if (temporaryCreated) {
      await operations.remove(temporaryPath).catch(() => undefined)
    }
  }
}
