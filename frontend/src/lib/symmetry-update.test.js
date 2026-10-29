// Symmetry: the fork's releases (.github/workflows/symmetry-apk.yml) are what lib/update.js picks.
import { describe, expect, it } from 'vitest'
import { apkKind, pickApk } from './update.js'

describe('symmetry releases and the in-app updater', () => {
  it('a SymmetryGym APK is the standard kind, with its checksum beside it', () => {
    const assets = [
      { name: 'SymmetryGym-1.4.1005.apk', browser_download_url: 'apk' },
      { name: 'SymmetryGym-1.4.1005.apk.sha256', browser_download_url: 'sha' },
    ]
    expect(apkKind(assets[0].name)).toBe('standard')
    expect(pickApk(assets, 'standard')).toEqual({ apk: assets[0], hash: assets[1] })
  })
})
