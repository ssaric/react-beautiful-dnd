// @flow
import memoizeOne from 'memoize-one';
import invariant from 'tiny-invariant';
import getStyles, { type Styles } from './get-styles';
import { prefixDataAttribute } from '../data-attributes';
import type { StyleMarshal } from './style-marshal-types';
import type { DropReason } from '../../types';
import getHead from '../dom-node/util/get-head';
import createStyleElement from '../dom-node/util/create-style-element';

let count: number = 0;

// Required for server side rendering as count is persisted across requests
export const resetStyleContext = () => {
  count = 0;
};

export default () => {
  const context: string = `${count++}`;
  const styles: Styles = getStyles(context);
  let always: ?HTMLStyleElement = null;
  let dynamic: ?HTMLStyleElement = null;

  // using memoizeOne as a way of not updating the innerHTML
  // unless there is a new value required
  const setStyle = memoizeOne((el: ?HTMLStyleElement, proposed: string) => {
    invariant(el, 'Cannot set style of style tag if not mounted');
    // This technique works with ie11+ so no need for a nasty fallback as seen here:
    // https://stackoverflow.com/a/22050778/1374236
    el.innerHTML = proposed;
  });

  // exposing this as a seperate step so that it works nicely with
  // server side rendering
  const mount = () => {
    invariant(!always && !dynamic, 'Style marshal already mounted');

    always = createStyleElement();
    dynamic = createStyleElement();
    // for easy identification

    always.setAttribute(prefixDataAttribute('style-always'), context);
    dynamic.setAttribute(prefixDataAttribute('style-dynamic'), context);

    // add style tags to head
    getHead().appendChild(always);
    getHead().appendChild(dynamic);

    // set initial style
    setStyle(always, styles.always);
    setStyle(dynamic, styles.resting);
  };

  const dragging = () => setStyle(dynamic, styles.dragging);
  const dropping = (reason: DropReason) => {
    if (reason === 'DROP') {
      setStyle(dynamic, styles.dropAnimating);
      return;
    }
    setStyle(dynamic, styles.userCancel);
  };
  const resting = () => setStyle(dynamic, styles.resting);

  const unmount = (): void => {
    invariant(
      always && dynamic,
      'Cannot unmount style marshal as it is already unmounted',
    );

    // Remove from head
    getHead().removeChild(always);
    getHead().removeChild(dynamic);
    // Unset
    always = null;
    dynamic = null;
  };

  const marshal: StyleMarshal = {
    dragging,
    dropping,
    resting,
    styleContext: context,
    mount,
    unmount,
  };

  return marshal;
};
