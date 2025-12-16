import crypto from 'crypto'
import https from 'https'

/**
 * Checks if the buffer starts with the ZIP magic bytes (PK\x03\x04)
 */
export function isZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  // PK\x03\x04 = 50 4B 03 04
  return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04
}

const THRESHOLD = parseInt(process.env.VIRUSTOTAL_MALICIOUS_THRESHOLD || '0', 10)

/**
 * Checks a file against VirusTotal API.
 * First checks by hash. If not found, UPLOADS the file for scanning (if small enough).
 */
export async function checkVirusTotal(buffer: Buffer, apiKey: string | undefined): Promise<{ safe: boolean, reason?: string }> {
  if (!apiKey) {
    console.log('[Security] VirusTotal API Key not configured. Skipping scan.')
    return { safe: true }
  }

  // 1. Check by Hash first (Fast & Free-er)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  console.log(`[Security] Checking file hash on VirusTotal: ${hash}`)

  const hashResult = await checkHashVT(hash, apiKey)
  if (hashResult.status === 'malicious') {
    return { safe: false, reason: hashResult.reason }
  }
  if (hashResult.status === 'clean') {
    return { safe: true }
  }

  // 2. If Unknown, Upload file (Slower)
  // Limit upload size to 32MB for VT API
  if (buffer.length > 32 * 1024 * 1024) {
    console.log('[Security] File too large for VT Upload (>32MB). Assuming safe (Fail Open).')
    return { safe: true }
  }

  console.log('[Security] File unknown to VirusTotal. Uploading for scan...')
  const uploadResult = await uploadFileVT(buffer, apiKey)
  
  if (uploadResult.success && uploadResult.id) {
    console.log(`[Security] File uploaded to VT. Analysis queued: ${uploadResult.id}`)
    console.log('[Security] Waiting for analysis results (Polling)...')
    
    // Poll for results (Max 60 seconds)
    const analysisResult = await pollAnalysisVT(uploadResult.id, apiKey)
    if (analysisResult.status === 'malicious') {
      return { safe: false, reason: analysisResult.reason }
    }
    return { safe: true }
  }

  return { safe: true } // Fail open on error
}

async function pollAnalysisVT(analysisId: string, apiKey: string): Promise<{ status: 'clean' | 'malicious' | 'unknown', reason?: string }> {
  const MAX_RETRIES = 10
  const RETRY_DELAY = 30000 // 30 seconds

  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise(r => setTimeout(r, RETRY_DELAY))
    console.log(`[Security] Polling VT Analysis (${i + 1}/${MAX_RETRIES})...`)

    const result = await checkAnalysisVT(analysisId, apiKey)
    if (result.status === 'completed') {
      const stats = result.stats
      if (stats) {
            const malicious = stats.malicious || 0
            if (malicious > THRESHOLD) {
               console.warn(`[Security] BLOCKED: File flagged by VirusTotal (Malicious: ${malicious} > Threshold: ${THRESHOLD})`)
               return { status: 'malicious', reason: 'Security Policy Violation: File identified as potential threat.' }
            }
            console.log(`[Security] VT Analysis passed. File is clean. (Malicious: ${malicious}/${stats.total || '?'})`)
            return { status: 'clean' }
          }
    }
  }
  
  console.log('[Security] VT Analysis timed out. Assuming safe (Fail Open).')
  return { status: 'clean' }
}

async function checkAnalysisVT(analysisId: string, apiKey: string): Promise<{ status: 'queued' | 'completed' | 'unknown', stats?: any }> {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      hostname: 'www.virustotal.com',
      path: `/api/v3/analyses/${analysisId}`,
      headers: { 'x-apikey': apiKey, 'Accept': 'application/json' }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve({ status: 'unknown' })
        try {
          const json = JSON.parse(data)
          const status = json.data?.attributes?.status
          if (status === 'completed') {
            return resolve({ status: 'completed', stats: json.data?.attributes?.stats })
          }
          return resolve({ status: 'queued' })
        } catch { resolve({ status: 'unknown' }) }
      })
    })
    req.on('error', () => resolve({ status: 'unknown' }))
    req.end()
  })
}

async function checkHashVT(hash: string, apiKey: string): Promise<{ status: 'clean' | 'malicious' | 'unknown', reason?: string }> {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      hostname: 'www.virustotal.com',
      path: `/api/v3/files/${hash}`,
      headers: { 'x-apikey': apiKey, 'Accept': 'application/json' }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode === 404) return resolve({ status: 'unknown' })
        if (res.statusCode !== 200) {
            console.error(`[Security] VT Hash Check Error: ${res.statusCode}`)
            return resolve({ status: 'unknown' })
        }
        try {
          const json = JSON.parse(data)
          const stats = json.data?.attributes?.last_analysis_stats
          if (stats) {
            const malicious = stats.malicious || 0
            if (malicious > THRESHOLD) {
              console.warn(`[Security] BLOCKED: File flagged by VirusTotal (Malicious: ${malicious} > Threshold: ${THRESHOLD})`)
              return resolve({ status: 'malicious', reason: 'Security Policy Violation: File identified as potential threat.' })
            }
            console.log(`[Security] VT Hash Check: CLEAN (Malicious: ${malicious}/${stats.total || '?'})`)
          }
          resolve({ status: 'clean' })
        } catch (e) { resolve({ status: 'unknown' }) }
      })
    })
    req.on('error', () => resolve({ status: 'unknown' }))
    req.end()
  })
}

async function uploadFileVT(buffer: Buffer, apiKey: string): Promise<{ success: boolean, id?: string }> {
  return new Promise((resolve) => {
    const boundary = '----SecureTagVTUploadBoundary' + crypto.randomBytes(8).toString('hex')
    const options = {
      method: 'POST',
      hostname: 'www.virustotal.com',
      path: '/api/v3/files',
      headers: { 
        'x-apikey': apiKey, 
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Accept': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`[Security] VT Upload Error: ${res.statusCode} - ${data}`)
                return resolve({ success: false })
            }
            try {
                const json = JSON.parse(data)
                resolve({ success: true, id: json.data?.id })
            } catch { resolve({ success: false }) }
        })
    })

    req.on('error', (e) => {
        console.error('[Security] VT Upload Network Error', e)
        resolve({ success: false })
    })

    // Construct Multipart Body
    req.write(`--${boundary}\r\n`)
    req.write('Content-Disposition: form-data; name="file"; filename="upload.zip"\r\n')
    req.write('Content-Type: application/zip\r\n\r\n')
    req.write(buffer)
    req.write(`\r\n--${boundary}--\r\n`)
    req.end()
  })
}
