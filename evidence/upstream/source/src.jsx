// Extracted and adapted from microsoft/PyRIT ConverterRegistry.tsx at the
// revisions recorded in README.md. This is not the complete upstream app.
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface,
  DialogTitle, FluentProvider, Table, TableBody, TableCell, TableRow,
  useRestoreFocusTarget, webLightTheme,
} from '@fluentui/react-components';

const converter = { converter_id: 'focus_probe' };

function RemoveDialog({ converterToRemove, dismissRemoveDialog }) {
  const removing = false; // Escape dismissal only; no backend request is made.
  return (
    <Dialog
      open={converterToRemove !== null}
      onOpenChange={(_, data) => { if (!data.open && !removing) dismissRemoveDialog(); }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Remove converter?</DialogTitle>
          <DialogContent>
            {converterToRemove
              ? `Remove "${converterToRemove.converter_id}" from the converter registry?`
              : ''}
          </DialogContent>
          <DialogActions>
            <Button disabled={removing} onClick={dismissRemoveDialog} data-testid="cancel">Cancel</Button>
            <Button appearance="primary" disabled={removing} onClick={dismissRemoveDialog} data-testid="confirm">Remove</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function RegistryControls({ restoreFocusTarget = {}, newConverterRef, openRemoveDialog }) {
  return (
    <>
      <h1>Converter Registry</h1>
      <Button {...restoreFocusTarget} ref={newConverterRef} appearance="primary" data-testid="new-converter">New Converter</Button>
      <Table aria-label="Converter instances">
        <TableBody><TableRow>
          <TableCell>{converter.converter_id}</TableCell>
          <TableCell>
            <Button
              {...restoreFocusTarget}
              appearance="subtle"
              aria-label={`Remove ${converter.converter_id}`}
              onClick={openRemoveDialog}
              data-testid="opener"
            >Remove</Button>
          </TableCell>
        </TableRow></TableBody>
      </Table>
    </>
  );
}

function Before() {
  const [converterToRemove, setConverterToRemove] = useState(null);
  return <>
    <RegistryControls openRemoveDialog={() => setConverterToRemove(converter)} />
    <RemoveDialog converterToRemove={converterToRemove} dismissRemoveDialog={() => setConverterToRemove(null)} />
  </>;
}

function After() {
  const [converterToRemove, setConverterToRemove] = useState(null);
  const [focusRestore, setFocusRestore] = useState(null);
  const restoreFocusTarget = useRestoreFocusTarget();
  const newConverterRef = useRef(null);
  const removeTriggerRef = useRef(null);
  const openDialogRef = useRef(null);
  useEffect(() => {
    if (!focusRestore) return;
    if (openDialogRef.current) return;
    const target = focusRestore.trigger?.isConnected
      ? focusRestore.trigger
      : newConverterRef.current;
    target?.focus();
  }, [focusRestore]);
  const openRemoveDialog = event => {
    removeTriggerRef.current = event.currentTarget;
    openDialogRef.current = { dialog: 'remove' };
    setConverterToRemove(converter);
  };
  const dismissRemoveDialog = () => {
    openDialogRef.current = null;
    setConverterToRemove(null);
    setFocusRestore({ trigger: removeTriggerRef.current });
  };
  return <>
    <RegistryControls restoreFocusTarget={restoreFocusTarget} newConverterRef={newConverterRef} openRemoveDialog={openRemoveDialog} />
    <RemoveDialog converterToRemove={converterToRemove} dismissRemoveDialog={dismissRemoveDialog} />
  </>;
}

const variant = new URLSearchParams(location.search).get('variant') === 'after' ? 'after' : 'before';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><FluentProvider theme={webLightTheme}><main data-variant={variant}>{variant === 'after' ? <After /> : <Before />}</main></FluentProvider></React.StrictMode>,
);
