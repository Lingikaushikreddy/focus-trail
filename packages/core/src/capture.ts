import type { CDPSession, Locator, Page } from '@playwright/test';
import type { ObservedFocus } from './types.js';

export function maskText(value: string, masks: readonly string[] = []): string {
  // Longest strings first prevent a shorter mask from exposing a longer secret.
  return [...new Set(masks)].filter(Boolean).sort((a, b) => b.length - a.length)
    .reduce((text, mask) => text.split(mask).join('[redacted]'), value);
}

const emptyFocus = (): ObservedFocus => ({ tag: null, role: null, name: null, testId: null });

/** Only the focused main-document node is queried. AX values and relatives are never persisted. */
export async function captureFocus(page: Page, masks: readonly string[] = []): Promise<ObservedFocus> {
  let session: CDPSession | undefined;
  let objectId: string | undefined;
  let observed = emptyFocus();
  try {
    session = await page.context().newCDPSession(page);
    const active = await session.send('Runtime.evaluate', { expression: 'document.activeElement', returnByValue: false });
    objectId = active.result.objectId;
    if (!objectId) return { ...observed, unavailable: 'Focus capture unavailable: no active element' };
    const inspect = async () => {
      const result = await session!.send('Runtime.callFunctionOn', {
        objectId,
        functionDeclaration: `function () { return {
          tag: this.tagName ? this.tagName.toLowerCase() : null,
          testId: this.getAttribute ? this.getAttribute('data-testid') : null,
          current: this === document.activeElement && this.isConnected,
          body: this === document.body || this === document.documentElement,
          shadow: !!(this.shadowRoot && this.shadowRoot.activeElement),
          frame: this.tagName === 'IFRAME' || this.tagName === 'FRAME'
        }; }`, returnByValue: true,
      });
      if (result.exceptionDetails || !result.result.value) throw new Error('Focus metadata unavailable');
      return result.result.value as { tag: string | null; testId: string | null; current: boolean; body: boolean; shadow: boolean; frame: boolean };
    };
    const before = await inspect();
    observed = { ...observed, tag: before.tag, testId: before.testId === null ? null : maskText(before.testId, masks) };
    if (!before.current) return { ...observed, unavailable: 'Focus capture unavailable: focus changed during capture' };
    if (before.body) return { ...observed, unavailable: 'No focused element: document body' };
    if (before.frame) return { ...observed, unavailable: 'Unsupported focus observation: frame content' };
    const described = await session.send('DOM.describeNode', { objectId, depth: 1, pierce: true });
    if (before.shadow || described.node.shadowRoots?.some(root => root.shadowRootType === 'closed')) {
      return { ...observed, unavailable: 'Unsupported focus observation: shadow content' };
    }
    const ax = await session.send('Accessibility.getPartialAXTree', { objectId, fetchRelatives: false });
    const focusedNode = ax.nodes.find(node => !node.ignored);
    if (!focusedNode) return { ...observed, unavailable: 'Focus capture unavailable: accessibility metadata' };
    const role = typeof focusedNode.role?.value === 'string' ? maskText(focusedNode.role.value, masks) : null;
    const name = typeof focusedNode.name?.value === 'string' ? maskText(focusedNode.name.value, masks) : null;
    const after = await inspect();
    if (!after.current || after.shadow || after.frame) return { ...observed, unavailable: 'Focus capture unavailable: focus changed during capture' };
    return { ...observed, role, name };
  } catch {
    return { ...observed, unavailable: 'Focus capture unavailable' };
  } finally {
    if (session && objectId) await session.send('Runtime.releaseObject', { objectId }).catch(() => {});
    if (session) await session.detach().catch(() => {});
  }
}

export interface TargetState { count: number; focused: boolean; unsupported?: string }

/** Counts, ownership and focus are sampled in the same document evaluation. */
export async function inspectTarget(page: Page, target: Locator): Promise<TargetState> {
  if (target.page() !== page) return { count: 0, focused: false, unsupported: 'Unsupported checkpoint target: other page' };
  try {
    return await target.evaluateAll(elements => {
      if (window !== window.top) return { count: elements.length, focused: false, unsupported: 'Unsupported checkpoint target: frame content' };
      const shadow = elements.some(element => element.getRootNode() !== document || element.ownerDocument !== document);
      if (shadow) return { count: elements.length, focused: false, unsupported: 'Unsupported checkpoint target: shadow content' };
      return { count: elements.length, focused: elements.length === 1 && elements[0] === document.activeElement };
    });
  } catch {
    throw new Error('Checkpoint target observation unavailable');
  }
}
