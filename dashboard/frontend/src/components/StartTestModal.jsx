import { useState } from 'react';

const OFFLINE_SCENARIOS = [
  { id: 'baseline', label: 'Baseline Test', script: 'baseline.js' },
  { id: 'ramp-up', label: 'Ramp-Up Test', script: 'ramp-up.js' },
  { id: 'sustained', label: 'Sustained Load Test', script: 'sustained.js' },
  { id: 'recovery', label: 'Recovery Test', script: 'recovery.js' },
  { id: 'compute', label: 'Compute Stress Test', script: 'compute.js' },
];

export default function StartTestModal({
  open,
  onClose,
  environment,
  overview,
  mode,
  onModeChange,
  name,
  onNameChange,
  rate,
  onRateChange,
  duration,
  onDurationChange,
  confirmCpu,
  onConfirmCpuChange,
  cpuEnabled,
  jobRunning,
  testError,
  onStart,
}) {
  const [step, setStep] = useState('form');

  if (!open) return null;

  const envLabel = environment === 'AWS' ? 'AWS' : environment === 'LOCAL_DOCKER' ? 'Local Docker' : 'Connecting…';
  const canSubmitCpu = mode === 'cpu' ? confirmCpu && cpuEnabled : true;
  const trimmedName = name.trim();
  const formValid = trimmedName.length > 0 && rate >= 1 && rate <= 5 && (mode === 'cpu' || (duration >= 10 && duration <= 60)) && canSubmitCpu;

  function close() {
    setStep('form');
    onClose();
  }

  function handlePrimary() {
    if (step === 'form') {
      if (!formValid) return;
      setStep('confirm');
      return;
    }
    onStart();
    setStep('form');
  }

  return (
    <div className="modal-scrim" role="presentation" onClick={close}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-test-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="start-test-title">Start New Load Test</h2>
          <button type="button" className="modal-close" onClick={close} aria-label="Close">×</button>
        </header>

        {step === 'form' && (
          <div className="modal-body">
            <label className="field">
              <span>Test name</span>
              <input
                type="text"
                maxLength={80}
                placeholder="e.g. Baseline Test"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Test mode</span>
              <select value={mode} onChange={(e) => onModeChange(e.target.value)}>
                <option value="probe">API Probe (read-only response check)</option>
                <option value="cpu" disabled={!cpuEnabled}>
                  CPU Scaling Observation {cpuEnabled ? '(AWS, billable)' : '(available on the AWS dashboard only)'}
                </option>
              </select>
              <small>
                This dashboard directly executes a bounded API probe (or, in AWS mode, a confirmed CPU-scaling
                observation through SSM). The k6 scenario scripts below are run with the project&rsquo;s load-test
                runners outside the browser; their saved results appear automatically in Previous Test Results.
              </small>
            </label>

            <div className="field">
              <span>Reference k6 scenarios (run via load-tests runner, not this button)</span>
              <div className="chip-row">
                {OFFLINE_SCENARIOS.map((s) => (
                  <span key={s.id} className="chip" title={`load-tests/scenarios/${s.script}`}>{s.label}</span>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Target environment</span>
              <input type="text" value={envLabel} disabled readOnly />
              <small>Targets come from the monitoring API&rsquo;s own configuration; arbitrary URLs cannot be entered.</small>
            </label>

            <div className="field-row">
              {mode === 'probe' && <label className="field">
                <span>Duration (seconds)</span>
                <input type="number" min={10} max={60} value={duration} onChange={(e) => onDurationChange(Number(e.target.value))} />
                <small>Bounded 10–60 seconds by the monitoring API.</small>
              </label>}
              <label className="field">
                <span>{mode === 'cpu' ? 'ALB probe rate (req/s)' : 'Request rate (req/s)'}</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={rate}
                  onChange={(e) => onRateChange(Number(e.target.value))}
                />
                <small>Bounded 1–5 read-only requests/second{mode === 'cpu' ? ' throughout the six-minute CPU run, to populate ALB metrics' : ''}.</small>
              </label>
            </div>

            <label className="field">
              <span>Backend capacity (read-only)</span>
              <input
                type="text"
                disabled
                readOnly
                value={
                  overview?.replicaCount != null
                    ? `${overview.replicaCount} in service${overview.desiredCapacity != null ? ` / desired ${overview.desiredCapacity}` : ''}`
                    : 'Unavailable'
                }
              />
              <small>
                {environment === 'AWS'
                  ? 'This dashboard never changes Auto Scaling desired capacity when starting a test.'
                  : 'Local replica count is controlled manually outside this dashboard.'}
              </small>
            </label>

            {mode === 'cpu' && (
              <label className="field field-checkbox">
                <input type="checkbox" checked={confirmCpu} onChange={(e) => onConfirmCpuChange(e.target.checked)} />
                <span>I confirm a six-minute CPU load plus read-only ALB probes and up to one extra minute for the new target to become healthy. Auto Scaling may launch a second billable EC2 backend.</span>
              </label>
            )}

            {testError && <p className="form-error" role="alert">{testError}</p>}
          </div>
        )}

        {step === 'confirm' && (
          <div className="modal-body">
            <p>Review the test before it starts:</p>
            <dl className="summary-list">
              <dt>Test name</dt><dd>{trimmedName}</dd>
              <dt>Mode</dt><dd>{mode === 'cpu' ? 'CPU scaling observation' : 'API probe (read-only)'}</dd>
              <dt>Target environment</dt><dd>{envLabel}</dd>
              <dt>Duration</dt><dd>{mode === 'cpu' ? '6 minutes (fixed)' : `${duration} seconds`}</dd>
              <dt>{mode === 'cpu' ? 'ALB probe rate' : 'Request rate'}</dt><dd>{rate} req/s</dd>
            </dl>
            {environment === 'AWS' && (
              <p className="form-error" role="alert">
                This will run a bounded test against the live AWS deployment. Confirm you want to proceed.
              </p>
            )}
          </div>
        )}

        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={step === 'confirm' ? () => setStep('form') : close}>
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={jobRunning || (step === 'form' && !formValid)}
            onClick={handlePrimary}
          >
            {step === 'form' ? 'Review' : 'Start Test'}
          </button>
        </footer>
      </div>
    </div>
  );
}
