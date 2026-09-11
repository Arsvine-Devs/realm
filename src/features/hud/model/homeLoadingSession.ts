// Locale changes remount the App Router locale layout, but they do not create a
// new browser document. Keep the opening sequence scoped to that document so a
// language change never replays it.
let initialBootSequencePending = true;

const INITIAL_BOOT_COMPLETE_ATTRIBUTE = 'data-initial-boot-complete';

function isDocumentBootComplete(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute(INITIAL_BOOT_COMPLETE_ATTRIBUTE)
  );
}

export function isInitialBootSequencePending(): boolean {
  return initialBootSequencePending && !isDocumentBootComplete();
}

export function completeInitialBootSequence(): void {
  initialBootSequencePending = false;

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(INITIAL_BOOT_COMPLETE_ATTRIBUTE, 'true');
  }
}
