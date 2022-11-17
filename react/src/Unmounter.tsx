import * as React from 'react';

// @ts-ignore
/**
 * A component with a button to force an unmount of its children,
 * and allow a remount. Intended only for testing effects/unmounts during development.
 *
 * @param param0
 * @returns
 */
export const Unmounter = ({ above = false, buttonClasses = '', children = [] }) => {
  const [mounted, setMounted] = React.useState(true);
  const content = [
    <div key="_or_unmountable">{children}</div>,
    <p key="_or_unmounter">
      <button data-testid="unmounter-button" onClick={() => setMounted((m) => !m)}>
        {mounted ? 'Unmount' : 'Remount'}
      </button>
    </p>,
  ];
  above && content.reverse();
  return (
    <div>
      {mounted && content}
      {!mounted && (
        <p key="_or_remounter">
          Unmounted!{' '}
          <span>
            <button className={buttonClasses} onClick={() => setMounted(true)}>
              Remount
            </button>
          </span>
        </p>
      )}
    </div>
  );
};
