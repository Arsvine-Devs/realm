import React, { useRef, useImperativeHandle, useEffect } from 'react';
import styles from '../HomeLoadingScreen.module.scss';

interface TerminalConsoleProps {
  logLines: Array<{ id: number; text: string }>;
}

export interface TerminalConsoleRef {
  container: HTMLDivElement | null;
}

function TerminalConsole({
  logLines,
  ref,
}: TerminalConsoleProps & { ref?: React.Ref<TerminalConsoleRef> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    container: containerRef.current,
  }));

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [logLines]);

  return (
    <div ref={containerRef} className={styles.console_output} style={{ opacity: 0 }}>
      <div className={styles.console_header}>
        <span className={styles.header_title}>SYSTEM LOG</span>
      </div>
      <div className={styles.console_content} ref={contentRef}>
        {logLines.map((line) => (
          <div key={line.id} className={styles.log_line}>
            <span className={styles.log_prefix}>&gt;</span>
            <span className={styles.log_text}>{line.text}</span>
          </div>
        ))}
        {logLines.length > 0 && (
          <div className={styles.log_line} style={{ opacity: 1 }}>
            <span className={styles.log_prefix}>&gt;</span>
            <span className={styles.log_text}>_</span>
          </div>
        )}
      </div>
    </div>
  );
}

TerminalConsole.displayName = 'TerminalConsole';

export default TerminalConsole;
