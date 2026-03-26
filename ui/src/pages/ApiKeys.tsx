import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchApiKeys, generateApiKey, revokeApiKey } from '../api/apiKeysApi'

function maskKey(key: string) {
  if (key.length <= 8) return key
  return key.slice(0, 4) + '•'.repeat(8) + key.slice(-4)
}

export function ApiKeys() {
  const { token } = useAuth()
  const [keys, setKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchApiKeys(token)
      setKeys(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setNewKey(null)
    try {
      const key = await generateApiKey(token)
      setNewKey(key)
      setKeys((prev) => [key, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (keyToRevoke: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return
    setError(null)
    try {
      await revokeApiKey(token, keyToRevoke)
      setKeys((prev) => prev.filter((k) => k !== keyToRevoke))
      if (newKey === keyToRevoke) setNewKey(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key')
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    // could add toast/feedback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">API Keys</h1>
          <p className="mt-1 text-slate-500">Manage API keys for programmatic access to the Resume API</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate New Key'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {newKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">New key created. Copy it now — it won’t be shown again:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-sm">{newKey}</code>
            <button
              type="button"
              onClick={() => copyKey(newKey)}
              className="btn-secondary text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display font-semibold text-slate-900">Active Keys</h2>
          <p className="text-sm text-slate-500">Keys are partially masked for security. Revoke any compromised keys immediately.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : keys.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              No API keys yet. Generate one to get started.
            </div>
          ) : (
            keys.map((key) => (
              <div key={key} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    🔑
                  </div>
                  <div>
                    <p className="font-mono text-sm text-slate-700">{maskKey(key)}</p>
                    <p className="text-xs text-slate-500">Full key visible only when created</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(key)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-3">
          <p className="text-xs text-slate-500">
            <strong>Security tip:</strong> Never share API keys. Use environment variables or a secrets manager in production.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display font-semibold text-slate-900">API Documentation</h3>
        <p className="mt-2 text-sm text-slate-600">
          Include your API key in the <code className="rounded bg-slate-100 px-1 py-0.5">X-API-Key</code> header when making requests:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-200">
{`curl -H "X-API-Key: YOUR_KEY" \\
  https://api.example.com/resume/`}
        </pre>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Swagger UI →
          </a>
          <a href="/redoc" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            ReDoc →
          </a>
        </div>
      </div>
    </div>
  )
}
