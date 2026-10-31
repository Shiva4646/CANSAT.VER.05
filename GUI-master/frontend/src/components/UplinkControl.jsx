import { useEffect, useState } from 'react'
import { useTelemetry } from '../context/TelemetryContext'

const VALID_COMMANDS = [
  'BOOT',
  'HC',
  'CALC',
  'TX_ON',
  'TX_OFF',
  'STATUS',
  'RESET',
  'RW',
]

function UplinkControl() {
  const {
    sendUplinkCommand,
    uplinkStatus,
    cmdResponse,
    resetUplinkStatus,
  } = useTelemetry()
  const [command, setCommand] = useState('')
  const [invalidCommand, setInvalidCommand] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (uplinkStatus !== 'sending') return undefined

    const timeout = setTimeout(() => {
      setTimedOut(true)
      resetUplinkStatus('error')
    }, 8000)

    return () => clearTimeout(timeout)
  }, [uplinkStatus, resetUplinkStatus])

  useEffect(() => {
    if (uplinkStatus !== 'success') return undefined

    const timeout = setTimeout(() => {
      setCommand('')
      resetUplinkStatus()
    }, 2000)

    return () => clearTimeout(timeout)
  }, [uplinkStatus, resetUplinkStatus])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (uplinkStatus === 'sending') return

    const cleanInput = command.trim().toUpperCase()
    if (!VALID_COMMANDS.includes(cleanInput)) {
      setInvalidCommand(true)
      return
    }

    if (
      cleanInput === 'RESET' &&
      !window.confirm('WARNING: Reboot flight computer?')
    ) {
      return
    }

    setInvalidCommand(false)
    setTimedOut(false)
    if (sendUplinkCommand(cleanInput)) {
      setCommand('')
    } else {
      resetUplinkStatus('error')
    }
  }

  const handleChange = (event) => {
    const cleanInput = event.target.value.trim().toUpperCase()
    setCommand(cleanInput)
    setInvalidCommand(false)
    setTimedOut(false)
    if (uplinkStatus === 'error') resetUplinkStatus()
  }

  const hasError = invalidCommand || uplinkStatus === 'error'
  const isSuccess = uplinkStatus === 'success'

  return (
    <div className="min-w-0 max-w-full">
      <form
        aria-label="Uplink command"
        className="flex w-fit max-w-full flex-row items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-100 shadow-lg"
        onSubmit={handleSubmit}
      >
      <label className="sr-only" htmlFor="uplink-command">
        Command text
      </label>
      <input
        autoComplete="off"
        aria-invalid={hasError}
        className={`w-56 max-w-full min-w-0 flex-none rounded-lg ${
          hasError
            ? 'border-4 border-red-500'
            : isSuccess
              ? 'border-4 border-green-500'
              : 'border border-slate-700'
        } bg-slate-950 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={uplinkStatus === 'sending'}
        id="uplink-command"
        onChange={handleChange}
        placeholder="Enter uplink command"
        type="text"
        value={command}
      />
      <button
        className="w-fit shrink-0 whitespace-nowrap rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={uplinkStatus === 'sending'}
        type="submit"
      >
        {uplinkStatus === 'sending'
          ? 'Waiting for ACK...'
          : invalidCommand
            ? 'Invalid Command'
            : isSuccess
              ? 'Success!'
              : uplinkStatus === 'error'
                ? timedOut
                  ? 'Timeout: ESP32 did not acknowledge'
                  : 'Failed - Retry'
                : 'Send Command'}
      </button>
      </form>
      {cmdResponse && (
        <output
          aria-live="polite"
          className="mt-2 block w-full min-w-0 max-w-md overflow-x-auto whitespace-nowrap rounded-md border border-emerald-900 bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-400"
          title={cmdResponse}
        >
          {cmdResponse}
        </output>
      )}
      {(uplinkStatus === 'success' || timedOut) && (
        <output
          aria-live="polite"
          className={`mt-1 block text-xs ${timedOut ? 'text-red-400' : 'text-slate-300'}`}
        >
          {timedOut
            ? 'Timeout: ESP32 did not acknowledge'
            : 'Command Successful'}
        </output>
      )}
    </div>
  )
}

export default UplinkControl
